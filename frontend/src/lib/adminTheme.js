// Admin panel theme (light/dark) — saved on this device only
const KEY = 'vl_admin_theme';

export function getAdminTheme() {
  try { return localStorage.getItem(KEY) || 'light'; } catch { return 'light'; }
}

export function applyAdminTheme() {
  document.documentElement.classList.toggle('dark-admin', getAdminTheme() === 'dark');
}

export function setAdminTheme(t) {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
  applyAdminTheme();
}

export function clearAdminTheme() {
  document.documentElement.classList.remove('dark-admin');
}
