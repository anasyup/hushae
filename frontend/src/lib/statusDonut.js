/* ============================================================================
 * Order Status Mix donut — pure data helpers (no React), so the exact logic
 * that renders the dashboard donut can be unit-tested in
 * tests/dashboard-donut.mjs.
 *
 * The donut counts orders by their FULFILMENT status (Order.status).
 * Its sibling widget "Payment health" counts by PAYMENT verification state
 * (Order.paymentState) — a different field, on purpose. The two concepts must
 * never share a label (see PAYMENT_STATES in admin/orders/orderConstants.js).
 * ========================================================================== */

/* Canonical display order — mirrors ORDER_STATUSES in
 * backend/src/models/Order.js. Keeping the same order here means the donut
 * always reads left-to-right as the fulfilment flow. */
export const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Processing',
  'Ready to Ship',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Refunded',
];

export const STATUS_COLORS = {
  Pending: '#f59e0b',
  Confirmed: '#06b6d4',
  Processing: '#3b82f6',
  'Ready to Ship': '#6366f1',
  Shipped: '#8b5cf6',
  'Out for Delivery': '#a855f7',
  Delivered: '#10b981',
  Cancelled: '#ef4444',
  Refunded: '#f97316',
};

/**
 * Build the donut segments from a `{ status: count }` map (the `byStatus`
 * object returned by GET /api/admin/dashboard).
 *
 * Rules:
 *   · A status with 0 orders is excluded — no empty slice, no "0" legend row.
 *   · Segments are ordered by the canonical fulfilment flow.
 *   · `total` is the sum of the SEGMENTS THEMSELVES, so the number in the
 *     donut centre always equals the sum of the legend values.
 *   · Unknown / legacy statuses (anything not in ORDER_STATUSES) are appended
 *     at the end so a non-empty bucket can never be silently dropped.
 */
export function buildStatusDonut(byStatus = {}) {
  const src = byStatus || {};
  const count = (name) => {
    const n = Number(src[name]);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  const segments = ORDER_STATUSES
    .filter((name) => count(name) > 0)
    .map((name) => ({ name, value: count(name), color: STATUS_COLORS[name] || '#9ca3af' }));

  const known = new Set(ORDER_STATUSES);
  for (const [name, raw] of Object.entries(src)) {
    if (!known.has(name) && Number(raw) > 0) {
      segments.push({ name, value: Number(raw), color: STATUS_COLORS[name] || '#9ca3af' });
    }
  }

  const total = segments.reduce((n, d) => n + d.value, 0);
  return { segments, total };
}
