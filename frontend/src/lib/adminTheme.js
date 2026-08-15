// Admin panel theme — LIGHT ONLY.
//
// The dark theme was removed at the merchant's request (2026-08-15). The
// .dark-admin class is never applied, so the admin always renders in its
// light palette on every device.
//
// The exported functions are kept so any existing imports keep working; the
// storage key was bumped so a previously-saved "dark" preference on any
// device is ignored and everyone lands on light.

const KEY = 'vl_admin_theme_v2'; // bumped — ignores any stored 'dark' from before

export function getAdminTheme() {
  return 'light';
}

export function applyAdminTheme() {
  // Force light everywhere — dark theme removed.
  if (typeof document !== 'undefined') document.documentElement.classList.remove('dark-admin');
}

export function setAdminTheme() {
  // No-op: only the light theme exists now. Kept for compatibility.
}

export function clearAdminTheme() {
  if (typeof document !== 'undefined') document.documentElement.classList.remove('dark-admin');
}
