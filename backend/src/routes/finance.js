const express = require('express');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { costConfig, orderEconomics, summarise } = require('../utils/orderEconomics');

const router = express.Router();
router.use(protect, adminOnly);

const LIVE = { $nin: ['Cancelled', 'Refunded'] };

/** Resolve ?from/?to (ISO) or ?days=N into a Mongo date filter. */
function window_(q) {
  const to = q.to ? new Date(q.to) : new Date();
  let from;
  if (q.from) {
    from = new Date(q.from);
  } else {
    const days = Math.min(730, Math.max(1, Number(q.days) || 30));
    from = new Date(to);
    from.setDate(from.getDate() - days + 1);
  }
  from.setHours(0, 0, 0, 0);
  return { from, to, match: { createdAt: { $gte: from, $lte: to } } };
}

const loadCfg = async () => costConfig((await Settings.findOne({ key: 'store' }).lean()) || {});

/* ---------------------------------------------------------------------------
 * GET /api/finance/order-profitability
 * Paginated, filterable, sortable. Sorting by margin ascending is the point:
 * it surfaces the worst orders first.
 * ------------------------------------------------------------------------- */
router.get('/order-profitability', asyncHandler(async (req, res) => {
  const { match, from, to } = window_(req.query);
  const cfg = await loadCfg();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(5, Number(req.query.limit) || 25));
  const filter = String(req.query.filter || 'all');
  const sort = String(req.query.sort || 'newest');

  const orders = await Order.find(match)
    .select('orderNumber customerInfo.name customerInfo.phone customerInfo.city items total status stage stageTimestamps paymentMethod paymentStatus courierCost paymentGatewayFee packagingCost createdAt')
    .lean();

  let rows = orders.map((o) => {
    const e = orderEconomics(o, cfg);
    return {
      id: o._id,
      orderNumber: o.orderNumber,
      customer: o.customerInfo?.name || 'Guest',
      phone: o.customerInfo?.phone || '',
      city: o.customerInfo?.city || '',
      date: o.createdAt,
      status: o.status,
      stage: o.stage || '',
      paymentMethod: o.paymentMethod,
      items: (o.items || []).reduce((n, it) => n + (Number(it.quantity) || 0), 0),
      ...e,
    };
  });

  if (filter === 'loss') rows = rows.filter((r) => r.health === 'loss');
  else if (filter === 'thin') rows = rows.filter((r) => r.health === 'thin');
  else if (filter === 'profitable') rows = rows.filter((r) => r.health === 'profitable');

  const sorters = {
    newest: (a, b) => new Date(b.date) - new Date(a.date),
    oldest: (a, b) => new Date(a.date) - new Date(b.date),
    'margin-asc': (a, b) => a.margin - b.margin,
    'margin-desc': (a, b) => b.margin - a.margin,
    'profit-asc': (a, b) => a.netProfit - b.netProfit,
    'profit-desc': (a, b) => b.netProfit - a.netProfit,
    'revenue-desc': (a, b) => b.revenue - a.revenue,
  };
  rows.sort(sorters[sort] || sorters.newest);

  const totals = summarise(orders, cfg);
  res.json({
    rows: rows.slice((page - 1) * limit, page * limit),
    page,
    limit,
    total: rows.length,
    totals,
    marginThreshold: cfg.marginThreshold,
    range: { from, to },
  });
}));

/* ---------------------------------------------------------------------------
 * GET /api/finance/profit-by-product — margin-based, distinct from best sellers
 * ------------------------------------------------------------------------- */
router.get('/profit-by-product', asyncHandler(async (req, res) => {
  const { match } = window_(req.query);
  const orders = await Order.find({ ...match, status: LIVE })
    .select('items').lean();

  const map = new Map();
  for (const o of orders) {
    for (const it of o.items || []) {
      const key = it.name || String(it.product || 'Unknown');
      const cur = map.get(key) || { name: key, image: it.image || '', units: 0, revenue: 0, cogs: 0 };
      const qty = Number(it.quantity) || 0;
      cur.units += qty;
      cur.revenue += Number(it.lineTotal) || (Number(it.price) || 0) * qty;
      cur.cogs += (Number(it.costPrice) || 0) * qty;
      map.set(key, cur);
    }
  }

  const rows = [...map.values()].map((r) => {
    const profit = r.revenue - r.cogs;
    return { ...r, profit, margin: r.revenue > 0 ? Math.round((profit / r.revenue) * 1000) / 10 : 0 };
  });
  const sort = String(req.query.sort || 'profit-desc');
  const sorters = {
    'profit-desc': (a, b) => b.profit - a.profit,
    'profit-asc': (a, b) => a.profit - b.profit,
    'margin-asc': (a, b) => a.margin - b.margin,
    'margin-desc': (a, b) => b.margin - a.margin,
    'units-desc': (a, b) => b.units - a.units,
    'revenue-desc': (a, b) => b.revenue - a.revenue,
  };
  rows.sort(sorters[sort] || sorters['profit-desc']);
  res.json({ rows: rows.slice(0, Number(req.query.limit) || 50), count: rows.length });
}));

/* ---------------------------------------------------------------------------
 * GET /api/finance/profit-by-customer — flags high revenue / low profit
 * ------------------------------------------------------------------------- */
