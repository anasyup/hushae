const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const PageView = require('../models/PageView');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

const RANGES = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
const DAY = 24 * 60 * 60 * 1000;
const VALID = { Cancelled: 1, Refunded: 1 };

router.get('/overview', asyncHandler(async (req, res) => {
  const rangeKey = req.query.range === 'all' ? 'all' : (RANGES[req.query.range] ? req.query.range : '30d');
  const days = RANGES[rangeKey] || 0;
  const now = Date.now();
  const start = days ? new Date(now - days * DAY) : new Date(0);
  const prevStart = days ? new Date(now - 2 * days * DAY) : null;

  const matchRange = { status: { $nin: ['Cancelled', 'Refunded'] }, createdAt: { $gte: start } };
  const pvMatch = { createdAt: { $gte: start } };

  const [orders, prevAgg, sessSessions, sessSeries, sessDevice, cartSids, coSids, landing, refs, products, newRegisters, subscribers, locAgg] = await Promise.all([
    Order.find(matchRange).select('items total paymentMethod status customerInfo.phone customerInfo.email customerInfo.city createdAt').lean(),
    days ? Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] }, createdAt: { $gte: prevStart, $lt: start } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]) : Promise.resolve([]),
    PageView.distinct('sid', pvMatch),
    PageView.aggregate([
      { $match: pvMatch },
      { $group: { _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, sid: '$sid' } } },
      { $group: { _id: '$_id.d', sessions: { $sum: 1 } } },
    ]),
    PageView.aggregate([{ $match: pvMatch }, { $group: { _id: '$device', sids: { $addToSet: '$sid' } } }, { $project: { sessions: { $size: '$sids' } } }]),
    PageView.distinct('sid', { ...pvMatch, event: 'cart' }),
    PageView.distinct('sid', { ...pvMatch, event: 'checkout' }),
    PageView.aggregate([{ $match: { ...pvMatch, event: 'pageview' } }, { $group: { _id: '$path', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    PageView.aggregate([{ $match: { ...pvMatch, referrer: { $ne: '' } } }, { $group: { _id: '$referrer', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 8 }]),
    Product.find().select('slug categorySlug').lean(),
    User.countDocuments({ role: 'customer', ...(days ? { createdAt: { $gte: start } } : {}) }),
    Subscriber.countDocuments({}),
    PageView.aggregate([
      { $match: { ...pvMatch, city: { $ne: '' } } },
      { $group: { _id: '$city', sids: { $addToSet: '$sid' } } },
      { $project: { sessions: { $size: '$sids' } } },
      { $sort: { sessions: -1 } },
      { $limit: 8 },
    ]),
  ]);

  // ---- KPIs
  const revenue = orders.reduce((a, o) => a + o.total, 0);
  const itemsSold = orders.reduce((a, o) => a + o.items.reduce((x, i) => x + (i.quantity || 1), 0), 0);
  const aov = orders.length ? Math.round(revenue / orders.length) : 0;
  const prev = prevAgg[0] || { revenue: 0, orders: 0 };

  // ---- Daily series (sales + sessions on shared dates)
  const seriesMap = {};
  if (days) {
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY).toISOString().slice(0, 10);
      seriesMap[d] = { date: d, revenue: 0, orders: 0, sessions: 0 };
    }
  }
  for (const o of orders) {
    const d = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!seriesMap[d]) seriesMap[d] = { date: d, revenue: 0, orders: 0, sessions: 0 };
    seriesMap[d].revenue += o.total; seriesMap[d].orders += 1;
  }
  for (const s of sessSeries) {
    if (!seriesMap[s._id]) seriesMap[s._id] = { date: s._id, revenue: 0, orders: 0, sessions: 0 };
    seriesMap[s._id].sessions = s.sessions;
  }
  const series = Object.values(seriesMap).sort((a, b) => a.date.localeCompare(b.date));

  // ---- Breakdowns
  const slugCat = Object.fromEntries(products.map((p) => [p.slug, p.categorySlug]));
  const prodMap = {}, catMap = {}, statusMap = {}, payMap = {}, cityMap = {};
  const phoneCount = new Map();
  for (const o of orders) {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    payMap[o.paymentMethod] = (payMap[o.paymentMethod] || 0) + o.total;
    const city = o.customerInfo?.city || '—';
    cityMap[city] = (cityMap[city] || 0) + 1;
    const key = o.customerInfo?.phone || o.customerInfo?.email || '';
    if (key) phoneCount.set(key, (phoneCount.get(key) || 0) + 1);
    for (const it of o.items) {
      const p = prodMap[it.name] || (prodMap[it.name] = { name: it.name, qty: 0, revenue: 0 });
      p.qty += it.quantity || 1; p.revenue += it.lineTotal || 0;
      const cat = slugCat[it.slug] || 'other';
      catMap[cat] = (catMap[cat] || 0) + (it.lineTotal || 0);
    }
  }

  // New vs returning buyers (in range)
  const keys = [...phoneCount.keys()];
  let returning = 0;
  if (days && keys.length) {
    const earlierPhones = await Order.distinct('customerInfo.phone', { createdAt: { $lt: start }, 'customerInfo.phone': { $in: keys } });
    const earlierEmails = await Order.distinct('customerInfo.email', { createdAt: { $lt: start }, 'customerInfo.email': { $in: keys } });
    const earlier = new Set([...earlierPhones, ...earlierEmails].filter(Boolean));
    returning = keys.filter((k) => earlier.has(k)).length;
  } else {
    returning = keys.filter((k) => phoneCount.get(k) > 1).length;
  }

  const sessions = sessSessions.length;
  res.json({
    range: rangeKey,
    kpis: {
      revenue, orders: orders.length, aov, itemsSold,
      sessions, carts: cartSids.length, checkouts: coSids.length,
      conversion: sessions ? +((orders.length / sessions) * 100).toFixed(1) : 0,
      newRegisters, subscribers,
    },
    prev: days ? { revenue: prev.revenue, orders: prev.orders } : null,
    series,
    topProducts: Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    byCategory: Object.entries(catMap).map(([cat, v]) => ({ cat, revenue: v })).sort((a, b) => b.revenue - a.revenue),
    byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    byPayment: Object.entries(payMap).map(([method, v]) => ({ method, revenue: v })),
    orderCities: Object.entries(cityMap).map(([city, count]) => ({ city, orders: count })).sort((a, b) => b.orders - a.orders).slice(0, 8),
    customerSplit: { fresh: keys.length - returning, returning },
    traffic: {
      sessionsSeries: series.map((s) => ({ date: s.date, sessions: s.sessions })),
      byDevice: sessDevice.map((d) => ({ device: d._id, sessions: d.sessions })),
      landing: landing.map((l) => ({ path: l._id, views: l.n })),
      refs: refs.map((r) => ({ ref: r._id, views: r.n })),
      visitCities: locAgg.map((l) => ({ city: l._id, sessions: l.sessions })),
    },
  });
}));

