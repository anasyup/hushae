import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, Award, ChevronRight, Heart,
  Package, RotateCcw, Ruler, ShieldCheck, Truck,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr, snap } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';
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

/* QA — brand name lives in the header; strip it from page-level names. */
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');
const nameOf = (p) => titleCase(displayName(p?.name));


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
  const addTimer = useRef(null); // resets "ADDED ✓" after 2s
  const [guideOpen, setGuideOpen] = useState(false);
  const [bundle, setBundle] = useState([]);
  const [related, setRelated] = useState([]);
  const [complete, setComplete] = useState([]);   // CK-style "Complete the Look" — never empty
  const [reviewTotal, setReviewTotal] = useState(null);

  const ctaRef = useRef(null);   // the real Add/Buy row
  const sizeRef = useRef(null);

  useEffect(() => {
    setP(null); setErr(false); setImgIdx(0); setSize(''); setQty(1);
    setSizeErr(false); setAdded(false); setBundle([]); setRelated([]); setComplete([]);
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

  /* ── CK-style "Complete the Look" — the section must NEVER sit empty.
     Priority: merchant bundle → same-category picks. Related is kept for the
     "You may also like" row, which dedupes against this list. */
  useEffect(() => {
    if (!p) return;
    if (bundle.length) { setComplete(bundle.slice(0, 4)); return; }
    let alive = true;
    api(`/products?category=${p.categorySlug}&limit=4&sort=popular`)
      .then((x) => { if (alive) setComplete((x.products || []).filter((pr) => pr.slug !== p.slug).slice(0, 4)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [p, bundle]); // eslint-disable-line

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
  /* v2 — sale windows. Only the merchant's explicit sale counts; the was-price
     is shown struck through, never as a "save" amount or a countdown. */
  const onSale = isOnSale(p);
  const reviewsShown = reviewTotal ?? 0;
  const name = nameOf(p);

  /* CK-style: Earn X points — mirrors the loyalty earn rate (server decides
     the real award; this is the same display-only estimate checkout uses). */
  const loyaltyCfg = settings?.loyalty;
  const showPoints = loyaltyCfg?.enabled === true;
  const earnPoints = showPoints
    ? Math.floor(p.price * (Number(loyaltyCfg?.earn?.perCurrency) || 0.01))
    : 0;

  /* "You may also like" never duplicates "Complete the Look". */
  const relatedExtra = related.filter((r) => !complete.some((c) => c.slug === r.slug));

  const tryAdd = (goToCheckout) => {
    if (needsSize && !size) {
      setSizeErr(true);
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      sizeRef.current?.querySelector('button')?.focus();
      return;
    }
    addToCart(p, { size, color, quantity: qty });
    setAdded(true);
    window.clearTimeout(addTimer.current);
    addTimer.current = window.setTimeout(() => setAdded(false), 2000);
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
    <div className="container-page bg-stone py-6 text-charcoal md:py-8">
      <Seo
        title={name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${name} — premium innerwear from HUSHAE. PKR ${p.price}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* QA — breadcrumb at the TOP, quiet 11px smoke */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-[11px] font-normal text-smoke md:mb-8">
        <Link to="/" className="transition hover:text-charcoal">Home</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <Link to={`/${p.gender}`} className="capitalize transition hover:text-charcoal">{p.gender}</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <Link to={`/category/${p.categorySlug}`} className="capitalize transition hover:text-charcoal">{p.categorySlug.replace(/-/g, ' ')}</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <span aria-current="page" className="clamp-1 max-w-[240px]">{name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14 xl:grid-cols-[1.2fr_1fr] xl:gap-20">
        {/* Left Column: Composed Lookbook Gallery */}
        <div className="min-w-0">
          <ProductGallery media={media} index={imgIdx} onIndex={setImgIdx} productName={name} />
        </div>

        {/* Right Column: Sticky, Quiet Details */}
        <aside className="lg:sticky lg:top-28 lg:h-fit space-y-7">
          <div className="border-b border-clay pb-7 space-y-4">
            {/* Product name — Inter 400, 28px, Title Case, charcoal */}
            <h1 className="text-[28px] font-normal leading-tight normal-case tracking-[0.01em] text-charcoal">
              {name}
            </h1>

            {/* Price — Inter 500, 18px + struck was-price. No "save" amounts. */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[18px] font-medium text-charcoal tabular-nums">{pkr(p.price)}</span>
              {onSale && (
                <span className="text-[14px] font-normal text-smoke line-through tabular-nums">
                  {pkr(p.compareAtPrice)}
                </span>
              )}
            </div>

            {/* Description — Inter 400, 14px, smoke, 1.7 leading */}
            <p className="body-qa">
              {p.shortDescription || p.description}
            </p>

            {/* Quiet meta — reviews link · item no. */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-smoke">
              {reviewsShown > 0 ? (
                <a href="#reviews" className="underline underline-offset-4 transition hover:text-charcoal">
                  {reviewsShown} review{reviewsShown === 1 ? '' : 's'}
                </a>
              ) : (
                <span>No reviews yet</span>
              )}
              <span aria-hidden="true" className="text-clay">|</span>
              <span>Item No. <span className="font-medium text-charcoal">{p.sku || p._id?.slice(-8).toUpperCase()}</span></span>
              <span aria-hidden="true" className="text-clay">|</span>
              <span>{soldOut ? 'Sold out' : 'In stock'}</span>
            </div>
          </div>

          {/* Colour Selector — flat rectangles, 2px clay border, text-only */}
          {p.colors?.length > 0 && (
            <fieldset className="border-0 p-0">
              <legend className="label-qa">
                Colour — <span className="font-medium normal-case text-charcoal">{color}</span>
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.colors.map((c) => {
                  const on = color === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => pickColor(c.name)}
                      aria-pressed={on}
                      aria-label={c.name}
                      className={`border-2 px-4 py-2 text-[12px] font-normal normal-case text-charcoal transition-colors duration-150 ${
                        on ? 'border-charcoal bg-charcoal text-white' : 'border-clay hover:border-charcoal'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Size Selector — clean rectangles, 1px clay border, 12px padding */}
          {needsSize && (
            <fieldset ref={sizeRef} className="border-0 p-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="label-qa">Size</legend>
                <div className="flex items-center gap-4 text-[11px] font-normal">
                  <button type="button" onClick={() => setGuideOpen(true)}
                    className="text-smoke underline underline-offset-4 transition hover:text-charcoal">
                    Size guide
                  </button>
                  <Link to="/fit-finder" className="inline-flex items-center gap-1 text-smoke transition hover:text-charcoal">
                    <Ruler size={11} /> Fit Finder
                  </Link>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {p.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSize(s); setSizeErr(false); }}
                      aria-pressed={on}
                      className={`border px-3 py-2 text-[13px] font-normal tracking-[0.02em] text-charcoal transition-colors duration-150 ${
                        on ? 'border-charcoal bg-charcoal text-white' : 'border-clay hover:border-charcoal'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {sizeErr && !size && (
                <p role="alert" className="mt-2 flex items-center gap-1.5 text-[11px] text-red-700">
                  <AlertCircle size={12} /> Choose your size
                </p>
              )}
              {!sizeErr && !size && (
                <p className="mt-2 text-[11px] text-smoke">Please select a size</p>
              )}
            </fieldset>
          )}

          {/* Quantity + Add to Bag + Wishlist */}
          <div ref={ctaRef} className="space-y-4 border-t border-clay pt-6">
            <div className="flex items-center gap-3">
              <QuantityStepper value={qty} onChange={setQty} min={1} max={Math.max(1, Math.min(10, p.stock || 10))} />

              {/* Add to Bag — midnight, 0 radius, Inter 500 / 14 / 0.08em */}
              <button
                type="button"
                onClick={() => tryAdd(false)}
                disabled={soldOut || (needsSize && !size)}
                className={`flex-1 min-h-[48px] inline-flex items-center justify-center text-[14px] font-medium uppercase tracking-[0.08em] transition-colors duration-300 ${
                  soldOut
                    ? 'cursor-not-allowed bg-sand text-smoke'
                    : needsSize && !size
                      ? 'cursor-not-allowed bg-sand text-smoke'
                      : `text-white ${added ? 'bg-gold' : 'bg-midnight hover:bg-charcoal'}`
                }`}
              >
                {soldOut ? 'Sold out' : needsSize && !size ? 'Select a Size' : added ? 'ADDED ✓' : 'Add to Bag'}
              </button>

              <button
                type="button"
                onClick={() => toggleWish(p)}
                aria-pressed={wished}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                className={`grid h-[48px] w-[48px] shrink-0 place-items-center border transition-colors duration-300 ${
                  wished ? 'border-charcoal bg-charcoal text-white' : 'border-clay text-smoke hover:border-charcoal hover:text-charcoal'
                }`}
              >
                <Heart size={16} strokeWidth={wished ? 2.2 : 1.6} fill={wished ? 'currentColor' : 'none'} />
              </button>
            </div>

            <p aria-live="polite" className="min-h-[1.25rem] text-[11px]">
              {added && (
                <span className="inline-flex items-center gap-1.5 pt-1 font-medium uppercase tracking-[0.12em] text-smoke">
                  ✓ Added to your bag
                </span>
              )}
            </p>
          </div>

          {/* ── Rewards + shipping note — quiet, no urgency ── */}
          <div className="space-y-2.5">
            {showPoints && (
              <div className="flex items-center gap-2.5 border border-clay bg-white/60 px-4 py-3">
                <Award size={15} className="shrink-0 text-gold" aria-hidden="true" />
                <p className="text-[12px] leading-relaxed text-smoke">
                  Earn <span className="font-medium text-charcoal tabular-nums">{earnPoints} {earnPoints === 1 ? 'point' : 'points'}</span> with this purchase
                  {' '}<Link to="/rewards" className="font-medium text-charcoal underline underline-offset-4 transition hover:text-gold">Join HUSHAE Circle</Link>
                </p>
              </div>
            )}
            <p className="text-[11px] leading-relaxed text-smoke">
              Free standard shipping on orders over {pkr(settings?.freeShippingThreshold ?? 4999)} · Discreet packaging on every order
            </p>
          </div>

          {/* Offers Panel */}
          <div className="pt-1">
            <Suspense fallback={null}>
              <ProductPromoPanel product={p} />
            </Suspense>
          </div>

          {/* Minimal Trust Row */}
          <ul className="grid grid-cols-3 divide-x divide-clay border-y border-clay py-4 text-center">
            {[
              [Truck, '2–5 Day Delivery'],
              [RotateCcw, '14-Day Exchange'],
              [ShieldCheck, 'Discreet Package'],
            ].map(([Icon, txt]) => (
              <li key={txt} className="flex flex-col items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-smoke">
                <Icon size={15} strokeWidth={1.5} className="text-charcoal/70" />
                {txt}
              </li>
            ))}
          </ul>

          {/* ── Horizontal tabs — thin clay border, active charcoal line ── */}
          <ProductTabs p={p} settings={settings} />
        </aside>
      </div>

      {/* ── CK-style "Complete the Look" — ALWAYS populated: bundle first,
          same-category picks as fallback, so the section never sits empty. */}
      {complete.length > 0 && (
        <div className="mt-24 md:mt-32">
          <ProductRow eyebrow="Complete the look" title="Pairs perfectly with" products={complete.map(snap)} />
        </div>
      )}

      {/* You may also like — deduped against Complete the Look */}
      {relatedExtra.length > 0 && (
        <div className="mt-24 md:mt-32">
          <ProductRow eyebrow="You may also like" title="Related pieces" products={relatedExtra.map(snap)} />
        </div>
      )}

      {/* ── ABOUT THIS FABRIC — editorial close-up ── */}
      {p.fabric && (
        <section className="mt-20 grid grid-cols-1 items-center gap-8 border-t border-clay/60 pt-14 md:mt-28 md:grid-cols-2 md:gap-14">
          <div className="relative aspect-[4/3] overflow-hidden bg-sand">
            <img src="/images/campaign/hushae-fabric.jpg" alt={`${p.fabric} — HUSHAE fabric close-up`} loading="lazy"
              className="absolute inset-0 h-full w-full object-cover" />
          </div>
          <div>
            <p className="label-qa">About this fabric</p>
            <h2 className="mt-4 text-[28px] font-light normal-case tracking-[0.06em] text-charcoal md:text-[36px]">
              {p.fabric}
            </h2>
            <p className="mt-5 max-w-md body-qa">
              {p.shortDescription || p.description}
            </p>
            {(p.care || []).length > 0 && (
              <ul className="mt-5 space-y-2 border-t border-clay/60 pt-5 text-[12px] text-smoke">
                {(p.care || []).slice(0, 3).map((c) => <li key={c} className="flex items-start gap-2"><span className="mt-1.5 h-1 w-1 shrink-0 bg-smoke/60" />{c}</li>)}
              </ul>
            )}
          </div>
        </section>
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

/* ═══ CK/SKIMS horizontal tabs — active = bold + underline, 200ms fade ═════ */
function ProductTabs({ p, settings }) {
  const [tab, setTab] = useState('details');
  const TABS = [
    { id: 'details', label: 'Product Details' },
    { id: 'fabric', label: 'Fabric & Care' },
    { id: 'shipping', label: 'Shipping & Returns' },
  ];
  return (
    <div className="pt-2">
      {/* Tab bar — thin bottom border, active = charcoal line */}
      <div className="flex gap-8 border-b border-clay" role="tablist" aria-label="Product information">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b pb-3 text-[10px] font-medium uppercase tracking-[0.15em] transition-colors duration-200 ${
              tab === t.id ? 'border-charcoal text-charcoal' : 'border-transparent text-smoke hover:text-charcoal'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — 200ms fade */}
      <div className="pt-5">
        {tab === 'details' && (
          <div key="details" className="animate-[fade-up_0.2s_ease-out_both]">
            <p className="body-qa">{p.description}</p>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-clay/60 pt-4 text-[12px]">
              {[
                ['Item No.', p.sku || p._id?.toUpperCase()],
                ['Material', p.fabric],
                ['Tier', p.tier === 'Premium' ? 'Signature' : p.tier],
                ['Category', p.categorySlug?.replace(/-/g, ' ')],
                ['Sizes', (p.sizes || []).join(' · ') || '—'],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="label-qa">{k}</dt>
                  <dd className="normal-case text-charcoal/80">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
        {tab === 'fabric' && (
          <div key="fabric" className="animate-[fade-up_0.2s_ease-out_both]">
            <p className="text-[13px] font-medium text-charcoal">{p.fabric}</p>
            <p className="mt-2 body-qa">Every HUSHAE fabric is wash-tested for 40 cycles before it enters the edit — softness in, softness out.</p>
            {(p.care || []).length > 0 && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] font-normal text-smoke">
                {(p.care || []).map((c) => <li key={c}>{c}</li>)}
              </ul>
            )}
          </div>
        )}
        {tab === 'shipping' && (
          <div key="shipping" className="animate-[fade-up_0.2s_ease-out_both]">
            <p className="body-qa">
              Flat {pkr(settings?.shippingFlatRate ?? 350)} nationwide, free over {pkr(settings?.freeShippingThreshold ?? 4999)}.
              Dispatched in 24–48h in plain, unmarked packaging.
            </p>
            <p className="mt-2 body-qa">
              Unworn pieces exchange within 14 days — size swaps are free. For hygiene reasons innerwear is only
              returnable if it arrives faulty.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
