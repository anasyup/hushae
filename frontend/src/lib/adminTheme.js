// Admin panel theme (light/dark) — saved on this device only.
// DARK IS THE DEFAULT for the admin: the panel is designed dark-first, and
// the toggle in the TopBar lets a user switch to light if they prefer. The
// preference persists, so whoever chose light keeps it.
//
// The .dark-admin class is applied ONLY on admin routes — the storefront
// must keep its light neutral palette, so applyAdminTheme() checks the URL.

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
