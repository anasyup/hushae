/**
 * Storefront display currency — fed from admin Settings → Currency
 * (settings.currency: { code, symbol, position, decimalSeparator,
 * thousandSeparator }). FORMATTING ONLY — prices are never converted.
 *
 * When the settings hold the untouched defaults, the legacy "PKR 1,250"
 * output is kept byte-for-byte, so every existing call site is unchanged
 * until the merchant actually customises the currency.
 */
let CURRENCY = null;

const CURRENCY_DEFAULTS = { code: 'PKR', symbol: 'PKR', position: 'before', decimalSeparator: '.', thousandSeparator: ',' };

export const applyCurrencySettings = (c) => {
  if (!c) { CURRENCY = null; return; }
  const same = (k) => (c[k] ?? CURRENCY_DEFAULTS[k]) === CURRENCY_DEFAULTS[k];
  CURRENCY = (same('code') && same('symbol') && same('position') && same('decimalSeparator') && same('thousandSeparator'))
    ? null
    : { ...CURRENCY_DEFAULTS, ...c };
};
export const getCurrencySettings = () => CURRENCY;

export function formatMoney(n, { symbol = 'PKR', position = 'before', decimalSeparator = '.', thousandSeparator = ',' } = {}) {
  let s = Number(n || 0).toLocaleString('en-PK');          // "1,250" / "1,250.5"
  if (thousandSeparator && thousandSeparator !== ',') s = s.replace(/,/g, thousandSeparator);
  if (decimalSeparator && decimalSeparator !== '.') s = s.replace('.', decimalSeparator);
  return position === 'after' ? `${s} ${symbol}` : `${symbol} ${s}`;
}

export const pkr = (n) => (CURRENCY ? formatMoney(n, CURRENCY) : `PKR ${Number(n || 0).toLocaleString('en-PK')}`);

export const cn = (...xs) => xs.filter(Boolean).join(' ');

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const snap = (p) => ({
  id: p._id || p.id, slug: p.slug, name: p.name, price: p.price,
  compareAtPrice: p.compareAtPrice || null,
  /* Sale-window flags must survive the snap, or the "is this on sale?" check
     silently fails and cards lose their % off / strike-through. */
  onSale: p.onSale === true, saleStart: p.saleStart || null, saleEnd: p.saleEnd || null,
  image: p.images?.[0]?.url || p.image || '',
  sizes: p.sizes || [], colors: p.colors || [], tier: p.tier || '', badges: p.badges || [],
  /* Fabric / material survives the snap for the card subtitle line. */
  fabric: p.fabric || '', categorySlug: p.categorySlug || '',
});

/** "4m ago" style relative time for the notification feed. */
export const ago = (ts) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};
