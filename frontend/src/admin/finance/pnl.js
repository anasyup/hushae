/* ============================================================================
 * FINANCE — pure P&L helpers
 *
 * Kept free of React and of the network so the arithmetic can be asserted
 * headlessly (scripts/test-finance-pnl-ui.mjs). All the money itself comes
 * from GET /api/finance/pnl, which is built on the backend's single source of
 * truth (utils/orderEconomics.js) — nothing here re-derives costs, which is
 * how the old page drifted away from its own tables.
 * ========================================================================== */

/* Period-over-period delta. Returns null when there is no meaningful
 * baseline, because "+Infinity%" is not information. */
export function delta(current, previous) {
  const c = Number(current) || 0;
  const p = Number(previous);
  if (!Number.isFinite(p) || p === 0) return null;
  return Math.round(((c - p) / Math.abs(p)) * 1000) / 10;
}

/* Is a change good? For costs a rise is bad, for profit a rise is good. */
export function deltaTone(pct, invert = false, rawChange = null) {
  if (pct == null) {
    /* No percentage is possible off a zero baseline, but the direction is
     * still known — and "costs went from nothing to something" is not a
     * neutral event, so fall back to the raw movement. */
    if (rawChange == null || rawChange === 0) return 'flat';
    const rose = rawChange > 0;
    return (invert ? !rose : rose) ? 'good' : 'bad';
  }
  if (pct === 0) return 'flat';
  const up = pct > 0;
  return (invert ? !up : up) ? 'good' : 'bad';
}

export const fmtDelta = (pct) => (pct == null ? '—' : `${pct > 0 ? '+' : ''}${pct}%`);

/* Build the activity-based income statement the page prints.
 * Groups carry subtotals; `memo` lines are shown but never summed, because a
 * refund is money that went back out and a cancelled order was never
 * collected — folding either into revenue makes the accounts unreadable. */
export function buildStatement(c) {
  if (!c) return [];
  const inc = c.income || {};
  const costs = c.costs || {};
  const opex = c.opex || {};
  return [
    {
      title: 'Income',
      rows: [
        { label: 'Merchandise', value: inc.merchandise },
        { label: 'Shipping charged', value: inc.shipping },
        { label: 'Discounts & promotions', value: -inc.discounts },
        { label: 'Store credit redeemed', value: -inc.rewards },
      ],
      subtotal: { label: 'Net sales', value: inc.net },
    },
    {
      title: 'Cost of goods',
      rows: [{ label: 'Wholesale cost of items sold', value: -costs.cogs }],
      subtotal: { label: 'Gross profit', value: c.grossProfit, rate: c.grossMargin },
    },
    {
      title: 'Fulfilment & fees',
      rows: [
        { label: 'Packaging', value: -costs.packaging },
        { label: 'Courier', value: -costs.courier },
        { label: 'Payment gateway fees', value: -costs.paymentFees },
      ],
      subtotal: { label: 'Trading profit', value: c.contribution, rate: c.contributionMargin },
    },
    {
      title: 'Lost orders',
      rows: [
        {
          label: `Returns after dispatch (${c.failed?.returnedAfterShip ?? 0})`,
          value: -(c.failed?.returnedAfterShipCost ?? 0),
        },
        {
          label: `Cancellations before dispatch (${c.failed?.cancelledBeforeShip ?? 0})`,
          value: -(c.failed?.cancelledBeforeShipCost ?? 0),
        },
      ],
      subtotal: { label: 'Profit after losses', value: c.contribution - (c.sunkCost ?? 0) },
    },
    /* Recorded expenses sit between the order-level losses and the settings
     * estimates. They get their own group so the merchant can see which of the
     * two is driving the number, and so double counting would be visible
     * rather than silent. */
    ...(c.recorded?.length ? [{
      title: 'Recorded expenses',
      rows: c.recorded.map((r) => ({ label: r.category, value: -r.amount })),
      subtotal: {
        label: 'Profit after expenses',
        value: (Number(c.contribution) || 0) - (Number(c.sunkCost) || 0) - (Number(c.recordedTotal) || 0),
      },
    }] : []),
    {
      title: 'Operating cost estimates',
      rows: [
        { label: 'Marketing (settings)', value: -opex.marketing },
        { label: 'SEO (settings)', value: -opex.seo },
        { label: 'Other (settings)', value: -opex.other },
      ],
      subtotal: { label: 'Net profit', value: c.netProfit, rate: c.netMargin, emphasis: true },
    },
  ];
}

/* Lines that must never be presented as revenue. */
export function buildMemos(c) {
  if (!c) return [];
  const m = c.memos || {};
  const out = [];
  if (m.taxCollected) out.push({ label: 'Tax collected (liability, not revenue)', value: m.taxCollected });
  if (c.income?.tax) out.push({ label: 'Tax collected (liability, not revenue)', value: c.income.tax });
  if (m.refundedValue) out.push({ label: `Refunded to customers (${m.refundedCount})`, value: m.refundedValue });
  if (m.cancelledValue) out.push({ label: `Cancelled, never collected (${m.cancelledCount})`, value: m.cancelledValue });
  /* de-duplicate the tax line if both shapes ever arrive */
  const seen = new Set();
  return out.filter((r) => (seen.has(r.label) ? false : (seen.add(r.label), true)));
}

/* Days of cover the current net profit buys against fixed monthly costs —
 * the number that answers "how long can I keep going". */
export function runwayDays(netProfit, monthlyFixed) {
  const fixed = Number(monthlyFixed) || 0;
  if (fixed <= 0) return null;
  const dailyBurn = fixed / 30;
  return Math.max(0, Math.round((Number(netProfit) || 0) / dailyBurn));
}

/* Headline cards. Each one names its own baseline so the page never shows a
 * percentage the reader cannot trace. */
export function buildKpis(cur, prev) {
  if (!cur) return [];
  const p = prev || {};
  return [
    { key: 'revenue', label: 'Net sales', value: cur.revenue, prev: p.revenue, sub: `${cur.orders} orders · AOV ${cur.aov}` },
    { key: 'gross', label: 'Gross profit', value: cur.grossProfit, prev: p.grossProfit, sub: `${cur.grossMargin}% gross margin` },
    { key: 'contribution', label: 'Contribution', value: cur.contribution, prev: p.contribution, sub: `${cur.contributionMargin}% after fulfilment & fees` },
    { key: 'net', label: 'Net profit', value: cur.netProfit, prev: p.netProfit, sub: `${cur.netMargin}% net margin`, verdict: true },
    { key: 'costs', label: 'Direct costs', value: cur.costs?.total, prev: p.costs?.total, sub: 'COGS, packing, courier, fees', invert: true },
    { key: 'sunk', label: 'Lost to failed orders', value: cur.sunkCost, prev: p.sunkCost, sub: `${(cur.failed?.returnedAfterShip ?? 0) + (cur.failed?.cancelledBeforeShip ?? 0)} orders`, invert: true },
  ].map((k) => {
    const pct = delta(k.value, k.prev);
    const rawChange = Number.isFinite(Number(k.prev)) ? (Number(k.value) || 0) - Number(k.prev) : null;
    return { ...k, pct, tone: deltaTone(pct, k.invert, rawChange) };
  });
}
