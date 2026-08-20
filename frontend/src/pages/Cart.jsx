import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { cartConfig, deliveryWindow } from '../lib/cartConfig';
import CartLine from './cart/CartLine';
import OrderSummary from './cart/OrderSummary';
import StickyCheckoutBar from './cart/StickyCheckoutBar';
import UndoBar from './cart/UndoBar';
import EmptyBag from './cart/EmptyBag';
import { useCartPricing } from './cart/useCartPricing';
import Seo from '../components/Seo';

/* ============================================================================
 * HUSHAE Shopping Bag — Pure Quiet Luxury (The Row / Toteme / Jil Sander)
 *
 * PHILOSOPHY:
 *   - Absolute restraint: Zero visual noise, zero cluttered boxes.
 *   - Pristine white ground, delicate 1px hairlines, and open letter-spacing.
 *   - Clean 2-column layout (Line items / Flat minimalist summary).
 * ========================================================================== */

const BLOCKING = new Set(['oos', 'unavailable', 'size-gone']);

export default function Cart() {
  const {
    cart, updateQty, removeLine, restoreLine, settings,
    wishlist, toggleWish, toast,
  } = useApp();

  const cfg = useMemo(() => cartConfig(settings), [settings]);
  const [stockMap, setStockMap] = useState({});
  const [applied, setApplied] = useState(null);
  const [pending, setPending] = useState(null);
  const [removing, setRemoving] = useState(null);
  const ctaRef = useRef(null);
  const undoTimer = useRef(0);

  const idKey = useMemo(
    () => Array.from(new Set(cart.map((l) => l.id).filter(Boolean))).sort().join(','),
    [cart],
  );

  useEffect(() => {
    if (!idKey) { setStockMap({}); return; }
    let alive = true;
    api(`/products?ids=${idKey}&limit=50`)
      .then((d) => {
        if (!alive) return;
        const map = {};
        (d.products || []).forEach((p) => {
          map[String(p._id)] = {
            stock: p.stock ?? 0,
            sizes: p.sizes || [],
            isActive: p.isActive !== false,
            compareAtPrice: p.compareAtPrice || null,
            onSale: p.onSale === true,
            saleStart: p.saleStart || null,
            saleEnd: p.saleEnd || null,
          };
        });
        setStockMap(map);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [idKey]);

  const lines = useMemo(() => cart.map((line, index) => {
    const m = stockMap[String(line.id)];
    const withCompare = m && isOnSale(m)
      ? { ...line, compareAtPrice: m.compareAtPrice, onSale: true, saleStart: m.saleStart, saleEnd: m.saleEnd }
      : { ...line, compareAtPrice: null, onSale: false, saleStart: null, saleEnd: null };
    if (!m) return { line: withCompare, index, status: 'ok', available: null };
    if (!m.isActive) return { line: withCompare, index, status: 'unavailable', available: 0 };
    if (m.stock <= 0) return { line: withCompare, index, status: 'oos', available: 0 };
    if (line.size && m.sizes.length && !m.sizes.includes(line.size)) return { line: withCompare, index, status: 'size-gone', available: m.stock };
    if (line.qty > m.stock) return { line: withCompare, index, status: 'low', available: m.stock };
    return { line: withCompare, index, status: 'ok', available: m.stock };
  }), [cart, stockMap]);

  const blocked = lines.some((x) => BLOCKING.has(x.status));
  const pricing = useCartPricing(lines, settings, cfg, applied);
  const delivery = useMemo(() => deliveryWindow(cfg), [cfg.deliveryMinDays, cfg.deliveryMaxDays]);

  const ordered = useMemo(
    () => [...lines].sort((a, b) => (BLOCKING.has(b.status) ? 1 : 0) - (BLOCKING.has(a.status) ? 1 : 0)),
    [lines],
  );

  const commitPending = useCallback(() => {
    setPending(null);
    setRemoving(null);
  }, []);

  const handleRemove = useCallback((entry) => {
    const key = lineKey(entry.line);
    setRemoving(key);
    setTimeout(() => {
      removeLine(key);
      setRemoving(null);
      setPending({ line: entry.line, index: entry.index, at: Date.now() });
      clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(commitPending, Math.max(1, cfg.undoSeconds) * 1000);
    }, 180);
  }, [removeLine, commitPending, cfg.undoSeconds]);

  const handleUndo = useCallback(() => {
    if (!pending) return;
    clearTimeout(undoTimer.current);
    restoreLine(pending.line, pending.index);
    setPending(null);
    toast('Item restored to your bag');
  }, [pending, restoreLine, toast]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

  const isWished = useCallback((line) => wishlist.some((w) => w.id === line.id), [wishlist]);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] pt-[140px] pb-24 font-sans text-[#111111] antialiased">
        <Seo title="Shopping Bag — HUSHAE" description="Your shopping bag is empty." />
        <div className="mx-auto max-w-xl px-6">
          <EmptyBag cfg={cfg} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[130px] pb-28 font-sans text-[#111111] antialiased">
      <Seo title="Shopping Bag — HUSHAE" description="Review the items in your bag — discreet packaging, COD nationwide." />

      <div className="mx-auto max-w-[1360px] px-6 sm:px-10 lg:px-16">
        {/* ── MINIMALIST HEADER ── */}
        <div className="border-b border-[#EAEAEA] pb-5 mb-10 flex items-baseline justify-between">
          <h1 className="text-sm sm:text-base font-normal uppercase tracking-[0.24em] text-[#000000]">
            Shopping Bag ({pricing.count})
          </h1>

          <Link
            to="/shop"
            className="text-[11.5px] uppercase tracking-[0.18em] text-neutral-400 hover:text-black transition-colors underline underline-offset-4"
          >
            Continue Shopping
          </Link>
        </div>

        {blocked && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 font-light">
            Some pieces sold out while in your bag. Please remove them to continue.
          </div>
        )}

        {/* ── 2-COLUMN MINIMALIST SPREAD (8 COLS / 4 COLS) ── */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 items-start">

          {/* ── LEFT: LINE ITEMS (8 COLS) ── */}
          <section className="lg:col-span-8" aria-label="Items in your bag">
            {/* Minimalist column headers */}
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_100px_32px] gap-6 border-b border-[#EAEAEA] pb-3 text-[10.5px] uppercase tracking-[0.2em] text-neutral-400 md:grid font-normal">
              <span>Item</span>
              <span>Price</span>
              <span>Quantity</span>
              <span className="text-right">Total</span>
              <span aria-hidden="true" />
            </div>

            {/* Pristine items list */}
            <ul className="divide-y divide-[#EAEAEA] border-b border-[#EAEAEA]">
              {ordered.map((entry) => (
                <CartLine
                  key={lineKey(entry.line)}
                  line={entry.line}
                  status={entry.status}
                  available={entry.available}
                  cfg={cfg}
                  delivery={delivery}
                  removing={removing === lineKey(entry.line)}
                  wished={isWished(entry.line)}
                  onQty={(q) => updateQty(lineKey(entry.line), q, cfg.maxQty)}
                  onRemove={() => handleRemove(entry)}
                  onWish={() => toggleWish(entry.line)}
                />
              ))}
            </ul>
          </section>

          {/* ── RIGHT: FLAT MINIMALIST SUMMARY (4 COLS) ── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-[120px]" aria-label="Order summary">
            <OrderSummary
              pricing={pricing}
              cfg={cfg}
              applied={applied}
              onApply={setApplied}
              onRemoveCoupon={() => setApplied(null)}
              blocked={blocked}
              ctaRef={ctaRef}
            />
          </aside>
        </div>

        {/* Mobile sticky bar */}
        <StickyCheckoutBar watchRef={ctaRef} pricing={pricing} cfg={cfg} blocked={blocked} />

        <UndoBar
          pending={pending}
          seconds={cfg.undoSeconds}
          onUndo={handleUndo}
          onDismiss={commitPending}
        />
      </div>
    </div>
  );
}
