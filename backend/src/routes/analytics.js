const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Subscriber = require('../models/Subscriber');
const PageView = require('../models/PageView');
const RefundLedger = require('../models/RefundLedger');
const ReturnCase = require('../models/ReturnCase');
const PromotionUse = require('../models/PromotionUse');
const EmailCampaign = require('../models/EmailCampaign');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { costConfig, orderEconomics, summarise } = require('../utils/orderEconomics');
const A = require('../utils/analyticsService');
const Settings = require('../models/Settings');

const router = express.Router();
router.use(protect, adminOnly);

/* ============================================================================
 * PHASE 8: UNIFIED ANALYTICS ENDPOINTS
 * All KPIs use shared definitions from analyticsService.js
 * ========================================================================== */

/* ── OVERVIEW (preserved + enhanced) ────────────────────────────────────── */
router.get('/overview', asyncHandler(async (req, res) => {
  const { from, to, days, prevFrom, prevTo } = A.resolveRange(req.query);
  const match = { status: A.LIVE, createdAt: { $gte: from, $lte: to } };
  const prevMatch = { status: A.LIVE, createdAt: { $gte: prevFrom, $lte: prevTo } };

  const [orders, prevOrders, newCustomers, refunds, products] = await Promise.all([
    Order.find(match).select('items total discount tax shippingCharge status paymentMethod customerInfo.phone customerInfo.email customerInfo.city customerInfo.province customerInfo.country costPrice courierCost packagingCost paymentGatewayFee createdAt').lean(),
    Order.find(prevMatch).select('total createdAt').lean(),
    User.countDocuments({ createdAt: { $gte: from, $lte: to } }),
    RefundLedger.find({ createdAt: { $gte: from, $lte: to } }).select('amount').lean(),
    Product.find().select('slug categorySlug').lean(),
  ]);

  // KPIs
  const revenue = A.calcRevenue(orders);
  const prevRevenue = A.calcRevenue(prevOrders);
  const orderCount = orders.length;
  const prevOrderCount = prevOrders.length;
  const aov = A.calcAOV(revenue, orderCount);
  const totalRefunded = refunds.reduce((s, r) => s + (r.amount || 0), 0);
  const totalDiscount = orders.reduce((s, o) => s + (o.discount || 0), 0);
  const totalTax = orders.reduce((s, o) => s + (o.tax || 0), 0);
  const totalShipping = orders.reduce((s, o) => s + (o.shippingCharge || 0), 0);

  // Customer metrics
  const phoneCounts = new Map();
  for (const o of orders) {
    const k = o.customerInfo?.phone || o.customerInfo?.email || '';
    if (k) phoneCounts.set(k, (phoneCounts.get(k) || 0) + 1);
  }
  const uniqueCustomers = phoneCounts.size;
  const repeatRate = A.calcRepeatRate(phoneCounts);

  // Daily series
  const series = A.buildDailySeries(orders, Math.min(days, 365), from);

  // Breakdowns
  const statusMap = {}, payMap = {}, cityMap = {}, catMap = {};
  const prodMap = {};
  const slugCat = Object.fromEntries(products.map(p => [p.slug, p.categorySlug]));

  for (const o of orders) {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
    payMap[o.paymentMethod] = (payMap[o.paymentMethod] || 0) + o.total;
    const city = o.customerInfo?.city || '—';
    cityMap[city] = (cityMap[city] || 0) + o.total;
    const country = o.customerInfo?.country || o.customerInfo?.province || 'PK';
    for (const it of o.items) {
      const p = prodMap[it.name] || (prodMap[it.name] = { name: it.name, qty: 0, revenue: 0 });
      p.qty += it.quantity || 1;
      p.revenue += it.lineTotal || 0;
      const cat = slugCat[it.slug] || 'other';
      catMap[cat] = (catMap[cat] || 0) + (it.lineTotal || 0);
    }
  }

  const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([city, revenue]) => ({ city, revenue }));
  const categories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([name, revenue]) => ({ name, revenue }));

  // Conversion funnel (from PageView events)
  const pvMatch = { createdAt: { $gte: from, $lte: to } };
  const [pageviews, cartSessions, checkoutSessions, purchaseCount] = await Promise.all([
    PageView.distinct('sid', { ...pvMatch, event: 'pageview' }),
    PageView.distinct('sid', { ...pvMatch, event: 'cart' }),
    PageView.distinct('sid', { ...pvMatch, event: 'checkout' }),
    orderCount,
  ]);

  res.json({
    range: { from, to, days, preset: req.query.range || '30d' },
    kpis: {
      revenue, revenueGrowth: A.calcGrowth(revenue, prevRevenue),
      orders: orderCount, ordersGrowth: A.calcGrowth(orderCount, prevOrderCount),
      aov, newCustomers, uniqueCustomers, repeatRate,
      refunds: totalRefunded, discounts: totalDiscount,
      tax: totalTax, shipping: totalShipping,
      netSales: revenue - totalDiscount,
    },
    series,
    breakdowns: {
      status: statusMap,
      payment: payMap,
      cities: topCities,
      categories,
    },
    topProducts,
    funnel: {
      pageviews: pageviews.length,
      addToCart: cartSessions.length,
      checkout: checkoutSessions.length,
      purchased: purchaseCount,
    },
  });
}));

