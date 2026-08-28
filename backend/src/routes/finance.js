const express = require('express');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { costConfig, orderEconomics, summarise, isCancelled, isReturned } = require('../utils/orderEconomics');

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

/* ---------------------------------------------------------------------------
 * GET /api/finance/pnl
 * The whole profit & loss for a period, built on the SAME summarise() that
 * order-profitability / profit-by-product / profit-by-customer / break-even
 * already use, so this page can never disagree with its own tables.
 *
 * That matters because the Finance page previously recomputed P&L in the
 * browser with different rules: it charged no gateway fees at all, used flat
 * settings rates instead of the courier/packaging cost stored on each order,
 * and computed the sunk cost of failed orders but never subtracted it. On a
 * 10-order sample that overstated net profit by PKR 1,120 (27.2% margin shown
 * against a true 24.6%). One source of truth removes the whole class of bug.
 *
 * Returns the previous period alongside so every figure can show a delta.
 * ------------------------------------------------------------------------- */
router.get('/pnl', asyncHandler(async (req, res) => {
  const cfg = await loadCfg();
  const settings = (await Settings.findOne({ key: 'store' }).lean()) || {};
  const oc = settings.operatingCosts || {};
  const { from, to, match } = window_(req.query);

  const SEL = 'items subtotal total discount promotionDiscount creditUsed pointsRedeemed '
    + 'shippingCharge tax status stage stageTimestamps paymentMethod customerInfo.city '
    + 'courierCost packagingCost paymentGatewayFee createdAt';

  /* previous period, same length, ending the day before this one starts */
  const span = to.getTime() - from.getTime();
  const prevMatch = { createdAt: { $gte: new Date(from.getTime() - span - 1), $lte: new Date(from.getTime() - 1) } };

  const [orders, prevOrders] = await Promise.all([
    Order.find(match).select(SEL).lean(),
    Order.find(prevMatch).select(SEL).lean(),
  ]);

  /** Income + cost breakdown for one set of orders. */
  const build = (list, days) => {
    const s = summarise(list, cfg);

    /* Income lines come from live orders only — a cancelled or refunded order
     * keeps no revenue, which is what summarise() already assumes. */
    const live = list.filter((o) => !isCancelled(o) && !isReturned(o));
    const inc = { merchandise: 0, shipping: 0, tax: 0, discounts: 0, rewards: 0, net: 0 };
    /* Live-order costs, kept apart from the sunk cost of failed orders.
     * summarise() deliberately merges the two into one net figure; a waterfall
     * has to show them as two separate steps, or "Contribution" quietly
     * absorbs losses that belong on their own line. */
    let liveCogs = 0, livePackaging = 0, liveCourier = 0, liveFees = 0;
    for (const o of live) {
      inc.merchandise += Number(o.subtotal) || 0;
      inc.shipping += Number(o.shippingCharge) || 0;
      inc.tax += Number(o.tax) || 0;
      inc.discounts += (Number(o.discount) || 0) + (Number(o.promotionDiscount) || 0);
      inc.rewards += Number(o.creditUsed) || 0;
      inc.net += Number(o.total) || 0;
      const e = orderEconomics(o, cfg);
      liveCogs += e.cogs; livePackaging += e.packaging; liveCourier += e.courier; liveFees += e.paymentFee;
    }

    /* Do the stated lines actually reconcile to what was charged? If not, say
     * so rather than quietly presenting a P&L that does not add up. */
    const stated = inc.merchandise + inc.shipping + inc.tax - inc.discounts - inc.rewards;
    const drift = Math.round((stated - inc.net) * 100) / 100;

    /* Refunds are real money that went back out; cancellations were never
     * collected. Both are shown as memos, not as negative revenue. */
    const refunded = list.filter(isReturned);
    const cancelled = list.filter(isCancelled);
    const memos = {
      refundedValue: refunded.reduce((n, o) => n + (Number(o.total) || 0), 0),
      refundedCount: refunded.length,
      cancelledValue: cancelled.reduce((n, o) => n + (Number(o.total) || 0), 0),
      cancelledCount: cancelled.length,
    };

    /* Operating costs are monthly in settings, so prorate to the window. */
    const months = Math.max(1, days) / 30;
    const opex = {
      marketing: Math.round((Number(oc.monthlyMarketing) || 0) * months),
      seo: Math.round((Number(oc.monthlySeo) || 0) * months),
      other: Math.round((Number(oc.monthlyOther) || 0) * months),
    };
    const opexTotal = opex.marketing + opex.seo + opex.other;

    /* Contribution = what live trading earns before overheads and before the
     * money already lost on failed orders. */
    const contribution = s.revenue - liveCogs - livePackaging - liveCourier - liveFees;
    /* s.netProfit already nets the sunk cost out, so only opex is left. */
    const netProfit = s.netProfit - opexTotal;

    /* Payment mix with the fee each method actually cost. */
    const mixMap = new Map();
    for (const o of live) {
      const e = orderEconomics(o, cfg);
      const k = o.paymentMethod || 'Unknown';
      const cur = mixMap.get(k) || { method: k, orders: 0, revenue: 0, fees: 0, profit: 0 };
      cur.orders += 1; cur.revenue += e.revenue; cur.fees += e.paymentFee; cur.profit += e.netProfit;
      mixMap.set(k, cur);
    }

    const sunkCost = (s.cancelledBeforeShipCost || 0) + (s.returnedAfterShipCost || 0);

    /* Daily series for the cash-flow chart. */
    const dayMap = new Map();
    for (const o of list) {
      const e = orderEconomics(o, cfg);
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      const cur = dayMap.get(key) || { date: key, revenue: 0, cogs: 0, costs: 0, profit: 0, orders: 0 };
      cur.revenue += e.revenue;
      cur.cogs += e.cogs;
      cur.costs += e.packaging + e.courier + e.paymentFee;
      cur.profit += e.netProfit;
      cur.orders += 1;
      dayMap.set(key, cur);
    }
    const daily = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    return {
      days,
      income: { ...inc, merchandise: Math.round(inc.merchandise), shipping: Math.round(inc.shipping), tax: Math.round(inc.tax), discounts: Math.round(inc.discounts), rewards: Math.round(inc.rewards), net: Math.round(inc.net) },
      reconcileDrift: drift,
      /* Live-trading costs. `all*` include the sunk cost of failed orders, so
       * the two views reconcile: live + sunk = total. */
      costs: {
        cogs: Math.round(liveCogs),
        packaging: Math.round(livePackaging),
        courier: Math.round(liveCourier),
        paymentFees: Math.round(liveFees),
        total: Math.round(liveCogs + livePackaging + liveCourier + liveFees),
        allPackaging: Math.round(s.packaging),
        allCourier: Math.round(s.courier),
      },
      opex,
      opexTotal,
      grossProfit: Math.round(s.grossProfit),
      grossMargin: s.revenue > 0 ? Math.round((s.grossProfit / s.revenue) * 1000) / 10 : 0,
      contribution: Math.round(contribution),
      contributionMargin: s.revenue > 0 ? Math.round((contribution / s.revenue) * 1000) / 10 : 0,
      sunkCost: Math.round(sunkCost),
      /* contribution - sunk must equal summarise()'s own net, or the ladder
       * is lying. Exposed so the UI (and the test) can prove it. */
      ladderCheck: Math.round(contribution - sunkCost - s.netProfit),
      netProfit: Math.round(netProfit),
      netMargin: s.revenue > 0 ? Math.round((netProfit / s.revenue) * 1000) / 10 : 0,
      revenue: Math.round(s.revenue),
      orders: s.orders,
      aov: s.orders ? Math.round(s.revenue / s.orders) : 0,
      health: { profitable: s.profitable || 0, thin: s.thin || 0, loss: s.loss || 0 },
      failed: {
        cancelledBeforeShip: s.cancelledBeforeShip || 0,
        cancelledBeforeShipCost: Math.round(s.cancelledBeforeShipCost || 0),
        returnedAfterShip: s.returnedAfterShip || 0,
        returnedAfterShipCost: Math.round(s.returnedAfterShipCost || 0),
        sunkCost: Math.round((s.cancelledBeforeShipCost || 0) + (s.returnedAfterShipCost || 0)),
      },
      memos,
      paymentMix: [...mixMap.values()].sort((a, b) => b.revenue - a.revenue)
        .map((m) => ({ ...m, revenue: Math.round(m.revenue), fees: Math.round(m.fees), profit: Math.round(m.profit) })),
      daily,
    };
  };

  const days = Math.max(1, Math.round(span / 86400000) + 1);
  const current = build(orders, days);
  const previous = build(prevOrders, days);

  /* Waterfall: gross sales down to net profit, each step labelled and signed. */
  const c = current;
  const waterfall = [
    { key: 'net', label: 'Net sales', value: c.income.net, kind: 'start' },
    { key: 'cogs', label: 'Cost of goods', value: -c.costs.cogs, kind: 'cost' },
    { key: 'packaging', label: 'Packaging', value: -c.costs.packaging, kind: 'cost' },
    { key: 'courier', label: 'Courier', value: -c.costs.courier, kind: 'cost' },
    { key: 'fees', label: 'Payment fees', value: -c.costs.paymentFees, kind: 'cost' },
    { key: 'contribution', label: 'Contribution', value: c.contribution, kind: 'subtotal' },
    { key: 'sunk', label: 'Failed orders', value: -c.sunkCost, kind: 'cost' },
    { key: 'marketing', label: 'Marketing', value: -c.opex.marketing, kind: 'cost' },
    { key: 'seo', label: 'SEO', value: -c.opex.seo, kind: 'cost' },
    { key: 'other', label: 'Other costs', value: -c.opex.other, kind: 'cost' },
    { key: 'netProfit', label: 'Net profit', value: c.netProfit, kind: 'total' },
  ].filter((w) => w.kind === 'start' || w.kind === 'subtotal' || w.kind === 'total' || w.value !== 0);

  res.json({
    range: { from, to, days, prevFrom: prevMatch.createdAt.$gte, prevTo: prevMatch.createdAt.$lte },
    current,
    previous,
    waterfall,
    thresholds: { margin: cfg.marginThreshold },
  });
}));

module.exports = router;
