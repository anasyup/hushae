const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const rateLimit = require('../middleware/rateLimit');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const Promotion = require('../models/Promotion');
const PromotionUse = require('../models/PromotionUse');
const Product = require('../models/Product');
const E = require('../utils/promotionEngine');

const router = express.Router();

/* ---------------------------------------------------------------------------
 * PUBLIC — what a shopper is allowed to know.
 *
 * Deliberately narrow: no eligibility rules, no usage counts, no budgets. A
 * promotion targeted at named phone numbers must not be discoverable by
 * everyone, and knowing a promotion has 3 uses left invites gaming.
 * ------------------------------------------------------------------------- */
router.get('/active', asyncHandler(async (req, res) => {
  const cfg = await E.marketingConfig();
  if (!cfg.enabled) return res.json({ enabled: false, promotions: [] });

  const now = new Date();
  const rows = await Promotion.find({ enabled: true });
  const live = rows
    .filter((p) => p.liveState(now).live)
    .filter((p) => p.showOnCard !== false || p.showInCart !== false)
    .map((p) => ({
      id: String(p._id),
      label: p.publicLabel || p.name,
      type: p.type,
      badge: p.badge?.show === false ? null : p.badge,
      endsAt: p.endsAt,
      // Only the shape of the offer, never who qualifies for it.
      discountPercent: p.discountPercent || 0,
      showOnCard: p.showOnCard !== false,
      showInCart: p.showInCart !== false,
    }));

  /* The storefront needs the badge RULES, not just a flag: it renders badges
     on cards it already has in memory, and re-fetching every product through
     a server that computes badges would be a request per grid. The rules are
     presentation-only — thresholds and toggles, nothing about eligibility or
     budgets — so publishing them leaks nothing. */
  res.json({
    enabled: true,
    promotions: live,
    flash: cfg.flash,
    badges: cfg.badges,
    scope: {
      // Which product ids each card-visible promotion covers, so a card can
      // show "Bundle offer" without asking the server per product. Capped:
      // an "everything" promotion sends a flag, not 101 ids.
      byPromotion: live.filter((p) => p.showOnCard).map((p) => {
        const src = rows.find((r) => String(r._id) === p.id);
        const sc = src?.scope || {};
        return {
          id: p.id,
          mode: sc.mode || 'all',
          productIds: (sc.productIds || []).slice(0, 300).map(String),
          categorySlugs: sc.categorySlugs || [],
          tags: sc.tags || [],
          gender: sc.gender || '',
          tiers: sc.tiers || [],
        };
      }),
    },
  });
}));

/* ---------------------------------------------------------------------------
 * BADGES for a set of products.
 *
 * computeBadges() shipped in Part 1 and nothing ever called it — measured:
 * one definition, one export, zero call sites. The storefront could not reach
 * it, so "Trending" was unreachable by design.
 *
 * Trending needs recent order counts, which only the server can know, so this
 * is a POST with the slugs currently on screen rather than a rule the client
 * evaluates. One request per grid, not per card.
 * ------------------------------------------------------------------------- */
router.post('/badges', asyncHandler(async (req, res) => {
  const cfg = await E.marketingConfig();
  if (!cfg.enabled || !cfg.badges?.enabled) return res.json({ enabled: false, badges: {} });

  const slugs = Array.isArray(req.body?.slugs) ? req.body.slugs.slice(0, 60).map(String) : [];
  if (!slugs.length) return res.json({ enabled: true, badges: {} });

  const products = await Product.find({ slug: { $in: slugs } })
    .select('slug price compareAtPrice stock isBestSeller isFeatured createdAt').lean();

  /* Recent order counts drive the Trending badge. One aggregate for the whole
     grid; doing it per product would be sixty queries for one screen. */
  let recent = new Map();
  if (cfg.badges.showTrending) {
    try {
      const Order = require('../models/Order');
      const since = new Date(Date.now() - (Number(cfg.badges.trendingDays) || 7) * 86400000);
      const rows2 = await Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $nin: ['Cancelled', 'Refunded'] } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', n: { $sum: 1 } } },
      ]);
      const ids = products.map((p) => String(p._id));
      recent = new Map(rows2.filter((r) => ids.includes(String(r._id))).map((r) => [String(r._id), r.n]));
    } catch { /* trending is a nicety; never fail the grid for it */ }
  }

  const out = {};
  for (const p of products) {
    const list = E.computeBadges(p, cfg, { recentOrders: recent.get(String(p._id)) || 0 });
    if (list.length) out[p.slug] = list;
  }
  res.json({ enabled: true, badges: out });
}));

