/* ============================================================================
 * MARKETING CONFIG
 *
 * Same contract as cartConfig / checkoutConfig / loyaltyConfig / searchConfig:
 * defaults byte-identical to the `marketing` block in Settings.js AND to
 * DEFAULTS in promotionEngine.js.
 *
 * Sprint 2J shipped a live bug from breaking exactly this contract — the
 * engine's synonym table was empty while the schema seeded twelve, so
 * "panty" returned one fuzzy match instead of a whole category. A parity
 * guard was added then and covers this file too.
 *
 * Everything here is PRESENTATION. No promotion is evaluated in the browser:
 * the server decides every rupee, and the cart re-quotes on every change. If
 * this file goes stale a shopper sees a wrong label, never a wrong price.
 * ========================================================================== */

export const MARKETING_DEFAULTS = {
  enabled: false,
  maxTotalDiscountPercent: 40,
  minMarginPercent: 0,
  allowWithCoupon: true,
  allowStacking: false,
  flash: {
    enabled: false,
    showCountdown: true,
    countdownLabel: 'Ends in',
    urgencyMinutes: 60,
    showStockLeft: true,
    lowStockThreshold: 5,
  },
  badges: {
    enabled: false,
    newDays: 21,
    showNew: true,
    showSale: true,
    minSalePercent: 25,
    showTrending: true,
    trendingDays: 7,
    trendingMinOrders: 3,
    showBestSeller: true,
    showLimitedStock: true,
    limitedStockThreshold: 5,
    maxPerCard: 2,
  },
  upsell: {
    enabled: false,
    title: 'Add to your order',
    count: 4,
    maxPriceRatio: 0.8,
    source: 'auto',
    manualProductIds: [],
  },
  crossSell: {
    enabled: false,
    title: 'Goes well with',
    count: 4,
    onProductPage: true,
    onCart: true,
  },
  boughtTogether: {
    enabled: false,
    title: 'Frequently bought together',
    count: 3,
    windowDays: 180,
    minCoOccur: 2,
    bundleDiscountPercent: 0,
  },
  schedule: { timezone: 'Asia/Karachi', evaluateOnRead: true },
};

const GROUPS = ['flash', 'badges', 'upsell', 'crossSell', 'boughtTogether', 'schedule'];

export function marketingConfig(settings) {
  const src = settings?.marketing || {};
  const out = { ...MARKETING_DEFAULTS };
  for (const k of Object.keys(MARKETING_DEFAULTS)) {
    if (GROUPS.includes(k)) continue;
    const v = src[k];
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  for (const g of GROUPS) out[g] = { ...MARKETING_DEFAULTS[g], ...(src[g] || {}) };
  return out;
}

/* ---------------------------------------------------------------------------
 * Badge tones. Colour alone must never carry meaning (WCAG 1.4.1), so every
 * badge keeps its word and the tone only reinforces it. These map onto the
 * classes already defined in index.css rather than inventing new ones.
 * ------------------------------------------------------------------------- */
export const BADGE_TONE = {
  sale: 'badge-sale',
  new: 'badge-new',
  accent: 'badge-best',
  urgent: 'badge-neutral',
  flash: 'badge-sale',
  bundle: 'badge-sage',
  exclusive: 'badge-new',
};

/**
 * Time left, in the pieces a countdown needs.
 * Returns null once it has passed, so a caller can stop rendering rather than
 * showing 00:00:00 forever.
 */
export function timeLeft(endsAt) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    total,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** "2 days 4 hours left" — for a screen reader, which must not hear ticking. */
export function timeLeftWords(endsAt) {
  const t = timeLeft(endsAt);
  if (!t) return '';
  if (t.days > 0) return `${t.days} day${t.days === 1 ? '' : 's'} and ${t.hours} hour${t.hours === 1 ? '' : 's'} left`;
  if (t.hours > 0) return `${t.hours} hour${t.hours === 1 ? '' : 's'} and ${t.minutes} minute${t.minutes === 1 ? '' : 's'} left`;
  return `${t.minutes} minute${t.minutes === 1 ? '' : 's'} left`;
}

/**
 * Does a promotion's published scope cover this product?
 *
 * Presentation only — it decides whether to draw a badge. The server decides
 * whether the discount actually applies, and its scope check is the real one.
 * A badge shown in error costs a glance; a price computed in error costs money,
 * which is why prices are never worked out here.
 */
export function scopeCovers(scope, product) {
  if (!scope || !product) return false;
  if (scope.gender && product.gender !== scope.gender) return false;
  if ((scope.tiers || []).length && !scope.tiers.includes(product.tier)) return false;

  switch (scope.mode) {
    case 'all': return true;
    case 'products': return (scope.productIds || []).includes(String(product._id || product.id));
    case 'categories': return (scope.categorySlugs || []).includes(product.categorySlug);
    case 'tags': {
      const tags = (product.tags || []).map((t) => String(t).toLowerCase());
      return (scope.tags || []).some((t) => tags.includes(String(t).toLowerCase()));
    }
    case 'rules': return true;
    default: return false;
  }
}
