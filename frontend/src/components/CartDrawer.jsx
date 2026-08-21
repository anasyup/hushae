import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ShoppingBag, X, Minus, Plus, ArrowRight, Percent, Check, Tag } from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';
import { cartConfig } from '../lib/cartConfig';
import Img from './Img';
import { useCartPricing } from '../pages/cart/useCartPricing';

/* ============================================================================
 * HUSHAE Luxury Cart Drawer — Exact Visual Reference Match
 *
 * Visual Geometry & Architecture (Direct reference to uploaded image spec):
 *   - Soft Alabaster / Light Studio Grey Drawer Canvas (`bg-[#F2F3F5]`)
 *   - Elevated Floating Product Cards (`bg-[#FFFFFF] rounded-[26px] p-5 sm:p-6 shadow-sm`)
 *   - Upper Card Grid:
 *       • Left: Rounded square studio thumbnail (`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#EBECEF]`)
 *       • Middle: Bold Title Case Product Name, `Size : M`, Unit Price
 *       • Right: Top-right `x{qty}` multiplier with smooth stepper controls
 *   - Subtle hairline divider (`border-t border-[#F0F0F2] my-4`)
 *   - Lower Card Action Strip:
 *       • Left: `Estimate Total` label + Bold Line Total
 *       • Right: "GOL" Pill Action Button (`Order Received` / Proceed) + Circular `%` Voucher Pill
 *       • Primary (First) Card: Jet Black Solid Pill (`bg-black text-white`)
 *       • Secondary Cards: Pristine White Bordered Pill (`border border-neutral-300`)
 *   - Drawer Bottom Sticky Footer:
 *       • Subtotal & Complimentary Delivery note
 *       • Primary Jet Black Pill CTA: `PROCEED TO CHECKOUT →`
 *       • Secondary Pill CTA: `CONTINUE SHOPPING`
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
  const [activeCouponCard, setActiveCouponCard] = useState(null);
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
    e?.preventDefault();
    const c = couponCode.trim();
    if (!c || couponBusy) return;
    setCouponBusy(true); setCouponErr('');
    try {
      const r = await api('/discounts/validate', { method: 'POST', body: { code: c, subtotal: pricing.subtotal } });
      if (!r || !r.discount) throw new Error(r?.message || 'This code cannot be applied');
      setApplied({ code: r.code, discount: r.discount, type: r.type, value: r.value });
      setCouponCode('');
      setCouponOpen(false);
      setActiveCouponCard(null);
    } catch (err) {
      setCouponErr(err?.message || 'Invalid promo code');
    } finally {
      setCouponBusy(false);
    }
  };

  const toggleCardCoupon = (key) => {
    setActiveCouponCard((prev) => (prev === key ? null : key));
    setCouponErr('');
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
            className="absolute right-0 top-0 flex h-full w-full flex-col bg-[#F3F4F6] shadow-2xl sm:max-w-[480px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── TOP HEADER (CLEAN LUXURY MINIMALIST BAR) ── */}
            <div className="flex items-center justify-between border-b border-neutral-200/80 px-6 py-4.5 bg-[#FFFFFF]">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="text-[#000000]" strokeWidth={1.5} />
                <h2 className="text-xs font-medium uppercase tracking-[0.24em] text-[#000000]">
                  Shopping Bag <span className="text-neutral-400 font-light">({pricing.count})</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close bag"
                className="grid h-8 w-8 place-items-center rounded-full text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors"
              >
                <X size={17} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>

            {/* Warning banner if any out of stock */}
            {problems > 0 && (
              <div className="mx-5 mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 font-light">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <span>Please adjust {problems} item{problems === 1 ? '' : 's'} before proceeding.</span>
              </div>
            )}

            {/* ── SCROLLABLE CANVAS WITH FLOATING WHITE CARDS (MATCHING REFERENCE IMAGE) ── */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 no-scrollbar">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center px-4 py-16 space-y-5">
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-[#FFFFFF] shadow-sm text-neutral-400">
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
                      className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[#000000] px-8 text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] hover:bg-neutral-800 transition-colors shadow-md"
                    >
                      Explore Collection &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                lines.map(({ line: l, index, status, available }) => {
                  const isBlocked = ['oos', 'unavailable', 'size-gone'].includes(status);
                  const isPrimary = index === 0;
                  const key = lineKey(l);
                  const showCouponInput = activeCouponCard === key;

                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="relative rounded-[26px] bg-[#FFFFFF] p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-black/[0.04] transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                    >
                      {/* ── TOP HALF: THUMBNAIL + TITLE + SIZE + UNIT PRICE + QTY MULTIPLIER ── */}
                      <div className="flex items-start gap-4">
                        {/* Rounded Studio Thumbnail Box */}
                        <Link
                          to={`/product/${l.slug}`}
                          onClick={() => setDrawerOpen(false)}
                          className={`relative aspect-square w-20 sm:w-24 shrink-0 overflow-hidden rounded-[18px] bg-[#F2F3F5] flex items-center justify-center p-1.5 transition-transform hover:scale-[1.02] ${
                            isBlocked ? 'opacity-40' : ''
                          }`}
                          tabIndex={-1}
                        >
                          <Img
                            src={l.image}
                            alt={l.name}
                            className="h-full w-full object-contain mix-blend-multiply"
                          />
                        </Link>

                        {/* Middle & Right Column */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between self-stretch">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 pr-2">
                              {/* Product Name (Title Case, Bold Modern Sans) */}
                              <h4 className="text-[15px] sm:text-[16px] font-semibold text-[#111827] leading-snug tracking-tight truncate">
                                <Link
                                  to={`/product/${l.slug}`}
                                  onClick={() => setDrawerOpen(false)}
                                  className="hover:text-neutral-600 transition-colors"
                                >
                                  {nameOf(l.name)}
                                </Link>
                              </h4>

                              {/* Size & Color Label */}
                              <p className="text-[13px] text-neutral-400 font-normal mt-0.5">
                                Size : {l.size || 'M'}{l.color ? ` • ${l.color}` : ''}
                              </p>
                            </div>

                            {/* Top-Right Multiplier Tag (e.g. x2) */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="text-[13px] font-normal text-neutral-400">
                                x{l.qty}
                              </span>

                              {/* Quick interactive stepper */}
                              <div className="inline-flex items-center rounded-full bg-neutral-100 px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => updateQty(key, Math.max(1, l.qty - 1), cfg.maxQty)}
                                  disabled={isBlocked || l.qty <= 1}
                                  className="h-4 w-4 grid place-items-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus size={9} strokeWidth={2.2} />
                                </button>
                                <span className="min-w-[14px] text-center text-[11px] font-medium text-black">
                                  {l.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQty(key, Math.min(cfg.maxQty || 10, l.qty + 1), cfg.maxQty)}
                                  disabled={isBlocked || l.qty >= (available ?? cfg.maxQty)}
                                  className="h-4 w-4 grid place-items-center text-neutral-500 hover:text-black transition-colors disabled:opacity-30"
                                  aria-label="Increase quantity"
                                >
                                  <Plus size={9} strokeWidth={2.2} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Unit Price (Bold Dark Text) */}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[16px] sm:text-[17px] font-bold text-[#111827] tracking-tight tabular-nums">
                              {pkr(l.price)}
                            </span>

                            {/* Subtle Delete Trigger */}
                            <button
                              type="button"
                              onClick={() => removeLine(key)}
                              className="text-[11px] text-neutral-400 hover:text-red-600 transition-colors"
                              title="Remove item"
                            >
                              Remove
                            </button>
                          </div>

                          {isBlocked && (
                            <p className="text-[11px] font-medium text-red-600 pt-1">
                              {status === 'size-gone' ? `Size ${l.size} unavailable` : 'Sold out'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ── HAIRLINE CARD DIVIDER ── */}
                      <div className="border-t border-[#F0F0F2] my-4" />

                      {/* ── BOTTOM HALF: ESTIMATE TOTAL + ACTION PILL BUTTONS ── */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Left: Estimate Total */}
                        <div className="flex flex-col">
                          <span className="text-[11px] sm:text-xs text-neutral-400 font-normal tracking-normal">
                            Estimate Total
                          </span>
                          <span className="text-[17px] sm:text-[18px] font-bold text-[#111827] tabular-nums tracking-tight">
                            {pkr(l.price * l.qty)}
                          </span>
                        </div>

                        {/* Right: Pill Button Group */}
                        <div className="flex items-center gap-2">
                          {/* Main Action Pill Button ("Order Received" / Direct Checkout) */}
                          <button
                            type="button"
                            onClick={() => {
                              setDrawerOpen(false);
                              nav('/checkout');
                            }}
                            className={`rounded-full px-5 py-2.5 text-xs font-semibold tracking-normal transition-all duration-200 shadow-xs flex items-center justify-center gap-1.5 ${
                              isPrimary
                                ? 'bg-[#000000] text-[#FFFFFF] hover:bg-neutral-800 hover:scale-[1.02]'
                                : 'border border-neutral-300 bg-[#FFFFFF] text-neutral-800 hover:border-black hover:text-black'
                            }`}
                          >
                            <span>Order Received</span>
                          </button>

                          {/* Circular / Pill % Discount Trigger Button */}
                          <button
                            type="button"
                            onClick={() => toggleCardCoupon(key)}
                            aria-label="Add discount voucher"
                            title="Add promo code"
                            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                              isPrimary
                                ? 'bg-[#000000] text-[#FFFFFF] hover:bg-neutral-800 hover:scale-[1.05]'
                                : 'border border-neutral-300 bg-[#FFFFFF] text-neutral-700 hover:border-black hover:text-black'
                            }`}
                          >
                            <Percent size={13} strokeWidth={2.4} />
                          </button>
                        </div>
                      </div>

                      {/* ── INLINE PROMO CODE DRAWER ON CARD ── */}
                      <AnimatePresence>
                        {showCouponInput && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden pt-3 border-t border-neutral-100 mt-3"
                          >
                            {!applied ? (
                              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => {
                                      setCouponCode(e.target.value.toUpperCase());
                                      setCouponErr('');
                                    }}
                                    placeholder="ENTER COUPON (e.g. LUXE10)"
                                    className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs uppercase tracking-wider text-black focus:border-black focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="submit"
                                    disabled={!couponCode.trim() || couponBusy}
                                    className="rounded-full bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40 transition-colors shrink-0"
                                  >
                                    {couponBusy ? '…' : 'Apply'}
                                  </button>
                                </div>
                                {couponErr && <p className="text-[11px] text-red-600 font-light pl-2">{couponErr}</p>}
                              </form>
                            ) : (
                              <div className="flex items-center justify-between rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs text-emerald-800">
                                <span className="flex items-center gap-1.5">
                                  <Check size={13} />
                                  Voucher <strong>{applied.code}</strong> applied (−{pkr(applied.discount)})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setApplied(null)}
                                  className="underline text-emerald-950 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* ── STICKY FOOTER (BAG TOTALS & "GOL" PILL CTAS) ── */}
            {cart.length > 0 && (
              <div className="border-t border-neutral-200/80 bg-[#FFFFFF] px-6 py-5 space-y-4 shadow-lg">
                {/* Subtotal & Delivery Status */}
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between text-xs uppercase tracking-wider">
                    <span className="text-[#000000] font-normal">Subtotal</span>
                    <span className="font-semibold text-[#000000] tabular-nums text-sm">{pkr(pricing.subtotal)}</span>
                  </div>

                  {applied && (
                    <div className="flex items-baseline justify-between text-xs text-emerald-700">
                      <span>Discount ({applied.code})</span>
                      <span className="tabular-nums">− {pkr(applied.discount)}</span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between text-xs text-neutral-500 font-light">
                    <span>Express Delivery</span>
                    <span className="text-emerald-700 font-medium uppercase tracking-wider text-[11px]">Free</span>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="flex items-baseline justify-between text-xs uppercase tracking-wider border-t border-neutral-100 pt-3 font-semibold text-[#000000]">
                  <span>Total Due</span>
                  <span className="text-lg font-bold tabular-nums text-[#111827]">{pkr(pricing.total)}</span>
                </div>

                {/* Dual "GOL" Action Pills */}
                <div className="space-y-2.5 pt-1">
                  {blocked ? (
                    <Link
                      to="/cart"
                      onClick={() => setDrawerOpen(false)}
                      className="flex h-[52px] w-full items-center justify-center rounded-full bg-red-100 text-xs font-medium uppercase tracking-[0.18em] text-red-800"
                    >
                      Fix Items in Bag
                    </Link>
                  ) : (
                    <Link
                      to="/checkout"
                      onClick={() => setDrawerOpen(false)}
                      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#000000] text-xs font-medium uppercase tracking-[0.2em] text-[#FFFFFF] shadow-md hover:bg-neutral-800 transition-all hover:scale-[1.01]"
                    >
                      <span>PROCEED TO CHECKOUT</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="flex h-[46px] w-full items-center justify-center rounded-full border border-neutral-300 bg-[#FFFFFF] text-xs font-medium uppercase tracking-[0.18em] text-[#000000] hover:border-black transition-colors"
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
