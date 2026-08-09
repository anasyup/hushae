import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookmarkPlus, Truck } from 'lucide-react';
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

/* ============================================================================
 * SHOPPING BAG
 *
 * Configuration
 *   Every string, toggle and number comes from settings.cart via cartConfig().
 *   Nothing here is hardcoded copy — Admin → Settings → Shopping Bag rewrites
 *   the page without a deploy.
 *
 * Money
 *   One calculation, in useCartPricing. The summary, the sticky bar and the
 *   drawer all read the same object, so they cannot disagree.
 *
 * Removal
 *   Never instant. The row fades, its height collapses, and an Undo bar holds
 *   the line for the merchant-configured window. Only when that window closes
 *   is the removal final.
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

  /* ---------------------------------------------------------------
   * Live stock check.
   * Keyed on the set of product IDs only. Keying it on quantity too
   * (the old behaviour) refetched the whole catalogue slice on every
   * single +/- click — two network round-trips per tap.
   * ------------------------------------------------------------- */
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
            /* Sale-window fields ride along so bag pricing can tell a real
               sale from a stale was-price. */
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

  /* ---------------------------------------------------------------
   * Recommendations. Strategy is merchant-selectable; 'auto' pairs the
   * bag with its complement (bras → panties, briefs → vests).
   * Depends on idKey, not on `cart`, so quantity edits do not refetch.
   * ------------------------------------------------------------- */
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
  }, [idKey, cfg.recommendEnabled, cfg.recommendStrategy]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Trending — only ever fetched for the empty bag. `loadingTrending` lets
     EmptyBag reserve the row's height so the footer cannot jump when it
     lands (measured 0.0380 CLS before the reservation). */
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

  /* ---------------- Per-line status ---------------- */
  const lines = useMemo(() => cart.map((line, index) => {
    const m = stockMap[String(line.id)];
    /* v2 — sale windows: the live was-price is only attached while the product
       is genuinely on sale; a cleared sale must not resurrect a strike-through
       from the cart snapshot. */
    const withCompare = m && isOnSale(m) ? { ...line, compareAtPrice: m.compareAtPrice, onSale: true, saleStart: m.saleStart, saleEnd: m.saleEnd } : { ...line, compareAtPrice: null, onSale: false, saleStart: null, saleEnd: null };
    if (!m) return { line: withCompare, index, status: 'ok', available: null };
    if (!m.isActive) return { line: withCompare, index, status: 'unavailable', available: 0 };
    if (m.stock <= 0) return { line: withCompare, index, status: 'oos', available: 0 };
    if (line.size && m.sizes.length && !m.sizes.includes(line.size)) return { line: withCompare, index, status: 'size-gone', available: m.stock };
    if (line.qty > m.stock) return { line: withCompare, index, status: 'low', available: m.stock };
    return { line: withCompare, index, status: 'ok', available: m.stock };
  }), [cart, stockMap]);

  const blocked = lines.some((x) => BLOCKING.has(x.status));
  const pricing = useCartPricing(lines, settings, cfg, applied);
  /* Display only. useCartPricing remains the single source of bag money; this
     just tells the shopper which automatic offers the SERVER says apply. The
     order route recomputes all of it when the order is placed. */
  const promoQuote = usePromoQuote(cart, { hasCoupon: !!applied });
  const delivery = useMemo(() => deliveryWindow(cfg), [cfg.deliveryMinDays, cfg.deliveryMaxDays]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Sold-out rows float to the top: they are the only thing blocking checkout. */
  const ordered = useMemo(
    () => [...lines].sort((a, b) => (BLOCKING.has(b.status) ? 1 : 0) - (BLOCKING.has(a.status) ? 1 : 0)),
    [lines],
  );

  /* ---------------- Remove with undo ---------------- */
  const commitPending = useCallback(() => {
    setPending(null);
    setRemoving(null);
  }, []);

  const handleRemove = useCallback((entry) => {
    const key = lineKey(entry.line);
    setRemoving(key);
    // Let the fade play, then drop the row and open the undo window.
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

  /* ---------------- Empty ---------------- */
  if (cart.length === 0 && saved.length === 0) {
    return <EmptyBag cfg={cfg} recent={recent.slice(0, 6)} trending={trending} loadingTrending={loadingTrending} />;
  }

  const itemWord = pricing.count === 1 ? 'item' : 'items';

  return (
    <div className="container-page py-8 md:py-12">
      {/* ---------------- Header ---------------- */}
      <header className="border-b border-clay pb-7">
        <Link
          to={cfg.continueHref}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-[12px] text-smoke underline underline-offset-4 transition hover:text-charcoal"
        >
          <ArrowLeft size={13} aria-hidden="true" /> {cfg.continueLabel}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          {/* QA — "Your Bag", Inter 300, 32px */}
          <h1 className="text-[32px] font-light normal-case tracking-[0.02em] text-charcoal">{cfg.title}</h1>
          <p className="text-[12px] text-smoke" aria-live="polite">
            {pricing.count} {itemWord}
            {cfg.showDelivery && pricing.count > 0 && (
              <span className="ml-2 inline-flex items-center gap-1.5 border-l border-clay pl-2">
                <Truck size={12} aria-hidden="true" /> Arrives {delivery}
              </span>
            )}
          </p>
        </div>
      </header>

      {blocked && (
        <p role="alert" className="mt-6 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800">
          Some pieces sold out while they were in your bag. Remove them to continue to checkout.
        </p>
      )}

      <div className="mt-8 grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------------- Lines ---------------- */}
        <section aria-label="Items in your bag">
          <ul className="divide-y divide-clay/60 border-b border-clay/60">
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

          {/* ---------------- Saved for later ---------------- */}
          {cfg.saveForLater && saved.length > 0 && (
            <section className="mt-10" aria-label="Saved for later">
              <h2 className="flex items-center gap-2 text-label uppercase tracking-widest text-ash">
                <BookmarkPlus size={13} aria-hidden="true" />
                Saved for later ({saved.length})
              </h2>
              <ul className="mt-4 divide-y divide-clay/60 border-y border-clay/60">
                {saved.map((l) => (
                  <li key={lineKey(l)} className="flex items-center gap-4 py-4">
                    <Link to={`/product/${l.slug}`} className="shrink-0 overflow-hidden rounded-control bg-cream" tabIndex={-1} aria-hidden="true">
                      <Img src={l.image} alt="" className="h-16 w-14 object-cover" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-body-sm font-medium">
                        <Link to={`/product/${l.slug}`} className="transition hover:underline">{l.name}</Link>
                      </h3>
                      <p className="mt-0.5 text-caption text-ash">
                        {[l.size && `Size ${l.size}`, l.color].filter(Boolean).join(' · ')} · {pkr(l.price)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => { moveToBag(l); toast('Moved to your bag'); }}
                        className="min-h-[44px] px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#111111] underline-offset-4 transition hover:underline"
                      >
                        Move to bag
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSaved(l)}
                        className="min-h-[44px] px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#707070] transition hover:text-[#111111]"
                        aria-label={`Remove ${l.name} from saved items`}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

        </section>

        {/* ---------------- Summary ---------------- */}
        <aside className="lg:sticky lg:top-24" aria-label="Order summary">
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

      {/* ---------------- Recommendations ---------------- */}
      {cfg.recommendEnabled && suggest.length > 0 && (
        <div className="mt-20 border-t border-clay/60 pt-14 md:mt-28">
          <ProductRow eyebrow={cfg.recommendTitle} title="You may also need" products={suggest} />
        </div>
      )}

      {/* Mobile: keep checkout one tap away, above the nav, never overlapping. */}
      <StickyCheckoutBar watchRef={ctaRef} pricing={pricing} cfg={cfg} blocked={blocked} />

      <UndoBar
        pending={pending}
        seconds={cfg.undoSeconds}
        onUndo={handleUndo}
        onDismiss={commitPending}
      />

      {/* Bottom padding so the sticky bar never covers the last row. */}
      <div className="h-24 md:hidden" aria-hidden="true" />
    </div>
  );
}
