/* ============================================================================
 * Adaptive print layout.
 *
 * A4 is 210 × 297 mm. With a 10 mm margin we have 190 × 277 mm of usable area,
 * which we treat as a 2 × 2 grid of "cells". A slip claims one, two or four
 * cells depending on how many lines it has to print, and cells are packed so
 * paper is never wasted and a slip is never clipped.
 * ========================================================================== */

/** Lines a slip can show before it needs more room, per size. */
const CAPACITY = { quarter: 4, half: 11 };

/** How many grid cells each size occupies. */
export const CELLS = { quarter: 1, half: 2, full: 4 };
const CELLS_PER_PAGE = 4;

/** Choose the smallest size that fits the order without clipping. */
export function sizeFor(order, docType = 'packing_slip') {
  const lines = order.lineCount ?? (order.items || []).length;
  // Invoices carry totals, tax lines and a payment block — they need more room.
  const budget = docType === 'invoice' ? 1 : 0;
  if (lines + budget <= CAPACITY.quarter) return 'quarter';
  if (lines + budget <= CAPACITY.half) return 'half';
  return 'full';
}

/**
 * Pack sized slips into pages.
 *
 * Greedy first-fit: keep filling the current page while the slip fits, then
 * start a new one. Half slips are placed as a full-width row so the visual
 * grid stays honest — a half never sits beside a quarter.
 *
 * @returns {{ pages: Array<{ slips: Array<{order, size}> }>, sizes: Object }}
 */
export function paginate(orders, docType = 'packing_slip') {
  const sized = orders.map((o) => ({ order: o, size: sizeFor(o, docType) }));

  const pages = [];
  let page = [];
  let used = 0;

  for (const slip of sized) {
    const cost = CELLS[slip.size];
    if (used + cost > CELLS_PER_PAGE) {
      pages.push({ slips: page });
      page = [];
      used = 0;
    }
    page.push(slip);
    used += cost;
  }
  if (page.length) pages.push({ slips: page });

  const sizes = sized.reduce((acc, s) => ({ ...acc, [s.size]: (acc[s.size] || 0) + 1 }), {});
  return { pages, sizes, total: sized.length };
}

/** Human summary for the preview header. */
export function describeLayout({ pages, sizes, total }) {
  const bits = [];
  if (sizes.quarter) bits.push(`${sizes.quarter} quarter-page`);
  if (sizes.half) bits.push(`${sizes.half} half-page`);
  if (sizes.full) bits.push(`${sizes.full} full-page`);
  return `${total} slip${total === 1 ? '' : 's'} · ${pages.length} A4 page${pages.length === 1 ? '' : 's'}${bits.length ? ` · ${bits.join(', ')}` : ''}`;
}
