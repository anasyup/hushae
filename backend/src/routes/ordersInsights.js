const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const OrderIssue = require('../models/OrderIssue');
const SavedFilter = require('../models/SavedFilter');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { scoreOrder, enrichItems, pickRoute } = require('../utils/orderQuality');

const router = express.Router();

/* ============================================================================
 * Insight endpoints for the order desk — mounted at /api/orders/insights
 *
 * Everything here is read-mostly and derived from existing collections, so no
 * migration is needed and the numbers can never drift from the orders table.
 * ========================================================================== */

const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));

/* ── DASHBOARD ────────────────────────────────────────────────────────────
 * One call powers every card on the dashboard strip. Deliberately a single
 * find() plus in-memory aggregation: with a store this size that is far
 * cheaper than six round trips, and it keeps the maths in one readable place.
 * ------------------------------------------------------------------------ */
router.get('/dashboard', protect, adminOnly, asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '30', 10)));
  const since = new Date(Date.now() - days * 86400000);
  const s = await Settings.findOne({ key: 'store' }).lean().catch(() => null);
  const excl = s?.includeTestOrders ? {} : { isTestOrder: { $ne: true } };
  // from/to (inclusive) override `days` when both are present (date-range picker).
  const from = req.query.from ? new Date(req.query.from) : since;
  const toQ = req.query.to ? new Date(req.query.to) : new Date();
  toQ.setHours(23, 59, 59, 999);
  const range = { createdAt: { $gte: from, $lte: toQ }, ...excl };
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const monthAgo = new Date(Date.now() - 30 * 86400000);

  const orders = await Order.find(range)
    .select('total createdAt status stage paymentMethod paymentState paymentStatus stageTimestamps customerService customerInfo items verifiedByCall stageUpdatedAt updatedAt')
    .lean();

  const live = orders.filter((o) => !['Cancelled', 'Refunded'].includes(o.status));
  const sum = (rows) => rows.reduce((a, o) => a + (o.total || 0), 0);
  const after = (d) => live.filter((o) => new Date(o.createdAt) >= d);

  // Pipeline — the visual New → … → Delivered strip
  const flow = require('../utils/orderFlow');
  const pipeline = ['new', 'processing', 'to-ship', 'shipped', 'delivered', 'issues']
    .map((group) => ({
      group,
      count: orders.filter((o) => flow.groupFor(o.stage || flow.stageFromLegacy(o)) === group).length,
      value: sum(orders.filter((o) => flow.groupFor(o.stage || flow.stageFromLegacy(o)) === group)),
    }));

  // Top products by units ordered
  const productUnits = new Map();
  for (const o of live) {
    for (const it of o.items || []) {
      const k = it.name || 'Unknown';
      const cur = productUnits.get(k) || { name: k, units: 0, revenue: 0, image: it.image };
      cur.units += it.quantity || 0;
      cur.revenue += it.lineTotal || 0;
      productUnits.set(k, cur);
    }
  }
  const topProducts = [...productUnits.values()].sort((a, b) => b.units - a.units).slice(0, 5);

  // Top cities
  const cityMap = new Map();
  for (const o of live) {
    const c = o.customerInfo?.city || 'Unknown';
    const cur = cityMap.get(c) || { city: c, orders: 0, revenue: 0 };
    cur.orders += 1; cur.revenue += o.total || 0;
    cityMap.set(c, cur);
  }
  const topCities = [...cityMap.values()].sort((a, b) => b.orders - a.orders).slice(0, 6);

  // Average dwell time per stage, from the recorded stage timestamps
  const dwell = {};
  const ORDER_OF = flow.FORWARD;
  for (const o of orders) {
    const ts = o.stageTimestamps || {};
    const reached = ORDER_OF.filter((s) => ts[s]).sort((a, b) => new Date(ts[a]) - new Date(ts[b]));
    for (let i = 0; i < reached.length - 1; i += 1) {
      const hrs = (new Date(ts[reached[i + 1]]) - new Date(ts[reached[i]])) / 3600000;
      if (hrs < 0 || hrs > 24 * 60) continue;              // ignore clock skew
      (dwell[reached[i]] = dwell[reached[i]] || []).push(hrs);
    }
  }
  const stageSpeed = Object.entries(dwell).map(([stage, list]) => ({
    stage,
    avgHours: Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10,
    samples: list.length,
  }));

  // Quality mix — how healthy is the current book of work
  const scores = orders.map((o) => scoreOrder(o).score);
  const qualityMix = [1, 2, 3, 4, 5].map((n) => ({ score: n, count: scores.filter((s) => s === n).length }));

  // Payment states, counted the same way the desk filters them so the card and
  // the tab strip can never disagree.
  const paymentBreakdown = orders.reduce((acc, o) => {
    const st = o.paymentState || (o.paymentStatus === 'Paid' ? 'Confirmed' : 'Pending');
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  // Top customers by lifetime spend, keyed on the phone tail like Customer 360.
  const custMap = new Map();
  for (const o of live) {
    const key = String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10);
    if (!key) continue;
    const cur = custMap.get(key) || {
      phone: o.customerInfo.phone, name: o.customerInfo?.name || 'Customer',
      orders: 0, spent: 0, lastAt: o.createdAt,
    };
    cur.orders += 1;
    cur.spent += o.total || 0;
    if (new Date(o.createdAt) > new Date(cur.lastAt)) cur.lastAt = o.createdAt;
    custMap.set(key, cur);
  }
  const topCustomers = [...custMap.values()].sort((a, b) => b.spent - a.spent).slice(0, 6);

  const verified = orders.filter((o) => ['Verified', 'Confirmed'].includes(o.paymentState) || o.paymentStatus === 'Paid').length;
  const cancelled = orders.filter((o) => ['Cancelled', 'Refunded'].includes(o.status)).length;
  const withIssue = orders.filter((o) => o.customerService?.hasIssue).length;

  // Daily + hourly series
  const daily = {};
  for (const o of live) {
    const k = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!daily[k]) daily[k] = { date: k, orders: 0, revenue: 0 };
    daily[k].orders += 1; daily[k].revenue += o.total || 0;
  }
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
  for (const o of live) hourly[new Date(o.createdAt).getHours()].orders += 1;

  const byMethod = live.reduce((acc, o) => {
    acc[o.paymentMethod] = (acc[o.paymentMethod] || 0) + 1;
    return acc;
  }, {});

  const shipped = orders.filter((o) => o.stageTimestamps?.Shipped);
  const avgShipHours = shipped.length
    ? Math.round((shipped.reduce((a, o) =>
      a + (new Date(o.stageTimestamps.Shipped) - new Date(o.createdAt)) / 3600000, 0) / shipped.length) * 10) / 10
    : 0;

  res.json({
    generatedAt: new Date().toISOString(),
    paymentBreakdown,
    topCustomers,
    avgShipHours,
    kpis: {
      today: { orders: after(startOfDay).length, revenue: sum(after(startOfDay)) },
      week: { orders: after(weekAgo).length, revenue: sum(after(weekAgo)) },
      month: { orders: after(monthAgo).length, revenue: sum(after(monthAgo)) },
      aov: live.length ? Math.round(sum(live) / live.length) : 0,
      totalOrders: orders.length,
      totalRevenue: sum(live),
      paymentVerifiedRate: orders.length ? Math.round((verified / orders.length) * 100) : 0,
      cancelRate: orders.length ? Math.round((cancelled / orders.length) * 100) : 0,
      issueRate: orders.length ? Math.round((withIssue / orders.length) * 100) : 0,
    },
    pipeline, topProducts, topCities, stageSpeed, qualityMix, byMethod,
    daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
    hourly,
    days,
  });
}));

