const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const OrderNotification = require('../models/OrderNotification');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, growthPct } = require('../utils/helpers');
const { costConfig, orderEconomics } = require('../utils/orderEconomics');

const router = express.Router();
router.use(protect, adminOnly);

const HOUR = 3600000;
const DAY = 86400000;
const LIVE = { $nin: ['Cancelled', 'Refunded'] };

/* ---------------------------------------------------------------------------
 * GET /api/dashboard/alerts — "what needs my attention today"
 * Every alert carries a link to the filtered view that resolves it.
 * ------------------------------------------------------------------------- */
router.get('/alerts', asyncHandler(async (req, res) => {
  const now = Date.now();
  const s = await Settings.findOne({ key: 'store' }).lean().catch(() => null);
  const excl = s?.includeTestOrders ? {} : { isTestOrder: { $ne: true } };
  const [pendingPay, live, lowStock, cancelledToday] = await Promise.all([
    Order.countDocuments({
      paymentState: 'Pending',
      status: LIVE,
      createdAt: { $lte: new Date(now - 24 * HOUR) },
      ...excl,
    }),
    Order.find({ status: LIVE, ...excl }).select('stage stageUpdatedAt updatedAt createdAt').lean(),
    Product.countDocuments({ isActive: true, status: { $ne: 'draft' }, stock: { $lte: 10 } }),
    Order.find({ status: 'Cancelled', updatedAt: { $gte: new Date(now - 7 * DAY) }, ...excl })
      .select('orderNumber _id cancelReason').limit(5).lean(),
  ]);

  const stuck = live.filter((o) => {
    const since = new Date(o.stageUpdatedAt || o.updatedAt || o.createdAt).getTime();
    return now - since > 48 * HOUR;
  }).length;

  const outOfStock = await Product.countDocuments({ isActive: true, status: { $ne: 'draft' }, stock: 0 });

  const alerts = [];
  if (pendingPay > 0) {
    alerts.push({
      id: 'payment-pending',
      severity: 'warning',
      title: `${pendingPay} order${pendingPay === 1 ? '' : 's'} pending payment verification 24h+`,
      detail: 'Work through them one tap at a time in the verification queue.',
      link: '/admin/verification-queue',
      cta: 'Open queue',
    });
  }
  if (stuck > 0) {
    alerts.push({
      id: 'stage-stuck',
      severity: 'warning',
      title: `${stuck} order${stuck === 1 ? '' : 's'} stuck in the same stage 48h+`,
      detail: 'These have not advanced in two days — check for a blocker.',
      link: '/admin/orders?sort=oldest',
      cta: 'Review',
    });
  }
  if (outOfStock > 0) {
    alerts.push({
      id: 'out-of-stock',
      severity: 'danger',
      title: `${outOfStock} product${outOfStock === 1 ? ' is' : 's are'} out of stock`,
      detail: 'Customers cannot buy these right now.',
      link: '/admin/products?stock=out',
      cta: 'Restock',
    });
  }
  if (lowStock - outOfStock > 0) {
    const n = lowStock - outOfStock;
    alerts.push({
      id: 'low-stock',
      severity: 'info',
      title: `${n} product${n === 1 ? '' : 's'} running low (≤ 10 left)`,
      detail: 'Reorder before they sell out.',
      link: '/admin/products?stock=low',
      cta: 'Update stock',
    });
  }
  if (cancelledToday.length > 0) {
    alerts.push({
      id: 'cancelled',
      severity: 'info',
      title: `${cancelledToday.length} order${cancelledToday.length === 1 ? '' : 's'} cancelled this week — review the reason`,
      detail: 'Repeat cancellations usually point at a fixable cause.',
      link: '/admin#cancellation-reasons',
      cta: 'View reasons',
    });
  }

  res.json({ alerts, generatedAt: new Date() });
}));

/* ---------------------------------------------------------------------------
 * GET /api/dashboard/insights — rotating observations from real data
 * ------------------------------------------------------------------------- */
