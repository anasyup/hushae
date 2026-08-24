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

/* ============================================================================
 * Phase 7: FINANCE DASHBOARD — comprehensive P&L
 * Every metric backed by shared orderEconomics calculations.
 * ========================================================================== */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const { match, from, to } = window_(req.query);
  const cfg = await loadCfg();

  const orders = await Order.find({ ...match, status: LIVE })
    .select('items total subtotal discount tax shippingCharge status stage stageTimestamps paymentMethod paymentStatus courierCost packagingCost paymentGatewayFee costPrice createdAt')
    .lean();

  const cancelledOrders = await Order.find({ ...match, status: { $in: ['Cancelled', 'Refunded'] } })
    .select('total discount shippingCharge status createdAt').lean();

  const s = summarise(orders, cfg);

  // Refunds
  const RefundLedger = require('../models/RefundLedger');
  const refundAgg = await RefundLedger.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const totalRefunded = refundAgg[0]?.total || 0;
  const refundCount = refundAgg[0]?.count || 0;

  // Expenses
  let totalExpenses = 0;
  let expenseBreakdown = {};
  try {
    const Expense = require('../models/Expense');
    const expenses = await Expense.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]);
    expenseBreakdown = Object.fromEntries(expenses.map(e => [e._id, e.total]));
    totalExpenses = expenses.reduce((sum, e) => sum + e.total, 0);
  } catch { /* Expense model may not exist yet */ }

  // Tax collected
  const taxCollected = orders.reduce((sum, o) => sum + (o.tax || 0), 0);

  // Shipping collected vs cost
  const shippingCollected = orders.reduce((sum, o) => sum + (o.shippingCharge || 0), 0);
  const shippingCost = s.courier || 0;

  // Payment breakdown
  const paymentBreakdown = {};
  for (const o of orders) {
    const m = o.paymentMethod || 'Unknown';
    if (!paymentBreakdown[m]) paymentBreakdown[m] = { count: 0, total: 0 };
    paymentBreakdown[m].count++;
    paymentBreakdown[m].total += o.total || 0;
  }

  // Estimated profit
  const estimatedProfit = s.revenue - s.cogs - s.packaging - s.courier - s.paymentFee - totalRefunded - totalExpenses;

  res.json({
    range: { from, to },
    sales: {
      grossRevenue: s.revenue + (cancelledOrders.reduce((sum, o) => sum + (o.total || 0), 0)),
      discounts: orders.reduce((sum, o) => sum + (o.discount || 0), 0),
      netRevenue: s.revenue,
      orders: s.orders,
      cancelledOrders: cancelledOrders.length,
      aov: s.orders ? Math.round(s.revenue / s.orders) : 0,
    },
    payments: {
      breakdown: paymentBreakdown,
      pending: orders.filter(o => o.paymentStatus === 'Pending').length,
      paid: orders.filter(o => o.paymentStatus === 'Paid').length,
    },
    refunds: { total: totalRefunded, count: refundCount },
    shipping: { collected: shippingCollected, cost: shippingCost, margin: shippingCollected - shippingCost },
    tax: { collected: taxCollected },
    costs: {
      cogs: s.cogs,
      packaging: s.packaging,
      courier: s.courier,
      paymentFees: s.paymentFee,
      expenses: totalExpenses,
      expenseBreakdown,
    },
    profit: {
      estimated: estimatedProfit,
      margin: s.revenue > 0 ? Math.round((estimatedProfit / s.revenue) * 100) : 0,
      label: 'Estimated Profit',
    },
    cashFlow: {
      inflows: s.revenue,
      outflows: totalRefunded + totalExpenses + s.courier + s.packaging,
      net: s.revenue - totalRefunded - totalExpenses - s.courier - s.packaging,
    },
  });
}));

/* ============================================================================
 * Phase 7: PAYMENT RECONCILIATION
 * ========================================================================== */
