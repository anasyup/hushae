/* ============================================================================
 * CUSTOMER EXPERIENCE CONFIG — wishlist · recently viewed · compare
 *
 * Same contract as cartConfig / checkoutConfig / accountConfig: these defaults
 * are byte-identical to the `customerExperience` block in
 * backend/src/models/Settings.js, so the first paint already matches the
 * merchant's saved values and nothing flashes while /settings is in flight
 * (settings is null for ~400ms on a cold load).
 *
 * The merge is per-sub-block rather than a flat spread, because a merchant who
 * has only ever touched the wishlist settings still needs full defaults for
 * recentlyViewed and compare.
 * ========================================================================== */

export const CX_DEFAULTS = {
  wishlist: {
    enabled: true,
    allowGuest: true,
    maxItems: 50,
    allowShare: true,
    allowMoveToCart: true,
    allowClearAll: true,
    title: 'Wishlist',
    emptyText: 'Tap the heart on any piece to keep it here for later.',
  },
  recentlyViewed: {
    enabled: true,
    maxItems: 12,
    expiryDays: 30,
    showOnHome: false,   // merchant removed this row on purpose; opt-in only
    showOnProduct: true,
    title: 'Recently viewed',
  },
  compare: {
    enabled: true,
    maxItems: 4,
    showOnCard: true,
    highlightDifferences: true,
    title: 'Compare',
  },
};

/** Merge the merchant's saved block over the defaults, one sub-block at a time. */
export function cxConfig(settings) {
  const src = settings?.customerExperience || {};
  const out = {};
  for (const group of Object.keys(CX_DEFAULTS)) {
    out[group] = { ...CX_DEFAULTS[group] };
    const saved = src[group] || {};
    for (const k of Object.keys(CX_DEFAULTS[group])) {
      const v = saved[k];
      if (v === undefined || v === null || v === '') continue;
      out[group][k] = v;
    }
  }
  return out;
}
