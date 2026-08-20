import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ShoppingBag, X, ArrowRight, Trash2 } from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';
import { cartConfig } from '../lib/cartConfig';
import Img from './Img';
import QuantityStepper from './ui/QuantityStepper';
import { useCartPricing } from '../pages/cart/useCartPricing';

/* ============================================================================
 * HUSHAE Cart Drawer — Ultra-Luxury Slide-Out Bag (Calvin Klein / SKIMS / The Row)
 *
 * SPECIFICATION:
 *   - Pure White (#FFFFFF) & Soft Alabaster ground
 *   - Sleek, borderless circular close icon
 *   - Strict 3:4 studio portrait thumbnail with subtle rounded corners
 *   - Title Case product names (strips repeated "HUSHAE" prefix)
 *   - Smooth oval pill quantity stepper (− 1 +)
 *   - Clean Free Shipping progress bar
 *   - Dual high-fashion soft-oval pill action buttons (rounded-full)
 * ========================================================================== */

const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

export default function CartDrawer() {
  const {
    drawerOpen, setDrawerOpen, cart, updateQty, removeLine, settings,
  } = useApp();
  const nav = useNavigate();
  const cfg = useMemo(() => cartConfig(settings), [settings]);
  const [stockMap, setStockMap] = useState({});
  const [picks, setPicks] = useState([]);
  const panelRef = useRef(null);
  const opener = useRef(null);

  const idKey = useMemo(
    () => Array.from(new Set(cart.map((l) => l.id).filter(Boolean))).sort().join(','),
    [cart],
  );

  /* Lazy-load curated picks for drawer */
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

  /* Dialog focus trap & escape */
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

  const freeShipThreshold = pricing.threshold || 4999;
  const isFreeShip = pricing.subtotal >= freeShipThreshold;
  const freeShipPct = Math.min(100, Math.round((pricing.subtotal / freeShipThreshold) * 100));
  const awayAmount = Math.max(0, freeShipThreshold - pricing.subtotal);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs font-sans"
          onClick={() => setDrawerOpen(false)}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping Bag"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 flex h-full w-full flex-col bg-[#FFFFFF] shadow-2xl sm:max-w-[430px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── TOP HEADER (Clean Luxury Typography & Borderless Close Icon) ── */}
            <div className="flex items-center justify-between border-b border-[#EAEAEA] px-6 py-4 bg-[#FFFFFF]">
              <div className="flex items-baseline gap-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#000000]">
                  Your Bag
                </h2>
                <span className="text-[12px] text-neutral-400 font-light">
                  ({pricing.count})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close bag"
                className="grid h-8 w-8 place-items-center rounded-full text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                <X size={18} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            {/* ── FREE SHIPPING PROGRESS BAR ── */}
            {cart.length > 0 && (
              <div className="border-b border-[#EAEAEA] bg-[#FBFBFB] px-6 py-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] tracking-wide">
                  {isFreeShip ? (
                    <span className="font-medium text-[#000000]">
                      Free express shipping unlocked
                    </span>
                  ) : (
                    <span className="text-neutral-600 font-light">
                      Add <strong className="font-medium text-black">{pkr(awayAmount)}</strong> for free shipping
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-400 font-light">
                    {freeShipPct}%
                  </span>
                </div>

                <div className="h-1 w-full overflow-hidden rounded-full bg-[#EAEAEA]">
                  <div
                    className="h-full rounded-full bg-[#000000] transition-all duration-500 ease-out"
                    style={{ width: `${freeShipPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Warning banner */}
            {problems > 0 && (
              <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-6 py-3 text-xs text-red-800 font-light">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <span>Please adjust {problems} item{problems === 1 ? '' : 's'} before checkout.</span>
              </div>
            )}

            {/* ── CART ITEMS SCROLLABLE BODY ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center px-4 py-16 space-y-4">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[#F5F5F5] text-neutral-400">
                    <ShoppingBag size={22} strokeWidth={1.4} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-medium uppercase tracking-wider text-[#000000]">
                      Your bag is empty
                    </h3>
                    <p className="text-xs text-neutral-500 font-light max-w-xs">
                      Discover second-skin essentials engineered for everyday comfort.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/shop"
                      onClick={() => setDrawerOpen(false)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#000000] px-8 text-xs font-medium uppercase tracking-widest text-[#FFFFFF] hover:bg-[#1A1A1A] transition-colors"
                    >
                      Explore Collection &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[#EAEAEA]">
                  {lines.map(({ line: l, status, available }) => {
                    const isBlocked = ['oos', 'unavailable', 'size-gone'].includes(status);
                    return (
                      <li key={lineKey(l)} className="flex gap-4 py-4 items-start">
                        {/* 3:4 Portrait Studio Thumbnail */}
                        <Link
                          to={`/product/${l.slug}`}
                          onClick={() => setDrawerOpen(false)}
                          className={`aspect-[3/4] w-20 rounded-xl overflow-hidden bg-[#F8F8F8] shrink-0 border border-[#EAEAEA] transition-opacity ${
                            isBlocked ? 'opacity-50' : 'hover:opacity-90'
                          }`}
                          tabIndex={-1}
                        >
                          <Img src={l.image} alt="" className="h-full w-full object-cover object-center" />
                        </Link>

                        {/* Item Details */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-[13px] font-normal text-[#000000] leading-snug truncate pr-1">
                                <Link
                                  to={`/product/${l.slug}`}
                                  onClick={() => setDrawerOpen(false)}
                                  className="hover:text-neutral-500 transition-colors"
                                >
                                  {nameOf(l.name)}
                                </Link>
                              </h4>

                              <button
                                type="button"
                                onClick={() => removeLine(lineKey(l))}
                                aria-label={`Remove ${l.name}`}
                                className="text-neutral-400 hover:text-black p-0.5 transition-colors"
                              >
                                <Trash2 size={13} strokeWidth={1.5} />
                              </button>
                            </div>

                            <p className="text-[11px] text-neutral-500 font-light">
                              {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')}
                            </p>

                            {isBlocked && (
                              <p className="text-[11px] font-medium text-red-600 pt-0.5">
                                {status === 'size-gone' ? `Size ${l.size} unavailable` : 'Out of stock'}
                              </p>
                            )}
                            {status === 'low' && (
                              <p className="text-[11px] text-amber-700 font-light pt-0.5">
                                Only {available} remaining
                              </p>
                            )}
                          </div>

                          {/* Stepper + Price Row */}
                          <div className="flex items-center justify-between pt-3">
                            <QuantityStepper
                              value={l.qty}
                              onChange={(q) => updateQty(lineKey(l), q, cfg.maxQty)}
                              min={1}
                              max={Math.min(cfg.maxQty, available ?? cfg.maxQty) || 1}
                              size="sm"
                              disabled={isBlocked}
                              label={`Quantity for ${l.name}`}
                            />

                            <span className="text-xs font-medium text-[#000000] tabular-nums">
                              {pkr(l.price * l.qty)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* ── YOU MAY ALSO LIKE (Curated horizontal rail) ── */}
              {cart.length > 0 && picks.length > 0 && (
                <div className="border-t border-[#EAEAEA] pt-5 mt-4 pb-2">
                  <p className="text-[10.5px] font-medium uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    You May Also Like
                  </p>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {picks.map((p) => (
                      <Link
                        key={p._id}
                        to={`/product/${p.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="group w-24 shrink-0 space-y-1.5"
                      >
                        <div className="aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#F8F8F8] border border-[#EAEAEA]">
                          <Img
                            src={p.images?.[0]?.url || ''}
                            alt={p.name}
                            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <p className="text-[11px] text-[#000000] truncate font-normal leading-tight">
                          {nameOf(p.name)}
                        </p>
                        <p className="text-[11px] font-medium text-neutral-600 tabular-nums">
                          {pkr(p.price)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── STICKY FOOTER (Clean Luxury Summary & Smooth Oval Buttons) ── */}
            {cart.length > 0 && (
              <div className="border-t border-[#EAEAEA] bg-[#FFFFFF] p-6 space-y-3.5 shadow-lg">
                <div className="space-y-0.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-normal uppercase tracking-wider text-neutral-500">
                      Subtotal
                    </span>
                    <span className="font-sans text-base font-medium text-[#000000] tabular-nums">
                      {pkr(pricing.subtotal)}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-neutral-400 font-light">
                    Taxes and delivery calculated at checkout
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  {blocked ? (
                    <Link
                      to="/cart"
                      onClick={() => setDrawerOpen(false)}
                      className="flex h-[50px] w-full items-center justify-center rounded-full bg-red-100 text-xs font-medium uppercase tracking-[0.16em] text-red-800"
                    >
                      Fix Items in Bag
                    </Link>
                  ) : (
                    <Link
                      to="/checkout"
                      onClick={() => setDrawerOpen(false)}
                      className="flex h-[50px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md hover:bg-neutral-800 transition-all hover:scale-[1.01]"
                    >
                      <span>Proceed to Checkout</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}

                  <Link
                    to="/cart"
                    onClick={() => setDrawerOpen(false)}
                    className="flex h-[42px] w-full items-center justify-center rounded-full border border-neutral-200 bg-[#FFFFFF] text-xs font-medium uppercase tracking-[0.16em] text-neutral-700 hover:border-black hover:text-black transition-colors"
                  >
                    View Full Bag
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
