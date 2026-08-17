// Admin panel theme — ORIGINAL MONOCHROME by default.
//
// History: the admin went through burgundy → editorial → flagship dark →
// production redesign → Shopify light, and (2026-08-17) the merchant asked
// to walk it back to the ORIGINAL register: white pages, black text, black
// primary buttons, no coloured brand accent. Light is the default; a
// sun/moon toggle still lets a user switch to dark, stored per device.
//
// .dark-admin is applied ONLY on admin routes — the storefront never changes.

const KEY = 'vl_admin_theme_v5'; // bumped — original monochrome default applies to every device

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
