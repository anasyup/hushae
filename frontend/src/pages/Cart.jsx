import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookmarkPlus, Truck, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { useApp, lineKey } from '../store/AppContext';
import { api } from '../api/client';
import { pkr, snap } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { cartConfig, deliveryWindow } from '../lib/cartConfig';
import Img from '../components/Img';
import ProductRow from '../components/ProductRow';
import CartLine from './cart/CartLine';
import OrderSummary from './cart/OrderSummary';
import usePromoQuote from '../lib/usePromoQuote';
import StickyCheckoutBar from './cart/StickyCheckoutBar';
import UndoBar from './cart/UndoBar';
import EmptyBag from './cart/EmptyBag';

import { useCartPricing } from './cart/useCartPricing';
import Seo from '../components/Seo';

/* ============================================================================
 * HUSHAE Shopping Bag — Ultra-Luxury Full Bag Experience (CK / SKIMS / The Row)
 * ========================================================================== */

const BLOCKING = new Set(['oos', 'unavailable', 'size-gone']);

export default function Cart() {
  const {
    cart, updateQty, removeLine, restoreLine, settings, recent,
    saved, saveForLater, moveToBag, removeSaved,
    wishlist, toggleWish, toast,
  } = useApp();

  const cfg = useMemo(() => cartConfig(settings), [settings]);

  const [stockMap, setStockMap] = useState({});
  const [suggest, setSuggest] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [applied, setApplied] = useState(null);
  const [pending, setPending] = useState(null);   // { line, at, index }
  const [removing, setRemoving] = useState(null); // lineKey mid-animation
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

  useEffect(() => {
    if (!cfg.recommendEnabled || !cart.length) { setSuggest([]); return; }
    const slugs = cart.map((l) => l.slug || '');
    const inCart = new Set(slugs);
    let q;
    if (cfg.recommendStrategy === 'bestsellers') q = 'sort=best&limit=8';
    else if (cfg.recommendStrategy === 'recent' && recent.length) q = `ids=${recent.slice(0, 8).map((r) => r.id).join(',')}&limit=8`;
    else {
      const need = (slugs.some((s) => /bra|bralette/.test(s)) && 'panties')
        || (slugs.some((s) => /brief|trunk|boxer/.test(s)) && 'vests-undershirts')
        || (slugs.some((s) => /vest|undershirt/.test(s)) && 'briefs')
        || 'bras';
      q = `category=${need}&limit=8`;
    }
    let alive = true;
    api(`/products?${q}`)
      .then((d) => { if (alive) setSuggest((d.products || []).filter((p) => !inCart.has(p.slug)).slice(0, 4).map(snap)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [idKey, cfg.recommendEnabled, cfg.recommendStrategy]);

  useEffect(() => {
    if (cart.length || trending.length) return undefined;
    let alive = true;
    setLoadingTrending(true);
    api('/products?sort=best&limit=8')
      .then((d) => { if (alive) setTrending((d.products || []).slice(0, 6).map(snap)); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingTrending(false); });
    return () => { alive = false; };
  }, [cart.length, trending.length]);

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
  const promoQuote = usePromoQuote(cart, { hasCoupon: !!applied });
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

  const handleSave = useCallback((line) => {
    saveForLater(line);
    toast('Saved for later');
  }, [saveForLater, toast]);

  const isWished = useCallback((line) => wishlist.some((w) => w.id === line.id), [wishlist]);

  if (cart.length === 0 && saved.length === 0) {
    return (
      <>
        <Seo title="Your Bag — HUSHAE" description="Review the items in your bag — secure checkout, COD nationwide, discreet packaging." />
        <EmptyBag cfg={cfg} recent={recent.slice(0, 6)} trending={trending} loadingTrending={loadingTrending} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[120px] pb-24 font-sans text-[#111111] antialiased">
      <Seo title="Your Bag — HUSHAE" description="Review the items in your bag — secure checkout, COD nationwide, discreet packaging." />

      <div className="mx-auto max-w-[1500px] px-6 sm:px-8 md:px-12">
        {/* ── TOP HEADER BAR ── */}
        <div className="border-b border-[#EAEAEA] pb-5 mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light uppercase tracking-tight text-[#000000]">
              Shopping Bag
            </h1>
            <p className="mt-1 text-xs text-neutral-500 font-light">
              {pricing.count} {pricing.count === 1 ? 'piece' : 'pieces'} in your bag
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-neutral-600 hover:text-black transition-colors"
            >
              <ArrowLeft size={13} />
              <span>Continue Shopping</span>
            </Link>
          </div>
        </div>

        {blocked && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            Some pieces sold out while in your bag. Please remove them to proceed to checkout.
          </div>
        )}

        {/* ── 2-COLUMN LUXURY BAG SUITE ── */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 items-start">

          {/* ── LEFT: LINE ITEMS (7 COLS) ── */}
          <section className="lg:col-span-7 space-y-6" aria-label="Items in your bag">
            {/* Table Header (Desktop) */}
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_140px_120px_40px] gap-4 border-b border-[#EAEAEA] pb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400 md:grid">
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span className="text-right">Total</span>
              <span aria-hidden="true" />
            </div>

            {/* Line items list */}
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
                  onSave={() => handleSave(entry.line)}
                  onWish={() => toggleWish(entry.line)}
                />
              ))}
            </ul>

            {/* Saved for later section */}
            {cfg.saveForLater && saved.length > 0 && (
              <div className="mt-12 pt-6 border-t border-[#EAEAEA]" aria-label="Saved for later">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-black">
                  <BookmarkPlus size={14} aria-hidden="true" />
                  Saved For Later ({saved.length})
                </h2>

                <ul className="mt-4 divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
                  {saved.map((l) => (
                    <li key={lineKey(l)} className="flex items-center gap-4 py-4">
                      <Link to={`/product/${l.slug}`} className="shrink-0 aspect-[3/4] w-16 rounded-xl overflow-hidden bg-[#F8F8F8] border border-[#EAEAEA]">
                        <Img src={l.image} alt="" className="h-full w-full object-cover" />
                      </Link>

                      <div className="min-w-0 flex-1 space-y-0.5">
                        <h3 className="text-xs font-medium text-black truncate">
                          <Link to={`/product/${l.slug}`} className="hover:text-neutral-500 transition-colors">
                            {l.name}
                          </Link>
                        </h3>
                        <p className="text-[11px] text-neutral-500 font-light">
                          {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')} · {pkr(l.price)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => { moveToBag(l); toast('Moved to your bag'); }}
                          className="rounded-full border border-neutral-300 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-black hover:border-black transition-colors"
                        >
                          Move to Bag
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSaved(l)}
                          className="px-2 py-1 text-[11px] text-neutral-400 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ── RIGHT: STICKY ORDER SUMMARY (5 COLS) ── */}
          <aside className="lg:col-span-5 lg:sticky lg:top-[120px]" aria-label="Order summary">
            <OrderSummary
              pricing={pricing}
              promoQuote={promoQuote}
              cfg={cfg}
              applied={applied}
              onApply={setApplied}
              onRemoveCoupon={() => setApplied(null)}
              blocked={blocked}
              ctaRef={ctaRef}
            />
          </aside>
        </div>

        {/* ── RECOMMENDATIONS / YOU MAY ALSO NEED ── */}
        {cfg.recommendEnabled && suggest.length > 0 && (
          <div className="mt-24 border-t border-[#EAEAEA] pt-16">
            <ProductRow eyebrow="RECOMMENDED EDITS" title="Complete Your Wardrobe" products={suggest} />
          </div>
        )}

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
