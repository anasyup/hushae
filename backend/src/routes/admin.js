const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, growthPct } = require('../utils/helpers');
const { reliabilityMap } = require('../utils/customerReliability');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/dashboard', asyncHandler(async (req, res) => {
  /* Date scope — from/to (inclusive, YYYY-MM-DD). Default: last 30 days.
     `prev` is the equal-length window immediately before `from`, so the KPI
     growth % is honest for ANY selected range. */
  const s = await Settings.findOne({ key: 'store' }).lean().catch(() => null);
  const inclTest = !!s?.includeTestOrders;
  const excl = inclTest ? {} : { isTestOrder: { $ne: true } };

  const now = new Date();
  const parse = (d, fallback) => { const t = new Date(d); return Number.isNaN(t.getTime()) ? fallback : t; };
  const to = parse(req.query.to, now);
  to.setHours(23, 59, 59, 999);
  const defFrom = new Date(now); defFrom.setDate(now.getDate() - 30); defFrom.setHours(0, 0, 0, 0);
  const from = parse(req.query.from, defFrom);
  from.setHours(0, 0, 0, 0);
  const spanDays = Math.max(1, Math.round((to - from) / 86400000));
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - spanDays * 86400000);
  const range = { createdAt: { $gte: from, $lte: to }, ...excl };
  const prevRange = { createdAt: { $gte: prevFrom, $lte: prevTo }, ...excl };
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  /* Chart bucketing — daily for ≤ 62 days, weekly beyond (a 365-day daily
     chart is unreadable). */
  const weekly = spanDays > 62;
  const bucketFmt = weekly ? '%Y-%V' : '%Y-%m-%d';
  const bucketMs = weekly ? 7 * 86400000 : 86400000;

  const [
    statusAgg, revenueAgg, totalProducts, lowStock, totalCustomers, recentOrders, bestAgg,
    currentWindow, previousWindow, dailySeries, todayHourly, topCustomers, newCustomersRange,
    cancelAgg,
  ] = await Promise.all([
    Order.aggregate([{ $match: range }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { ...range, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Product.countDocuments({ isActive: true, status: { $ne: 'draft' } }),
    Product.find({ isActive: true, status: { $ne: 'draft' }, stock: { $lte: 10 } }).sort({ stock: 1 }).limit(10)
      .select('name slug sku stock tier images costPrice reorderStatus'),
    User.countDocuments({ role: 'customer', createdAt: { $gte: from, $lte: to } }),
    Order.find(range).sort({ createdAt: -1 }).limit(6)
      .select('orderNumber customerInfo.name customerInfo.city customerInfo.phone total status paymentMethod paymentStatus createdAt items.image items.quantity isTestOrder'),
    Order.aggregate([
      { $match: { ...range, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' }, image: { $first: '$items.image' } } },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),
    Order.aggregate([
      { $match: { ...range, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: {
        _id: '$_id',
        total: { $first: '$total' },
        productRev: { $sum: '$items.lineTotal' },
        productCost: { $sum: { $multiply: [{ $ifNull: ['$items.costPrice', 0] }, '$items.quantity'] } },
      } },
      { $group: {
        _id: null,
        revenue: { $sum: '$total' },
        productRev: { $sum: '$productRev' },
        cost: { $sum: '$productCost' },
        orders: { $sum: 1 },
      } },
    ]),
    Order.aggregate([
      { $match: { ...prevRange, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: {
        _id: '$_id',
        total: { $first: '$total' },
        productCost: { $sum: { $multiply: [{ $ifNull: ['$items.costPrice', 0] }, '$items.quantity'] } },
      } },
      { $group: {
        _id: null,
        revenue: { $sum: '$total' },
        cost: { $sum: '$productCost' },
        orders: { $sum: 1 },
      } },
    ]),
    Order.aggregate([
      { $match: range },
      { $group: {
        _id: { $dateToString: { format: bucketFmt, date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Refunded']] }, 0, '$total'] } },
      } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart }, ...excl } },
      { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.find(range).select('customerInfo.phone customerInfo.name customerInfo.city total status createdAt customerService').lean(),
    User.countDocuments({ role: 'customer', createdAt: { $gte: from, $lte: to } }),
    Order.aggregate([
      { $match: { ...range, status: { $in: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: { $ifNull: ['$cancelReason', 'Not specified'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const byStatus = Object.fromEntries(statusAgg.map((x) => [x._id, x.count]));
  const totalOrders = statusAgg.reduce((n, x) => n + x.count, 0);
  const cur = currentWindow[0] || { revenue: 0, cost: 0, orders: 0 };
  const prev = previousWindow[0] || { revenue: 0, cost: 0, orders: 0 };
  const curProfit = (cur.revenue || 0) - (cur.cost || 0);
  const prevProfit = (prev.revenue || 0) - (prev.cost || 0);

  // growthPct returns null when the previous window is zero — the KPI cards
  // show "New" / nothing instead of a fake 100%.
  const pctChange = (a, b) => growthPct(a, b);

  /* Chart series — fill gaps in the bucket sequence so the line never jumps.
     ISO-8601 week key (Monday-based) computed in UTC so it matches MongoDB's
     $dateToString('%Y-%V') exactly. */
  const isoWeekKey = (d) => {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7;                 // Mon=1 … Sun=7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);      // move to Thursday of this week
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
  };
  const buckets = [];
  for (let t = from.getTime(); t <= to.getTime(); t += bucketMs) {
    const d = new Date(t);
    const key = weekly ? isoWeekKey(d) : d.toISOString().slice(0, 10);
    const last = buckets[buckets.length - 1];
    if (last && last.key === key) continue;
    buckets.push({ key, label: weekly ? `Wk ${key.slice(5)}` : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) });
  }
  const dayMap = Object.fromEntries(dailySeries.map((d) => [d._id, d]));
  const chart = buckets.map((b) => ({ date: b.key, label: b.label, orders: dayMap[b.key]?.orders || 0, revenue: dayMap[b.key]?.revenue || 0 }));

  // Fill 24 hours today
  const hourMap = Object.fromEntries(todayHourly.map((h) => [h._id, h.orders]));
  const hourly = [];
  for (let h = 0; h < 24; h += 1) hourly.push({ hour: h, orders: hourMap[h] || 0 });

  // Top customers with reliability badges (server-side, keyed by phone)
  const rel = reliabilityMap(topCustomers);
  const custMap = new Map();
  for (const o of topCustomers) {
    const key = String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10);
    if (!key) continue;
    const curE = custMap.get(key) || { name: o.customerInfo?.name || 'Customer', phone: key, city: o.customerInfo?.city || '', orders: 0, spent: 0 };
    curE.orders += 1;
    curE.spent += o.total || 0;
    custMap.set(key, curE);
  }
  const topCust = [...custMap.values()].sort((a, b) => b.spent - a.spent).slice(0, 6)
    .map((c) => ({ ...c, reliability: rel.get(c.phone) || null }));

  const cancelReasons = cancelAgg.map((c) => ({ reason: c._id, count: c.count }));

  res.json({
    scope: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), days: spanDays, weekly },
    stats: {
      totalOrders,
      pending: byStatus['Pending'] || 0,
      confirmed: byStatus['Confirmed'] || 0,
      processing: byStatus['Processing'] || 0,
      readyToShip: byStatus['Ready to Ship'] || 0,
      shipped: (byStatus['Shipped'] || 0) + (byStatus['Out for Delivery'] || 0),
      delivered: byStatus['Delivered'] || 0,
      cancelled: (byStatus['Cancelled'] || 0) + (byStatus['Refunded'] || 0),
      revenue: revenueAgg[0]?.total || 0,
      totalProducts,
      lowStockCount: lowStock.length,
      totalCustomers,
    },
    kpis: {
      revenue:      { value: cur.revenue,   prev: prev.revenue,   change: pctChange(cur.revenue, prev.revenue) },
      orders:       { value: cur.orders,    prev: prev.orders,    change: pctChange(cur.orders, prev.orders) },
      customers:    { value: newCustomersRange, prev: 0,          change: null },
      aov:          { value: cur.orders ? Math.round(cur.revenue / cur.orders) : 0,
                      prev:  prev.orders ? Math.round(prev.revenue / prev.orders) : 0,
                      change: pctChange(
                        cur.orders ? cur.revenue / cur.orders : 0,
                        prev.orders ? prev.revenue / prev.orders : 0
                      ) },
      profit:       { value: curProfit,     prev: prevProfit,     change: pctChange(curProfit, prevProfit) },
      cost:         { value: cur.cost || 0, prev: prev.cost || 0, change: pctChange(cur.cost, prev.cost) },
      margin:       { value: cur.revenue > 0 ? Math.round((curProfit / cur.revenue) * 1000) / 10 : 0,
                      prev:  prev.revenue > 0 ? Math.round((prevProfit / prev.revenue) * 1000) / 10 : 0,
                      change: null },
    },
    chart,       // buckets [{ date, label, orders, revenue }]
    hourly,      // 24 hours today
    byStatus,    // donut / status breakdown
    lowStock,
    recentOrders,
    bestSellers: bestAgg.map((b) => ({ name: b._id, qty: b.qty, revenue: b.revenue, image: b.image })),
    topCustomers: topCust,
    cancellationReasons: cancelReasons,
    includeTestOrders: inclTest,
  });
}));

router.get('/insights', asyncHandler(async (req, res) => {
  const days = Math.min(180, Math.max(7, parseInt(req.query.days || '90', 10)));
  const since = new Date(Date.now() - days * 86400000);

  const [hourAgg, cityAgg, profitByProduct, repeatAgg, cohortAgg] = await Promise.all([
    // Best selling hours (last N days, all orders including cancelled to see traffic patterns)
    Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Refunded']] }, 0, '$total'] } } } },
      { $sort: { _id: 1 } },
    ]),
    // Top cities by revenue
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: '$customerInfo.city', orders: { $sum: 1 }, revenue: { $sum: '$total' }, province: { $first: '$customerInfo.province' } } },
      { $sort: { revenue: -1 } },
      { $limit: 12 },
    ]),
    // Profit ranking by product (revenue - cost) — top 10
    Order.aggregate([
      { $match: { createdAt: { $gte: since }, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        image: { $first: '$items.image' },
        unitsSold: { $sum: '$items.quantity' },
        revenue: { $sum: '$items.lineTotal' },
        cost: { $sum: { $multiply: [{ $ifNull: ['$items.costPrice', 0] }, '$items.quantity'] } },
      } },
      { $addFields: { profit: { $subtract: ['$revenue', '$cost'] } } },
      { $sort: { profit: -1 } },
      { $limit: 10 },
    ]),
    // Repeat purchase rate — customers with 2+ orders / total customers with orders
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: '$customerInfo.phone', count: { $sum: 1 } } },
      { $group: { _id: null,
        total: { $sum: 1 },
        repeat: { $sum: { $cond: [{ $gte: ['$count', 2] }, 1, 0] } },
      } },
    ]),
    // Simple cohort — customers grouped by their FIRST order month + their total orders
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $sort: { createdAt: 1 } },
      { $group: {
        _id: '$customerInfo.phone',
        firstOrder: { $first: '$createdAt' },
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: '$total' },
      } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$firstOrder' } },
        newCustomers: { $sum: 1 },
        repeatCustomers: { $sum: { $cond: [{ $gte: ['$totalOrders', 2] }, 1, 0] } },
        totalSpent: { $sum: '$totalSpent' },
      } },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
  ]);

  // Fill 24-hour array (may have gaps)
  const hourMap = Object.fromEntries(hourAgg.map((h) => [h._id, h]));
  const hourly = [];
  for (let h = 0; h < 24; h += 1) hourly.push({ hour: h, orders: hourMap[h]?.orders || 0, revenue: hourMap[h]?.revenue || 0 });

  const rep = repeatAgg[0] || { total: 0, repeat: 0 };

  res.json({
    days,
    hourly,
    topCities: cityAgg,
    topProfit: profitByProduct,
    repeat: {
      total: rep.total,
      repeat: rep.repeat,
      rate: rep.total ? Math.round((rep.repeat / rep.total) * 1000) / 10 : 0,
    },
    cohort: cohortAgg,
  });
}));

// Customers list with order counts
router.get('/customers', asyncHandler(async (req, res) => {
  const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(500)
    .select('name email phone createdAt isActive tags');
  const orderCounts = await Order.aggregate([
    { $match: { customer: { $ne: null } } },
    { $group: { _id: '$customer', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
  ]);
  const map = Object.fromEntries(orderCounts.map((o) => [String(o._id), o]));
  res.json({
    customers: customers.map((c) => ({
      id: c._id, name: c.name, email: c.email, phone: c.phone, createdAt: c.createdAt,
      orders: map[String(c._id)]?.orders || 0, spent: map[String(c._id)]?.spent || 0,
      tags: c.tags || [],
    })),
  });
}));

/** PATCH /api/admin/customers/:id/tags — set a customer's merchant tags. */
router.patch('/customers/:id/tags', asyncHandler(async (req, res) => {
  const { tags } = req.body || {};
  if (!Array.isArray(tags)) return res.status(400).json({ message: 'tags must be an array' });
  const clean = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean).map((t) => t.slice(0, 30)))];
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Customer not found' });
  user.tags = clean;
  await user.save();
  res.json({ ok: true, tags: user.tags });
}));

