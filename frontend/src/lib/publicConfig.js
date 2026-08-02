/* Shared helpers for customer-facing PAYMENT + POLICY copy.
 *
 * WHY: cart/checkout/home/footer/PDP must never disagree about which payment
 * methods are active or what the returns policy is. Every component reads
 * from this single source instead of hard-coding its own list.
 *
 * SAFETY: no credentials, no cost prices, no bank details — public-safe only.
 *
 * RULES encoded here (owner-approved):
 *   - COD is the only method currently live.
 *   - JazzCash / EasyPaisa / Bank / Card only render when both the merchant
 *     toggle AND their integration credentials are actually configured.
 *   - No blanket exchange promise: opened / worn / washed innerwear cannot
 *     be returned or exchanged for hygiene reasons.
 *   - Wrong / damaged / defective items are always replaced.
 *   - "Secure / encrypted payment" language only when at least one online
 *     gateway is live (otherwise COD-only never says "Secure pay").
 */

const PAYMENT_ICONS = { COD: null, JazzCash: 'CreditCard', EasyPaisa: 'CreditCard', Bank: 'CreditCard', Card: 'CreditCard' };
const PAYMENT_LABELS = {
  COD: 'Cash on delivery',
  JazzCash: 'JazzCash',
  EasyPaisa: 'EasyPaisa',
  Bank: 'Bank transfer',
  Card: 'Card',
};

/* Flat rate, free-shipping threshold, delivery window. Mirrors the settings
 * defaults so every page shows the same numbers. Components that receive real
 * settings can pass them in to override. */
const SHIPPING = { flatRate: 350, freeThreshold: 4999, minDays: 2, maxDays: 5 };

export function shippingFromSettings(settings) {
  const list = settings?.checkout?.shippingMethods;
  let minDays = SHIPPING.minDays, maxDays = SHIPPING.maxDays;
  if (Array.isArray(list)) {
    const on = list.filter((m) => m.enabled);
    if (on[0]) { minDays = Number(on[0].minDays) || minDays; maxDays = Number(on[0].maxDays) || maxDays; }
  } else {
    minDays = Number(settings?.cart?.deliveryMinDays) || minDays;
    maxDays = Number(settings?.cart?.deliveryMaxDays) || maxDays;
  }
  return {
    flatRate: Number(settings?.shippingFlatRate ?? SHIPPING.flatRate),
    freeThreshold: Number(settings?.freeShippingThreshold ?? SHIPPING.freeThreshold),
    minDays, maxDays,
    range: `${minDays}\u2013${maxDays} days`,
  };
}

/* Which payment methods are genuinely usable by customers right now.
 * Always returns an array of { id, label } sorted COD first. */
export function publicPayments(settings) {
  const ints = settings?.integrations?.payments || {};
  const jcConfig = !!(ints.jazzcash?.configured || (ints.jazzcash?.merchantId && ints.jazzcash?.password));
  const epConfig = !!(ints.easypaisa?.configured || (ints.easypaisa?.merchantId && ints.easypaisa?.password));
  const bd = String(settings?.paymentMethods?.bankDetails || '');
  const bankConfig = bd.length > 0 && !/0000 0000/.test(bd);
  // Card (Visa/Mastercard) only when a real card gateway (SafePay or similar)
  // is present and flagged. Nothing wired yet → always off.
  const cardConfig = false;

  const out = [];
  const pm = settings?.paymentMethods || {};
  if (pm.cod !== false) out.push({ id: 'COD', label: PAYMENT_LABELS.COD });
  if (pm.jazzcash && jcConfig) out.push({ id: 'JazzCash', label: PAYMENT_LABELS.JazzCash });
  if (pm.easypaisa && epConfig) out.push({ id: 'EasyPaisa', label: PAYMENT_LABELS.EasyPaisa });
  if (pm.bank && bankConfig) out.push({ id: 'Bank', label: PAYMENT_LABELS.Bank });
  if (cardConfig) out.push({ id: 'Card', label: PAYMENT_LABELS.Card });

  // If checkout.paymentList exists and checkoutMigrated, that list wins but
  // still filtered by configured credentials (can't show what isn't wired).
  const list = settings?.checkout?.paymentList;
  if (Array.isArray(list) && list.length && settings?.checkout?.checkoutMigrated) {
    const mapId = (id) => ({
      COD: 'cod', JazzCash: 'jazzcash', EasyPaisa: 'easypaisa',
      'Bank Transfer': 'bank', Bank: 'bank', Card: 'card',
    }[id] || id?.toLowerCase());
    return list
      .filter((m) => m && m.enabled && !m.comingSoon)
      .filter((m) => {
        const k = mapId(m.id);
        if (k === 'cod') return true;
        if (k === 'jazzcash') return jcConfig;
        if (k === 'easypaisa') return epConfig;
        if (k === 'bank') return bankConfig;
        if (k === 'card') return cardConfig;
        return false;
      })
      .map((m) => ({ id: m.id, label: m.label || PAYMENT_LABELS[m.id] || m.id }));
  }
  return out;
}

export function isCodOnly(settings) {
  const p = publicPayments(settings);
  return p.length === 1 && p[0].id === 'COD';
}

export function hasOnlinePayment(settings) {
  return publicPayments(settings).some((m) => m.id !== 'COD');
}

/* Marquee / trust line fallbacks (used when settings.marquee empty). */
export const MARQUEE_DEFAULTS = [
  'COD available \u2014 nationwide',
  'Free shipping over PKR 4,999',
  'Discreet packaging \u2014 always',
  'Made in Pakistan',
];

/* Customer-facing hygiene-first policy blocks. Approved by owner:
 *   - No general return/exchange window promised.
 *   - Opened/worn/washed innerwear is final for hygiene reasons.
 *   - Wrong/damaged/defective items are replaced. */
export const POLICY = Object.freeze({
  trust: [
    { icon: 'Truck',      key: 'delivery',  label: null },      // filled with "2–5 days"
    { icon: 'ShieldCheck', key: 'quality',  label: 'Quality checked' },
    { icon: 'Package',    key: 'discreet', label: 'Discreet parcel' },
  ],
  shippingBlurb(shipping) {
    return `Dispatched in 24\u201348h via courier in plain, unmarked packaging. Flat PKR ${shipping.flatRate} nationwide; free shipping on orders over PKR ${shipping.freeThreshold.toLocaleString('en-PK')}. Estimated delivery: ${shipping.range}.`;
  },
  returnsBlurb: 'For hygiene reasons, opened, worn or washed innerwear cannot be returned or exchanged. Wrong, damaged or defective items are replaced promptly \u2014 contact care with your order number.',
});

export { PAYMENT_ICONS as _icons };