router.get('/insights', asyncHandler(async (req, res) => {
  const now = new Date();
  const start30 = new Date(now - 30 * DAY);
  const start7 = new Date(now - 7 * DAY);
  const prev7 = new Date(now - 14 * DAY);
  const s = await Settings.findOne({ key: 'store' }).lean().catch(() => null);
  const excl = s?.includeTestOrders ? {} : { isTestOrder: { $ne: true } };

  const [recent, prior] = await Promise.all([
    Order.find({ createdAt: { $gte: start30 }, status: LIVE, ...excl })
      .select('customerInfo.city total items createdAt stageTimestamps').lean(),
    Order.find({ createdAt: { $gte: prev7, $lt: start7 }, status: LIVE, ...excl })
      .select('items total createdAt stageTimestamps').lean(),
  ]);

  const insights = [];
  const revenue = recent.reduce((n, o) => n + (Number(o.total) || 0), 0);

  // 1 — geography concentration
  if (revenue > 0) {
    const byCity = new Map();
    for (const o of recent) {
      const c = o.customerInfo?.city || 'Unknown';
      byCity.set(c, (byCity.get(c) || 0) + (Number(o.total) || 0));
    }
    const [city, amount] = [...byCity.entries()].sort((a, b) => b[1] - a[1])[0] || [];
    if (city) {
      const pct = Math.round((amount / revenue) * 100);
      insights.push({
        id: 'geo',
        icon: 'MapPin',
        text: `${city} made up ${pct}% of revenue this month.`,
        hint: pct > 70 ? 'Heavy concentration — a second city would spread the risk.' : '',
      });
    }
  }

  // 2 — product momentum, this week vs last
  const unitsIn = (list) => {
    const m = new Map();
    for (const o of list) for (const it of o.items || []) {
      m.set(it.name, (m.get(it.name) || 0) + (Number(it.quantity) || 0));
    }
    return m;
  };
  const thisWeek = unitsIn(recent.filter((o) => new Date(o.createdAt) >= start7));
  const lastWeek = unitsIn(prior);
  let best = null;
  for (const [name, qty] of thisWeek) {
    const before = lastWeek.get(name) || 0;
    if (before === 0 || qty <= before) continue;
    const growth = Math.round(((qty - before) / before) * 100);
    if (!best || growth > best.growth) best = { name, growth, qty };
  }
  if (best) {
    insights.push({
      id: 'product-momentum',
      icon: 'TrendingUp',
      text: `${best.name} sold ${best.growth}% more than last week (${best.qty} units).`,
      hint: 'Worth featuring on the home page while it runs hot.',
    });
  }

  // 3 — fulfilment speed trend
  const shipHours = (list) => {
    const vals = list.map((o) => {
      const t = o.stageTimestamps || {};
      const shipped = t.Shipped || t['In Transit'] || t['Out for Delivery'];
      if (!shipped) return null;
      return (new Date(shipped) - new Date(o.createdAt)) / HOUR;
    }).filter((v) => v !== null && v >= 0);
    return vals.length ? vals.reduce((a, c) => a + c, 0) / vals.length : null;
  };
  const nowSpeed = shipHours(recent.filter((o) => new Date(o.createdAt) >= start7));
  const thenSpeed = shipHours(prior);
  if (nowSpeed !== null && thenSpeed !== null && Math.abs(nowSpeed - thenSpeed) > 0.5) {
    const faster = nowSpeed < thenSpeed;
    insights.push({
      id: 'fulfilment',
      icon: faster ? 'Zap' : 'Clock',
      text: `Average time to ship ${faster ? 'improved' : 'slipped'} by ${Math.abs(nowSpeed - thenSpeed).toFixed(1)} hours vs last week.`,
      hint: faster ? '' : 'Slower dispatch is the usual cause of "where is my order" messages.',
    });
  }

  // 4 — repeat-purchase rate
  if (recent.length >= 5) {
    const byPhone = new Map();
    for (const o of recent) {
      const p = o.customerInfo?.phone;
      if (p) byPhone.set(p, (byPhone.get(p) || 0) + 1);
    }
    const repeat = [...byPhone.values()].filter((n) => n > 1).length;
    if (byPhone.size > 0) {
      const pct = Math.round((repeat / byPhone.size) * 100);
      insights.push({
        id: 'repeat',
        icon: 'Users',
        text: `${pct}% of customers this month ordered more than once.`,
        hint: pct < 20 ? 'A follow-up offer 2 weeks after delivery lifts this cheaply.' : '',
      });
    }
  }

  res.json({ insights, generatedAt: new Date() });
}));

/* ---------------------------------------------------------------------------
 * GET /api/dashboard/goal — monthly revenue goal + pace
 * ------------------------------------------------------------------------- */
