import { useCallback, useEffect, useId, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, CreditCard, Heart, Loader2,
  Package, RefreshCw, RotateCcw, Ruler, ShieldCheck, Sparkles, Star, Truck, Lock,
} from 'lucide-react';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr, snap } from '../lib/format';
import { isVideo } from '../lib/media';
import QuantityStepper from '../components/ui/QuantityStepper';
import ProductRow from '../components/ProductRow';
import ProductReviews from '../components/ProductReviews';
import ProductQA from '../components/reviews/ProductQA';
import SizeGuideModal from '../components/SizeGuideModal';
import { ProductSkeleton } from '../components/Skeletons';
import Seo, { productJsonLd } from '../components/Seo';
import ProductGallery from './product/ProductGallery';
import StickyBuyBar from './product/StickyBuyBar';
import Img from '../components/Img';
import Tx from '../components/Tx';

/* Lazy heavy panels only when they render — the main buy panel stays lean. */
const ProductPromoPanel = lazy(() => import('../components/marketing/ProductPromoPanel'));

import Accordion from './product/Accordion';

/* Light swatches need a dark tick, everything else a light one. */
const LIGHT_HEX = new Set(['#FFFFFF', '#FFF', '#F7F5F1', '#EFEAE3', '#E3C9B3', '#E8C7C8', '#E4DDD3', '#F5F0EA']);

const STANDING_MARKDOWN = 25;
const CRUMB = 'transition-colors duration-base ease-standard hover:text-obsidian';

/* Payment icon map keyed by id/label (supports both legacy paymentMethods booleans
 * and the new checkout.paymentList array). Only IDs that map to a real Lucide
 * icon are ever rendered — anything unmapped falls back to CreditCard. */
const PAYMENT_ICONS = {
  cod: () => null,                /* COD gets its own line, no icon duplication */
  jazzcash: CreditCard,
  easypaisa: CreditCard,
  bank: CreditCard,
  card: CreditCard,
};
const PAYMENT_LABEL = {
  cod: 'Cash on delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
  bank: 'Bank transfer',
  card: 'Card',
};

/* Build the list of active payment methods from settings. Reads the new
 * checkout.paymentList first (correct source), then falls back to the flat
 * paymentMethods booleans. Never shows a provider the merchant has disabled
 * and never hard-codes a fake one. */
function activePayments(settings) {
  const list = settings?.checkout?.paymentList;
  if (Array.isArray(list) && list.length) {
    return list
      .filter((m) => m && m.enabled && !m.comingSoon)
      .map((m) => ({ id: m.id, label: m.label || PAYMENT_LABEL[m.id?.toLowerCase()] || m.id }));
  }
  const pm = settings?.paymentMethods || {};
  const out = [];
  if (pm.cod !== false) out.push({ id: 'cod', label: PAYMENT_LABEL.cod });
  if (pm.jazzcash) out.push({ id: 'jazzcash', label: PAYMENT_LABEL.jazzcash });
  if (pm.easypaisa) out.push({ id: 'easypaisa', label: PAYMENT_LABEL.easypaisa });
  if (pm.bank) out.push({ id: 'bank', label: PAYMENT_LABEL.bank });
  return out;
}

/* Active shipping methods (for the delivery trust line). */
function activeShipping(settings) {
  const list = settings?.checkout?.shippingMethods;
  if (Array.isArray(list) && list.length) {
    const on = list.filter((m) => m.enabled);
    if (on.length) return on[0]; // take primary enabled (standard)
  }
  return { minDays: 2, maxDays: 5 };
}

function returnDays() { return 14; } // Single source of truth for 14-day policy.

