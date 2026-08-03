/* ============================================================================
 * International market config — single source of truth.
 *
 * Persisted to localStorage (hushae.market). Drives:
 *   - Currency display and formatting
 *   - Address form shape per country
 *   - Shipping options per zone
 *   - Payment methods per market
 *   - Delivery estimates per zone
 * ========================================================================== */

const STORAGE_KEY = 'hushae.market';

export const MARKETS = {
  PK: {
    code: 'PK', name: 'Pakistan', currency: 'PKR', symbol: 'Rs',
    format: (v) => `PKR ${Number(v).toLocaleString('en-PK')}`,
    shipping: { flatRate: 350, freeThreshold: 4999, label: 'Nationwide delivery' },
    payment: ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer'],
    delivery: '2–5 working days',
    address: { fields: ['name', 'phone', 'address', 'city', 'province'], provinceDropdown: true, cityDropdown: true },
    phonePrefix: '+92',
  },
  US: {
    code: 'US', name: 'United States', currency: 'USD', symbol: '$',
    format: (v) => `$ ${Number(v).toFixed(2)}`,
    shipping: { flatRate: 15, freeThreshold: 150, label: 'International shipping' },
    payment: ['Card', 'PayPal'],
    delivery: '7–14 working days',
    address: { fields: ['name', 'email', 'address', 'city', 'state', 'zip'], provinceDropdown: false, cityDropdown: false },
    phonePrefix: '+1',
  },
  GB: {
    code: 'GB', name: 'United Kingdom', currency: 'GBP', symbol: '£',
    format: (v) => `£ ${Number(v).toFixed(2)}`,
    shipping: { flatRate: 12, freeThreshold: 120, label: 'International shipping' },
    payment: ['Card', 'PayPal'],
    delivery: '7–14 working days',
    address: { fields: ['name', 'email', 'address', 'city', 'postcode'], provinceDropdown: false, cityDropdown: false },
    phonePrefix: '+44',
  },
  AE: {
    code: 'AE', name: 'UAE', currency: 'AED', symbol: 'AED',
    format: (v) => `AED ${Number(v).toFixed(2)}`,
    shipping: { flatRate: 40, freeThreshold: 300, label: 'International shipping' },
    payment: ['Card', 'PayPal'],
    delivery: '5–10 working days',
    address: { fields: ['name', 'phone', 'address', 'city', 'emirate'], provinceDropdown: false, cityDropdown: false },
    phonePrefix: '+971',
  },
  EU: {
    code: 'EU', name: 'Europe', currency: 'EUR', symbol: '€',
    format: (v) => `€ ${Number(v).toFixed(2)}`,
    shipping: { flatRate: 14, freeThreshold: 130, label: 'International shipping' },
    payment: ['Card', 'PayPal'],
    delivery: '7–14 working days',
    address: { fields: ['name', 'email', 'address', 'city', 'postcode', 'country'], provinceDropdown: false, cityDropdown: false },
    phonePrefix: '',
  },
};

const RATE_MARGIN = 1.05; // 5% margin on live rates

const FALLBACK_RATES = { USD: 0.0036, GBP: 0.0028, EUR: 0.0033, AED: 0.013, PKR: 1 };

export function loadMarket() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (MARKETS[parsed.code]) return parsed;
    }
  } catch {}
  return MARKETS.PK;
}

export function saveMarket(code) {
  if (!MARKETS[code]) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MARKETS[code]));
}

export function geoDetect() {
  // Simple geo: browser language or timezone hint
  try {
    const lang = navigator.language || '';
    if (lang.startsWith('ur') || lang.startsWith('en-PK')) return 'PK';
    if (lang.startsWith('en-GB')) return 'GB';
    if (lang.startsWith('ar')) return 'AE';
    if (lang.startsWith('en-US')) return 'US';
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.startsWith('Asia/Karachi')) return 'PK';
    if (tz.startsWith('Europe/London')) return 'GB';
    if (tz.startsWith('Asia/Dubai')) return 'AE';
    if (tz.startsWith('America/')) return 'US';
    if (tz.startsWith('Europe/')) return 'EU';
  } catch {}
  return 'PK';
}

export function convertPrice(pkrPrice, toCurrency) {
  const rate = FALLBACK_RATES[toCurrency] || 1;
  return Math.round(pkrPrice * rate * 100) / 100;
}

export function formatPrice(pkrPrice, market) {
  if (!market || market.currency === 'PKR') return market?.format?.(pkrPrice) || `PKR ${pkrPrice.toLocaleString('en-PK')}`;
  const converted = convertPrice(pkrPrice, market.currency);
  return market.format(converted);
}
