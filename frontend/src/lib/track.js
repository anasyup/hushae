import { api } from '../api/client';

// Anonymous first-party visit tracking — one random id per browser session, no cookies, no personal data
const SID_KEY = 'vl_sid';
const REF_KEY = 'vl_ref';

function sid() {
  let s = sessionStorage.getItem(SID_KEY);
  if (!s) {
    s = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SID_KEY, s);
  }
  return s;
}

function referrer() {
  let r = sessionStorage.getItem(REF_KEY);
  if (r === null) {
    r = document.referrer && !document.referrer.includes(location.host) ? document.referrer : '';
    sessionStorage.setItem(REF_KEY, r);
  }
  return r;
}

export function track(event, path) {
  try {
    api('/track', { method: 'POST', body: { sid: sid(), event, path: path || location.pathname, referrer: referrer() } }).catch(() => {});
  } catch { /* never block the shopper */ }
}