router.get('/goal', asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne({ key: 'store' }).lean()) || {};
  const goal = Number(settings.monthlyRevenueGoal) || 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const daysInMonth = monthEnd.getDate();
  const dayOfMonth = now.getDate();

  const agg = await Order.aggregate([
    { $match: { createdAt: { $gte: monthStart }, status: LIVE } },
    { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  ]);
  const earned = agg[0]?.revenue || 0;
  const orders = agg[0]?.orders || 0;

  const pctElapsed = (dayOfMonth / daysInMonth) * 100;
  const pctAchieved = goal > 0 ? (earned / goal) * 100 : 0;
  const delta = pctAchieved - pctElapsed;

  res.json({
    goal,
    earned,
    orders,
    pctAchieved: Math.round(pctAchieved * 10) / 10,
    pctElapsed: Math.round(pctElapsed * 10) / 10,
    daysRemaining: daysInMonth - dayOfMonth,
    daysInMonth,
    // ±5pp of the elapsed line counts as on track — narrower than that flickers daily.
    pace: goal === 0 ? 'unset' : delta > 5 ? 'ahead' : delta < -5 ? 'behind' : 'on-track',
    dailyNeeded: goal > earned && daysInMonth - dayOfMonth > 0
      ? Math.ceil((goal - earned) / (daysInMonth - dayOfMonth)) : 0,
  });
}));

/* ---------------------------------------------------------------------------
 * GET /api/dashboard/compare?mode=prev|last-month|last-year&days=N
 * Backs the flexible comparison dropdown on the KPI row.
 * ------------------------------------------------------------------------- */
router.get('/compare', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const mode = String(req.query.mode || 'prev');
  const now = new Date();
  const curFrom = new Date(now); curFrom.setDate(curFrom.getDate() - days + 1); curFrom.setHours(0, 0, 0, 0);

  let baseFrom;
  let baseTo;
  if (mode === 'last-month') {
    baseFrom = new Date(curFrom); baseFrom.setMonth(baseFrom.getMonth() - 1);
    baseTo = new Date(now); baseTo.setMonth(baseTo.getMonth() - 1);
  } else if (mode === 'last-year') {
    baseFrom = new Date(curFrom); baseFrom.setFullYear(baseFrom.getFullYear() - 1);
    baseTo = new Date(now); baseTo.setFullYear(baseTo.getFullYear() - 1);
  } else {
    baseTo = new Date(curFrom.getTime() - 1);
    baseFrom = new Date(baseTo); baseFrom.setDate(baseFrom.getDate() - days + 1); baseFrom.setHours(0, 0, 0, 0);
  }

  const s = await Settings.findOne({ key: 'store' }).lean().catch(() => null);
  const excl = s?.includeTestOrders ? {} : { isTestOrder: { $ne: true } };
  const bucket = async (from, to) => {
    const r = await Order.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to }, status: LIVE, ...excl } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    ]);
    const row = r[0] || { revenue: 0, orders: 0 };
    return { ...row, aov: row.orders ? Math.round(row.revenue / row.orders) : 0 };
  };

  const [current, baseline] = await Promise.all([bucket(curFrom, now), bucket(baseFrom, baseTo)]);
  // growthPct returns null when there is no meaningful rate from zero —
  // the KPI cards show "New" / nothing instead of a fake 100%.
  const pct = (a, b) => growthPct(a, b);

  res.json({
    mode,
    days,
    current,
    baseline,
    hasBaseline: baseline.orders > 0,
    change: {
      revenue: pct(current.revenue, baseline.revenue),
      orders: pct(current.orders, baseline.orders),
      aov: pct(current.aov, baseline.aov),
    },
    label: mode === 'last-month' ? 'vs same period last month'
      : mode === 'last-year' ? 'vs same period last year'
        : `vs previous ${days} days`,
  });
}));

/* ---------------------------------------------------------------------------
 * Notifications — the bell in the admin topbar.
 * Mounted separately at /api/notifications so the paths stay flat.
 * ------------------------------------------------------------------------- */
const notifications = express.Router();
notifications.use(protect, adminOnly);

notifications.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 15));
  const [items, unread] = await Promise.all([
    OrderNotification.find().sort({ createdAt: -1 }).limit(limit).lean(),
    OrderNotification.countDocuments({ read: false }),
  ]);
  res.json({
    items: items.map((n) => ({
      id: n._id,
      type: n.type,
      severity: n.severity,
      title: n.title,
      body: n.body,
      link: n.link || (n.order ? `/admin/orders/${n.order}` : ''),
      orderNumber: n.orderNumber,
      read: n.read,
      at: n.createdAt,
    })),
    unread,
  });
}));

notifications.post('/read', asyncHandler(async (req, res) => {
  const { id, all } = req.body || {};
  if (all) await OrderNotification.updateMany({ read: false }, { read: true, readAt: new Date() });
  else if (id) await OrderNotification.updateOne({ _id: id }, { read: true, readAt: new Date() });
  res.json({ ok: true, unread: await OrderNotification.countDocuments({ read: false }) });
}));

module.exports = router;
module.exports.notifications = notifications;