/* ── SALES TREND ────────────────────────────────────────────────────────── */
router.get('/sales', asyncHandler(async (req, res) => {
  const { from, to, days } = A.resolveRange(req.query);
  const orders = await Order.find({ status: A.LIVE, createdAt: { $gte: from, $lte: to } })
    .select('total discount tax shippingCharge createdAt').lean();

  // Group by day/week/month depending on range
  const granularity = days <= 31 ? 'day' : days <= 180 ? 'week' : 'month';
  const buckets = {};
  for (const o of orders) {
    let key;
    const d = new Date(o.createdAt);
    if (granularity === 'day') key = d.toISOString().slice(0, 10);
    else if (granularity === 'week') {
      const weekStart = new Date(d); weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else key = d.toISOString().slice(0, 7);

    if (!buckets[key]) buckets[key] = { period: key, revenue: 0, orders: 0, discounts: 0, tax: 0, shipping: 0 };
    buckets[key].revenue += o.total || 0;
    buckets[key].orders += 1;
    buckets[key].discounts += o.discount || 0;
    buckets[key].tax += o.tax || 0;
    buckets[key].shipping += o.shippingCharge || 0;
  }

  res.json({ granularity, data: Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period)) });
}));

/* ── CUSTOMER ANALYTICS ─────────────────────────────────────────────────── */
router.get('/customers', asyncHandler(async (req, res) => {
  const { from, to } = A.resolveRange(req.query);
  const orders = await Order.find({ status: A.LIVE, createdAt: { $gte: from, $lte: to } })
    .select('total customerInfo.phone customerInfo.email customerInfo.country createdAt').lean();

  const phoneData = new Map();
  for (const o of orders) {
    const k = o.customerInfo?.phone || o.customerInfo?.email || 'unknown';
    if (!phoneData.has(k)) phoneData.set(k, { orders: 0, revenue: 0, country: o.customerInfo?.country || 'PK', first: o.createdAt, last: o.createdAt });
    const d = phoneData.get(k);
    d.orders++;
    d.revenue += o.total || 0;
    if (o.createdAt < d.first) d.first = o.createdAt;
    if (o.createdAt > d.last) d.last = o.createdAt;
  }

  const customers = [...phoneData.values()];
  const totalCustomers = customers.length;
  const newCustomers = customers.filter(c => c.orders === 1).length;
  const repeatCustomers = customers.filter(c => c.orders >= 2).length;
  const vip = customers.filter(c => c.revenue >= 500000).length;
  const avgLTV = totalCustomers ? Math.round(customers.reduce((s, c) => s + c.revenue, 0) / totalCustomers) : 0;
  const avgOrders = totalCustomers ? Math.round(customers.reduce((s, c) => s + c.orders, 0) / totalCustomers * 10) / 10 : 0;

  // Country breakdown
  const byCountry = {};
  for (const c of customers) {
    const country = c.country || 'PK';
    if (!byCountry[country]) byCountry[country] = { customers: 0, revenue: 0, orders: 0 };
    byCountry[country].customers++;
    byCountry[country].revenue += c.revenue;
    byCountry[country].orders += c.orders;
  }

  // LTV distribution
  const ltvBuckets = { '0-5k': 0, '5k-25k': 0, '25k-100k': 0, '100k-500k': 0, '500k+': 0 };
  for (const c of customers) {
    if (c.revenue >= 500000) ltvBuckets['500k+']++;
    else if (c.revenue >= 100000) ltvBuckets['100k-500k']++;
    else if (c.revenue >= 25000) ltvBuckets['25k-100k']++;
    else if (c.revenue >= 5000) ltvBuckets['5k-25k']++;
    else ltvBuckets['0-5k']++;
  }

  res.json({
    total: totalCustomers, new: newCustomers, repeat: repeatCustomers, vip,
    avgLTV, avgOrders,
    repeatRate: totalCustomers ? Math.round((repeatCustomers / totalCustomers) * 100) : 0,
    byCountry,
    ltvDistribution: ltvBuckets,
  });
}));

