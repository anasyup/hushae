/* ============================================================================
 * ANALYTICS SERVICE — Phase 8: Single source of truth for KPI definitions
 *
 * Every analytics endpoint resolves metrics through this module so the numbers
 * always reconcile across Analytics, Finance, Dashboard, Reports.
 * ========================================================================== */

const DAY = 86400000;
const LIVE = { $nin: ['Cancelled', 'Refunded'] };

/* ── Date Range Resolution ──────────────────────────────────────────────── */
function resolveRange(query) {
  const to = query.to ? new Date(query.to) : new Date();
  to.setHours(23, 59, 59, 999);
  let from;

  const preset = String(query.range || query.preset || '30d');
  switch (preset) {
    case 'today':
      from = new Date(); from.setHours(0, 0, 0, 0); break;
    case 'yesterday':
      from = new Date(Date.now() - DAY); from.setHours(0, 0, 0, 0);
      to.setTime(from.getTime() + DAY - 1); break;
    case '7d': from = new Date(Date.now() - 7 * DAY); from.setHours(0, 0, 0, 0); break;
    case '30d': from = new Date(Date.now() - 30 * DAY); from.setHours(0, 0, 0, 0); break;
    case '90d': from = new Date(Date.now() - 90 * DAY); from.setHours(0, 0, 0, 0); break;
    case 'this_month':
      from = new Date(); from.setDate(1); from.setHours(0, 0, 0, 0); break;
    case 'last_month':
      from = new Date(); from.setDate(1); from.setMonth(from.getMonth() - 1); from.setHours(0, 0, 0, 0);
      to.setTime(new Date(from.getFullYear(), from.getMonth() + 1, 0, 23, 59, 59, 999).getTime()); break;
    case 'this_year':
      from = new Date(); from.setMonth(0, 1); from.setHours(0, 0, 0, 0); break;
    case 'all': from = new Date(0); break;
    case 'custom':
      from = query.from ? new Date(query.from) : new Date(Date.now() - 30 * DAY);
      from.setHours(0, 0, 0, 0); break;
    default:
      from = new Date(Date.now() - 30 * DAY); from.setHours(0, 0, 0, 0);
  }

  const days = Math.max(1, Math.round((to - from) / DAY));

  // Previous period for comparison
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - days * DAY);

  return { from, to, days, prevFrom, prevTo, preset };
}

/* ── KPI Definitions (authoritative) ────────────────────────────────────── */

/**
 * Revenue: Sum of qualifying order totals (status NOT Cancelled/Refunded).
 * Same definition as Finance Phase 7.
 */
function calcRevenue(orders) {
  return orders.reduce((s, o) => s + (o.total || 0), 0);
}

/**
 * AOV: Revenue / qualifying orders count.
 */
function calcAOV(revenue, orderCount) {
  return orderCount > 0 ? Math.round(revenue / orderCount) : 0;
}

/**
 * Repeat rate: customers with ≥2 orders / customers with ≥1 order.
 */
function calcRepeatRate(phoneCounts) {
  let total = 0, repeat = 0;
  for (const count of phoneCounts.values()) {
    total++;
    if (count >= 2) repeat++;
  }
  return total > 0 ? Math.round((repeat / total) * 100) : 0;
}

/**
 * Growth percentage: (current - previous) / previous × 100.
 * Returns null when previous is 0 (insufficient data).
 */
function calcGrowth(current, previous) {
  if (!previous || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/**
 * Build daily time series from orders.
 */
function buildDailySeries(orders, days, from) {
  const map = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * DAY).toISOString().slice(0, 10);
    map[d] = { date: d, revenue: 0, orders: 0, customers: new Set() };
  }
  for (const o of orders) {
    const d = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!map[d]) map[d] = { date: d, revenue: 0, orders: 0, customers: new Set() };
    map[d].revenue += o.total || 0;
    map[d].orders += 1;
    const key = o.customerInfo?.phone || o.customerInfo?.email || '';
    if (key) map[d].customers.add(key);
  }
  return Object.values(map).map(s => ({
    date: s.date, revenue: s.revenue, orders: s.orders, customers: s.customers.size,
  })).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Build monthly cohort retention from orders.
 * Groups customers by first-order month, then tracks what % ordered again in subsequent months.
 */
function buildCohorts(orders) {
  const customerFirstMonth = new Map(); // phone → 'YYYY-MM'
  const customerActivity = new Map(); // phone → Set<'YYYY-MM'>

  for (const o of orders) {
    const key = o.customerInfo?.phone || o.customerInfo?.email || '';
    if (!key) continue;
    const month = new Date(o.createdAt).toISOString().slice(0, 7);

    if (!customerFirstMonth.has(key) || month < customerFirstMonth.get(key)) {
      customerFirstMonth.set(key, month);
    }
    if (!customerActivity.has(key)) customerActivity.set(key, new Set());
    customerActivity.get(key).add(month);
  }

  // Group by cohort month
  const cohortMap = {};
  for (const [phone, firstMonth] of customerFirstMonth) {
    if (!cohortMap[firstMonth]) cohortMap[firstMonth] = { cohort: firstMonth, size: 0, retention: {} };
    cohortMap[firstMonth].size++;

    const activity = customerActivity.get(phone) || new Set();
    const [fy, fm] = firstMonth.split('-').map(Number);
    for (const activeMonth of activity) {
      if (activeMonth <= firstMonth) continue;
      const [ay, am] = activeMonth.split('-').map(Number);
      const monthsLater = (ay - fy) * 12 + (am - fm);
      if (monthsLater > 0 && monthsLater <= 12) {
        cohortMap[firstMonth].retention[monthsLater] = (cohortMap[firstMonth].retention[monthsLater] || 0) + 1;
      }
    }
  }

  // Convert to percentages
  return Object.values(cohortMap)
    .map(c => ({
      cohort: c.cohort,
      size: c.size,
      retention: Object.fromEntries(
        Object.entries(c.retention).map(([m, n]) => [m, Math.round((n / c.size) * 100)])
      ),
    }))
    .sort((a, b) => b.cohort.localeCompare(a.cohort))
    .slice(0, 12);
}

module.exports = {
  LIVE, DAY,
  resolveRange, calcRevenue, calcAOV, calcRepeatRate, calcGrowth,
  buildDailySeries, buildCohorts,
};