// ---- Analytics: last 14 days series + status + top products + totals ----
router.get('/analytics', asyncHandler(async (req, res) => {
  const days = 14;
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - (days - 1));
  const [daily, statusAgg, top, totals, newCustomers30, subscriberCount] = await Promise.all([
    Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Refunded']] }, 0, '$total'] } },
      } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]),
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: 'customer', createdAt: { $gte: new Date(Date.now() - 30 * 864e5) } }),
    Subscriber.countDocuments(),
  ]);

  const map = Object.fromEntries(daily.map((d) => [d._id, d]));
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const dt = new Date(since); dt.setDate(dt.getDate() + i);
    const key = dt.toISOString().slice(0, 10);
    series.push({ date: key, orders: map[key]?.orders || 0, revenue: map[key]?.revenue || 0 });
  }
  const t = totals[0] || { revenue: 0, orders: 0 };

  res.json({
    series,
    byStatus: Object.fromEntries(statusAgg.map((s) => [s._id, s.count])),
    topProducts: top.map((p) => ({ name: p._id, qty: p.qty, revenue: p.revenue })),
    revenue: t.revenue, orders: t.orders,
    aov: t.orders ? Math.round(t.revenue / t.orders) : 0,
    newCustomers30, subscriberCount,
  });
}));

// ---- Subscribers (Growth) ----
router.get('/subscribers', asyncHandler(async (req, res) => {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 }).limit(1000);
  res.json({ subscribers });
}));

router.delete('/subscribers/:id', asyncHandler(async (req, res) => {
  await Subscriber.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