/* ── CUSTOMER 360 ─────────────────────────────────────────────────────────
 * Keyed on the last ten digits of the phone number, which is how the same
 * shopper is recognised across guest checkouts and different formats.
 * ------------------------------------------------------------------------ */
router.get('/customer/:phone', protect, adminOnly, asyncHandler(async (req, res) => {
  const key = phoneKey(req.params.phone);
  if (key.length < 7) return res.status(400).json({ message: 'Phone number too short' });

  // Anchor the regex to the end so 0300… and +92300… both match.
  const rx = new RegExp(`${key}$`);
  const orders = await Order.find({ 'customerInfo.phone': rx }).sort({ createdAt: -1 }).lean();
  if (!orders.length) return res.status(404).json({ message: 'No orders for this customer' });

  const latest = orders[0];
  const live = orders.filter((o) => !['Cancelled', 'Refunded'].includes(o.status));
  const spent = live.reduce((a, o) => a + (o.total || 0), 0);

  const addresses = [...new Map(orders.map((o) => {
    const c = o.customerInfo || {};
    const line = [c.address, c.city].filter(Boolean).join(', ');
    return [line, { line, city: c.city, province: c.province, postalCode: c.postalCode, usedAt: o.createdAt }];
  })).values()];

  const methodCount = orders.reduce((a, o) => { a[o.paymentMethod] = (a[o.paymentMethod] || 0) + 1; return a; }, {});
  const preferredMethod = Object.entries(methodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const issues = await OrderIssue.find({ order: { $in: orders.map((o) => o._id) } })
    .sort({ createdAt: -1 }).lean();

  // Favourite products across their history
  const prod = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const cur = prod.get(it.name) || { name: it.name, units: 0, image: it.image };
      cur.units += it.quantity || 0;
      prod.set(it.name, cur);
    }
  }

  res.json({
    customer: {
      name: latest.customerInfo?.name || '',
      phone: latest.customerInfo?.phone || '',
      email: latest.customerInfo?.email || '',
      city: latest.customerInfo?.city || '',
      totalOrders: orders.length,
      completedOrders: live.length,
      totalSpent: spent,
      averageOrder: live.length ? Math.round(spent / live.length) : 0,
      firstOrderAt: orders[orders.length - 1].createdAt,
      lastOrderAt: latest.createdAt,
      isRepeat: orders.length >= 3,
      preferredMethod,
      cancelled: orders.filter((o) => o.status === 'Cancelled').length,
      openIssues: issues.filter((i) => ['Open', 'In Progress'].includes(i.status)).length,
    },
    addresses,
    favourites: [...prod.values()].sort((a, b) => b.units - a.units).slice(0, 5),
    orders: orders.map((o) => ({
      _id: o._id, orderNumber: o.orderNumber, createdAt: o.createdAt,
      status: o.status, stage: o.stage, total: o.total,
      paymentMethod: o.paymentMethod, paymentState: o.paymentState,
      itemCount: (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0),
    })),
    issues,
    notes: orders.flatMap((o) => (o.internalNotes || []).map((n) => ({ ...n, orderNumber: o.orderNumber }))),
  });
}));