router.get('/profit-by-customer', asyncHandler(async (req, res) => {
  const { match } = window_(req.query);
  const cfg = await loadCfg();
  const orders = await Order.find(match)
    .select('customerInfo.name customerInfo.phone customerInfo.city items total status stage stageTimestamps paymentMethod courierCost paymentGatewayFee packagingCost createdAt')
    .lean();

  const map = new Map();
  for (const o of orders) {
    const key = o.customerInfo?.phone || o.customerInfo?.name || 'unknown';
    const e = orderEconomics(o, cfg);
    const cur = map.get(key) || {
      phone: key, name: o.customerInfo?.name || 'Guest', city: o.customerInfo?.city || '',
      orders: 0, revenue: 0, profit: 0, cancelled: 0, returned: 0, lostCost: 0,
    };
    cur.orders += 1;
    cur.revenue += e.revenue;
    cur.profit += e.netProfit;
    if (e.cancelled) cur.cancelled += 1;
    if (e.returned) cur.returned += 1;
    cur.lostCost += e.lostCost;
    map.set(key, cur);
  }

  const rows = [...map.values()].map((r) => {
    const margin = r.revenue > 0 ? Math.round((r.profit / r.revenue) * 1000) / 10 : 0;
    const failRate = r.orders > 0 ? Math.round(((r.cancelled + r.returned) / r.orders) * 100) : 0;
    return {
      ...r,
      margin,
      failRate,
      // Worth attention: they buy a lot but you keep little of it.
      atRisk: r.revenue > 0 && (margin < cfg.marginThreshold || failRate >= 25),
    };
  });
  const sort = String(req.query.sort || 'profit-desc');
  rows.sort(sort === 'profit-asc' ? (a, b) => a.profit - b.profit
    : sort === 'revenue-desc' ? (a, b) => b.revenue - a.revenue
      : sort === 'margin-asc' ? (a, b) => a.margin - b.margin
        : (a, b) => b.profit - a.profit);
  res.json({ rows: rows.slice(0, Number(req.query.limit) || 25), count: rows.length });
}));

/* ---------------------------------------------------------------------------
 * GET /api/finance/cod-exposure — revenue at risk under a 100% COD model
 * ------------------------------------------------------------------------- */
router.get('/cod-exposure', asyncHandler(async (req, res) => {
  const cfg = await loadCfg();
  const open = await Order.find({
    status: { $nin: ['Delivered', 'Cancelled', 'Refunded'] },
  }).select('orderNumber customerInfo.name customerInfo.phone customerInfo.city total status stage stageTimestamps paymentMethod paymentStatus items courierCost packagingCost paymentGatewayFee createdAt').lean();

  const cod = open.filter((o) => o.paymentMethod === 'COD');
  const now = Date.now();
  const buckets = { notShipped: 0, inTransit: 0 };
  let exposure = 0;
  let sunkCost = 0;
  let oldestDays = 0;

  for (const o of cod) {
    const e = orderEconomics(o, cfg);
    exposure += Number(o.total) || 0;
    if (e.shipped) { buckets.inTransit += 1; sunkCost += e.packaging + e.courier; }
    else buckets.notShipped += 1;
    oldestDays = Math.max(oldestDays, Math.floor((now - new Date(o.createdAt)) / 86400000));
  }

  // Per-customer reliability from full history, so the desk can spot repeat cancellers.
  const history = await Order.aggregate([
    { $group: {
      _id: '$customerInfo.phone',
      name: { $first: '$customerInfo.name' },
      total: { $sum: 1 },
      bad: { $sum: { $cond: [{ $in: ['$status', ['Cancelled', 'Refunded']] }, 1, 0] } },
    } },
    { $match: { total: { $gte: 2 } } },
  ]);
  const risky = history
    .filter((h) => h.bad > 0)
    .map((h) => ({
      phone: h._id, name: h.name || 'Guest', orders: h.total, failed: h.bad,
      failRate: Math.round((h.bad / h.total) * 100),
    }))
    .sort((a, b) => b.failRate - a.failRate)
    .slice(0, 8);

  res.json({
    exposure,
    orders: cod.length,
    buckets,
    sunkCost,
    oldestDays,
    avgExposure: cod.length ? Math.round(exposure / cod.length) : 0,
    risky,
  });
}));

/* ---------------------------------------------------------------------------
 * GET /api/finance/break-even — orders/day needed to cover fixed costs
 * ------------------------------------------------------------------------- */
router.get('/break-even', asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne({ key: 'store' }).lean()) || {};
  const cfg = costConfig(settings);
  const oc = settings.operatingCosts || {};
  const { match } = window_(req.query);

  const orders = await Order.find(match)
    .select('items total status stage stageTimestamps paymentMethod customerInfo.city courierCost packagingCost paymentGatewayFee createdAt')
    .lean();
  const s = summarise(orders, cfg);

  const monthlyFixed = (Number(oc.monthlyMarketing) || 0) + (Number(oc.monthlySeo) || 0) + (Number(oc.monthlyOther) || 0);
  const aov = s.orders ? s.revenue / s.orders : 0;
  // Contribution = what one average order leaves behind after its own variable costs.
  const variablePerOrder = s.orders ? (s.cogs + s.packaging + s.courier + s.paymentFee) / s.orders : 0;
  const contribution = aov - variablePerOrder;

  const ordersNeededMonth = contribution > 0 ? Math.ceil(monthlyFixed / contribution) : null;
  const perDay = ordersNeededMonth !== null ? Math.ceil(ordersNeededMonth / 30) : null;

  const days = Math.max(1, Math.round((new Date() - match.createdAt.$gte) / 86400000));
  const currentPerDay = Math.round(((s.orders + s.loss) / days) * 10) / 10;

  res.json({
    monthlyFixed,
    aov: Math.round(aov),
    variablePerOrder: Math.round(variablePerOrder),
    contribution: Math.round(contribution),
    ordersNeededMonth,
    ordersNeededPerDay: perDay,
    currentPerDay,
    onTrack: perDay !== null ? currentPerDay >= perDay : null,
  });
}));

module.exports = router;
