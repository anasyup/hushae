// Admin panel theme — LIGHT (full-white editorial) is the canonical system.
// Dark remains available via the sun/moon toggle. Storefront never receives
// these classes.

const KEY = 'hushae.admin_theme_v3';
const LEGACY_KEYS = ['hushae.admin_theme', 'vl_admin_theme'];
const isAdminPath = () => typeof window !== 'undefined' && /^\/admin/.test(window.location.pathname);

export function getAdminTheme() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return 'light';
  } catch {
    return 'light';
  }
}

export function applyAdminTheme() {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const onAdmin = isAdminPath();
  const dark = onAdmin && getAdminTheme() === 'dark';
  root.classList.toggle('dark-admin', dark);
  root.classList.toggle('admin-light', onAdmin && !dark);
}

export function setAdminTheme(t) {
  try {
    localStorage.setItem(KEY, t);
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  applyAdminTheme();
}

export function clearAdminTheme() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark-admin');
  document.documentElement.classList.remove('admin-light');
}
