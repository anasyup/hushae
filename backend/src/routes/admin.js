const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/dashboard', asyncHandler(async (req, res) => {
  // Time windows: current 30 days vs previous 30 days (for trend %)
  const now = new Date();
  const start30 = new Date(now); start30.setDate(now.getDate() - 30); start30.setHours(0, 0, 0, 0);
  const prev60 = new Date(now); prev60.setDate(now.getDate() - 60); prev60.setHours(0, 0, 0, 0);
  const start14 = new Date(now); start14.setDate(now.getDate() - 13); start14.setHours(0, 0, 0, 0);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const [
    statusAgg, revenueAgg, totalProducts, lowStock, totalCustomers, recentOrders, bestAgg,
    currentWindow, previousWindow, dailySeries, todayHourly, topCustomers, newCustomers30,
  ] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Product.countDocuments({ isActive: true, status: { $ne: 'draft' } }),
    Product.find({ isActive: true, status: { $ne: 'draft' }, stock: { $lte: 5 } }).sort({ stock: 1 }).limit(10)
      .select('name slug sku stock tier images'),
    User.countDocuments({ role: 'customer' }),
    Order.find().sort({ createdAt: -1 }).limit(6)
      .select('orderNumber customerInfo.name customerInfo.city customerInfo.phone total status paymentMethod paymentStatus createdAt items.image items.quantity'),
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' }, image: { $first: '$items.image' } } },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),
    // Current 30-day window totals — includes profit (revenue - cost of goods)
    Order.aggregate([
      { $match: { createdAt: { $gte: start30 }, status: { $nin: ['Cancelled', 'Refunded'] } } },
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
    // Previous 30-day window (for trend %)
    Order.aggregate([
      { $match: { createdAt: { $gte: prev60, $lt: start30 }, status: { $nin: ['Cancelled', 'Refunded'] } } },
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
    // Daily series for 14-day chart
    Order.aggregate([
      { $match: { createdAt: { $gte: start14 } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Refunded']] }, 0, '$total'] } },
      } },
      { $sort: { _id: 1 } },
    ]),
    // Today hourly distribution (for a "today's activity" chart)
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Top 5 customers by spend
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: '$customerInfo.phone', name: { $first: '$customerInfo.name' }, city: { $first: '$customerInfo.city' }, spent: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { spent: -1 } },
      { $limit: 5 },
    ]),
    User.countDocuments({ role: 'customer', createdAt: { $gte: start30 } }),
  ]);

  const byStatus = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));
  const totalOrders = statusAgg.reduce((n, s) => n + s.count, 0);
  const cur = currentWindow[0] || { revenue: 0, cost: 0, orders: 0 };
  const prev = previousWindow[0] || { revenue: 0, cost: 0, orders: 0 };
  const curProfit = (cur.revenue || 0) - (cur.cost || 0);
  const prevProfit = (prev.revenue || 0) - (prev.cost || 0);

  const pctChange = (a, b) => {
    if (!b) return a > 0 ? 100 : 0;
    return Math.round(((a - b) / b) * 1000) / 10;
  };

  // Fill 14 days series with zeros for gaps
  const dayMap = Object.fromEntries(dailySeries.map((d) => [d._id, d]));
  const chart = [];
  for (let i = 0; i < 14; i += 1) {
    const dt = new Date(start14); dt.setDate(dt.getDate() + i);
    const key = dt.toISOString().slice(0, 10);
    chart.push({
      date: key,
      label: dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      orders: dayMap[key]?.orders || 0,
      revenue: dayMap[key]?.revenue || 0,
    });
  }

  // Fill 24 hours today
  const hourMap = Object.fromEntries(todayHourly.map((h) => [h._id, h.orders]));
  const hourly = [];
  for (let h = 0; h < 24; h += 1) hourly.push({ hour: h, orders: hourMap[h] || 0 });

  res.json({
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
    // 30-day KPIs with trend %
    kpis: {
      revenue:      { value: cur.revenue,   prev: prev.revenue,   change: pctChange(cur.revenue, prev.revenue) },
      orders:       { value: cur.orders,    prev: prev.orders,    change: pctChange(cur.orders, prev.orders) },
      customers:    { value: newCustomers30, prev: 0,             change: 0 },
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
                      change: 0 },
    },
    chart,       // 14 days [{ date, label, orders, revenue }]
    hourly,      // 24 hours today
    byStatus,    // for donut / status breakdown chart
    lowStock,
    recentOrders,
    bestSellers: bestAgg.map((b) => ({ name: b._id, qty: b.qty, revenue: b.revenue, image: b.image })),
    topCustomers: topCustomers.map((c) => ({ name: c.name || 'Guest', phone: c._id, city: c.city, spent: c.spent, orders: c.orders })),
  });
}));

// Customers list with order counts
router.get('/customers', asyncHandler(async (req, res) => {
  const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(500)
    .select('name email phone createdAt isActive');
  const orderCounts = await Order.aggregate([
    { $match: { customer: { $ne: null } } },
    { $group: { _id: '$customer', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
  ]);
  const map = Object.fromEntries(orderCounts.map((o) => [String(o._id), o]));
  res.json({
    customers: customers.map((c) => ({
      id: c._id, name: c.name, email: c.email, phone: c.phone, createdAt: c.createdAt,
      orders: map[String(c._id)]?.orders || 0, spent: map[String(c._id)]?.spent || 0,
    })),
  });
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
