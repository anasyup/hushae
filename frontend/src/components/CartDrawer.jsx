import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ShoppingBag, Trash2, X } from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { cartConfig } from '../lib/cartConfig';
import Img from './Img';
import Tx from './Tx';
import QuantityStepper from './ui/QuantityStepper';
import FreeShipProgress from '../pages/cart/FreeShipProgress';
import { useCartPricing } from '../pages/cart/useCartPricing';

/* ============================================================================
 * Mini bag.
 *
 * Shares three things with the full bag so the two can never diverge:
 *   · cartConfig()    — the merchant's wording and toggles
 *   · useCartPricing  — one calculation, so the drawer's total always matches
 *                       the total on /cart and at checkout
 *   · QuantityStepper — the same 44px, screen-reader-announced control
 *
 * The panel is a real dialog: labelled, focus-trapped, Escape closes, and
 * focus returns to whatever opened it.
 * ========================================================================== */
export default function CartDrawer() {
  const {
    drawerOpen, setDrawerOpen, cart, updateQty, removeLine, settings,
  } = useApp();
  const cfg = useMemo(() => cartConfig(settings), [settings]);
  const [stockMap, setStockMap] = useState({});
  const [picks, setPicks] = useState([]); // "You may also like" — best sellers, lazy-loaded once
  const panelRef = useRef(null);
  const opener = useRef(null);

  const idKey = useMemo(
    () => Array.from(new Set(cart.map((l) => l.id).filter(Boolean))).sort().join(','),
    [cart],
  );

  /* Lazy-load best sellers for the drawer's "You may also like" rail —
     fetched only when the drawer first opens, cached for the session. */
  const picksFetched = useRef(false);
  useEffect(() => {
    if (!drawerOpen || picksFetched.current) return undefined;
    picksFetched.current = true;
    let alive = true;
    api('/products?bestSeller=true&limit=6').then((d) => {
      if (alive) setPicks(d.products || []);
    }).catch(() => {});
    return () => { alive = false; };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen || !idKey) return undefined;
    let alive = true;
    api(`/products?ids=${idKey}&limit=50`).then((d) => {
      if (!alive) return;
      const m = {};
      (d.products || []).forEach((p) => {
        m[String(p._id)] = { stock: p.stock ?? 0, sizes: p.sizes || [], isActive: p.isActive !== false };
      });
      setStockMap(m);
    }).catch(() => {});
    return () => { alive = false; };
  }, [drawerOpen, idKey]);

  const lines = useMemo(() => cart.map((line, index) => {
    const m = stockMap[String(line.id)];
    if (!m) return { line, index, status: 'ok', available: null };
    if (!m.isActive) return { line, index, status: 'unavailable', available: 0 };
    if (m.stock <= 0) return { line, index, status: 'oos', available: 0 };
    if (line.size && m.sizes.length && !m.sizes.includes(line.size)) return { line, index, status: 'size-gone', available: m.stock };
    if (line.qty > m.stock) return { line, index, status: 'low', available: m.stock };
    return { line, index, status: 'ok', available: m.stock };
  }), [cart, stockMap]);

  const blocked = lines.some((x) => ['oos', 'unavailable', 'size-gone'].includes(x.status));
  const problems = lines.filter((x) => x.status !== 'ok').length;
  const pricing = useCartPricing(lines, settings, cfg, null);

  /* ---- Dialog behaviour: escape, focus trap, focus return ---- */
  useEffect(() => {
    if (!drawerOpen) return undefined;
    opener.current = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') { setDrawerOpen(false); return; }
      if (e.key !== 'Tab') return;
      const f = panelRef.current?.querySelectorAll(
        'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])',
      );
      if (!f || !f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => panelRef.current?.querySelector('button')?.focus(), 60);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, [drawerOpen, setDrawerOpen]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-obsidian/30"
          onClick={() => setDrawerOpen(false)}
        >
          <motion.div
            ref={panelRef}
            role="dialog" aria-modal="true" aria-label={cfg.title}
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-alabaster shadow-e-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-label uppercase tracking-widest">
                {cfg.title} <span className="text-ash">({pricing.count})</span>
              </h2>
              <button
                type="button" onClick={() => setDrawerOpen(false)} aria-label="Close bag"
                className="grid h-11 w-11 place-items-center transition hover:bg-satin/60"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {problems > 0 && (
              <p role="alert" className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-5 py-3 text-caption leading-relaxed text-red-800">
                <AlertCircle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span><b>{problems} item{problems === 1 ? '' : 's'}</b> need{problems === 1 ? 's' : ''} attention before checkout.</span>
              </p>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <span className="empty-state-icon h-14 w-14" aria-hidden="true"><ShoppingBag size={22} strokeWidth={1.6} /></span>
                  <p className="mt-4 font-display text-h4">{cfg.emptyTitle}</p>
                  <p className="mt-1 text-body-sm text-ash">Discover pieces that feel like nothing at all.</p>
                  <Link to={cfg.continueHref} onClick={() => setDrawerOpen(false)} className="btn-primary mt-6">
                    {cfg.continueLabel}
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  {lines.map(({ line: l, status, available }) => {
                    const isBlocked = ['oos', 'unavailable', 'size-gone'].includes(status);
                    return (
                      <li key={lineKey(l)} className="flex gap-3.5 py-4">
                        <Link
                          to={`/product/${l.slug}`} onClick={() => setDrawerOpen(false)}
                          className={`shrink-0 overflow-hidden rounded-control bg-cream ${isBlocked ? 'opacity-55' : ''}`}
                          tabIndex={-1} aria-hidden="true"
                        >
                          <Img src={l.image} alt="" className="h-24 w-20 object-cover" />
                        </Link>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className={`clamp-2 text-body-sm font-medium leading-snug ${isBlocked ? 'opacity-60' : ''}`}>
                              <Link to={`/product/${l.slug}`} onClick={() => setDrawerOpen(false)} className="hover:underline">
                                {l.name}
                              </Link>
                            </h3>
                            <button
                              type="button" onClick={() => removeLine(lineKey(l))}
                              aria-label={`Remove ${l.name} from your bag`}
                              className="-mr-2 -mt-1.5 grid h-11 w-11 shrink-0 place-items-center text-ash transition hover:bg-satin/60 hover:text-obsidian"
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>

                          <p className="mt-0.5 text-caption text-ash">
                            {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')}
                          </p>

                          {isBlocked && (
                            <p className="mt-1 text-caption font-semibold text-red-700">
                              {status === 'size-gone' ? `Size ${l.size} unavailable` : 'Out of stock'}
                            </p>
                          )}
                          {status === 'low' && (
                            <p className="mt-1 text-caption font-semibold text-amber-800">Only {available} left</p>
                          )}

                          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                            <QuantityStepper
                              value={l.qty}
                              onChange={(q) => updateQty(lineKey(l), q, cfg.maxQty)}
                              min={1}
                              max={Math.min(cfg.maxQty, available ?? cfg.maxQty) || 1}
                              size="sm"
                              disabled={isBlocked}
                              label={`Quantity for ${l.name}`}
                            />
                            <p className={`text-body-sm font-semibold tabular-nums ${isBlocked ? 'line-through opacity-60' : ''}`}>
                              {pkr(l.price * l.qty)}
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* ── YOU MAY ALSO LIKE — horizontal best-seller rail ── */}
              {cart.length > 0 && picks.length > 0 && (
                <div className="mt-4 border-t border-line pt-5">
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-ash">You may also like</p>
                  <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
                    {picks.map((p) => (
                      <Link
                        key={p._id}
                        to={`/product/${p.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="group w-[104px] shrink-0"
                      >
                        <div className="overflow-hidden bg-cream" style={{ aspectRatio: '3/4' }}>
                          <Img src={p.images?.[0]?.url || ''} alt={p.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                        </div>
                        <p className="mt-1.5 truncate text-[11px] font-medium uppercase tracking-[0.04em] text-obsidian">{p.name}</p>
                        <p className="text-[11px] font-semibold tabular-nums text-ash">{pkr(p.price)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-4 border-t border-neutral-200/80 bg-white p-6">
                {cfg.showProgress && (
                  <div className="mb-4">
                    <FreeShipProgress subtotal={pricing.subtotal} threshold={pricing.threshold} cfg={cfg} />
                  </div>
                )}

                <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.15em]">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="text-[14px] font-semibold text-black">{pkr(pricing.subtotal)}</span>
                </div>
                <p className="text-center text-[10px] uppercase tracking-widest text-neutral-400">
                  Taxes and shipping calculated at checkout
                </p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Link to="/cart" onClick={() => setDrawerOpen(false)} className="flex w-full items-center justify-center border border-black py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-black transition-all duration-300 hover:bg-black hover:text-white">
                    Bag View
                  </Link>
                  {blocked ? (
                    <Link
                      to="/cart" onClick={() => setDrawerOpen(false)}
                      className="btn btn-sm inline-flex items-center justify-center gap-1.5 bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      <AlertCircle size={12} aria-hidden="true" /> Fix items
                    </Link>
                  ) : (
                    <Link to="/checkout" onClick={() => setDrawerOpen(false)} className="flex w-full items-center justify-center gap-1.5 bg-black py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white transition-all duration-300 hover:bg-neutral-800">
                      <span>Checkout</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
