// Admin panel theme — LIGHT by default, dark as an explicit opt-in.
//
// History: dark used to be the forced default, then the merchant asked to
// remove it (2026-08-15). It now returns as a TOP-BAR TOGGLE (sun/moon) that
// defaults to LIGHT on every device until the user opts into dark — so the
// panel looks exactly as before until someone deliberately switches it.
// The choice is stored in localStorage per device.
//
// .dark-admin is applied ONLY on admin routes — the storefront never changes.

const KEY = 'vl_admin_theme';
const isAdminPath = () => typeof window !== 'undefined' && /^\/admin/.test(window.location.pathname);

export function getAdminTheme() {
  try { return localStorage.getItem(KEY) || 'light'; } catch { return 'light'; }
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