/* ---------------------------------------------------------------------------
 * CART QUOTE — public, read-only, and the only way the storefront learns what
 * a promotion is worth.
 *
 * The client sends WHICH products and how many. It never sends a price: every
 * amount comes from the product documents the server loads and the promotion
 * rules the server reads. Same discipline as the loyalty quote in Sprint 2I —
 * a request may ask, it may not assert.
 *
 * Writes nothing. Usage is recorded by the order route once an order exists.
 * ------------------------------------------------------------------------- */
const quoteLimit = rateLimit({ windowMs: 60 * 1000, max: 90, key: 'promo-quote', message: 'One moment — try again shortly' });

router.post('/quote', quoteLimit, optionalAuth, asyncHandler(async (req, res) => {
  const cfg = await E.marketingConfig();
  if (!cfg.enabled) return res.json({ enabled: false, discounts: [], total: 0, rejected: [] });

  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  if (!items.length) return res.json({ enabled: true, discounts: [], total: 0, rejected: [] });

  const ids = items.map((i) => i.product).filter((x) => /^[0-9a-fA-F]{24}$/.test(String(x)));
  if (!ids.length) return res.json({ enabled: true, discounts: [], total: 0, rejected: [] });

  const products = await Product.find({ _id: { $in: ids }, isActive: true, status: { $ne: 'draft' } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const it of items) {
    const prod = byId.get(String(it.product));
    if (!prod) continue;
    lines.push({
      key: `${prod._id}:${it.size || ''}:${it.color || ''}`,
      productId: prod._id,
      price: prod.price,                              // server price, always
      qty: Math.max(1, Math.min(20, parseInt(it.quantity, 10) || 1)),
      product: prod,
    });
  }
  if (!lines.length) return res.json({ enabled: true, discounts: [], total: 0, rejected: [] });

  /* first-order eligibility is counted from real orders, never trusted from
     the request — otherwise "first order only" is a free-for-all. */
  let orderCount = 0;
  const phone = req.user?.phone || String(req.body?.phone || '');
  const key = String(phone).replace(/\D/g, '').slice(-9);
  if (key) {
    try {
      const Order = require('../models/Order');
      orderCount = await Order.countDocuments({
        'customerInfo.phone': { $regex: `${key}$` },
        status: { $nin: ['Cancelled'] },
      });
    } catch { /* an eligibility read must not fail the basket */ }
  }

  const r = await E.evaluateCart({
    lines,
    ctx: {
      phone, orderCount,
      city: String(req.body?.city || ''),
      paymentMethod: String(req.body?.paymentMethod || ''),
      hasCoupon: !!req.body?.hasCoupon,
    },
  });

  /* Only near-misses are published. Telling a shopper a promotion exists for
     other people, or for another city, is confusing and slightly insulting —
     "spend PKR 400 more" is useful, "you have ordered before" is not. */
  const SHOW = new Set(['below-minimum', 'too-few-items']);
  const nudges = [];
  for (const rej of r.rejected || []) {
    if (!SHOW.has(rej.rejectedFor)) continue;
    const promo = await Promotion.findById(rej.id).select('name publicLabel eligibility').lean().catch(() => null);
    if (!promo) continue;
    nudges.push({
      id: rej.id,
      name: promo.publicLabel || promo.name,
      rejectedFor: rej.rejectedFor,
      need: rej.rejectedFor === 'below-minimum'
        ? promo.eligibility?.minCartTotal || 0
        : promo.eligibility?.minCartItems || 0,
    });
  }

  res.json({
    enabled: true,
    discounts: (r.discounts || []).filter((d) => d.showInCart !== false),
    total: r.total,
    capped: r.capped,
    freeShipping: r.freeShipping,
    rejected: nudges,
  });
}));

/* ---------------------------------------------------------------------------
 * ADMIN. Registered before any /:id route so "preview" is never read as an id.
 * ------------------------------------------------------------------------- */
router.use(protect, adminOnly);

/** Validation lives here, not in the engine: the engine's job is to honour
 *  what was saved. Refusing bad input at the door is what keeps it honest. */
function validate(body) {
  const errs = [];
  const name = String(body.name || '').trim();
  if (!name) errs.push({ field: 'name', message: 'Give the promotion a name' });
  if (!Promotion.TYPES.includes(body.type)) errs.push({ field: 'type', message: 'Choose a promotion type' });

  const pct = Number(body.discountPercent) || 0;
  const fix = Number(body.discountFixed) || 0;
  if (pct < 0 || pct > 100) errs.push({ field: 'discountPercent', message: 'Percentage must be between 0 and 100' });
  if (fix < 0) errs.push({ field: 'discountFixed', message: 'Amount cannot be negative' });

  const needsReward = ['flash', 'percent', 'fixed'].includes(body.type);
  if (needsReward && pct <= 0 && fix <= 0) {
    errs.push({ field: 'discountPercent', message: 'Set either a percentage or a fixed amount' });
  }

  if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
    errs.push({ field: 'endsAt', message: 'The end date must be after the start date' });
  }

  if (body.type === 'bxgy') {
    if ((Number(body.bxgy?.buyQty) || 0) < 1) errs.push({ field: 'bxgy.buyQty', message: 'Buy quantity must be at least 1' });
    if ((Number(body.bxgy?.getQty) || 0) < 1) errs.push({ field: 'bxgy.getQty', message: 'Get quantity must be at least 1' });
  }
  if (body.type === 'bundle') {
    const ids = body.bundle?.productIds || [];
    if (ids.length < 2) errs.push({ field: 'bundle.productIds', message: 'A bundle needs at least two products' });
    // The engine no longer clamps this, so the floor is enforced here where
    // the merchant can actually see the message.
    if (body.bundle?.requireAll === false && (Number(body.bundle?.minItems) || 0) < 1) {
      errs.push({ field: 'bundle.minItems', message: 'Minimum items must be at least 1' });
    }
  }
  if (body.type === 'tiered' && !(body.tiers || []).length) {
    errs.push({ field: 'tiers', message: 'Add at least one spend tier' });
  }
  return errs;
}

