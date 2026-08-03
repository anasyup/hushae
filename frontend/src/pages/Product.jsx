import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, Banknote, CheckCircle2, ChevronRight, CreditCard, Heart,
  Package, RotateCcw, Ruler, ShieldCheck, Star, Truck,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr, snap } from '../lib/format';
import { isOnSale, salePercent, saleEndsSoon, saleEndsOnLabel } from '../lib/sale';
import { isVideo } from '../lib/media';
import QuantityStepper from '../components/ui/QuantityStepper';
import ProductRow from '../components/ProductRow';
import ProductReviews from '../components/ProductReviews';
import ProductQA from '../components/reviews/ProductQA';
import SizeGuideModal from '../components/SizeGuideModal';
import { ProductSkeleton } from '../components/Skeletons';
import Tx from '../components/Tx';
import Seo, { productJsonLd } from '../components/Seo';
import ProductGallery from './product/ProductGallery';
import StickyBuyBar from './product/StickyBuyBar';

const ProductPromoPanel = lazy(() => import('../components/marketing/ProductPromoPanel'));

import Accordion from './product/Accordion';

const LIGHT_HEX = new Set(['#FFFFFF', '#FFF', '#F7F5F1', '#EFEAE3', '#E3C9B3', '#E8C7C8', '#E4DDD3']);
const STANDING_MARKDOWN = 25;
const CRUMB = 'transition-colors duration-base ease-standard hover:text-obsidian';

