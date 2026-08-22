// Admin panel theme — DARK by default (Phase 01 design system).
//
// History: dark used to be the forced default, then the merchant asked to
// remove it (2026-08-15) and it returned as a toggle defaulting to LIGHT.
// Phase 01 (2026-08-22) makes DARK the canonical design system again:
// dark editorial luxury + electric violet accent. The sun/moon toggle stays
// for legacy preference; the admin design tokens are dark-first either way.
//
// .dark-admin is applied ONLY on admin routes — the storefront never changes.

const KEY = 'hushae.admin_theme';
const LEGACY_KEY = 'vl_admin_theme';
const isAdminPath = () => typeof window !== 'undefined' && /^\/admin/.test(window.location.pathname);

export function getAdminTheme() {
  try { return localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || 'dark'; } catch { return 'dark'; }
}

export function applyAdminTheme() {
  const dark = isAdminPath() && getAdminTheme() === 'dark';
  document.documentElement.classList.toggle('dark-admin', dark);
}

export function setAdminTheme(t) {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyAdminTheme();
}

export function clearAdminTheme() {
  document.documentElement.classList.remove('dark-admin');
}