/* List, with the real reason each promotion is or is not running. "Disabled"
   and "budget spent" look identical in a bare list and mean very different
   things to a merchant. */
router.get('/', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.enabled === 'true') where.enabled = true;
  if (req.query.enabled === 'false') where.enabled = false;

  const perPage = Math.min(100, parseInt(req.query.limit || '50', 10));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));

  const [rows, total] = await Promise.all([
    Promotion.find(where).sort({ priority: 1, createdAt: -1 }).skip((page - 1) * perPage).limit(perPage),
    Promotion.countDocuments(where),
  ]);

  const now = new Date();
  res.json({
    promotions: rows.map((p) => ({ ...p.toObject(), state: p.liveState(now) })),
    total, page, perPage, hasMore: page * perPage < total,
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const p = await Promotion.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  const uses = await PromotionUse.find({ promotion: p._id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ promotion: { ...p.toObject(), state: p.liveState() }, uses });
}));

router.post('/', asyncHandler(async (req, res) => {
  const errs = validate(req.body || {});
  if (errs.length) return res.status(400).json({ message: errs[0].message, errors: errs });

  // Every promotion is created OFF. A rule that goes live the instant it is
  // saved gives the merchant no chance to check it first.
  const p = await Promotion.create({
    ...req.body,
    enabled: false,
    usedCount: 0,
    totalDiscounted: 0,
    createdBy: req.user._id,
  });
  res.status(201).json({ promotion: { ...p.toObject(), state: p.liveState() } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const errs = validate({ ...req.body });
  if (errs.length) return res.status(400).json({ message: errs[0].message, errors: errs });

  const p = await Promotion.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });

  /* Counters are never accepted from the client — they are the record of what
     actually happened, not a field to edit. */
  const { usedCount, totalDiscounted, createdBy, _id, ...safe } = req.body || {};
  Object.assign(p, safe);
  await p.save();
  res.json({ promotion: { ...p.toObject(), state: p.liveState() } });
}));

router.patch('/:id/toggle', asyncHandler(async (req, res) => {
  const p = await Promotion.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  p.enabled = req.body?.enabled !== undefined ? !!req.body.enabled : !p.enabled;
  await p.save();
  res.json({ ok: true, enabled: p.enabled, state: p.liveState() });
}));

/* Bulk enable/disable — a seasonal sale is usually several promotions that
   must start and stop together. */
router.post('/bulk', asyncHandler(async (req, res) => {
  const ids = (req.body?.ids || []).filter((x) => /^[0-9a-fA-F]{24}$/.test(String(x)));
  const action = String(req.body?.action || '');
  if (!ids.length) return res.status(400).json({ message: 'Select at least one promotion' });

  let update = null;
  if (action === 'enable') update = { $set: { enabled: true } };
  else if (action === 'disable') update = { $set: { enabled: false } };
  else if (action === 'delete') {
    const r = await Promotion.deleteMany({ _id: { $in: ids } });
    return res.json({ ok: true, affected: r.deletedCount });
  } else if (action === 'schedule') {
    const { startsAt = null, endsAt = null } = req.body || {};
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return res.status(400).json({ message: 'The end date must be after the start date' });
    }
    update = { $set: { startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null } };
  } else {
    return res.status(400).json({ message: 'Unknown action' });
  }

  const r = await Promotion.updateMany({ _id: { $in: ids } }, update);
  res.json({ ok: true, affected: r.modifiedCount });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const p = await Promotion.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  // Usage rows are KEPT. They are the record of money already given away;
  // deleting the rule must not rewrite the accounts.
  res.json({ ok: true });
}));