export default function Product() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addToCart, inWishlist, toggleWish, pushRecent, recent, settings } = useApp();
  const rvCfg = settings?.customerExperience?.recentlyViewed || {};

  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeErr, setSizeErr] = useState(false);
  const [added, setAdded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [bundle, setBundle] = useState([]);
  const [related, setRelated] = useState([]);
  const [reviewTotal, setReviewTotal] = useState(null);

  const ctaRef = useRef(null);   // the real Add/Buy row
  const sizeRef = useRef(null);

  useEffect(() => {
    setP(null); setErr(false); setImgIdx(0); setSize(''); setQty(1);
    setSizeErr(false); setAdded(false); setBundle([]); setRelated([]);
    setReviewTotal(null);
    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors[0]?.name || '');
        pushRecent(d.product);
        const bslug = d.product.bundleSlug || '';
        if (bslug) api(`/products?category=${bslug}&limit=3&sort=popular`).then((x) => setBundle(x.products)).catch(() => {});
        api(`/reviews/product/${d.product._id}?limit=1`)
          .then((r) => setReviewTotal(Number(r?.total) || 0))
          .catch(() => setReviewTotal(0));
      })
      .catch(() => setErr(true));
    api(`/products/${slug}/related`).then((d) => setRelated(d.products || [])).catch(() => setRelated([]));
  }, [slug]); // eslint-disable-line

  useEffect(() => { setAdded(false); }, [size, color, qty]);

  const media = useMemo(() => {
    if (!p) return [];
    const imgs = (p.images || []).map((im) => ({ t: isVideo(im.url) ? 'video' : 'img', url: im.url, alt: im.alt || p.name }));
    return p.video && !imgs.some((m) => m.url === p.video)
      ? [...imgs, { t: 'video', url: p.video, alt: `${p.name} video` }]
      : imgs;
  }, [p]);

  if (err) {
    return (
      <div className="container-page py-sect-y md:py-sect-y-lg">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Package size={24} strokeWidth={1.6} /></span>
          <h1 className="mt-6 font-display text-h2">This piece has moved on</h1>
          <p className="mt-2 text-body-sm">It may be sold out or no longer part of the edit.</p>
          <Link to="/shop" className="btn-primary mt-8">Back to Shop</Link>
        </div>
      </div>
    );
  }
  if (!p) return <ProductSkeleton />;

  const wished = inWishlist(p);
  const isBra = p.categorySlug === 'bras';
  const needsSize = (p.sizes || []).length > 0;
  const soldOut = p.stock === 0;
  /* v2 — sale windows. Only the merchant's explicit sale (flag + was-price +
     window) counts; compareAtPrice alone no longer means "on sale". */
  const onSale = isOnSale(p);
  const off = salePercent(p);
  const notableMarkdown = onSale && off > STANDING_MARKDOWN;
  const saleUrgent = saleEndsSoon(p, 7);
  const saleEndLabel = saleEndsOnLabel(p);
  const lowStock = !soldOut && p.stock <= 5;

  const tierLabel = p.tier === 'Premium' ? 'Signature' : p.tier;
  const reviewsShown = reviewTotal ?? 0;

  const extraBadges = (p.badges || [])
    .filter((b) => String(b).trim().toLowerCase() !== String(tierLabel).trim().toLowerCase());

  const tryAdd = (goToCheckout) => {
    if (needsSize && !size) {
      setSizeErr(true);
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      sizeRef.current?.querySelector('button')?.focus();
      return;
    }
    addToCart(p, { size, color, quantity: qty });
    setAdded(true);
    if (goToCheckout) nav('/checkout');
  };

  const pickColor = (name) => {
    setColor(name);
    const c = p.colors.find((x) => x.name === name);
    if (c?.image) {
      const idx = p.images.findIndex((im) => im.url === c.image);
      if (idx >= 0) setImgIdx(idx);
    }
  };

  return (
    <div className="container-page py-6 md:py-8 bg-[#FBFAF8] text-[#000000]">
      <Seo
        title={p.name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${p.name} — premium innerwear from HUSHAE. PKR ${p.price}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-neutral-400">
        <Link to="/" className={CRUMB}>Home</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <Link to={`/${p.gender}`} className={`capitalize ${CRUMB}`}>{p.gender}</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <Link to={`/category/${p.categorySlug}`} className={CRUMB}>{p.categorySlug.replace(/-/g, ' ')}</Link>
        <ChevronRight size={12} aria-hidden="true" />
        <span aria-current="page" className="clamp-2 max-w-[180px] text-neutral-900 font-semibold">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 xl:grid-cols-[1.35fr_1fr] xl:gap-20">
        {/* Left Column: Composed Lookbook Gallery */}
        <div className="min-w-0">
          <ProductGallery media={media} index={imgIdx} onIndex={setImgIdx} productName={p.name} />
        </div>

        {/* Right Column: Sticky, Premium Details Block (LV/Corsen Style) */}
        <aside className="lg:sticky lg:top-28 lg:h-fit space-y-6">
          <div className="border-b border-[#E4E0DA] pb-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-2.5 py-1 bg-neutral-900 text-white rounded-[2px]">
                {tierLabel}
              </span>
              {notableMarkdown && (
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-2.5 py-1 bg-neutral-900 text-white rounded-[2px]">
                  {off}% off
                </span>
              )}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#6B7252]">HUSHAE / {p.gender}</p>
            <h1 className="font-sans text-3xl font-light uppercase tracking-tight text-neutral-900 sm:text-4xl leading-tight">
              {p.name}
            </h1>

            {/* Ratings & SKU */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 font-mono">
              {reviewsShown > 0 ? (
                <>
                  <span className="inline-flex items-center gap-1 text-neutral-900 font-semibold">
                    <Star size={13} fill="currentColor" aria-hidden="true" className="text-amber-500" />
                    <span>{p.ratingAvg.toFixed(1)}</span>
                  </span>
                  <span aria-hidden="true" className="text-neutral-300">|</span>
                  <a href="#reviews" className="hover:text-neutral-900 underline underline-offset-4 decoration-1">
                    {reviewsShown} review{reviewsShown === 1 ? '' : 's'}
                  </a>
                  <span aria-hidden="true" className="text-neutral-300">|</span>
                </>
              ) : null}
              <span>SKU: <span className="font-semibold text-neutral-800">{p.sku || p._id?.slice(-8).toUpperCase()}</span></span>
            </div>

            {/* Price section */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-2">
              <span className="font-sans text-2xl font-bold text-neutral-900 tabular-nums">{pkr(p.price)}</span>
              {onSale && (
                <>
                  <span className="text-sm tabular-nums text-neutral-400 line-through font-light">
                    {pkr(p.compareAtPrice)}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-[2px]">
                    Save {pkr(p.compareAtPrice - p.price)}
                  </span>
                </>
              )}
            </div>

            {/* Sale urgency — real windows end, so say so. Only when the sale
                actually has an end date (saleEndsOnLabel returns '' otherwise). */}
            {onSale && saleEndLabel && (
              <p aria-live="polite" className="flex items-center gap-1.5 text-xs">
                <AlertCircle size={13} className={saleUrgent ? 'text-red-600' : 'text-amber-600'} />
                <span className={`font-semibold uppercase tracking-wider ${saleUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                  {saleUrgent ? `Sale ends soon — ${saleEndLabel}` : `Sale ends ${saleEndLabel}`}
                </span>
              </p>
            )}

            {/* Stock Indicator */}
            <p aria-live="polite" className="flex items-center gap-1.5 text-xs">
              {soldOut ? (
                <><AlertCircle size={13} className="text-red-600" /><span className="font-semibold text-red-600 uppercase tracking-wider">Out of stock</span></>
              ) : lowStock ? (
                <><AlertCircle size={13} className="text-amber-600" /><span className="font-semibold text-amber-600 uppercase tracking-wider">Only {p.stock} left — High Demand</span></>
              ) : (
                <><CheckCircle2 size={13} className="text-[#6B7252]" /><span className="text-[#6B7252] font-semibold uppercase tracking-wider">In stock — Ships in 24–48h</span></>
              )}
            </p>
          </div>

          {/* Color Selector */}
          {p.colors?.length > 0 && (
            <fieldset className="border-0 p-0 space-y-2">
              <legend className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
                Colour — <span className="text-neutral-900 font-semibold">{color}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {p.colors.map((c) => {
                  const on = color === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => pickColor(c.name)}
                      aria-pressed={on}
                      aria-label={c.name}
                      title={c.name}
                      className={`grid h-10 w-10 place-items-center rounded-full border transition-all duration-150 ${
                        on ? 'border-transparent ring-2 ring-neutral-900 ring-offset-2 ring-offset-[#FBFAF8]' : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {on && (
                        <CheckCircle2
                          size={14} strokeWidth={2.5}
                          className={LIGHT_HEX.has(String(c.hex).toUpperCase()) ? 'text-neutral-900' : 'text-white'}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Size Selector */}
          {needsSize && (
            <fieldset ref={sizeRef} className="border-0 p-0 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">Size</legend>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <button type="button" onClick={() => setGuideOpen(true)}
                    className="text-neutral-500 underline underline-offset-4 hover:text-neutral-900">
                    Size guide
                  </button>
                  <Link to="/fit-finder" className="inline-flex items-center gap-1 text-[#6B7252] hover:underline">
                    <Ruler size={11} /> Fit Finder
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {p.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSize(s); setSizeErr(false); }}
                      aria-pressed={on}
                      className={`min-h-[44px] min-w-[52px] rounded-[2px] border text-xs font-bold uppercase tracking-[0.05em] transition-all active:scale-[0.98] ${
                        on
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {sizeErr && !size && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600 mt-2">
                  <AlertCircle size={12} /> Choose your size
                </p>
              )}
            </fieldset>
          )}

          {/* Quantity, Add to Cart & Wishlist Row (LV/Corsen Style - Unified & Asymmetric) */}
          <div ref={ctaRef} className="pt-4 border-t border-[#E4E0DA] space-y-4">
            <div className="flex items-center gap-3">
              {/* Stepper */}
              <QuantityStepper value={qty} onChange={setQty} min={1} max={Math.max(1, Math.min(10, p.stock || 10))} />

              {/* Add to Bag (Sleek high-fashion rectangular) */}
              <button
                type="button"
                onClick={() => tryAdd(false)}
                disabled={soldOut}
                className="flex-1 min-h-[46px] inline-flex items-center justify-center rounded-[2px] bg-neutral-900 text-white text-xs font-bold uppercase tracking-[0.2em] transition duration-300 hover:bg-[#6B7252] disabled:opacity-40"
              >
                Add to Bag
              </button>

              {/* Wishlist Square Button next to Add to Bag */}
              <button
                type="button"
                onClick={() => toggleWish(p)}
                aria-pressed={wished}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[2px] border transition duration-300 ${
                  wished ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-400 hover:border-neutral-900 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Heart size={16} strokeWidth={wished ? 2.5 : 2} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Buy Now (Full width outline) */}
            <button
              type="button"
              onClick={() => tryAdd(true)}
              disabled={soldOut}
              className="w-full min-h-[46px] inline-flex items-center justify-center rounded-[2px] border border-neutral-900 bg-transparent text-neutral-900 text-xs font-bold uppercase tracking-[0.2em] transition duration-300 hover:bg-neutral-900 hover:text-white disabled:opacity-40"
            >
              Express Checkout &rarr;
            </button>

            <p aria-live="polite" className="min-h-[1.25rem] text-xs">
              {added && (
                <span className="inline-flex items-center gap-1.5 pt-1 font-semibold text-[#6B7252] uppercase tracking-wider">
                  ✓ Successfully added to your bag
                </span>
              )}
            </p>
          </div>

          {/* Offers Panel */}
          <div className="pt-2">
            <Suspense fallback={null}>
              <ProductPromoPanel product={p} />
            </Suspense>
          </div>

          {/* Minimal Trust Row */}
          <ul className="grid grid-cols-3 divide-x divide-neutral-200 border-t border-b border-[#E4E0DA] py-4 text-center">
            {[
              [Truck, '2–5 Day Delivery'],
              [RotateCcw, '14-Day Exchange'],
              [ShieldCheck, 'Discreet Package'],
            ].map(([Icon, txt]) => (
              <li key={txt} className="flex flex-col items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <Icon size={15} className="text-neutral-800" />
                {txt}
              </li>
            ))}
          </ul>

          {/* Accordion Sheets (Detailed Description) */}
          <div className="pt-2 space-y-1">
            <Accordion title="Detailed Description" defaultOpen>
              <p className="text-sm text-neutral-600 leading-relaxed font-light">{p.description}</p>
            </Accordion>
            <Accordion title="Fabric & Feel (Strict Quality)">
              <p className="font-semibold text-neutral-900 text-sm">{p.fabric}</p>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed font-light">Every HUSHAE fabric is wash-tested for 40 cycles before it enters the edit — softness in, softness out.</p>
            </Accordion>
            <Accordion title="Care & Maintenance">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-600 font-light">
                {(p.care || []).map((c) => <li key={c}>{c}</li>)}
              </ul>
            </Accordion>
            <Accordion title="Shipping & Returns Policy">
              <p className="text-sm text-neutral-600 leading-relaxed font-light">
                Flat {pkr(settings?.shippingFlatRate ?? 350)} nationwide, free over {pkr(settings?.freeShippingThreshold ?? 4999)}.
                Dispatched in 24–48h in plain, unmarked packaging.
              </p>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed font-light">
                Unworn pieces exchange within 14 days — size swaps are free. For hygiene reasons innerwear is only
                returnable if it arrives faulty.
              </p>
            </Accordion>
            <Accordion title="Composition Details">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-xs">
                {[
                  ['SKU', p.sku || p._id?.toUpperCase()],
                  ['Material', p.fabric],
                  ['Tier', p.tier === 'Premium' ? 'Signature' : p.tier],
                  ['Category', p.categorySlug?.replace(/-/g, ' ')],
                  ['Sizes', (p.sizes || []).join(' · ') || '—'],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{k}</dt>
                    <dd className="capitalize text-neutral-700 font-mono">{v}</dd>
                  </div>
                ))}
              </dl>
            </Accordion>
          </div>
        </aside>
      </div>

      {/* Complete the Set / Pairs with */}
      {bundle.length > 0 && (
        <div className="mt-24 md:mt-32">
          <ProductRow eyebrow="Complete the set" title="Pairs perfectly with" products={bundle.map(snap)} />
        </div>
      )}

      {/* You may also like */}
      {related.length > 0 && (
        <div className="mt-24 md:mt-32">
          <ProductRow eyebrow="You may also like" title="Related pieces" products={related.map(snap)} />
        </div>
      )}

      {/* Reviews Section */}
      <div id="reviews" className="scroll-mt-28">
        <ProductReviews product={p} />
        <ProductQA product={p} />
      </div>

      {/* Recently Viewed */}
      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <div className="mt-24 pb-4 md:mt-32">
          <ProductRow eyebrow="Your history" title={rvCfg.title || 'Recently viewed'} products={recent.filter((r) => r.slug !== p.slug).slice(0, 8)} />
        </div>
      )}

      {/* Sticky Bottom Purchase Bar */}
      <StickyBuyBar
        product={p}
        watchRef={ctaRef}
        size={size}
        needsSize={needsSize}
        onAdd={() => tryAdd(false)}
        disabled={soldOut}
        thumb={p.images?.[0]?.url}
      />

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}
