/* ============================================================================
 * LOYALTY CONFIG
 *
 * Same contract as cartConfig / checkoutConfig / accountConfig / cxConfig /
 * reviewsConfig: these defaults are byte-identical to the `loyalty` block in
 * backend/src/models/Settings.js and to DEFAULTS in
 * backend/src/utils/loyaltyEngine.js.
 *
 * Why three copies of the same numbers instead of one fetch? Because the first
 * paint must already be right. If the storefront waited for /settings before
 * knowing "1 point = PKR 1", every rewards figure would flash a wrong value
 * first. Matching defaults means the flash cannot happen.
 *
 * These are PRESENTATION defaults only. Nothing here decides what a customer
 * is actually paid — the server computes every rupee and every point. If this
 * file ever drifts from the server, the customer sees a stale label; they can
 * never receive a wrong balance.
 * ========================================================================== */
import { pkr } from './format';

export const LOYALTY_DEFAULTS = {
  enabled: false,
  programName: 'HUSHAE Circle',
  pointsName: 'points',
  pointsNameOne: 'point',
  dashboardTitle: 'Rewards',
  joinText: 'Earn points on everything you buy, and turn them into money off.',

  earn: {
    perCurrency: 0.01,
    roundingMode: 'floor',
    awardOnStatus: 'Delivered',
    earnOnDiscounted: true,
    earnOnShipping: false,
    signupPoints: 100,
    signupEnabled: true,
    firstOrderPoints: 200,
    firstOrderEnabled: true,
    reviewPoints: 50,
    reviewEnabled: true,
    newsletterPoints: 25,
    newsletterEnabled: true,
    profilePoints: 25,
    profileEnabled: true,
    birthdayPoints: 250,
    birthdayEnabled: true,
  },

  redeem: {
    enabled: true,
    pointValue: 1,
    minPoints: 200,
    maxPercentOfOrder: 50,
    step: 50,
  },

  expiry: { enabled: true, months: 12, warnDays: 30 },

  tiers: {
    enabled: true,
    windowMonths: 12,
    levels: [
      { id: 'bronze', name: 'Bronze', minSpend: 0, multiplier: 1, freeShipping: false, discountPercent: 0, colour: '#B3927E', perks: ['Earn points on every order'] },
      { id: 'silver', name: 'Silver', minSpend: 15000, multiplier: 1.25, freeShipping: false, discountPercent: 0, colour: '#C9BFB4', perks: ['1.25× points', 'Early access to drops'] },
      { id: 'gold', name: 'Gold', minSpend: 40000, multiplier: 1.5, freeShipping: true, discountPercent: 5, colour: '#C8A96A', perks: ['1.5× points', 'Free delivery', '5% member discount'] },
      { id: 'platinum', name: 'Platinum', minSpend: 90000, multiplier: 1.75, freeShipping: true, discountPercent: 8, colour: '#8F9C8B', perks: ['1.75× points', 'Free delivery', '8% member discount', 'Priority support'] },
      { id: 'diamond', name: 'Diamond', minSpend: 180000, multiplier: 2, freeShipping: true, discountPercent: 12, colour: '#5C6A5A', perks: ['2× points', 'Free delivery', '12% member discount', 'Private previews'] },
    ],
  },

  referral: {
    enabled: true,
    referrerPoints: 300,
    refereePoints: 150,
    payOnStatus: 'Delivered',
    minOrderValue: 1500,
    maxPerMonth: 10,
    codePrefix: 'HUS',
  },

  credit: { enabled: true, allowAtCheckout: true },

  giftCards: {
    enabled: true,
    minAmount: 500,
    maxAmount: 50000,
    expiryMonths: 12,
    codePrefix: 'HUSGC',
  },

  achievements: {
    enabled: true,
    list: [
      { id: 'first-buy', name: 'First order', note: 'Placed your first HUSHAE order', icon: 'ShoppingBag', metric: 'orders', target: 1, points: 0 },
      { id: 'regular', name: 'Regular', note: 'Five orders in', icon: 'Repeat', metric: 'orders', target: 5, points: 100 },
      { id: 'reviewer', name: 'Reviewer', note: 'Wrote three reviews', icon: 'Star', metric: 'reviews', target: 3, points: 75 },
      { id: 'connector', name: 'Connector', note: 'Referred three friends', icon: 'Users', metric: 'referrals', target: 3, points: 150 },
    ],
  },

  limits: {
    maxPointsPerOrder: 5000,
    maxPointsPerDay: 10000,
    minSecondsBetweenEarns: 2,
    blockSelfReferral: true,
  },

  notify: { onEarn: true, onTierUp: true, onExpiring: true },
};

