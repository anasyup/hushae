// Admin panel theme — BURGUNDY (design-system pass) by default.
//
// History: dark was the original flagship direction, then light Shopify,
// then dark flagship again, and now (2026-08-17) the merchant picked the
// burgundy design-system pass ("option 1") — white pages, black text, one
// deep rose-burgundy accent (#9C2C4E) used for primary actions and active
// states. Light is the default; a sun/moon toggle still lets a user switch
// to dark, stored in localStorage per device.
//
// .dark-admin is applied ONLY on admin routes — the storefront never changes.

const KEY = 'vl_admin_theme_v4'; // bumped — so the burgundy default applies to existing devices too

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