router.get('/reconciliation', asyncHandler(async (req, res) => {
  const { match } = window_(req.query);
  const OrderPayment = require('../models/OrderPayment');

  const orders = await Order.find({ ...match, status: LIVE })
    .select('orderNumber total paymentMethod paymentStatus paymentState createdAt')
    .lean();

  const payments = await OrderPayment.find({ createdAt: match.createdAt })
    .select('orderNumber method amount state transactionId reference createdAt')
    .lean();

  const rows = orders.map(o => {
    const pay = payments.find(p => p.orderNumber === o.orderNumber);
    const expected = o.total;
    const received = pay ? pay.amount : 0;
    const mismatch = expected !== received;
    return {
      orderNumber: o.orderNumber,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      expected,
      received,
      mismatch,
      mismatchReason: !pay ? 'missing_payment' : mismatch ? 'amount_mismatch' : null,
      transactionId: pay?.transactionId || '',
      reference: pay?.reference || '',
      gatewayState: pay?.state || 'none',
      date: o.createdAt,
    };
  });

  const issues = rows.filter(r => r.mismatch || !r.transactionId);
  res.json({
    total: rows.length,
    reconciled: rows.length - issues.length,
    issues: issues.length,
    rows: rows.slice(0, 200),
    summary: {
      missing: rows.filter(r => r.mismatchReason === 'missing_payment').length,
      amountMismatch: rows.filter(r => r.mismatchReason === 'amount_mismatch').length,
    },
  });
}));

/* ============================================================================
 * Phase 7: SHIPPING REPORT
 * ========================================================================== */
router.get('/shipping-report', asyncHandler(async (req, res) => {
  const { match } = window_(req.query);
  const cfg = await loadCfg();

  const orders = await Order.find({ ...match, status: LIVE })
    .select('orderNumber shippingCharge courierCost shippingMethod status stage stageTimestamps createdAt')
    .lean();

  const shipped = orders.filter(o => {
    const stage = o.stage || o.status;
    return ['Shipped', 'In Transit', 'Out for Delivery', 'Delivered'].includes(stage);
  });

  const totalCharged = orders.reduce((s, o) => s + (o.shippingCharge || 0), 0);
  const totalCost = shipped.reduce((s, o) => s + (o.courierCost || cfg.courierDefault || 0), 0);
  const failed = orders.filter(o => o.stage === 'Failed Delivery' || o.status === 'Failed Delivery').length;

  // Average delivery time (for delivered orders with timestamps)
  const delivered = orders.filter(o => o.stage === 'Delivered' && o.stageTimestamps?.Shipped && o.stageTimestamps?.Delivered);
  const avgDeliveryDays = delivered.length > 0
    ? delivered.reduce((s, o) => s + (new Date(o.stageTimestamps.Delivered) - new Date(o.stageTimestamps.Shipped)) / 86400000, 0) / delivered.length
    : null;

  res.json({
    totalOrders: orders.length,
    shipped: shipped.length,
    delivered: delivered.length,
    failed,
    shippingCharged: totalCharged,
    courierCost: totalCost,
    shippingMargin: totalCharged - totalCost,
    avgDeliveryDays: avgDeliveryDays ? Math.round(avgDeliveryDays * 10) / 10 : null,
  });
}));

/* ============================================================================
 * Phase 7: TAX REPORT
 * ========================================================================== */
router.get('/tax-report', asyncHandler(async (req, res) => {
  const { match, from, to } = window_(req.query);
  const TaxZone = require('../models/TaxZone');

  const orders = await Order.find({ ...match, status: LIVE })
    .select('total subtotal discount tax taxPercent customerInfo.province customerInfo.country createdAt')
    .lean();

  const totalTax = orders.reduce((s, o) => s + (o.tax || 0), 0);
  const taxableSales = orders.reduce((s, o) => s + Math.max(0, (o.subtotal || 0) - (o.discount || 0)), 0);

  // Tax by region
  const byRegion = {};
  for (const o of orders) {
    const region = o.customerInfo?.province || o.customerInfo?.country || 'Unknown';
    if (!byRegion[region]) byRegion[region] = { count: 0, tax: 0, taxableSales: 0 };
    byRegion[region].count++;
    byRegion[region].tax += o.tax || 0;
    byRegion[region].taxableSales += Math.max(0, (o.subtotal || 0) - (o.discount || 0));
  }

  const zones = await TaxZone.find({ isActive: true }).lean().catch(() => []);

  res.json({
    range: { from, to },
    totalTax,
    taxableSales,
    effectiveRate: taxableSales > 0 ? Math.round((totalTax / taxableSales) * 1000) / 10 : 0,
    byRegion,
    activeZones: zones.map(z => ({ name: z.name, country: z.country, rate: z.rate, inclusive: z.inclusive })),
    disclaimer: 'This is commerce tax reporting, not government filing data.',
  });
}));

/* ============================================================================
 * Phase 7: EXPENSES CRUD
 * ========================================================================== */
router.get('/expenses', asyncHandler(async (req, res) => {
  const Expense = require('../models/Expense');
  const { match } = window_(req.query);
  const expenses = await Expense.find({ date: match.createdAt })
    .sort({ date: -1 }).limit(200).lean();
  res.json({ expenses });
}));