export default function Product() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addToCart, inWishlist, toggleWish, pushRecent, recent, settings } = useApp();
  const rvCfg = settings?.customerExperience?.recentlyViewed || {};

  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeErr, setSizeErr] = useState(false);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [bundle, setBundle] = useState([]);
  const [related, setRelated] = useState([]);
  const [reviewTotal, setReviewTotal] = useState(null);

  const ctaRef = useRef(null);
  const sizeRef = useRef(null);

  const load = useCallback(() => {
    setErr(false);
    setP(null);
    setImgIdx(0);
    setSize('');
    setColor('');
    setQty(1);
    setSizeErr(false);
    setAdded(false);
    setAdding(false);
    setAddError('');
    setBundle([]);
    setRelated([]);
    setReviewTotal(null);
    setLoading(true);
    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors?.[0]?.name || '');
        pushRecent(d.product);
        const bslug = d.product.bundleSlug || '';
        if (bslug) {
          api(`/products?category=${bslug}&limit=4&sort=popular`)
            .then((x) => setBundle((x.products || []).filter((pp) => pp.slug !== d.product.slug).slice(0, 3)))
            .catch(() => setBundle([]));
        }
        api(`/reviews/product/${d.product._id}?limit=1`)
          .then((r) => setReviewTotal(Number(r?.total) || 0))
          .catch(() => setReviewTotal(0));
      })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
    api(`/products/${slug}/related`).then((d) => setRelated((d.products || []).slice(0, 8))).catch(() => setRelated([]));
  }, [slug, pushRecent]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setAdded(false); setAddError(''); }, [size, color, qty]);

  const media = useMemo(() => {
    if (!p) return [];
    const imgs = (p.images || []).map((im) => ({ t: isVideo(im.url) ? 'video' : 'img', url: im.url, alt: im.alt || `${p.name} product image` }));
    return p.video && !imgs.some((m) => m.url === p.video)
      ? [...imgs, { t: 'video', url: p.video, alt: `${p.name} video` }]
      : imgs;
  }, [p]);

  const payments = useMemo(() => activePayments(settings), [settings]);
  const shipping = useMemo(() => activeShipping(settings), [settings]);
  const loyaltyOn = !!settings?.loyalty?.enabled;
  const pointsPer = Number(settings?.loyalty?.earn?.perCurrency) || 0;
  const days = returnDays();

  if (err) {
    return (
      <div className="container-page py-sect-y md:py-sect-y-lg">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Package size={24} strokeWidth={1.6} /></span>
          <h1 className="mt-6 font-display text-h2">This piece has moved on</h1>
          <p className="mt-2 text-body-sm">It may be sold out or no longer part of the edit.</p>
          <div className="mt-8 flex gap-3">
            <button type="button" onClick={load} className="btn btn-outline inline-flex items-center gap-2">
              <RefreshCw size={15} aria-hidden="true" /> Try again
            </button>
            <Link to="/shop" className="btn btn-primary">Back to shop</Link>
          </div>
        </div>
      </div>
    );
  }
  if (!p || loading) return <ProductSkeleton />;

  const wished = inWishlist(p);
  const isBra = p.categorySlug === 'bras';
  const needsSize = (p.sizes || []).length > 0;
  const soldOut = p.stock === 0;
  const onSale = p.compareAtPrice > p.price;
  const off = onSale ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  const notableMarkdown = onSale && off > STANDING_MARKDOWN;
  const lowStock = !soldOut && p.stock <= 5;

  const tierLabel = p.tier === 'Premium' ? 'Signature' : p.tier;

  const reviewsShown = reviewTotal ?? 0;

  /* Drop duplicate tier badge from the freeform badges row. */
  const extraBadges = (p.badges || [])
    .filter((b) => String(b).trim().toLowerCase() !== String(tierLabel).trim().toLowerCase());

  const canAdd = !soldOut && !adding && (needsSize ? !!size : true);

  const tryAdd = (goToCheckout) => {
    if (adding) return;
    if (needsSize && !size) {
      setSizeErr(true);
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      requestAnimationFrame(() => sizeRef.current?.querySelector('button[aria-pressed="false"]')?.focus());
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      addToCart(p, { size, color, quantity: qty });
      setAdded(true);
      if (goToCheckout) nav('/checkout');
    } catch (e) {
      setAddError(e?.message || 'Something went wrong — please try again');
    } finally {
      setAdding(false);
    }
  };

  const pickColor = (name) => {
    setColor(name);
    setSizeErr(false);
    const c = p.colors?.find((x) => x.name === name);
    if (c?.image) {
      const idx = p.images.findIndex((im) => im.url === c.image);
      if (idx >= 0) setImgIdx(idx);
    }
  };

  const flatRate = Number(settings?.shippingFlatRate ?? 350);
  const freeThreshold = Number(settings?.freeShippingThreshold ?? 4999);
  const estPoints = loyaltyOn && pointsPer > 0
    ? Math.floor((pointsPer * p.price * qty) || 0)
    : 0;
  const deliveryRange = (shipping?.minDays && shipping?.maxDays)
    ? `${shipping.minDays}–${shipping.maxDays} days`
    : '2–5 days';

  const freeShipShort = freeThreshold > p.price * qty;
  const freeShipAway = Math.max(0, freeThreshold - p.price * qty);

  return (
    <div className="container-page py-6 md:py-10">
      <Seo
        title={p.name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${p.name} — premium innerwear from HUSHAE. ${pkr(p.price)}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* ── Back link (mobile) + Breadcrumbs ─────────────────────────── */}
      <div className="mb-6 flex items-center gap-1.5 text-caption text-ash">
        <button type="button" onClick={() => nav(-1)} className="mr-1 hidden items-center gap-1 transition-colors hover:text-obsidian sm:inline-flex" aria-label="Go back">
          <ArrowLeft size={13} aria-hidden="true" /> Back
        </button>
        <span className="hidden text-ash/50 sm:inline">|</span>
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
          <Link to="/" className={CRUMB}>Home</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <Link to={`/${p.gender}`} className={`capitalize ${CRUMB}`}>{p.gender}</Link>
          <ChevronRight size={12} aria-hidden="true" />
          <Link to={`/category/${p.categorySlug}`} className={CRUMB}>{p.categorySlug.replace(/-/g, ' ')}</Link>
          <ChevronRight size={12} aria-hidden="true" className="hidden sm:block" />
          <span aria-current="page" className="hidden max-w-[220px] truncate text-obsidian sm:inline">{p.name}</span>
        </nav>
      </div>

      {/* ── Two-column premium layout ────────────────────────────────── */}
      <div className="grid gap-8 md:gap-10 lg:grid-cols-2 lg:gap-14 xl:grid-cols-[1.32fr_1fr] xl:gap-20 2xl:gap-24">
        <ProductGallery media={media} index={imgIdx} onIndex={setImgIdx} productName={p.name} />

        <div className="lg:pt-1">
          {/* Tier / discount row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`pill ${p.tier === 'Premium' ? 'bg-obsidian text-alabaster' : p.tier === 'Standard' ? 'bg-satin text-obsidian' : 'badge-sage'}`}>
              {tierLabel}
            </span>
            {notableMarkdown && <span className="badge-sale">{off}% off</span>}
            {extraBadges.map((b) => <span key={b} className="badge-sage">{b}</span>)}
          </div>

          <h1 className="mt-gap-sm font-display text-[28px] leading-[1.1] tracking-tight sm:text-h1">{p.name}</h1>

          {/* Rating + SKU line — honest, only when reviews exist */}
          <div className="mt-gap-sm flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
            {reviewsShown > 0 ? (
              <>
                <span className="inline-flex items-center gap-1 text-obsidian">
                  <Star size={14} fill="currentColor" aria-hidden="true" />
                  <b>{(p.ratingAvg || 0).toFixed(1)}</b>
                  <span className="sr-only">out of 5</span>
                </span>
                <span aria-hidden="true" className="text-ash">·</span>
                <a href="#reviews" className="text-ash underline-offset-4 hover:text-obsidian hover:underline">
                  {reviewsShown} review{reviewsShown === 1 ? '' : 's'}
                </a>
                <span aria-hidden="true" className="text-ash">·</span>
              </>
            ) : null}
            <span className="text-ash">SKU {p.sku}</span>
          </div>

          {/* Price */}
          <div className="mt-gap-md flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-h2 tabular-nums text-obsidian">{pkr(p.price)}</span>
            {onSale && (
              <>
                <span className="text-body-sm tabular-nums text-ash line-through">
                  <span className="sr-only">Regular price </span>{pkr(p.compareAtPrice)}
                </span>
                <span className="text-body-sm font-medium tabular-nums text-sagedeep">
                  Save {pkr(p.compareAtPrice - p.price)}
                </span>
              </>
            )}
          </div>

          {/* Stock (aria-live) */}
          <p aria-live="polite" className="mt-gap-sm flex items-center gap-1.5 text-body-sm">
            {soldOut ? (
              <><AlertCircle size={14} className="text-red-600" aria-hidden="true" /><span className="font-medium text-red-700">Sold out — check back soon</span></>
            ) : lowStock ? (
              <><AlertCircle size={14} className="text-clay" aria-hidden="true" /><span className="font-medium text-obsidian">Only {p.stock} left in stock</span></>
            ) : (
              <><CheckCircle2 size={14} className="text-sagedeep" aria-hidden="true" /><span className="text-sagedeep">In stock · ready to ship in 24–48h</span></>
            )}
          </p>

          {p.shortDescription && (
            <p className="mt-gap-md max-w-prose text-[15px] leading-[1.7] text-ink/90">{p.shortDescription}</p>
          )}

          {/* ── Colour ───────────────────────────────────────────────── */}
          {p.colors?.length > 0 && (
            <fieldset className="mt-gap-lg border-0 p-0">
              <legend className="label !mb-2">
                <Tx k="color" /> <span className="text-obsidian">— {color || 'Select'}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Colour">
                {p.colors.map((c) => {
                  const on = color === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => pickColor(c.name)}
                      className={`grid h-11 w-11 place-items-center rounded-full border transition-[box-shadow,transform] duration-base ease-standard hover:scale-[1.03] active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:scale-100 ${
                        on ? 'border-transparent ring-2 ring-obsidian ring-offset-2 ring-offset-alabaster' : 'border-line hover:border-stone'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {on && (
                        <CheckCircle2
                          size={15} strokeWidth={2.4} aria-hidden="true"
                          className={LIGHT_HEX.has(String(c.hex).toUpperCase()) ? 'text-obsidian' : 'text-white'}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Colour name under swatches — aids screen readers and clarity */}
              {color && <p className="mt-2 text-caption text-ash">{color}</p>}
            </fieldset>
          )}

          {/* ── Size ─────────────────────────────────────────────────── */}
          {needsSize && (
            <fieldset ref={sizeRef} className="mt-gap-lg border-0 p-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <legend className="label !mb-0 float-left">
                  <Tx k="size" />
                  {size && <span className="ml-1 text-obsidian">— {size}</span>}
                </legend>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="inline-flex items-center gap-1 text-caption font-semibold text-ash underline underline-offset-4 transition-colors duration-base ease-standard hover:text-obsidian"
                  >
                    <Ruler size={12} aria-hidden="true" /> Size guide
                  </button>
                  <Link
                    to="/fit-finder"
                    className="inline-flex items-center gap-1 text-caption font-semibold text-sagedeep transition-colors duration-base ease-standard hover:text-sagedark hover:underline"
                  >
                    <Sparkles size={12} aria-hidden="true" /> Fit Finder
                  </Link>
                </div>
              </div>

              <div className="mt-gap-sm flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
                {p.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => { setSize(s); setSizeErr(false); }}
                      aria-label={`Size ${s}${on ? ', selected' : ''}`}
                      className={`min-h-[46px] min-w-[56px] rounded-control border px-4 text-body-sm transition-[color,background-color,border-color,transform] duration-base ease-standard active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                        on
                          ? 'border-obsidian bg-obsidian font-medium text-alabaster'
                          : 'border-line font-normal text-ink hover:border-obsidian/60 hover:bg-cream/40'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {sizeErr && !size && (
                <p role="alert" className="field-error mt-2">
                  <AlertCircle size={13} aria-hidden="true" /> Please choose a size to continue
                </p>
              )}
            </fieldset>
          )}

          {/* ── Quantity + Wishlist ──────────────────────────────────── */}
          <div className="mt-gap-lg flex items-center gap-3">
            <QuantityStepper
              value={qty}
              onChange={setQty}
              min={1}
              max={Math.max(1, Math.min(10, p.stock || 10))}
              disabled={soldOut}
              label="Quantity"
            />
            <button
              type="button"
              onClick={() => toggleWish(p)}
              aria-pressed={wished}
              aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-colors duration-base ${
                wished ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line text-ash hover:border-obsidian/50 hover:text-obsidian'
              }`}
            >
              <Heart size={17} strokeWidth={1.8} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          {/* ── CTA row ──────────────────────────────────────────────── */}
          <div ref={ctaRef} className="mt-gap-sm grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => tryAdd(false)}
              disabled={!canAdd}
              className="btn btn-outline inline-flex min-h-[50px] items-center justify-center gap-2 disabled:opacity-40"
              aria-busy={adding}
            >
              {adding
                ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Adding…</>
                : <Tx k="addToCart" />}
            </button>
            <button
              type="button"
              onClick={() => tryAdd(true)}
              disabled={!canAdd}
              className="btn btn-primary inline-flex min-h-[50px] items-center justify-center gap-2 disabled:opacity-40"
              aria-busy={adding}
            >
              {adding
                ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Please wait</>
                : <Tx k="buyNow" />}
            </button>
          </div>

          {/* Feedback line (added / error) */}
          <p aria-live="polite" className="min-h-[1.25rem] pt-2 text-body-sm">
            {added && !adding && !addError && (
              <span className="inline-flex items-center gap-1.5 font-medium text-sagedeep">
                <CheckCircle2 size={14} aria-hidden="true" /> Added to your bag
              </span>
            )}
            {addError && (
              <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
                <AlertCircle size={14} aria-hidden="true" /> {addError}
              </span>
            )}
          </p>

          {/* ── Free-shipping nudge (data-accurate) ─────────────────── */}
          {!soldOut && freeThreshold > 0 && freeShipShort && (
            <p className="mt-gap-sm rounded-control bg-satin/50 px-3 py-2 text-caption text-ink">
              Add <b>{pkr(freeShipAway)}</b> more for free shipping.
            </p>
          )}
          {!soldOut && freeThreshold > 0 && !freeShipShort && (
            <p className="mt-gap-sm inline-flex items-center gap-1.5 rounded-control bg-sagedeep/10 px-3 py-2 text-caption font-medium text-sagedark">
              <CheckCircle2 size={13} aria-hidden="true" /> Free shipping unlocked
            </p>
          )}

          {/* ── Trust panel (delivery / returns / discreet) ─────────── */}
          <ul className="mt-gap-lg grid grid-cols-3 gap-2 rounded-card border border-line bg-white/60 px-2 py-4 text-center sm:px-4">
            <li className="flex flex-col items-center gap-1.5 px-1 text-caption font-medium text-ash">
              <Truck size={17} className="text-obsidian" aria-hidden="true" />
              <span>{deliveryRange}</span>
            </li>
            <li className="flex flex-col items-center gap-1.5 border-x border-line/70 px-1 text-caption font-medium text-ash">
              <RotateCcw size={17} className="text-obsidian" aria-hidden="true" />
              <span>{days}-day exchange</span>
            </li>
            <li className="flex flex-col items-center gap-1.5 px-1 text-caption font-medium text-ash">
              <ShieldCheck size={17} className="text-obsidian" aria-hidden="true" />
              <span>Discreet parcel</span>
            </li>
          </ul>

          {/* ── Payment panel (config-driven, no fake providers) ────── */}
          {payments.length > 0 && (
            <div className="mt-gap-sm flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-line bg-white/60 px-4 py-3">
              <span className="inline-flex items-center gap-1.5 text-label font-bold uppercase tracking-widest text-ash">
                <Lock size={12} aria-hidden="true" /> Secure pay
              </span>
              {payments.map((m) => {
                const Icn = PAYMENT_ICONS[m.id?.toLowerCase()] || CreditCard;
                return (
                  <span key={m.id || m.label} className="inline-flex items-center gap-1.5 text-caption text-ink">
                    {Icn ? <Icn size={13} className="text-ash" aria-hidden="true" /> : null}
                    {m.label}
                  </span>
                );
              })}
              {flatRate > 0 && (
                <span className="ml-auto text-caption text-ash">
                  Flat {pkr(flatRate)} · free over {pkr(freeThreshold)}
                </span>
              )}
            </div>
          )}

          {/* ── Loyalty / rewards (only when enabled) ───────────────── */}
          {loyaltyOn && estPoints > 0 && (
            <p className="mt-gap-sm inline-flex items-center gap-2 rounded-control bg-cream px-3 py-2 text-caption text-ink">
              <Sparkles size={13} className="text-sagedeep" aria-hidden="true" />
              Earn <b>{estPoints.toLocaleString()} {settings?.loyalty?.pointsName || 'points'}</b> on this order.
            </p>
          )}

          {/* Promo panel (flash, bundle wording, countdown) */}
          <div className="mt-gap-md">
            <Suspense fallback={null}>
              <ProductPromoPanel product={p} />
            </Suspense>
          </div>

          {/* ── Accordions ──────────────────────────────────────────── */}
          <div className="mt-gap-lg" id="details">
            <Accordion title="About this piece" defaultOpen>
              {p.description ? (
                <p className="leading-relaxed">{p.description}</p>
              ) : (
                <p className="leading-relaxed text-ash">A considered {p.gender === 'women' ? 'women\u2019s' : 'men\u2019s'} piece from the HUSHAE {tierLabel.toLowerCase()} edit.</p>
              )}
            </Accordion>

            <Accordion title="Fit & feel">
              <div className="space-y-2 leading-relaxed">
                <p>
                  Innerwear fit is personal. If you are between sizes, size down for a snug,
                  supportive fit or up for relaxed comfort.
                </p>
                {/* Only surface data the product actually carries — nothing fabricated. */}
                <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-caption pt-1">
                  {p.tier && (<><dt className="text-label font-bold uppercase text-ash">Tier</dt><dd>{tierLabel}</dd></>)}
                  {p.categorySlug && (<><dt className="text-label font-bold uppercase text-ash">Category</dt><dd className="capitalize">{p.categorySlug.replace(/-/g, ' ')}</dd></>)}
                  {(p.sizes || []).length > 0 && (<><dt className="text-label font-bold uppercase text-ash">Sizes</dt><dd>{p.sizes.join(' · ')}</dd></>)}
                  {(p.colors || []).length > 0 && (<><dt className="text-label font-bold uppercase text-ash">Colours</dt><dd>{p.colors.map((c) => c.name).join(', ')}</dd></>)}
                </dl>
                <p className="pt-1 text-ash">
                  Use <Link to="/fit-finder" className="underline underline-offset-2 hover:text-obsidian">Fit Finder</Link> for a
                  size recommendation in under a minute.
                </p>
              </div>
            </Accordion>

            <Accordion title="Fabric & technology">
              {p.fabric ? (
                <p className="font-medium text-obsidian">{p.fabric}</p>
              ) : (
                <p className="text-ash">Fabric details coming soon.</p>
              )}
            </Accordion>

            <Accordion title="Care instructions">
              {(p.care || []).length > 0 ? (
                <ul className="list-disc space-y-1.5 pl-5">
                  {p.care.map((c) => <li key={c}>{c}</li>)}
                </ul>
              ) : (
                <p className="text-ash">Care instructions are printed inside the waistband.</p>
              )}
            </Accordion>

            <Accordion title="Shipping & exchange">
              <div className="space-y-2 leading-relaxed">
                <p>
                  Dispatched in 24–48h via courier in plain, unmarked packaging.
                  {flatRate > 0 && <> Flat {pkr(flatRate)} nationwide; free shipping on orders over {pkr(freeThreshold)}.</>}
                  Estimated delivery: <b>{deliveryRange}</b>.
                </p>
                <p>
                  Unworn, unwashed pieces in original packaging can be exchanged within <b>{days} days</b> — size swaps are free.
                </p>
                <p className="text-ash">
                  For hygiene reasons, innerwear is only returnable if it arrives faulty or incorrect.
                </p>
              </div>
            </Accordion>

            <Accordion title="Size information">
              <div className="space-y-3 leading-relaxed">
                <p>Refer to the size guide for exact measurements. Not sure? <Link to="/fit-finder" className="underline underline-offset-2 hover:text-obsidian">Fit Finder</Link> can recommend your size.</p>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  className="inline-flex items-center gap-1.5 text-caption font-semibold text-sagedeep underline underline-offset-4 hover:text-sagedark"
                >
                  <Ruler size={12} aria-hidden="true" /> Open size guide
                </button>
              </div>
            </Accordion>

            <Accordion title="Product details">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-caption">
                {[
                  ['SKU', p.sku],
                  ['Material', p.fabric],
                  ['Tier', tierLabel],
                  ['Made in', 'Pakistan'],
                  ['Category', p.categorySlug?.replace(/-/g, ' ')],
                  ['Sizes', (p.sizes || []).join(' · ')],
                  ['Colours', (p.colors || []).map((c) => c.name).join(', ')],
                ]
                  .filter(([, v]) => v && String(v).trim())
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-label font-bold uppercase tracking-widest text-ash">{k}</dt>
                      <dd className="capitalize text-ink">{v}</dd>
                    </div>
                  ))}
              </dl>
            </Accordion>
          </div>
        </div>
      </div>

      {/* ── Complete the set ─────────────────────────────────────────── */}
      {bundle.length > 0 && (
        <section className="mt-16 md:mt-24" aria-labelledby="set-title">
          <ProductRow eyebrow="Complete the set" title="Pairs perfectly with" titleId="set-title" products={bundle.map(snap)} />
        </section>
      )}

      {/* ── Related pieces ───────────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="mt-16 md:mt-24" aria-labelledby="related-title">
          <ProductRow eyebrow="You may also like" title="More from the edit" titleId="related-title" products={related.map(snap)} />
        </section>
      )}

      {/* ── Reviews + Q&A ───────────────────────────────────────────── */}
      <section id="reviews" className="scroll-mt-28 mt-16 md:mt-24">
        <ProductReviews product={p} />
        <ProductQA product={p} />
      </section>

      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <section className="mt-16 pb-4 md:mt-24" aria-labelledby="rv-title">
          <ProductRow
            eyebrow="Your history"
            title={rvCfg.title || 'Recently viewed'}
            titleId="rv-title"
            products={recent.filter((r) => r.slug !== p.slug).slice(0, 8)}
          />
        </section>
      )}

      <StickyBuyBar
        product={p}
        watchRef={ctaRef}
        size={size}
        color={color}
        needsSize={needsSize}
        onAdd={() => tryAdd(false)}
        onBuyNow={() => tryAdd(true)}
        disabled={soldOut}
        adding={adding}
        thumb={p.images?.[0]?.url}
      />

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}
