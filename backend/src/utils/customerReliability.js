/* ============================================================================
 * Customer reliability — computed server-side, keyed by phone number (the
 * most reliable COD identifier).
 *
 * Derives the score from the customer's actual order history, so it is always
 * current — the moment an order is cancelled/delivered the next read reflects
 * it. (No stale cache to invalidate; equivalent to "recalculated whenever a
 * status changes", but guaranteed to never drift.)
 * ========================================================================== */

/**
 * @param {Array} orders — that customer's orders (need .status, .customerService)
 * @returns reliability descriptor
 */
function reliabilityFromOrders(orders = []) {
  const total = orders.length;
  const delivered = orders.filter((o) => o.status === 'Delivered').length;
  const cancelled = orders.filter((o) => ['Cancelled', 'Refunded'].includes(o.status)).length;
  const noResponse = orders.filter((o) => o?.customerService?.hasIssue && /no.?response/i.test(o?.customerService?.issueType || '')).length;
  const cancelRate = total ? Math.round((cancelled / total) * 1000) / 10 : 0;

  let tier = 'neutral';
  if (total <= 2) tier = 'new';                                             // first or second order
  else if (cancelRate > 40 && total >= 3) tier = 'high-risk';
  else if (cancelRate < 10 && delivered >= 2) tier = 'reliable';

  const LABEL = {
    reliable: 'Reliable', 'new': 'New customer', 'high-risk': 'High risk', neutral: '',
  };
  return {
    totalOrders: total,
    delivered,
    cancelled,
    noResponse,
    cancelRate,
    tier,
    label: LABEL[tier],
  };
}

/* Aggregation-style grouping: takes an array of orders (any customers) and
   returns a Map keyed by the last-10-digit phone tail → reliability. */
function reliabilityMap(orders = []) {
  const byPhone = new Map();
  for (const o of orders) {
    const key = String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10);
    if (!key) continue;
    if (!byPhone.has(key)) byPhone.set(key, []);
    byPhone.get(key).push(o);
  }
  const map = new Map();
  for (const [key, list] of byPhone) map.set(key, reliabilityFromOrders(list));
  return map;
}

module.exports = { reliabilityFromOrders, reliabilityMap };
