/* ============================================================================
 * CHECKOUT CONFIG — the only place checkout reads its own rules from.
 *
 * Same contract as cartConfig.js: these defaults are byte-identical to
 * backend/src/models/Settings.js, so the first paint already matches the
 * merchant's saved configuration and nothing flashes while /settings is in
 * flight (settings is null for ~400ms on a cold load).
 *
 * Money is NOT in here. Checkout prices through useCartPricing, the same
 * engine the bag and the drawer use, so the three can never disagree.
 * ========================================================================== */

export const CHECKOUT_DEFAULTS = {
  title: 'Checkout',
  subtitle: 'Secure checkout · discreet, unmarked packaging on every order',

  guestCheckout: true,
  accountRequired: false,
  rememberCustomer: true,

  showOrderNotes: true,
  orderNotesLabel: 'Order notes (optional)',
  orderNotesHint: 'Rider instructions, landmarks…',
  showBillingAddress: true,
  showPinLocation: true,

  termsRequired: false,
  termsText: 'I agree to the Terms of Service and Returns Policy',
  privacyText: 'Your details are used only to deliver this order. We never sell your data.',
  showNewsletter: true,
  newsletterText: 'Email me about new drops and private offers',

  showTrust: true,
  trust: [
    { icon: 'Lock', label: 'Secure, encrypted checkout' },
    { icon: 'RefreshCw', label: 'Easy 7-day exchanges' },
    { icon: 'Package', label: 'Discreet, unmarked parcel' },
    { icon: 'Headphones', label: 'WhatsApp support, 7 days a week' },
  ],

  paymentList: [
    { id: 'COD', label: 'Cash on Delivery', note: 'Pay the rider at your door', icon: 'Banknote', enabled: true, needsTxn: false, instructions: '', comingSoon: false },
    { id: 'JazzCash', label: 'JazzCash', note: 'Send, then enter the transaction ID', icon: 'Smartphone', enabled: true, needsTxn: true, instructions: '', comingSoon: false },
    { id: 'EasyPaisa', label: 'EasyPaisa', note: 'Send, then enter the transaction ID', icon: 'Smartphone', enabled: true, needsTxn: true, instructions: '', comingSoon: false },
    { id: 'Bank Transfer', label: 'Bank Transfer', note: 'Transfer, then enter the reference', icon: 'Landmark', enabled: true, needsTxn: true, instructions: '', comingSoon: false },
  ],

  shippingMethods: [
    { id: 'standard', label: 'Standard delivery', note: 'Nationwide courier', rate: 0, minDays: 2, maxDays: 5, enabled: true, freeEligible: true },
    { id: 'express', label: 'Express delivery', note: 'Next working day in major cities', rate: 600, minDays: 1, maxDays: 2, enabled: false, freeEligible: false },
    { id: 'pickup', label: 'Store pickup', note: 'Collect from our outlet', rate: 0, minDays: 1, maxDays: 2, enabled: false, freeEligible: true },
    { id: 'local', label: 'Local delivery', note: 'Same-day inside the city', rate: 250, minDays: 0, maxDays: 1, enabled: false, freeEligible: false },
  ],

  successTitle: 'Thank you — your order is confirmed',
  successText: 'We are preparing your parcel now. Keep your order number safe — you will need it to track delivery.',
  successNote: '',
  showSuccessRecommend: false,
  showSuccessShare: false,
  successShareText: 'I just ordered from HUSHAE',
  animations: true,
};

/** Merge the merchant's saved checkout block over the defaults. */
export function checkoutConfig(settings) {
  const c = settings?.checkout || {};
  const out = { ...CHECKOUT_DEFAULTS };
  for (const k of Object.keys(CHECKOUT_DEFAULTS)) {
    const v = c[k];
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0 && !(k in c)) continue;
    out[k] = v;
  }

  /* ------------------------------------------------------------------
   * Backwards compatibility.
   * Stores created before this sprint only have the old boolean block
   * settings.paymentMethods = { cod, jazzcash, easypaisa, bank }. If the
   * merchant has never opened the new Checkout page, honour those booleans
   * so a method they switched OFF does not silently come back on.
   * ---------------------------------------------------------------- */
  if (!Array.isArray(c.paymentList) || c.paymentList.length === 0) {
    const legacy = settings?.paymentMethods;
    if (legacy) {
      const map = { COD: 'cod', JazzCash: 'jazzcash', EasyPaisa: 'easypaisa', 'Bank Transfer': 'bank' };
      out.paymentList = out.paymentList.map((m) => {
        const key = map[m.id];
        return key && legacy[key] !== undefined ? { ...m, enabled: !!legacy[key] } : m;
      });
    }
  }

  out.trust = (out.trust || []).filter((t) => t && t.label);
  out.paymentList = (out.paymentList || []).filter((m) => m && m.id);
  out.shippingMethods = (out.shippingMethods || []).filter((m) => m && m.id);
  return out;
}

/** Only the methods a customer may actually pick. */
export const enabledPayments = (cfg) => cfg.paymentList.filter((m) => m.enabled);
export const enabledShipping = (cfg) => cfg.shippingMethods.filter((m) => m.enabled);

/**
 * What this shipping method costs, given the pricing already computed by
 * useCartPricing. Mirrors backend/src/routes/orders.js exactly — if these two
 * ever drift the customer is quoted a total the server will not charge.
 */
export function shippingCostFor(method, pricing) {
  if (!method) return pricing.shipping;
  const base = pricing.freeShip ? 0 : pricing.flat;
  if (method.freeEligible !== false && base === 0) return 0;
  return Number(method.rate) || 0;
}

/** "Tue 4 – Fri 7 Aug" for a given shipping method. */
export function methodWindow(method, from = new Date()) {
  const day = 86400000;
  const a = new Date(from.getTime() + (Number(method?.minDays) ?? 2) * day);
  const b = new Date(from.getTime() + (Number(method?.maxDays) ?? 5) * day);
  const fmt = (x, withMonth) => x.toLocaleDateString('en-GB', withMonth
    ? { weekday: 'short', day: 'numeric', month: 'short' }
    : { weekday: 'short', day: 'numeric' });
  return `${fmt(a, a.getMonth() !== b.getMonth())} – ${fmt(b, true)}`;
}
