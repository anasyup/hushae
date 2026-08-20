import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ShoppingBag, X, Minus, Plus, ArrowRight } from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';
import { cartConfig } from '../lib/cartConfig';
import Img from './Img';
import { useCartPricing } from '../pages/cart/useCartPricing';

/* ============================================================================
 * HUSHAE Cart Drawer — Ultra-Luxury Slide-Out Bag (Exact Reference Match)
 *
 * MATCHING USER'S SCREENSHOT INSPIRATION:
 *   1. Header: "SHOPPING BAG (count)" + Minimalist top-right "✕" close button
 *   2. Solid Jet Black notice: "Welcome back! Your products are still in the cart."
 *   3. Studio 3:4 Portrait Thumbnail on the left
 *   4. Item Details: "NEW COLLECTION" eyebrow, Title Case name, "Color: ...", "Size: ..."
 *   5. "Remove" subtle underline text link on the top right
 *   6. Minimalist "− 1 +" stepper & right-aligned price
 *   7. Subtotal, Promo code trigger, and Total breakdown
 *   8. Calvin Klein dual CTAs: "PROCEED TO CHECKOUT" & "CONTINUE SHOPPING"
 * ========================================================================== */

const nameOf = (name) => titleCase(String(name || '').replace(/^HUSHAE\s+/i, ''));

