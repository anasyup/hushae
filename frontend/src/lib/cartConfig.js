/* ============================================================================
 * CART CONFIG — the only place the bag reads its own rules from.
 *
 * Every string, toggle and number the Shopping Bag renders comes from
 * settings.cart (Admin → Settings → Shopping Bag). This file resolves the
 * merchant's saved values against the same defaults the Mongoose schema uses,
 * so the bag renders correctly on the very first paint — before /settings has
 * answered — and never flashes when it does.
 *
 * WHY DEFAULTS ARE DUPLICATED HERE
 * settings is null for ~400ms on a cold load. If a boolean's unset default
 * differed from the merchant's value the block would flash in or out and cost
 * CLS. Keeping these identical to backend/src/models/Settings.js means the
 * first paint already matches the saved configuration.
 *
 * Money rules (flat rate, free-shipping threshold) deliberately live at the
 * TOP level of settings, not in here, because Checkout reads the same two
 * fields. One source → cart and checkout can never quote different totals.
 * ========================================================================== */

export const CART_DEFAULTS = {
  title: 'Shopping Bag',
  emptyTitle: 'Your bag is empty',
  emptyText: 'Beautiful foundations are waiting. Start with the pieces everyone is reaching for.',
  continueLabel: 'Continue shopping',
  continueHref: '/women',
  checkoutLabel: 'Proceed to checkout',

  showDelivery: true,
  deliveryMinDays: 2,
  deliveryMaxDays: 5,
  deliveryNote: 'Discreet, unmarked packaging on every order',

  showProgress: true,
  progressAway: 'You are {amount} away from free shipping',
  progressDone: 'Free shipping unlocked',
  confetti: true,

  couponEnabled: true,
  saveForLater: true,
  undoSeconds: 5,
  maxQty: 10,
  recommendEnabled: true,
  recommendTitle: 'Complete the set',
  recommendStrategy: 'auto',

  applePay: false,
  googlePay: false,

  taxPercent: 0,
  taxLabel: 'Estimated tax',

  showTrust: true,
  trust: [
    { icon: 'ShieldCheck', label: 'Quality checked' },
    { icon: 'Package', label: 'Discreet packaging' },
    { icon: 'BadgeCheck', label: '100% original products' },
    { icon: 'Truck', label: '2\u20135 day delivery' },
  ],
};

/** Merge the merchant's saved cart block over the defaults. */
export function cartConfig(settings) {
  const c = settings?.cart || {};
  const out = { ...CART_DEFAULTS };
  for (const k of Object.keys(CART_DEFAULTS)) {
    const v = c[k];
    if (v === undefined || v === null || v === '') continue;
    // An empty trust array means "merchant deleted them all" only when the
    // key is genuinely present, otherwise fall back to the defaults.
    if (Array.isArray(v) && v.length === 0 && !(k in c)) continue;
    out[k] = v;
  }
  out.trust = (out.trust || []).filter((t) => t && t.label);
  return out;
}

/** Global money rules — shared with Checkout so the two can never disagree. */
export function shippingRules(settings) {
  return {
    flat: settings?.shippingFlatRate ?? 350,
    threshold: settings?.freeShippingThreshold ?? 4999,
  };
}

/** "{amount} away" → "PKR 1,250 away". Keeps copy editable from admin. */
export function fill(template, vars) {
  return String(template || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
}

/**
 * Delivery window as a human range, e.g. "Tue 4 – Fri 7 Aug".
 * Uses the merchant's min/max day settings.
 */
export function deliveryWindow(cfg, from = new Date()) {
  const day = 86400000;
  const a = new Date(from.getTime() + (Number(cfg.deliveryMinDays) || 2) * day);
  const b = new Date(from.getTime() + (Number(cfg.deliveryMaxDays) || 5) * day);
  const d = (x, withMonth) =>
    x.toLocaleDateString('en-GB', withMonth ? { weekday: 'short', day: 'numeric', month: 'short' } : { weekday: 'short', day: 'numeric' });
  const sameMonth = a.getMonth() === b.getMonth();
  return `${d(a, !sameMonth)} – ${d(b, true)}`;
}
