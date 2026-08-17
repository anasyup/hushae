/* ============================================================================
 * PRODUCT GRID — the one full-bleed hairline grid used by every product list.
 *
 * This class string was duplicated verbatim in nine places (Home featured,
 * New Arrivals, Shop, Sale, Collection, Search results, Search recovery,
 * Fabric Tech, PDP recently-viewed). Changing the responsive behaviour meant
 * editing nine files and hoping none were missed — the previous column change
 * did exactly that and left them briefly inconsistent. It lives here now.
 *
 * COLUMNS — 2 / 3 / 4, and deliberately 2 from the smallest screen up.
 *
 * MEASURED at 390px with the old `grid-cols-1` base: each card became a
 * 390x636px full-width block (559px image + 77px info row). Ten New Arrivals
 * cards produced 6,360px of scroll in ONE section, and the homepage came to
 * 14,517px on mobile against 7,606px on desktop — 1.9x TALLER on the smaller
 * screen, roughly seventeen phone-screens of scrolling to reach the footer.
 * /shop was 9,508px against 3,373px.
 *
 * Two-up is the standard mobile e-commerce grid (Zara, COS, Uniqlo) and it
 * costs the full-bleed look nothing: the cards still touch both edges, the
 * 1px #e7e5e0 gaps still draw the hairline rules, the cards themselves are
 * untouched. The 560px breakpoint that used to introduce the second column is
 * therefore redundant and has been dropped.
 * ========================================================================== */
export const PRODUCT_GRID =
  'grid grid-cols-2 gap-px border-y border-[#e7e5e0] bg-[#e7e5e0] md:grid-cols-3 lg:grid-cols-4';

/* Same grid without the leading `grid` token, for the one caller that composes
   the class list conditionally (Shop's preset switch). */
export const PRODUCT_GRID_INNER =
  'grid-cols-2 gap-px border-y border-[#e7e5e0] bg-[#e7e5e0] md:grid-cols-3 lg:grid-cols-4';