/* ── WAREHOUSE VIEW FOR ONE ORDER ─────────────────────────────────────────── */
router.get('/warehouse/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid order id' });
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const ids = (order.items || []).map((i) => i.product).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids } }).select('sku stock categorySlug').lean();
  const stockMap = new Map(products.map((p) => [String(p._id), p]));

  const items = enrichItems(order, stockMap);
  res.json({ items, route: pickRoute(items), quality: scoreOrder(order) });
}));

/* ── SAVED FILTER VIEWS ───────────────────────────────────────────────────── */
router.get('/filters', protect, adminOnly, asyncHandler(async (req, res) => {
  const views = await SavedFilter.find({
    $or: [{ shared: true }, { owner: req.user._id }],
  }).sort({ useCount: -1, updatedAt: -1 }).limit(50).lean();
  res.json({ views });
}));

router.post('/filters', protect, adminOnly, asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const query = String(req.body?.query || '').trim();
  if (!name) return res.status(400).json({ message: 'Give the view a name' });
  if (!query) return res.status(400).json({ message: 'Nothing to save — set some filters first' });
  if (await SavedFilter.countDocuments({}) >= 100) {
    return res.status(400).json({ message: 'Saved-view limit reached — delete one first' });
  }
  const view = await SavedFilter.create({
    name: name.slice(0, 60), query: query.slice(0, 1200),
    icon: String(req.body?.icon || '').slice(0, 40),
    shared: req.body?.shared !== false,
    owner: req.user._id, ownerName: req.user.name || req.user.email || '',
  });
  res.json({ view });
}));

router.patch('/filters/:id/used', protect, adminOnly, asyncHandler(async (req, res) => {
  await SavedFilter.findByIdAndUpdate(req.params.id, { $inc: { useCount: 1 }, $set: { lastUsedAt: new Date() } });
  res.json({ ok: true });
}));

router.delete('/filters/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await SavedFilter.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ── SEARCH SUGGESTIONS ───────────────────────────────────────────────────── */
router.get('/suggest', protect, adminOnly, asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ suggestions: [] });
  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const rows = await Order.find({
    $or: [{ orderNumber: rx }, { 'customerInfo.name': rx }, { 'customerInfo.phone': rx }, { 'customerInfo.city': rx }],
  }).select('orderNumber customerInfo.name customerInfo.phone customerInfo.city').limit(40).lean();

  const seen = new Set();
  const suggestions = [];
  const push = (type, value, hint) => {
    const k = `${type}:${value}`;
    if (!value || seen.has(k)) return;
    seen.add(k);
    suggestions.push({ type, value, hint });
  };

  for (const o of rows) {
    if (rx.test(o.orderNumber)) push('order', o.orderNumber, 'Order');
    if (rx.test(o.customerInfo?.name || '')) push('customer', o.customerInfo.name, o.customerInfo.phone);
    if (rx.test(o.customerInfo?.phone || '')) push('phone', o.customerInfo.phone, o.customerInfo.name);
    if (rx.test(o.customerInfo?.city || '')) push('city', o.customerInfo.city, 'City');
  }

  res.json({ suggestions: suggestions.slice(0, 8) });
}));

module.exports = router;
