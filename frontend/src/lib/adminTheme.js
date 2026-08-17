// Admin panel theme — PRODUCTION REDESIGN (light + HUSHAE purple) by default.
//
// History: the admin went through original → burgundy → editorial →
// production redesign (light #F6F6F8 page, purple #6C5CE7 accent) → Shopify
// light (green). On 2026-08-17 the merchant asked to bring back the "old one
// that was before" — the production-redesign register. Light is the default;
// a sun/moon toggle still lets a user switch to dark, stored per device.
//
// .dark-admin is applied ONLY on admin routes — the storefront never changes.

const KEY = 'vl_admin_theme_v6'; // bumped — production-redesign default applies to every device

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
