import { useSyncExternalStore } from 'react';

/* ============================================================================
 * Display currency — international shoppers can browse in their currency.
 * Prices are APPROXIMATE conversions for display only; checkout always
 * charges in PKR (stated clearly in the UI when a foreign currency is on).
 * Rates are indicative mid-market values, overridable via Settings.fx.
 * ========================================================================== */

const KEY = 'hushae.fx';

export const FX_DEFAULT_RATES = { PKR: 1, USD: 0.0036, EUR: 0.0033, GBP: 0.0028, AED: 0.0132 };
const SYMBOL = { PKR: '₨', USD: '$', EUR: '€', GBP: '£', AED: 'AED ' };

let rates = { ...FX_DEFAULT_RATES };
let cur = 'PKR';
try { cur = localStorage.getItem(KEY) || 'PKR'; } catch { /* private mode */ }

const subs = new Set();
const emit = () => subs.forEach((fn) => fn());
const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export function setCurrency(code) {
  cur = SYMBOL[code] ? code : 'PKR';
  try { localStorage.setItem(KEY, cur); } catch { /* ignore */ }
  emit();
}
export function getCurrency() { return cur; }
export function setFxRates(next) {
  if (next && typeof next === 'object') rates = { ...FX_DEFAULT_RATES, ...next };
  emit();
}

/** Subscribe a component so it re-renders when the shopper switches currency. */
export function useFx() {
  return useSyncExternalStore(subscribe, getCurrency);
}

export function money(v) {
  const n = Number(v) || 0;
  if (cur === 'PKR') return `₨${Math.round(n).toLocaleString('en-PK')}`;
  const x = n * (rates[cur] || 1);
  const digits = x < 100 ? 2 : 0;
  return `${SYMBOL[cur]}${x.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

/** Honest note shown near totals when browsing in a foreign currency. */
export function fxNote() {
  return cur === 'PKR' ? '' : `Approximate in ${cur} — you will be charged in PKR.`;
}
