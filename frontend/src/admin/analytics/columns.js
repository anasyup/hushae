/* ============================================================================
 * ANALYTICS — column definitions for the report sections
 *
 * Every row in a report section is a 12-column grid: the lead cell (rank +
 * name) always takes 4, so the metrics beside it must total exactly 8.
 * Those numbers live here, in one place, instead of being repeated on every
 * <Metric> — and `scripts/test-analytics-sections.mjs` imports this same file
 * to prove the sums hold. Change a span here and the header labels move with
 * it, because <HeadRow> and <Metric> read the same object.
 *
 * hide: 'md' | 'sm' — column drops out on narrow viewports (see analytics.css).
 * ========================================================================== */

/* The lead cell's fixed share of the 12-column grid. */
export const LEAD_SPAN = 4;
export const GRID_COLS = 12;
export const METRIC_BUDGET = GRID_COLS - LEAD_SPAN; /* 8 */

/* Product conversion — views → orders. */
export const PRODUCT_COLS = [
  { label: 'Views', span: 1, hide: 'md' },
  { label: 'Conv.', span: 2, align: 'c' },
  { label: 'Orders', span: 1, hide: 'sm' },
  { label: 'Revenue', span: 3 },
  { label: 'Returns', span: 1, align: 'c', hide: 'md' },
];

/* Customer value — lifetime spend. */
export const CUSTOMER_COLS = [
  { label: 'Orders', span: 2, align: 'c' },
  { label: 'Lifetime spend', span: 6 },
];

/* Coupon ROI. */
export const COUPON_COLS = [
  { label: 'Uses', span: 2, align: 'c' },
  { label: 'Revenue', span: 3 },
  { label: 'Cost', span: 3 },
];

/* Top variants. */
export const VARIANT_COLS = [
  { label: 'Units', span: 2, align: 'c' },
  { label: 'Revenue', span: 6 },
];

/* Win-back list. */
export const WINBACK_COLS = [
  { label: 'Silent', span: 2, align: 'c' },
  { label: 'Action', span: 6 },
];

/* Quality radar. */
export const QUALITY_COLS = [
  { label: 'Returns', span: 4, align: 'c' },
  { label: 'Rate', span: 4 },
];

/* Build-your-own report. */
export const CUSTOM_COLS = [
  { label: 'Orders', span: 2, align: 'c' },
  { label: 'Revenue', span: 3 },
  { label: 'Share', span: 3, hide: 'md' },
];

/* Every column set, for validation. */
export const ALL_COL_SETS = {
  PRODUCT_COLS,
  CUSTOMER_COLS,
  COUPON_COLS,
  VARIANT_COLS,
  WINBACK_COLS,
  QUALITY_COLS,
  CUSTOM_COLS,
};

/* Sum of a column set's spans — must equal METRIC_BUDGET. */
export const colSum = (cols) => cols.reduce((s, c) => s + c.span, 0);
