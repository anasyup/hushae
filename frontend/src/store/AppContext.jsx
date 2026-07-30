import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { STR } from '../i18n/strings';
import { snap } from '../lib/format';
import { track } from '../lib/track';
import { isPreview, announceReady, PREVIEW_MSG, PREVIEW_SELECT } from '../lib/livePreview';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const LS = {
  get(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

/**
 * Stable identity for a bag line: the same product in a different size or
 * colour is a different line. Used instead of the array index so reordering
 * the rendered rows can never make a Remove hit the wrong row.
 */
export const lineKey = (l) => `${l.id}::${l.size || ''}::${l.color || ''}`;

// One-time migration: rename any old veloura.* localStorage keys to hushae.*
// (safe rebrand — copies value then removes old key, only if new key not already set)
try {
  if (typeof localStorage !== 'undefined' && !localStorage.getItem('hushae.migrated')) {
    const keys = ['auth', 'cart', 'wish', 'recent', 'lang', 'consent', 'promo', 'lockpw', 'checkoutDraft', 'newsletter', 'calc'];
    for (const k of keys) {
      const oldKey = `veloura.${k}`;
      const newKey = `hushae.${k}`;
      const oldVal = localStorage.getItem(oldKey);
      if (oldVal !== null && localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, oldVal);
      }
      if (oldVal !== null) localStorage.removeItem(oldKey);
    }
    localStorage.setItem('hushae.migrated', '1');
  }
} catch { /* noop */ }

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [lang, setLang] = useState('en');
  const [auth, setAuth] = useState(() => LS.get('hushae.auth', null));
  const [cart, setCart] = useState(() => LS.get('hushae.cart', []));
  const [guestWish, setGuestWish] = useState(() => LS.get('hushae.wish', []));
  const [serverWish, setServerWish] = useState([]);
  const [recent, setRecent] = useState(() => LS.get('hushae.recent', []));
  const [saved, setSaved] = useState(() => LS.get('hushae.saved', []));
  const [toasts, setToasts] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const t = useCallback((k) => STR[k]?.[lang] || STR[k]?.en || k, [lang]);

  useEffect(() => { LS.set('hushae.lang', lang); document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { LS.set('hushae.cart', cart); }, [cart]);
  useEffect(() => { LS.set('hushae.wish', guestWish); }, [guestWish]);
  useEffect(() => { LS.set('hushae.recent', recent); }, [recent]);
  useEffect(() => { LS.set('hushae.saved', saved); }, [saved]);
  useEffect(() => { LS.set('hushae.auth', auth); }, [auth]);

  useEffect(() => { api('/settings').then((d) => setSettings(d.settings)).catch(() => {}); }, []);

  // ── Theme Editor live preview ───────────────────────────────────────────
  // When this app runs inside the editor's iframe (?preview=1) it accepts
  // in-memory settings pushed on every keystroke, so edits render instantly
  // without saving. Outside the iframe this listener never activates.
  useEffect(() => {
    if (!isPreview()) return undefined;
    const onMessage = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === PREVIEW_MSG && d.settings) setSettings(d.settings);
      if (d.type === PREVIEW_SELECT && d.sectionId) {
        const el = document.querySelector(`[data-section="${d.sectionId}"]`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ps-flash');
          setTimeout(() => el.classList.remove('ps-flash'), 1200);
        }
      }
    };
    window.addEventListener('message', onMessage);
    announceReady();
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const toast = useCallback((message) => {
    const id = Date.now() + Math.random();
    setToasts((ts) => [...ts, { id, message }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 2600);
  }, []);

  // ---------- auth ----------
  const refreshWish = useCallback(async (token) => {
    if (!token) return setServerWish([]);
    try { const d = await api('/wishlist', { token }); setServerWish(d.products.map(snap)); } catch { /* noop */ }
  }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password, remember } });
    setAuth(d);
    // merge guest wishlist into account
    const guest = LS.get('hushae.wish', []);
    for (const p of guest) { try { await api(`/wishlist/${p.id}`, { method: 'POST', token: d.token }); } catch { /* noop */ } }
    setGuestWish([]);
    await refreshWish(d.token);
    return d;
  }, [refreshWish]);

  const register = useCallback(async (payload) => {
    const d = await api('/auth/register', { method: 'POST', body: payload });
    setAuth(d);
    const guest = LS.get('hushae.wish', []);
    for (const p of guest) { try { await api(`/wishlist/${p.id}`, { method: 'POST', token: d.token }); } catch { /* noop */ } }
    setGuestWish([]);
    await refreshWish(d.token);
    return d;
  }, [refreshWish]);

  const logout = useCallback(() => { setAuth(null); setServerWish([]); }, []);

  /* Replace the cached user after a profile/address/avatar change, keeping the
     existing token. Without this the header avatar and the greeting keep
     showing stale data until a full reload. */
  const patchUser = useCallback((user) => {
    setAuth((a) => (a ? { ...a, user: { ...a.user, ...user } } : a));
  }, []);

  /* A token can expire while the tab is open (sessions are 2 days by default,
     30 with "remember me"). Verify once on mount and sign out cleanly rather
     than letting every request fail with a 401. */
  useEffect(() => {
    if (!auth?.token) return;
    api('/auth/me', { token: auth.token })
      .then((d) => { if (d?.user) patchUser(d.user); })
      .catch((e) => { if (e?.status === 401) { setAuth(null); setServerWish([]); } });
  }, []); // eslint-disable-line

  useEffect(() => { if (auth?.token) refreshWish(auth.token); }, []); // eslint-disable-line

  // ---------- cart ----------
  const addToCart = useCallback((product, { size, color, quantity = 1 } = {}) => {
    const s = snap(product);
    const sizeUse = size || s.sizes[0] || '';
    const colorUse = color || s.colors[0]?.name || '';
    track('cart'); // live-view funnel: added to cart
    setCart((c) => {
      const i = c.findIndex((l) => l.id === s.id && l.size === sizeUse && l.color === colorUse);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: Math.min(n[i].qty + quantity, 10) }; return n; }
      return [...c, { ...s, size: sizeUse, color: colorUse, qty: quantity }];
    });
    toast(STR.addedToBag[lang] || 'Added to your bag');
  }, [toast, lang]);

  /* --------------------------------------------------------------------
   * Line addressing.
   * Lines used to be addressed by array index, which breaks the moment the
   * bag renders them in any order other than storage order (the bag floats
   * out-of-stock rows to the top). lineKey() is a stable identity built from
   * the product + the chosen variant, so a remove always hits the row the
   * customer actually clicked. Index is still accepted for back-compat with
   * the drawer and any older caller.
   * ------------------------------------------------------------------ */
  const cartMax = settings?.cart?.maxQty ?? 10;

  const updateQty = useCallback((key, qty, max) => {
    const cap = Number(max) || cartMax;
    setCart((c) => c.map((l, i) => (
      (typeof key === 'number' ? i === key : lineKey(l) === key)
        ? { ...l, qty: Math.max(1, Math.min(qty, cap)) }
        : l)));
  }, [cartMax]);

  const removeLine = useCallback((key) => setCart((c) => c.filter((l, i) => (
    typeof key === 'number' ? i !== key : lineKey(l) !== key))), []);

  /** Put a removed line back exactly where it was — powers Undo. */
  const restoreLine = useCallback((line, at) => setCart((c) => {
    if (c.some((l) => lineKey(l) === lineKey(line))) return c;
    const n = [...c];
    n.splice(Math.max(0, Math.min(at ?? n.length, n.length)), 0, line);
    return n;
  }), []);

  const clearCart = useCallback(() => setCart([]), []);

  /* ---------- save for later ---------- */
  const saveForLater = useCallback((line) => {
    setCart((c) => c.filter((l) => lineKey(l) !== lineKey(line)));
    setSaved((s) => (s.some((l) => lineKey(l) === lineKey(line)) ? s : [{ ...line }, ...s]));
  }, []);

  const moveToBag = useCallback((line) => {
    setSaved((s) => s.filter((l) => lineKey(l) !== lineKey(line)));
    setCart((c) => {
      const i = c.findIndex((l) => lineKey(l) === lineKey(line));
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + (line.qty || 1) }; return n; }
      return [...c, { ...line }];
    });
  }, []);

  const removeSaved = useCallback((line) => setSaved((s) => s.filter((l) => lineKey(l) !== lineKey(line))), []);

  const cartCount = cart.reduce((n, l) => n + l.qty, 0);
  const cartSubtotal = cart.reduce((n, l) => n + l.price * l.qty, 0);

  // ---------- wishlist ----------
  const wishlist = auth?.token ? serverWish : guestWish;
  const inWishlist = useCallback((p) => wishlist.some((w) => w.id === (p.id || p._id)), [wishlist]);
  /* Returns { ok, message } so a caller can surface a real reason — the cap is
     enforced on the server too, and swallowing that error would leave the
     heart looking broken with no explanation. */
  const toggleWish = useCallback(async (product) => {
    const s = snap(product);
    const max = settings?.customerExperience?.wishlist?.maxItems ?? 50;

    if (auth?.token) {
      const exists = serverWish.some((w) => w.id === s.id);
      if (!exists && serverWish.length >= max) {
        return { ok: false, message: `Your wishlist is full (${max} items). Remove something first.` };
      }
      try {
        await api(`/wishlist/${s.id}`, { method: exists ? 'DELETE' : 'POST', token: auth.token });
        await refreshWish(auth.token);
        return { ok: true, added: !exists };
      } catch (e) {
        return { ok: false, message: e.message || 'Could not update your wishlist' };
      }
    }

    const exists = guestWish.some((x) => x.id === s.id);
    if (!exists && guestWish.length >= max) {
      return { ok: false, message: `Your wishlist is full (${max} items). Remove something first.` };
    }
    setGuestWish((w) => (exists ? w.filter((x) => x.id !== s.id) : [...w, s]));
    return { ok: true, added: !exists };
  }, [auth, serverWish, guestWish, refreshWish, settings]);

  /* Clear everything. Server wishlist is cleared item by item because the API
     has no bulk delete; the local list is one assignment. */
  const clearWish = useCallback(async () => {
    if (auth?.token) {
      for (const w of serverWish) {
        await api(`/wishlist/${w.id}`, { method: 'DELETE', token: auth.token }).catch(() => {});
      }
      await refreshWish(auth.token);
    } else {
      setGuestWish([]);
    }
  }, [auth, serverWish, refreshWish]);

  // ---------- recently viewed ----------
  const pushRecent = useCallback((product) => {
    const s = snap(product);
    setRecent((r) => [s, ...r.filter((x) => x.id !== s.id)].slice(0, 10));
  }, []);

  const value = useMemo(() => ({
    settings, lang, setLang, t,
    auth, setAuth, login, register, logout, patchUser,
    cart, addToCart, updateQty, removeLine, restoreLine, clearCart, cartCount, cartSubtotal,
    saved, saveForLater, moveToBag, removeSaved,
    wishlist, inWishlist, toggleWish, clearWish,
    recent, pushRecent,
    toast, toasts, drawerOpen, setDrawerOpen,
  }), [settings, lang, t, auth, login, register, logout, patchUser, cart, addToCart, updateQty, removeLine, restoreLine, clearCart,
    cartCount, cartSubtotal, saved, saveForLater, moveToBag, removeSaved,
    wishlist, inWishlist, toggleWish, clearWish, recent, pushRecent, toast, toasts, drawerOpen]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
