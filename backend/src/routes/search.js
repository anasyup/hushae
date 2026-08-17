const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

const esc = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ============================================================================
 * Global admin search — ⌘K. Returns REAL entities, grouped, capped at 5 each.
 * Nothing fabricated: results come straight from the live collections.
 * ========================================================================== */
router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ products: [], orders: [], customers: [] });
  const rx = new RegExp(esc(q), 'i');

  const [products, orders, customers] = await Promise.all([
    Product.find({ $or: [{ name: rx }, { sku: rx }, { slug: rx }] })
      .select('name sku slug images stock price isActive')
      .limit(5).lean(),
    Order.find({
      $or: [
        { orderNumber: rx },
        { 'customerInfo.name': rx },
        { 'customerInfo.phone': rx },
        { 'customerInfo.city': rx },
      ],
    })
      .select('orderNumber customerInfo.name customerInfo.city total status createdAt')
      .sort({ createdAt: -1 })
      .limit(5).lean(),
    User.find({ role: 'customer', $or: [{ name: rx }, { email: rx }, { phone: rx }] })
      .select('name email phone isActive')
      .limit(5).lean(),
  ]);

  res.json({ products, orders, customers });
}));

/* ============================================================================
 * SEARCH ANALYTICS — /api/search/admin/*
 *
 * The admin SearchAnalytics screen called these three endpoints and none of
 * them existed, so the page rendered with permanently empty cards. Every
 * figure below is derived from SearchLog rows written by the public search
 * router; nothing is estimated or fabricated.
 * ========================================================================== */
const SearchLog = require('../models/SearchLog');

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const sinceDays = (v) => {
  const d = Math.min(365, Math.max(1, parseInt(v, 10) || 30));
  return { days: d, from: new Date(Date.now() - d * 86400000) };
};

router.get('/stats', asyncHandler(async (req, res) => {
  const { from } = sinceDays(req.query.days);
  const match = { createdAt: { $gte: from } };

  const [totals, zero, top, clicked, device] = await Promise.all([
    SearchLog.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        searches: { $sum: 1 },
        zeroResults: { $sum: { $cond: ['$zeroResult', 1, 0] } },
        clicks: { $sum: { $cond: ['$clicked', 1, 0] } },
        conversions: { $sum: { $cond: ['$converted', 1, 0] } },
        fuzzyUsed: { $sum: { $cond: ['$usedFuzzy', 1, 0] } },
      } },
    ]),
    SearchLog.aggregate([
      { $match: { ...match, zeroResult: true } },
      { $group: { _id: '$normalized', count: { $sum: 1 }, term: { $first: '$term' } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]),
    SearchLog.aggregate([
      { $match: match },
      { $group: {
        _id: '$normalized', count: { $sum: 1 }, term: { $first: '$term' },
        clicks: { $sum: { $cond: ['$clicked', 1, 0] } },
        avgResults: { $avg: '$results' },
      } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]),
    SearchLog.aggregate([
      { $match: { ...match, clicked: true } },
      { $group: { _id: '$normalized', count: { $sum: 1 }, term: { $first: '$term' } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]),
    SearchLog.aggregate([
      { $match: { ...match, device: { $ne: '' } } },
      { $group: { _id: '$device', n: { $sum: 1 } } },
    ]),
  ]);

  const t = totals[0] || { searches: 0, zeroResults: 0, clicks: 0, conversions: 0, fuzzyUsed: 0 };
  res.json({
    searches: t.searches,
    zeroResults: t.zeroResults,
    zeroRate: pct(t.zeroResults, t.searches),
    clicks: t.clicks,
    clickRate: pct(t.clicks, t.searches),
    conversions: t.conversions,
    conversionRate: pct(t.conversions, t.searches),
    fuzzyUsed: t.fuzzyUsed,
    zero: zero.map((r) => ({ term: r.term, count: r.count })),
    top: top.map((r) => ({
      term: r.term, count: r.count, clicks: r.clicks,
      avgResults: Math.round(r.avgResults || 0),
    })),
    clicked: clicked.map((r) => ({ term: r.term, count: r.count })),
    device: Object.fromEntries(device.map((r) => [r._id, r.n])),
  });
}));

/* Data-quality checks. These read the CATALOGUE, not the log: a size stored
   three different ways splits one filter into three, which is a merchandising
   fault the search screen is the right place to surface. */
router.get('/data-quality', asyncHandler(async (_req, res) => {
  const docs = await Product.find({ isActive: true })
    .select('sizes colors fabric tags').lean();

  const group = (values) => {
    const m = new Map();
    for (const v of values) {
      const k = String(v).toLowerCase().replace(/[\s._-]/g, '');
      if (!k) continue;
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(String(v));
    }
    return [...m.entries()]
      .filter(([, set]) => set.size > 1)
      .map(([k, set]) => ({ canonical: [...set][0], key: k, variants: [...set] }));
  };

  const colorNames = docs.flatMap((d) => (d.colors || []).map((c) => c?.name).filter(Boolean));
  res.json({
    duplicateSizes: group(docs.flatMap((d) => d.sizes || [])),
    duplicateColors: group(colorNames),
    // A colour with digits or no vowel is almost always a typo or a raw code.
    suspiciousColors: [...new Set(colorNames)].filter((c) => /\d/.test(c) || !/[aeiou]/i.test(c)),
    missingFabricCount: docs.filter((d) => !d.fabric).length,
    missingTagsCount: docs.filter((d) => !(d.tags || []).length).length,
  });
}));

/* CSV export of the keyword table. Streams strings only — the sheet is opened
   in Excel, so every field is quoted and quotes are doubled. */
router.get('/export', asyncHandler(async (req, res) => {
  const { days, from } = sinceDays(req.query.days);
  const rows = await SearchLog.aggregate([
    { $match: { createdAt: { $gte: from } } },
    { $group: {
      _id: '$normalized', term: { $first: '$term' }, count: { $sum: 1 },
      clicks: { $sum: { $cond: ['$clicked', 1, 0] } },
      conversions: { $sum: { $cond: ['$converted', 1, 0] } },
      avgResults: { $avg: '$results' },
    } },
    { $sort: { count: -1 } },
  ]);

  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    ['Term', 'Searches', 'Clicks', 'Orders', 'Avg results'].map(q).join(','),
    ...rows.map((r) => [r.term, r.count, r.clicks, r.conversions, Math.round(r.avgResults || 0)].map(q).join(',')),
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="search-${days}d.csv"`);
  res.send(csv);
}));

module.exports = router;