/* ── INTELLIGENCE — the answers Overview doesn't give ──────────────────────
 * Product conversion, coupon ROI, recovery ROI, customer value and quality
 * radar. One endpoint, aggregated server-side; the page only presents. */
router.get('/intelligence', asyncHandler(async (req, res) => {
  const days = RANGES[req.query.range] && req.query.range !== 'all' ? RANGES[req.query.range] : 30;
  const start = new Date(Date.now() - days * 86400000);
  const Order = require('../models/Order');
  const Product = require('../models/Product');
  const ReturnCase = require('../models/ReturnCase');
  const AbandonedCart = require('../models/AbandonedCart');

  const [orders, viewAgg, carts, returns, prods] = await Promise.all([
    Order.find({ createdAt: { $gte: start } }).select('orderNumber customerInfo.name customerInfo.phone items total discount discountCode status').lean(),
    PageView.aggregate([
      { $match: { createdAt: { $gte: start }, path: { $regex: '^/product/' } } },
      { $group: { _id: '$path', views: { $sum: 1 } } },
    ]),
    AbandonedCart.find({ createdAt: { $gte: start } }).select('email phone recoveredOrderId').lean(),
    ReturnCase.find({ createdAt: { $gte: start } }).select('orderNumber items').lean(),
    Product.find({}).select('slug name').lean(),
  ]);

  const live = orders.filter((o) => !['Cancelled', 'Refunded'].includes(o.status));
  const slugOf = {}; const nameOf = {};
  prods.forEach((p) => { slugOf[p.slug] = p.name; nameOf[p.slug] = p.name; });

  /* product intel: views vs orders vs returns */
  const bySlug = {};
  viewAgg.forEach((v) => { bySlug[v._id.replace('/product/', '')] = { views: v.views, orders: 0, qty: 0, revenue: 0, returns: 0 }; });
  const retByProduct = {};
  returns.forEach((r) => (r.items || []).forEach((it) => {
    const slug = it.slug || String(it.product);
    retByProduct[slug] = (retByProduct[slug] || 0) + 1;
  }));
  live.forEach((o) => (o.items || []).forEach((it) => {
    const slug = it.slug || String(it.product);
    const e = bySlug[slug] || (bySlug[slug] = { views: 0, orders: 0, qty: 0, revenue: 0, returns: 0 });
    e.orders += 1; e.qty += it.quantity || 0; e.revenue += (it.price || 0) * (it.quantity || 0);
  }));
  Object.keys(retByProduct).forEach((slug) => {
    const e = bySlug[slug] || (bySlug[slug] = { views: 0, orders: 0, qty: 0, revenue: 0, returns: 0 });
    e.returns = retByProduct[slug];
  });
  const productIntel = Object.entries(bySlug)
    .map(([slug, e]) => ({
      name: nameOf[slug] || slug, slug,
      views: e.views, orders: e.orders, revenue: e.revenue, returns: e.returns,
      conv: e.views ? +((e.orders / e.views) * 100).toFixed(1) : null,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);

  /* coupon ROI */
  const couponMap = {};
  live.forEach((o) => {
    const code = String(o.discountCode || '').trim();
    if (!code) return;
    const c = couponMap[code] || (couponMap[code] = { code, uses: 0, revenue: 0, cost: 0 });
    c.uses += 1; c.revenue += o.total || 0; c.cost += o.discount || 0;
  });
  const coupons = Object.values(couponMap).sort((a, b) => b.uses - a.uses).slice(0, 8);

  /* customer value */
  const custMap = {};
  live.forEach((o) => {
    const key = String(o.customerInfo?.phone || o.customerInfo?.email || '').replace(/\D/g, '').slice(-10) || o.orderNumber;
    const c = custMap[key] || (custMap[key] = { name: o.customerInfo?.name || 'Guest', orders: 0, revenue: 0 });
    c.orders += 1; c.revenue += o.total || 0;
  });
  const customers = Object.values(custMap);
  const repeat = customers.filter((c) => c.orders > 1).length;
  const topCustomers = customers.sort((a, b) => b.revenue - a.revenue).slice(0, 8);

  /* recovery ROI */
  const recoveredIds = carts.map((c) => c.recoveredOrderId).filter(Boolean);
  const recOrders = recoveredIds.length
    ? await Order.find({ _id: { $in: recoveredIds } }).select('total').lean()
    : [];
  const recovery = {
    captured: carts.length,
    recovered: recoveredIds.length,
    revenue: recOrders.reduce((a, o) => a + (o.total || 0), 0),
    rate: carts.length ? +((recoveredIds.length / carts.length) * 100).toFixed(1) : 0,
  };

  /* quality radar */
  const quality = Object.entries(retByProduct)
    .map(([slug, n]) => ({ name: nameOf[slug] || slug, returns: n }))
    .sort((a, b) => b.returns - a.returns)
    .slice(0, 6);

  res.json({
    productIntel, coupons, topCustomers, recovery, quality,
    repeatRate: customers.length ? +((repeat / customers.length) * 100).toFixed(1) : 0,
    totalCustomers: customers.length,
  });
}));

/* ── ADVANCED INTELLIGENCE — the $399-plan features, free ──────────────────
 * cohorts, at-risk customers, variant performance and a custom report
 * builder (dimension x metric), all from existing data. */
router.get('/advanced', asyncHandler(async (req, res) => {
  const Order = require('../models/Order');
  const { dim = 'category', metric = 'revenue' } = req.query;
  const rangeKey = RANGES[req.query.range] ? req.query.range : '30d';
  const days = RANGES[rangeKey] || 30;
  const start = new Date(Date.now() - days * 86400000);
  const orders = await Order.find({ createdAt: { $gte: start }, status: { $nin: ['Cancelled', 'Refunded'] } })
    .select('customerInfo.phone customerInfo.name customerInfo.city items total paymentMethod discountCode createdAt').lean();

  /* cohorts: first-purchase month x repeat in following months (0..5) */
  const all = await Order.find({ status: { $nin: ['Cancelled', 'Refunded'] } })
    .select('customerInfo.phone createdAt').lean();
  const byCust = {};
  all.forEach((o) => {
    const k = String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10) || o.customerInfo?.email || o._id;
    (byCust[k] = byCust[k] || []).push(new Date(o.createdAt));
  });
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const cohortMap = {};
  Object.values(byCust).forEach((dates) => {
    dates.sort((a, b) => a - b);
    const first = dates[0];
    const ck = monthKey(first);
    const c = cohortMap[ck] || (cohortMap[ck] = { cohort: ck, customers: 0, m: [0, 0, 0, 0, 0, 0] });
    c.customers += 1;
    dates.slice(1).forEach((d) => {
      const diff = (d.getFullYear() - first.getFullYear()) * 12 + (d.getMonth() - first.getMonth());
      if (diff >= 1 && diff <= 6) c.m[diff - 1] += 1;
    });
  });
  const cohorts = Object.values(cohortMap).sort((a, b) => (a.cohort < b.cohort ? 1 : -1)).slice(0, 6)
    .map((c) => ({ ...c, rates: c.m.map((n) => (c.customers ? +((n / c.customers) * 100).toFixed(0) : 0)) }));

  /* at-risk: repeat buyers silent 60+ days */
  const now = Date.now();
  const atRisk = Object.entries(byCust)
    .map(([k, dates]) => ({ k, n: dates.length, last: Math.max(...dates.map((d) => +d)) }))
    .filter((c) => c.n >= 2 && now - c.last > 60 * 86400000)
    .sort((a, b) => a.last - b.last)
    .slice(0, 10)
    .map((c) => {
      const o = all.find((o) => (String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10) === c.k));
      return { name: o?.customerInfo?.name || 'Customer', phone: o?.customerInfo?.phone || '', orders: c.n, days: Math.round((now - c.last) / 86400000) };
    });

  /* variant performance */
  const varMap = {};
  orders.forEach((o) => (o.items || []).forEach((it) => {
    const key = `${it.name || it.product} · ${it.size || '—'}${it.color ? ' / ' + it.color : ''}`;
    const v = varMap[key] || (varMap[key] = { variant: key, qty: 0, revenue: 0 });
    v.qty += it.quantity || 0; v.revenue += (it.price || 0) * (it.quantity || 0);
  }));
  const variants = Object.values(varMap).sort((a, b) => b.qty - a.qty).slice(0, 12);

  /* custom report: dimension x metric */
  const cust = {};
  const push = (key, o) => {
    if (!key) return;
    const c = cust[key] || (cust[key] = { name: key, revenue: 0, orders: 0 });
    c.orders += 1; c.revenue += o.total || 0;
  };
  orders.forEach((o) => {
    if (dim === 'product') (o.items || []).forEach((it) => push(it.name || String(it.product), { total: (it.price || 0) * (it.quantity || 0) }));
    else if (dim === 'category') push((it => it && it.categorySlug)(o.items?.[0]) || o.items?.[0]?.slug?.split('-')[0] || 'Uncategorised', o);
    else if (dim === 'city') push(o.customerInfo?.city || 'Unknown', o);
    else if (dim === 'payment') push(o.paymentMethod || 'Unknown', o);
    else if (dim === 'coupon') push(o.discountCode || '(none)', o);
    else push('All', o);
  });
  let custom = Object.values(cust).sort((a, b) => (metric === 'orders' ? b.orders - a.orders : b.revenue - a.revenue)).slice(0, 12);

  res.json({ cohorts, atRisk, variants, custom, dim, metric });
}));

