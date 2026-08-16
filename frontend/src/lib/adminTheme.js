// Admin panel theme — FLAGSHIP DARK by default (Linear/Vercel register).
//
// Dark is the primary direction. A sun/moon toggle in the topbar still lets
// a user switch to the optional light counterpart; the choice is stored in
// localStorage per device. Default (no stored value) = 'dark'.
//
// .dark-admin is applied ONLY on admin routes — the storefront never changes.

const KEY = 'vl_admin_theme';
const isAdminPath = () => typeof window !== 'undefined' && /^\/admin/.test(window.location.pathname);

export function getAdminTheme() {
  try { return localStorage.getItem(KEY) || 'dark'; } catch { return 'dark'; }
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