export default function CartDrawer() {
  const {
    drawerOpen, setDrawerOpen, cart, updateQty, removeLine, settings,
  } = useApp();
  const nav = useNavigate();
  const cfg = useMemo(() => cartConfig(settings), [settings]);
  const [stockMap, setStockMap] = useState({});
  const [applied, setApplied] = useState(null);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponErr, setCouponErr] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);

  const panelRef = useRef(null);
  const opener = useRef(null);

  const idKey = useMemo(
    () => Array.from(new Set(cart.map((l) => l.id).filter(Boolean))).sort().join(','),
    [cart],
  );

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
  const pricing = useCartPricing(lines, settings, cfg, applied);

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

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    const c = couponCode.trim();
    if (!c || couponBusy) return;
    setCouponBusy(true); setCouponErr('');
    try {
      const r = await api('/discounts/validate', { method: 'POST', body: { code: c, subtotal: pricing.subtotal } });
      if (!r || !r.discount) throw new Error(r?.message || 'This code cannot be applied');
      setApplied({ code: r.code, discount: r.discount, type: r.type, value: r.value });
      setCouponCode('');
      setCouponOpen(false);
    } catch (err) {
      setCouponErr(err?.message || 'Invalid promo code');
    } finally {
      setCouponBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs font-sans"
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
            transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 top-0 flex h-full w-full flex-col bg-[#FFFFFF] shadow-2xl sm:max-w-[440px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── TOP HEADER (SHOPPING BAG + BORDERLESS ✕) ── */}
            <div className="flex items-center justify-between border-b border-[#EAEAEA] px-6 py-5 bg-[#FFFFFF]">
              <h2 className="text-xs font-normal uppercase tracking-[0.24em] text-[#000000]">
                Shopping Bag <span className="text-neutral-400 font-light">({pricing.count})</span>
              </h2>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close bag"
                className="text-neutral-400 hover:text-black transition-colors p-1"
              >
                <X size={18} strokeWidth={1.4} aria-hidden="true" />
              </button>
            </div>

            {/* ── JET BLACK WELCOME / REASSURANCE BANNER (MATCHING REFERENCE) ── */}
            {cart.length > 0 && (
              <div className="bg-[#000000] text-[#FFFFFF] px-6 py-2.5 text-[11px] font-normal tracking-wide text-center">
                Welcome back! Your products are still in the cart—pick up right where you left off.
              </div>
            )}

            {/* Warning banner if any out of stock */}
            {problems > 0 && (
              <div className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-6 py-3 text-xs text-red-800 font-light">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <span>Please adjust {problems} item{problems === 1 ? '' : 's'} before checkout.</span>
              </div>
            )}

            {/* ── CART ITEMS SCROLLABLE BODY ── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 no-scrollbar">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center px-4 py-16 space-y-5">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[#F5F5F5] text-neutral-400">
                    <ShoppingBag size={22} strokeWidth={1.3} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-normal uppercase tracking-[0.16em] text-[#000000]">
                      Your shopping bag is empty
                    </h3>
                    <p className="text-xs text-neutral-500 font-light max-w-xs">
                      Discover second-skin pieces engineered for everyday comfort.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Link
                      to="/shop"
                      onClick={() => setDrawerOpen(false)}
                      className="inline-flex min-h-[44px] items-center justify-center bg-[#000000] px-8 text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] hover:bg-neutral-800 transition-colors"
                    >
                      Explore Collection
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-[#EAEAEA]">
                  {lines.map(({ line: l, status, available }) => {
                    const isBlocked = ['oos', 'unavailable', 'size-gone'].includes(status);
                    return (
                      <li key={lineKey(l)} className="pt-6 first:pt-0 pb-6 flex gap-4 items-start">
                        {/* 3:4 Studio Portrait Thumbnail */}
                        <Link
                          to={`/product/${l.slug}`}
                          onClick={() => setDrawerOpen(false)}
                          className={`aspect-[3/4] w-24 shrink-0 bg-[#F8F8F8] overflow-hidden transition-opacity ${
                            isBlocked ? 'opacity-40' : 'hover:opacity-90'
                          }`}
                          tabIndex={-1}
                        >
                          <Img src={l.image} alt="" className="h-full w-full object-cover object-center" />
                        </Link>

                        {/* Item Details Stack (Matching Screenshot 1) */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                          <div>
                            {/* Line 1: Eyebrow + Remove Link */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                                {l.category || 'NEW COLLECTION'}
                              </span>

                              <button
                                type="button"
                                onClick={() => removeLine(lineKey(l))}
                                className="text-xs text-neutral-500 hover:text-black transition-colors underline underline-offset-4"
                              >
                                Remove
                              </button>
                            </div>

                            {/* Line 2: Product Name (Title Case) */}
                            <h4 className="text-[14px] font-normal text-[#000000] leading-snug mt-1 truncate">
                              <Link
                                to={`/product/${l.slug}`}
                                onClick={() => setDrawerOpen(false)}
                                className="hover:text-neutral-500 transition-colors"
                              >
                                {nameOf(l.name)}
                              </Link>
                            </h4>

                            {/* Line 3: Color & Size */}
                            <div className="mt-1.5 space-y-0.5 text-xs text-neutral-500 font-light">
                              {l.color && <p>Color: {l.color}</p>}
                              {l.size && <p>Size: {l.size}</p>}
                            </div>

                            {isBlocked && (
                              <p className="text-[11px] font-medium text-red-600 pt-1">
                                {status === 'size-gone' ? `Size ${l.size} unavailable` : 'Sold out'}
                              </p>
                            )}
                          </div>

                          {/* Line 4: Minimalist Stepper & Price Row */}
                          <div className="flex items-center justify-between pt-3">
                            <div className="flex items-center gap-3 text-xs text-neutral-700 font-light">
                              <button
                                type="button"
                                onClick={() => updateQty(lineKey(l), Math.max(1, l.qty - 1), cfg.maxQty)}
                                disabled={isBlocked || l.qty <= 1}
                                className="h-6 w-6 grid place-items-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="min-w-[16px] text-center font-normal text-black">
                                {l.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQty(lineKey(l), Math.min(cfg.maxQty || 10, l.qty + 1), cfg.maxQty)}
                                disabled={isBlocked || l.qty >= (available ?? cfg.maxQty)}
                                className="h-6 w-6 grid place-items-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
                                aria-label="Increase quantity"
                              >
                                <Plus size={11} />
                              </button>
                            </div>

                            <span className="text-[13.5px] font-medium text-[#000000] tabular-nums">
                              {pkr(l.price * l.qty)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* ── TOTALS & CHECKOUT FOOTER (EXACT SCREENSHOT 1 & 2 MATCH) ── */}
            {cart.length > 0 && (
              <div className="border-t border-[#EAEAEA] bg-[#FFFFFF] px-6 py-6 space-y-4">
                {/* Subtotal */}
                <div className="flex items-baseline justify-between text-xs uppercase tracking-wider">
                  <span className="text-[#000000] font-normal">SUBTOTAL</span>
                  <span className="font-normal text-[#000000] tabular-nums text-sm">{pkr(pricing.subtotal)}</span>
                </div>

                <p className="text-[10.5px] text-neutral-400 font-light text-right">
                  * Complimentary express delivery & discreet packaging across Pakistan
                </p>

                {/* Promo Code Trigger */}
                <div className="pt-1">
                  {!applied ? (
                    <div>
                      {!couponOpen ? (
                        <button
                          type="button"
                          onClick={() => setCouponOpen(true)}
                          className="text-xs text-neutral-500 hover:text-black transition-colors flex items-center gap-1"
                        >
                          <span>+ Enter coupon code</span>
                        </button>
                      ) : (
                        <form onSubmit={handleApplyCoupon} className="space-y-1.5 pt-1">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponErr(''); }}
                              placeholder="COUPON CODE"
                              className="w-full border border-neutral-300 bg-white px-3 py-2 text-xs uppercase tracking-wider text-black focus:border-black focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={!couponCode.trim() || couponBusy}
                              className="bg-black px-4 py-2 text-xs font-medium uppercase tracking-wider text-white hover:bg-neutral-800 disabled:opacity-40"
                            >
                              {couponBusy ? '…' : 'Apply'}
                            </button>
                          </div>
                          {couponErr && <p className="text-[11px] text-red-600 font-light">{couponErr}</p>}
                        </form>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-emerald-700">
                      <span>Coupon {applied.code} applied (− {pkr(applied.discount)})</span>
                      <button
                        type="button"
                        onClick={() => setApplied(null)}
                        className="underline hover:text-emerald-950"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-baseline justify-between text-xs uppercase tracking-wider border-t border-[#EAEAEA] pt-3 font-medium text-[#000000]">
                  <span>TOTAL</span>
                  <span className="text-base font-semibold tabular-nums">{pkr(pricing.total)}</span>
                </div>

                {/* Dual Action Buttons (Calvin Klein Inspired) */}
                <div className="space-y-2.5 pt-2">
                  {blocked ? (
                    <Link
                      to="/cart"
                      onClick={() => setDrawerOpen(false)}
                      className="flex h-[48px] w-full items-center justify-center bg-red-100 text-xs font-medium uppercase tracking-[0.18em] text-red-800"
                    >
                      Fix Items in Bag
                    </Link>
                  ) : (
                    <Link
                      to="/checkout"
                      onClick={() => setDrawerOpen(false)}
                      className="flex h-[48px] w-full items-center justify-center bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md hover:bg-neutral-800 transition-colors"
                    >
                      PROCEED TO CHECKOUT
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="flex h-[44px] w-full items-center justify-center border border-neutral-300 bg-[#FFFFFF] text-xs font-medium uppercase tracking-[0.18em] text-[#000000] hover:border-black transition-colors"
                  >
                    CONTINUE SHOPPING
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