/* ── COHORT ANALYSIS ────────────────────────────────────────────────────── */
router.get('/cohorts', asyncHandler(async (req, res) => {
  const allOrders = await Order.find({ status: A.LIVE })
    .select('customerInfo.phone customerInfo.email createdAt').lean().limit(50000);

  const cohorts = A.buildCohorts(allOrders);
  res.json({ cohorts, totalCustomers: new Set(allOrders.map(o => o.customerInfo?.phone || o.customerInfo?.email).filter(Boolean)).size });
}));

/* ── PRODUCT ANALYTICS ──────────────────────────────────────────────────── */
router.get('/products', asyncHandler(async (req, res) => {
  const { from, to } = A.resolveRange(req.query);
  const orders = await Order.find({ status: A.LIVE, createdAt: { $gte: from, $lte: to } })
    .select('items').lean();

  const cfg = costConfig((await Settings.findOne({ key: 'store' }).lean()) || {});
  const productMap = {};

  for (const o of orders) {
    for (const it of o.items || []) {
      const key = it.product || it.name;
      if (!productMap[key]) productMap[key] = { name: it.name, qty: 0, revenue: 0, cost: 0, refunds: 0 };
      productMap[key].qty += it.quantity || 1;
      productMap[key].revenue += it.lineTotal || 0;
      productMap[key].cost += (it.costPrice || it.price * 0.5 || 0) * (it.quantity || 1);
    }
  }

  const products = Object.values(productMap).map(p => ({
    ...p,
    profit: p.revenue - p.cost,
    margin: p.revenue > 0 ? Math.round((p.revenue - p.cost) / p.revenue * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  res.json({ products: products.slice(0, 50), total: products.length });
}));

/* ── ORDER ANALYTICS ────────────────────────────────────────────────────── */
router.get('/orders', asyncHandler(async (req, res) => {
  const { from, to } = A.resolveRange(req.query);
  const orders = await Order.find({ createdAt: { $gte: from, $lte: to } })
    .select('status total paymentMethod stage stageTimestamps createdAt').lean();

  const byStatus = {};
  const byDay = {};
  let cancelled = 0, refunded = 0;

  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const day = new Date(o.createdAt).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
    if (o.status === 'Cancelled') cancelled++;
    if (o.status === 'Refunded') refunded++;
  }

  // Production duration (where both timestamps exist)
  const durations = orders
    .filter(o => o.stageTimestamps?.Confirmed && o.stageTimestamps?.['Ready to Ship'])
    .map(o => (new Date(o.stageTimestamps['Ready to Ship']) - new Date(o.stageTimestamps.Confirmed)) / 3600000);
  const avgProductionHours = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length * 10) / 10 : null;

  res.json({
    total: orders.length, cancelled, refunded,
    byStatus, byDay,
    avgProductionHours,
    returnRate: orders.length > 0 ? Math.round((refunded / orders.length) * 1000) / 10 : 0,
  });
}));

/* ── RETURNS ANALYTICS ──────────────────────────────────────────────────── */
router.get('/returns', asyncHandler(async (req, res) => {
  const { from, to } = A.resolveRange(req.query);
  const returns = await ReturnCase.find({ createdAt: { $gte: from, $lte: to } })
    .select('stage reason refundAmount resolution createdAt').lean();

  const byStage = {}, byReason = {};
  let totalRefund = 0;
  for (const r of returns) {
    byStage[r.stage] = (byStage[r.stage] || 0) + 1;
    byReason[r.reason] = (byReason[r.reason] || 0) + 1;
    if (r.refundAmount) totalRefund += r.refundAmount;
  }

  res.json({
    total: returns.length,
    byStage, byReason,
    totalRefund,
    approved: (byStage.approved || 0) + (byStage.completed || 0),
    rejected: byStage.rejected || 0,
  });
}));

/* ── MARKETING ANALYTICS ────────────────────────────────────────────────── */
router.get('/marketing', asyncHandler(async (req, res) => {
  const { from, to } = A.resolveRange(req.query);

  const [promoUses, campaigns, promoCount] = await Promise.all([
    PromotionUse.find({ createdAt: { $gte: from, $lte: to } }).select('amount promotionName').lean(),
    EmailCampaign.find({ createdAt: { $gte: from, $lte: to } }).select('name status sent failed skipped matched').lean(),
    PromotionUse.countDocuments({ createdAt: { $gte: from, $lte: to } }),
  ]);

  const totalDiscount = promoUses.reduce((s, u) => s + (u.amount || 0), 0);
  const campaignStats = {
    total: campaigns.length,
    totalSent: campaigns.reduce((s, c) => s + (c.sent || 0), 0),
    totalFailed: campaigns.reduce((s, c) => s + (c.failed || 0), 0),
    totalSkipped: campaigns.reduce((s, c) => s + (c.skipped || 0), 0),
    totalMatched: campaigns.reduce((s, c) => s + (c.matched || 0), 0),
  };

  res.json({
    promotions: { redemptions: promoCount, totalDiscount },
    campaigns: campaignStats,
    disclaimer: 'No open rate, click rate, or ROAS — tracking infrastructure not available.',
  });
}));

/* ── COUNTRY ANALYTICS ──────────────────────────────────────────────────── */
router.get('/countries', asyncHandler(async (req, res) => {
  const { from, to } = A.resolveRange(req.query);
  const orders = await Order.find({ status: A.LIVE, createdAt: { $gte: from, $lte: to } })
    .select('total customerInfo.country customerInfo.province customerInfo.city').lean();

  const byCountry = {};
  for (const o of orders) {
    const c = o.customerInfo?.country || (o.customerInfo?.province ? 'PK' : 'Unknown');
    if (!byCountry[c]) byCountry[c] = { orders: 0, revenue: 0, customers: new Set() };
    byCountry[c].orders++;
    byCountry[c].revenue += o.total || 0;
    const k = o.customerInfo?.phone || o.customerInfo?.email || '';
    if (k) byCountry[c].customers.add(k);
  }

  const countries = Object.entries(byCountry).map(([name, d]) => ({
    name, orders: d.orders, revenue: d.revenue,
    customers: d.customers.size,
    aov: d.orders > 0 ? Math.round(d.revenue / d.orders) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  res.json({ countries });
}));

module.exports = router;