/* ── WEEKLY DIGEST — lazy cron: fires when the owner opens Overview after 7d ── */
router.post('/weekly-digest', protect, adminOnly, asyncHandler(async (req, res) => {
  const Settings = require('../models/Settings');
  const s = await Settings.findOne({ key: 'store' });
  const last = s?.digestLastSent ? new Date(s.digestLastSent) : null;
  if (last && Date.now() - last < 6 * 86400000) return res.json({ sent: false, reason: 'too soon' });
  const Order = require('../models/Order');
  const PageView = require('../models/PageView') || PageView;
  const start = new Date(Date.now() - 7 * 86400000);
  const [orders, sessions, carts] = await Promise.all([
    Order.find({ createdAt: { $gte: start }, status: { $nin: ['Cancelled', 'Refunded'] } }).select('total items customerInfo.phone').lean(),
    PageView.distinct('sid', { createdAt: { $gte: start } }),
    require('../models/AbandonedCart').find({ createdAt: { $gte: start }, recoveredOrderId: { $ne: null } }).countDocuments(),
  ]);
  const revenue = orders.reduce((a, o) => a + (o.total || 0), 0);
  const top = {};
  orders.forEach((o) => (o.items || []).forEach((it) => { top[it.name] = (top[it.name] || 0) + (it.quantity || 0); }));
  const topProduct = Object.entries(top).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const newCust = new Set(orders.map((o) => String(o.customerInfo?.phone || '').slice(-10))).size;
  const mailer = require('../utils/mailer');
  const result = await mailer.sendWeeklyDigest({
    revenue: `Rs ${Math.round(revenue).toLocaleString()}`,
    orders: String(orders.length),
    sessions: String(sessions.length),
    conversion: sessions.length ? `${((orders.length / sessions.length) * 100).toFixed(1)}%` : '0%',
    newCustomers: String(newCust),
    recovered: String(carts),
    pendingCalls: 'see COD Command',
    topProduct,
  }, s || {});
  if (s) { s.digestLastSent = new Date(); await s.save(); }
  res.json({ sent: !!result?.ok !== false, result });
}));

module.exports = router;