/* Sub-objects are merged one level down, which is exactly the shape of this
   block. A saved `redeem: { step: 25 }` must not wipe out `pointValue`. */
const GROUPS = [
  'earn', 'redeem', 'expiry', 'tiers', 'referral',
  'credit', 'giftCards', 'achievements', 'limits', 'notify',
];

export function loyaltyConfig(settings) {
  const src = settings?.loyalty || {};
  const out = { ...LOYALTY_DEFAULTS };

  for (const k of Object.keys(LOYALTY_DEFAULTS)) {
    if (GROUPS.includes(k)) continue;
    const v = src[k];
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }

  for (const g of GROUPS) {
    out[g] = { ...LOYALTY_DEFAULTS[g], ...(src[g] || {}) };
    // An empty saved array is a real merchant choice ("no tiers"), but a
    // missing one is not — fall back rather than render an empty ladder.
    if (g === 'tiers' && !Array.isArray(out.tiers.levels)) {
      out.tiers.levels = LOYALTY_DEFAULTS.tiers.levels;
    }
    if (g === 'achievements' && !Array.isArray(out.achievements.list)) {
      out.achievements.list = LOYALTY_DEFAULTS.achievements.list;
    }
  }

  return out;
}

/* ---------------------------------------------------------------------------
 * Shared display helpers. The dashboard, the checkout box and the admin
 * preview all need to say the same thing the same way.
 * ------------------------------------------------------------------------- */

/** "1 point" / "250 points" — respects the merchant's own wording. */
export function pointsLabel(n, cfg) {
  const one = cfg?.pointsNameOne || 'point';
  const many = cfg?.pointsName || 'points';
  return `${Number(n || 0).toLocaleString('en-PK')} ${Math.abs(Number(n) || 0) === 1 ? one : many}`;
}

/** What a points balance is worth in rupees, at the merchant's rate. */
export function pointsToPkr(points, cfg) {
  return Math.floor((Number(points) || 0) * (Number(cfg?.redeem?.pointValue) || 1));
}

/** "PKR 100 = 1 point" — the earn rate said in a way a shopper understands. */
export function earnRateText(cfg) {
  const per = Number(cfg?.earn?.perCurrency) || 0;
  if (per <= 0) return '';
  const spend = Math.round(1 / per);
  return `${pkr(spend)} = 1 ${cfg?.pointsNameOne || 'point'}`;
}

/** The tier a spend figure lands in. Mirrors resolveTier() on the server. */
export function resolveTierClient(spend, cfg) {
  const levels = [...((cfg?.tiers?.levels) || [])]
    .filter((l) => l && l.id)
    .sort((a, b) => (a.minSpend || 0) - (b.minSpend || 0));
  if (!levels.length) return { current: null, next: null, progress: 0, toNext: 0 };

  let current = levels[0];
  for (const l of levels) if (spend >= (l.minSpend || 0)) current = l;

  const idx = levels.findIndex((l) => l.id === current.id);
  const next = levels[idx + 1] || null;
  const floor = current.minSpend || 0;
  const ceiling = next ? next.minSpend : floor;
  const progress = next && ceiling > floor
    ? Math.min(100, Math.max(0, ((spend - floor) / (ceiling - floor)) * 100))
    : 100;

  return { current, next, progress: Math.round(progress), toNext: next ? Math.max(0, ceiling - spend) : 0 };
}