/* ---------------------------------------------------------------------------
 * PREVIEW — what would this promotion do to a real basket?
 *
 * Writes nothing. A merchant should be able to see the arithmetic before a
 * customer does, including WHY a promotion was rejected.
 * ------------------------------------------------------------------------- */
router.post('/preview', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  if (!items.length) return res.status(400).json({ message: 'Add at least one product to preview' });

  const ids = items.map((i) => i.product).filter((x) => /^[0-9a-fA-F]{24}$/.test(String(x)));
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const it of items) {
    const p = byId.get(String(it.product));
    if (!p) continue;
    const qty = Math.max(1, Math.min(20, parseInt(it.quantity, 10) || 1));
    lines.push({
      key: `${p._id}:${it.size || ''}:${it.color || ''}`,
      productId: p._id, price: p.price, qty, product: p,
    });
  }
  if (!lines.length) return res.status(400).json({ message: 'None of those products were found' });

  /* An unsaved promotion can be previewed by passing it in the body, so the
     merchant can test a rule BEFORE committing it. */
  let promotions = null;
  if (req.body?.draft) {
    const draft = { ...req.body.draft, _id: req.body.draft._id || '000000000000000000000000', enabled: true };
    promotions = [draft];
  }

  const result = await E.evaluateCart({
    lines,
    ctx: {
      phone: req.body?.phone || '',
      city: req.body?.city || '',
      paymentMethod: req.body?.paymentMethod || '',
      orderCount: Number(req.body?.orderCount) || 0,
      loyaltyTier: req.body?.loyaltyTier || '',
      hasCoupon: !!req.body?.hasCoupon,
    },
    at: req.body?.at ? new Date(req.body.at) : new Date(),
    promotions,
    // Admin-only, writes nothing: let the merchant test rules before the
    // programme is switched on.
    force: true,
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  res.json({
    ...result,
    subtotal,
    payable: Math.max(0, subtotal - result.total),
    effectivePercent: subtotal ? Math.round((result.total / subtotal) * 100) : 0,
    lines: lines.map((l) => ({ name: l.product.name, price: l.price, qty: l.qty, key: l.key })),
  });
}));

/* ---------------------------------------------------------------------------
 * ANALYTICS — what did these rules actually cost, and what did they move?
 * ------------------------------------------------------------------------- */
router.get('/admin/stats', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '30', 10)));
  const since = new Date(Date.now() - days * 86400000);

  const [totals, byPromo, byDay, active] = await Promise.all([
    PromotionUse.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, uses: { $sum: 1 }, given: { $sum: '$amount' }, orders: { $addToSet: '$order' } } },
      { $addFields: { orders: { $size: '$orders' } } },
    ]),
    PromotionUse.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$promotion', name: { $last: '$promotionName' }, type: { $last: '$type' }, uses: { $sum: 1 }, given: { $sum: '$amount' } } },
      { $sort: { given: -1 } }, { $limit: 25 },
    ]),
    PromotionUse.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, uses: { $sum: 1 }, given: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    Promotion.countDocuments({ enabled: true }),
  ]);

  const t = totals[0] || {};
  res.json({
    days,
    uses: t.uses || 0,
    ordersAffected: t.orders || 0,
    totalGiven: t.given || 0,
    avgPerOrder: t.orders ? Math.round((t.given || 0) / t.orders) : 0,
    activePromotions: active,
    byPromotion: byPromo.map((x) => ({
      id: String(x._id), name: x.name, type: x.type, uses: x.uses, given: x.given,
    })),
    daily: byDay.map((x) => ({ date: x._id, uses: x.uses, given: x.given })),
  });
}));

router.get('/admin/export', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '90', 10)));
  const rows = await PromotionUse.find({ createdAt: { $gte: new Date(Date.now() - days * 86400000) } })
    .sort({ createdAt: -1 }).limit(20000).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = 'date,promotion,type,orderNumber,phone,amount';
  const body = rows.map((r) => [
    new Date(r.createdAt).toISOString(), r.promotionName, r.type, r.orderNumber, r.phone, r.amount,
  ].map(esc).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="promotions.csv"');
  res.send(`${head}\n${body}`);
}));

module.exports = router;