router.post('/expenses', asyncHandler(async (req, res) => {
  const Expense = require('../models/Expense');
  const b = req.body || {};
  if (!b.category || !Expense.CATEGORIES.includes(b.category)) return res.status(400).json({ message: 'Invalid category' });
  const amount = Number(b.amount);
  if (!(amount > 0)) return res.status(400).json({ message: 'Amount must be positive' });
  const expense = await Expense.create({
    category: b.category, amount, date: b.date || new Date(),
    note: b.note || '', recurring: !!b.recurring, reference: b.reference || '',
    createdBy: req.user?._id || null, createdByName: req.user?.name || '',
  });
  res.status(201).json({ expense });
}));

router.put('/expenses/:id', asyncHandler(async (req, res) => {
  const Expense = require('../models/Expense');
  const e = await Expense.findById(req.params.id);
  if (!e) return res.status(404).json({ message: 'Not found' });
  const b = req.body || {};
  if (b.category) e.category = b.category;
  if (b.amount !== undefined) e.amount = Math.max(0, Number(b.amount));
  if (b.date) e.date = new Date(b.date);
  if (b.note !== undefined) e.note = b.note;
  if (b.recurring !== undefined) e.recurring = !!b.recurring;
  if (b.reference !== undefined) e.reference = b.reference;
  await e.save();
  res.json({ expense: e });
}));

router.delete('/expenses/:id', asyncHandler(async (req, res) => {
  const Expense = require('../models/Expense');
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* ============================================================================
 * Phase 7: CASH FLOW
 * ========================================================================== */
router.get('/cashflow', asyncHandler(async (req, res) => {
  const { match, from, to } = window_(req.query);
  const cfg = await loadCfg();

  const orders = await Order.find({ ...match, status: LIVE, paymentStatus: 'Paid' })
    .select('total paymentMethod createdAt').lean();

  const RefundLedger = require('../models/RefundLedger');
  const refunds = await RefundLedger.aggregate([
    { $match: { createdAt: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  let expenses = 0;
  try {
    const Expense = require('../models/Expense');
    const expAgg = await Expense.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    expenses = expAgg[0]?.total || 0;
  } catch {}

  const inflows = orders.reduce((s, o) => s + (o.total || 0), 0);
  const outflows = (refunds[0]?.total || 0) + expenses;

  // By payment method
  const byMethod = {};
  for (const o of orders) {
    const m = o.paymentMethod || 'Unknown';
    byMethod[m] = (byMethod[m] || 0) + (o.total || 0);
  }

  res.json({
    range: { from, to },
    inflows,
    outflows,
    net: inflows - outflows,
    byMethod,
    refunds: refunds[0]?.total || 0,
    expenses,
    disclaimer: 'Commerce cash-flow reporting. Not bank reconciliation.',
  });
}));

/* ============================================================================
 * Phase 7: FINANCIAL EXPORT (CSV)
 * ========================================================================== */
router.get('/export/:type', asyncHandler(async (req, res) => {
  const type = req.params.type;
  const { match, from, to } = window_(req.query);
  const cfg = await loadCfg();
  let csv = '';
  let filename = '';

  if (type === 'sales') {
    const orders = await Order.find({ ...match, status: LIVE }).select('orderNumber customerInfo.name total discount tax shippingCharge status paymentMethod createdAt').lean();
    csv = 'Order,Customer,Total,Discount,Tax,Shipping,Status,Payment Method,Date\n';
    for (const o of orders) {
      csv += `"${o.orderNumber}","${(o.customerInfo?.name || '').replace(/"/g, '""')}",${o.total},${o.discount},${o.tax},${o.shippingCharge},${o.status},${o.paymentMethod},${new Date(o.createdAt).toISOString().slice(0,10)}\n`;
    }
    filename = 'hushae-sales.csv';
  } else if (type === 'expenses') {
    const Expense = require('../models/Expense');
    const expenses = await Expense.find({ date: match.createdAt }).sort({ date: -1 }).lean();
    csv = 'Category,Amount,Date,Note,Reference\n';
    for (const e of expenses) {
      csv += `"${e.category}",${e.amount},${new Date(e.date).toISOString().slice(0,10)},"${(e.note || '').replace(/"/g, '""')}","${e.reference}"\n`;
    }
    filename = 'hushae-expenses.csv';
  } else {
    return res.status(400).json({ message: 'Unknown export type. Use: sales, expenses' });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}));

module.exports = router;
