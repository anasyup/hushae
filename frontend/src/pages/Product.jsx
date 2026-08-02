import { useCallback, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronRight, CreditCard, Heart, Loader2,
  Package, RefreshCw, Ruler, ShieldCheck, Sparkles, Star, Truck, Lock,
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
import Tx from '../components/Tx';

const ProductPromoPanel = lazy(() => import('../components/marketing/ProductPromoPanel'));
import Accordion from './product/Accordion';

const LIGHT_HEX = new Set(['#FFFFFF', '#FFF', '#F7F5F1', '#EFEAE3', '#E3C9B3', '#E8C7C8', '#E4DDD3', '#F5F0EA']);
const STANDING_MARKDOWN = 25;
const CRUMB = 'transition-colors duration-base ease-standard hover:text-obsidian';

const PAYMENT_ICONS = { jazzcash: CreditCard, easypaisa: CreditCard, bank: CreditCard, card: CreditCard };
const PAYMENT_LABEL = { cod: 'Cash on delivery', jazzcash: 'JazzCash', easypaisa: 'EasyPaisa', bank: 'Bank transfer', card: 'Card' };

function activePayments(settings) {
  const ints = settings?.integrations?.payments || {};
  const jc = !!(ints.jazzcash?.configured || (ints.jazzcash?.merchantId && ints.jazzcash?.password));
  const ep = !!(ints.easypaisa?.configured || (ints.easypaisa?.merchantId && ints.easypaisa?.password));
  const bd = String(settings?.paymentMethods?.bankDetails || '');
  const bankOk = bd.length > 0 && !/0000 0000/.test(bd);

  const isOn = (id) => {
    if (id === 'cod') return true;
    if (id === 'jazzcash' || id === 'JazzCash') return jc;
    if (id === 'easypaisa' || id === 'EasyPaisa') return ep;
    if (id === 'bank' || id === 'Bank Transfer') return bankOk;
    return true;
  };

  const list = settings?.checkout?.paymentList;
  if (Array.isArray(list) && list.length && settings?.checkout?.checkoutMigrated) {
    return list
      .filter((m) => m && m.enabled && !m.comingSoon && isOn(m.id))
      .map((m) => ({ id: m.id, label: m.label || PAYMENT_LABEL[m.id?.toLowerCase()] || m.id }));
  }
  const pm = settings?.paymentMethods || {};
  const out = [];
  if (pm.cod !== false) out.push({ id: 'cod', label: PAYMENT_LABEL.cod });
  if (pm.jazzcash && jc) out.push({ id: 'jazzcash', label: PAYMENT_LABEL.jazzcash });
  if (pm.easypaisa && ep) out.push({ id: 'easypaisa', label: PAYMENT_LABEL.easypaisa });
  if (pm.bank && bankOk) out.push({ id: 'bank', label: PAYMENT_LABEL.bank });
  return out;
}

function activeShipping(settings) {
  const list = settings?.checkout?.shippingMethods;
  if (Array.isArray(list) && list.length) {
    const on = list.filter((m) => m.enabled);
    if (on.length) return on[0];
  }
  const cartMin = settings?.cart?.deliveryMinDays;
  const cartMax = settings?.cart?.deliveryMaxDays;
  if (cartMin && cartMax) return { minDays: cartMin, maxDays: cartMax };
  return { minDays: 2, maxDays: 5 };
}

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
  const [colorErr, setColorErr] = useState(false);
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
    setErr(false); setP(null); setImgIdx(0); setSize(''); setColor(''); setQty(1);
    setSizeErr(false); setColorErr(false); setAdded(false); setAdding(false); setAddError('');
    setBundle([]); setRelated([]); setReviewTotal(null); setLoading(true);
    api(`/products/${slug}`)
      .then((d) => {
        const prod = d.product;
        setP(prod);
        const colours = prod.colors || [];
        const canAutoPick = colours.length <= 1 || !!colours[0]?.image;
        setColor(canAutoPick ? colours[0]?.name || '' : '');
        pushRecent(prod);
        const bslug = prod.bundleSlug || '';
        if (bslug) {
          api(`/products?category=${bslug}&limit=4&sort=popular`)
            .then((x) => setBundle((x.products || []).filter((pp) => pp.slug !== prod.slug).slice(0, 3)))
            .catch(() => setBundle([]));
        }
        api(`/reviews/product/${prod._id}?limit=1`)
          .then((r) => setReviewTotal(Number(r?.total) || 0))
          .catch(() => setReviewTotal(0));
      })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
    api(`/products/${slug}/related`).then((d) => setRelated((d.products || []).slice(0, 8))).catch(() => setRelated([]));
  }, [slug, pushRecent]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setAdded(false); setAddError(''); setSizeErr(false); setColorErr(false); }, [size, color, qty]);

  const media = useMemo(() => {
    if (!p) return [];
    const imgs = (p.images || []).map((im) => ({
      t: isVideo(im.url) ? 'video' : 'img', url: im.url,
      alt: im.alt || `${p.name}`,
    }));
    return p.video && !imgs.some((m) => m.url === p.video)
      ? [...imgs, { t: 'video', url: p.video, alt: `${p.name} video` }] : imgs;
  }, [p]);

  const payments = useMemo(() => activePayments(settings), [settings]);
  const shipping = useMemo(() => activeShipping(settings), [settings]);
  const loyaltyOn = !!settings?.loyalty?.enabled;
  const pointsPer = Number(settings?.loyalty?.earn?.perCurrency) || 0;

  if (err) {
    return (
      <div className="container-page py-sect-y md:py-sect-y-lg">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><Package size={22} strokeWidth={1.5} /></span>
          <h1 className="mt-5 font-display text-[28px] leading-tight">This piece has moved on</h1>
          <p className="mt-2 text-caption">It may be sold out or no longer part of the edit.</p>
          <div className="mt-6 flex gap-2.5">
            <button type="button" onClick={load} className="btn btn-outline inline-flex items-center gap-1.5 text-[11px]">
              <RefreshCw size={13} aria-hidden="true" /> Try again
            </button>
            <Link to="/shop" className="btn btn-primary text-[11px]">Back to shop</Link>
          </div>
        </div>
      </div>
    );
  }
  if (!p || loading) return <ProductSkeleton />;

  const wished = inWishlist(p);
  const isBra = p.categorySlug === 'bras';
  const needsSize = (p.sizes || []).length > 0;
  const needsColor = (p.colors || []).length > 1;
  const soldOut = p.stock === 0;
  const onSale = p.compareAtPrice > p.price;
  const off = onSale ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  const notableMarkdown = onSale && off > STANDING_MARKDOWN;
  const lowStock = !soldOut && p.stock <= 5;
  const tierLabel = p.tier === 'Premium' ? 'Signature' : p.tier;
  const reviewsShown = reviewTotal ?? 0;
  const extraBadges = (p.badges || [])
    .filter((b) => String(b).trim().toLowerCase() !== String(tierLabel).trim().toLowerCase());
  const canAdd = !soldOut && !adding && (needsSize ? !!size : true) && (needsColor ? !!color : true);

  const tryAdd = (goToCheckout) => {
    if (adding) return;
    if (needsColor && !color) { setColorErr(true); return; }
    if (needsSize && !size) {
      setSizeErr(true);
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      requestAnimationFrame(() => sizeRef.current?.querySelector('button[aria-checked="false"]')?.focus());
      return;
    }
    setAdding(true); setAddError('');
    try {
      addToCart(p, { size, color, quantity: qty });
      setAdded(true);
      if (goToCheckout) nav('/checkout');
    } catch (e) {
      setAddError(e?.message || 'Something went wrong — please try again');
    } finally { setAdding(false); }
  };

  const pickColor = (name) => {
    setColor(name); setSizeErr(false); setColorErr(false);
    const c = p.colors?.find((x) => x.name === name);
    if (c?.image) {
      const idx = p.images.findIndex((im) => im.url === c.image);
      if (idx >= 0) setImgIdx(idx);
    }
  };

  const flatRate = Number(settings?.shippingFlatRate ?? 350);
  const freeThreshold = Number(settings?.freeShippingThreshold ?? 4999);
  const estPoints = loyaltyOn && pointsPer > 0 ? Math.floor(pointsPer * p.price * qty) : 0;
  const deliveryRange = (shipping?.minDays && shipping?.maxDays)
    ? `${shipping.minDays}–${shipping.maxDays} days` : '2–5 days';
  const codOnly = payments.length === 1 && payments[0].id === 'cod';
  const freeShipShort = freeThreshold > p.price * qty;
  const freeShipAway = Math.max(0, freeThreshold - p.price * qty);
  const careArr = Array.isArray(p.care) ? p.care : [];

  /* Hygiene-first policy for innerwear. No blanket exchange promise — opened,
   * worn, or washed pieces cannot be returned or exchanged. Wrong / defective
   * items are always replaced. If the merchant later enables a limited
   * exchange window in settings, wire exchangeEnabled to that flag here. */
  const exchangeEnabled = false;

  return (
    <div className="container-page py-4 md:py-8">
      <Seo
        title={p.name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${p.name} — premium innerwear from HUSHAE. ${pkr(p.price)}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-[11px] tracking-wide text-ash sm:gap-1.5">
        <button type="button" onClick={() => nav(-1)} aria-label="Go back"
          className="mr-1 inline-flex items-center gap-1 transition-colors hover:text-obsidian">
          <ArrowLeft size={12} aria-hidden="true" /><span className="hidden sm:inline">Back</span>
        </button>
        <span className="hidden text-ash/50 sm:inline">|</span>
        <Link to="/" className={CRUMB}>Home</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <Link to={`/${p.gender}`} className={`capitalize ${CRUMB}`}>{p.gender}</Link>
        <ChevronRight size={11} aria-hidden="true" />
        <Link to={`/category/${p.categorySlug}`} className={CRUMB}>{p.categorySlug.replace(/-/g, ' ')}</Link>
        <ChevronRight size={11} aria-hidden="true" className="hidden sm:block" />
        <span aria-current="page" className="hidden max-w-[200px] truncate text-obsidian sm:inline">{p.name}</span>
      </nav>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-[minmax(0,56%)_minmax(0,44%)] lg:gap-12 xl:grid-cols-[minmax(0,58%)_minmax(0,42%)] xl:gap-16">
        <ProductGallery media={media} index={imgIdx} onIndex={setImgIdx} productName={p.name} />

        <div className="lg:pt-1">
          {/* Badges — visible spacing provided by gap-1.5; screen-reader commas are
              rendered as visually hidden separators so assistive tech announces
              "Economy, Everyday, Bestseller" rather than running words together. */}
          <div className="flex flex-wrap items-center gap-1.5" role="list" aria-label="Product badges">
            <span role="listitem" className={`inline-flex items-center rounded-control px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.18em] ${
              p.tier === 'Premium' ? 'bg-obsidian text-alabaster'
                : p.tier === 'Standard' ? 'bg-satin text-obsidian'
                  : 'bg-sage/25 text-sagedark'
            }`}>{tierLabel}</span>
            {notableMarkdown && (
              <span role="listitem" className="inline-flex items-center rounded-control border border-obsidian/40 bg-alabaster/80 px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.18em]">
                {off}% off
              </span>
            )}
            {extraBadges.slice(0, 2).map((b, i) => (
              <span key={b} role="listitem" className="inline-flex items-center gap-1.5">
                {i > 0 || notableMarkdown ? <span className="sr-only">, </span> : null}
                <span className="inline-flex items-center rounded-control bg-sage/25 px-2 py-[3px] text-[10px] font-medium uppercase tracking-[0.18em] text-sagedark">
                  {b}
                </span>
              </span>
            ))}
          </div>

          <h1 className="mt-2.5 font-display text-[24px] leading-[1.15] tracking-[-0.01em] sm:text-[28px] lg:text-[32px]">{p.name}</h1>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11.5px] text-ash">
            {reviewsShown > 0 && (
              <>
                <span className="inline-flex items-center gap-1 text-obsidian">
                  <Star size={12} fill="currentColor" aria-hidden="true" />
                  <b className="font-medium">{(p.ratingAvg || 0).toFixed(1)}</b>
                </span>
                <span aria-hidden="true">·</span>
                <a href="#reviews" className="underline-offset-4 hover:text-obsidian hover:underline">
                  {reviewsShown} review{reviewsShown === 1 ? '' : 's'}
                </a>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>SKU {p.sku}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="font-display text-[22px] leading-none tracking-[-0.01em] tabular-nums sm:text-[24px] lg:text-[26px]">{pkr(p.price)}</span>
            {onSale && (
              <>
                <span className="text-[13px] tabular-nums text-ash line-through">
                  <span className="sr-only">Regular price </span>{pkr(p.compareAtPrice)}
                </span>
                <span className="text-[11.5px] font-medium tabular-nums text-sagedeep">
                  Save {pkr(p.compareAtPrice - p.price)}
                </span>
              </>
            )}
          </div>

          <p aria-live="polite" className="mt-2 flex items-center gap-1 text-[12px]">
            {soldOut ? (
              <><AlertCircle size={12} className="text-red-600" aria-hidden="true" /><span className="font-medium text-red-700">Sold out</span></>
            ) : lowStock ? (
              <><AlertCircle size={12} className="text-clay" aria-hidden="true" /><span className="font-medium text-obsidian">Only {p.stock} left</span></>
            ) : (
              <><CheckCircle2 size={12} className="text-sagedeep" aria-hidden="true" /><span className="text-sagedeep">In stock · ships in 24–48h</span></>
            )}
          </p>

          {p.shortDescription && (
            <p className="mt-3.5 max-w-[55ch] text-[14px] leading-[1.65] text-ink/85">{p.shortDescription}</p>
          )}

          {p.colors?.length > 0 && (
            <fieldset className="mt-5 border-0 p-0">
              <legend className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ash">
                Colour{color
                  ? <> <span className="normal-case tracking-normal text-obsidian">— {color}</span></>
                  : needsColor ? <> <span className="normal-case tracking-normal text-ash/80">— select</span></> : null}
              </legend>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour" aria-required={needsColor}>
                {p.colors.map((c) => {
                  const on = color === c.name;
                  return (
                    <button key={c.name} type="button" role="radio" aria-checked={on}
                      aria-label={c.name} title={c.name} onClick={() => pickColor(c.name)}
                      className={`grid h-10 w-10 place-items-center rounded-full border transition-[box-shadow,transform] duration-base ease-standard active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                        on ? 'border-transparent ring-2 ring-obsidian ring-offset-2 ring-offset-alabaster' : 'border-line hover:border-stone'
                      }`}
                      style={{ backgroundColor: c.hex }}>
                      {on && <CheckCircle2 size={14} strokeWidth={2.4} aria-hidden="true"
                        className={LIGHT_HEX.has(String(c.hex).toUpperCase()) ? 'text-obsidian' : 'text-white'} />}
                    </button>
                  );
                })}
              </div>
              {colorErr && needsColor && !color && (
                <p role="alert" className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
                  <AlertCircle size={11} aria-hidden="true" /> Please choose a colour
                </p>
              )}
            </fieldset>
          )}

          {needsSize && (
            <fieldset ref={sizeRef} className="mt-5 border-0 p-0">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <legend className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-ash">
                  Size{size ? <> <span className="normal-case tracking-normal text-obsidian">— {size}</span></> : null}
                </legend>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setGuideOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-ash underline underline-offset-4 transition-colors hover:text-obsidian">
                    <Ruler size={11} aria-hidden="true" /> Size guide
                  </button>
                  <Link to="/fit-finder"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sagedeep transition-colors hover:text-sagedark">
                    <Sparkles size={11} aria-hidden="true" /> Fit Finder
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Size" aria-required>
                {p.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <button key={s} type="button" role="radio" aria-checked={on}
                      onClick={() => { setSize(s); setSizeErr(false); }}
                      aria-label={`Size ${s}${on ? ', selected' : ''}`}
                      className={`min-h-[44px] min-w-[48px] rounded-control border px-3.5 text-[13px] transition-[color,background-color,border-color,transform] duration-base ease-standard active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${
                        on ? 'border-obsidian bg-obsidian font-medium text-alabaster'
                          : 'border-line text-ink hover:border-obsidian/55 hover:bg-cream/35'
                      }`}>
                      {s}
                    </button>
                  );
                })}
              </div>
              {sizeErr && !size && (
                <p role="alert" className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-red-600">
                  <AlertCircle size={11} aria-hidden="true" /> Please choose a size
                </p>
              )}
            </fieldset>
          )}

          <div className="mt-5 flex items-center gap-2.5">
            <QuantityStepper value={qty} onChange={setQty} min={1}
              max={Math.max(1, Math.min(10, p.stock || 10))}
              disabled={soldOut} label="Quantity" size="sm" />
            <button type="button" onClick={() => toggleWish(p)} aria-pressed={wished}
              aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors duration-base ${
                wished ? 'border-obsidian bg-obsidian text-alabaster' : 'border-line text-ash hover:border-obsidian/50 hover:text-obsidian'
              }`}>
              <Heart size={15} strokeWidth={1.7} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>

          <div ref={ctaRef} className="mt-4 grid grid-cols-[1fr_auto] gap-2.5">
            <button type="button" onClick={() => tryAdd(false)} disabled={!canAdd}
              className="btn btn-outline inline-flex min-h-[48px] items-center justify-center gap-2 text-[11.5px] disabled:opacity-40" aria-busy={adding}>
              {adding ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Adding…</> : <Tx k="addToCart" />}
            </button>
            <button type="button" onClick={() => tryAdd(true)} disabled={!canAdd}
              className="btn btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 px-5 text-[11.5px] disabled:opacity-40" aria-busy={adding}>
              {adding ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Tx k="buyNow" />}
            </button>
          </div>

          <p aria-live="polite" className="min-h-[1.1rem] pt-1.5 text-[12px]">
            {added && !adding && !addError && (
              <span className="inline-flex items-center gap-1 font-medium text-sagedeep">
                <CheckCircle2 size={12} aria-hidden="true" /> Added to your bag
              </span>
            )}
            {addError && (
              <span className="inline-flex items-center gap-1 font-medium text-red-700">
                <AlertCircle size={12} aria-hidden="true" /> {addError}
              </span>
            )}
          </p>

          {!soldOut && freeThreshold > 0 && freeShipShort && (
            <p className="mt-2 rounded-control bg-satin/55 px-2.5 py-1.5 text-[11.5px] text-ink">
              Add <b className="text-obsidian">{pkr(freeShipAway)}</b> more for free shipping.
            </p>
          )}
          {!soldOut && freeThreshold > 0 && !freeShipShort && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-control bg-sagedeep/10 px-2.5 py-1.5 text-[11.5px] font-medium text-sagedark">
              <CheckCircle2 size={11} aria-hidden="true" /> Free shipping unlocked
            </p>
          )}

          {/* Combined trust + pay row — single source so COD never doubles up.
              Trust grid always delivery/discreet. The third cell flips between
              "Quality checked" (default hygiene-first policy) and an exchange
              promise if/when the merchant enables exchanges in settings. */}
          <ul className="mt-5 grid grid-cols-3 divide-x divide-line/80 rounded-control border border-line bg-white/55 px-1 py-3 text-center">
            <li className="flex flex-col items-center gap-1 px-1 text-[10.5px] font-medium uppercase tracking-wide text-ash">
              <Truck size={14} className="text-obsidian" aria-hidden="true" />
              <span>{deliveryRange}</span>
            </li>
            <li className="flex flex-col items-center gap-1 px-1 text-[10.5px] font-medium uppercase tracking-wide text-ash">
              {exchangeEnabled ? (
                <><RotateCcw size={14} className="text-obsidian" aria-hidden="true" /><span>14-day exchange</span></>
              ) : (
                <><ShieldCheck size={14} className="text-obsidian" aria-hidden="true" /><span>Quality checked</span></>
              )}
            </li>
            <li className="flex flex-col items-center gap-1 px-1 text-[10.5px] font-medium uppercase tracking-wide text-ash">
              <Package size={14} className="text-obsidian" aria-hidden="true" />
              <span>Discreet parcel</span>
            </li>
          </ul>

          {/* Single payment row — no duplicates. Label adapts for COD-only
              vs multi-method (no misleading "Secure pay" when COD-only). */}
          {payments.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line bg-white/55 px-3 py-2 text-[11px] text-ash">
              {!codOnly && <Lock size={10} aria-hidden="true" />}
              <span className="font-semibold uppercase tracking-[0.18em] text-ash">
                {codOnly ? 'Cash on delivery' : 'Pay'}
              </span>
              {!codOnly && payments.map((m, i) => {
                const Icn = PAYMENT_ICONS[m.id?.toLowerCase()] || null;
                return (
                  <span key={m.id || m.label} className="inline-flex items-center gap-1 text-ink">
                    {i > 0 && <span className="sr-only">, </span>}
                    {Icn ? <Icn size={11} className="text-ash" aria-hidden="true" /> : null}
                    {m.label}
                  </span>
                );
              })}
              {flatRate > 0 && (
                <span className="ml-auto text-ash/90">
                  Flat {pkr(flatRate)} · free over {pkr(freeThreshold)}
                </span>
              )}
            </div>
          )}

          {loyaltyOn && estPoints > 0 && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-control bg-cream/80 px-2.5 py-1.5 text-[11px] text-ink">
              <Sparkles size={11} className="text-sagedeep" aria-hidden="true" />
              Earn <b className="text-obsidian">{estPoints.toLocaleString()} {settings?.loyalty?.pointsName || 'points'}</b> on this order
            </p>
          )}

          <Suspense fallback={null}>
            <div className="mt-4"><ProductPromoPanel product={p} /></div>
          </Suspense>

          <div className="mt-6 border-t border-line">
            <Accordion title="About this piece" defaultOpen>
              {p.description
                ? <p className="leading-[1.65]">{p.description}</p>
                : <p className="leading-[1.65] text-ash">A considered {p.gender === 'women' ? 'women’s' : 'men’s'} piece from the {tierLabel.toLowerCase()} edit.</p>}
            </Accordion>

            <Accordion title="Fit & feel">
              <div className="space-y-2 leading-[1.65]">
                <p>For a personal size recommendation, use Fit Finder in under a minute.</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 pt-1 text-[12.5px]">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash">Tier</dt>
                  <dd>{tierLabel}</dd>
                  {(p.sizes || []).length > 0 && (<><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash">Sizes</dt><dd>{p.sizes.join(' · ')}</dd></>)}
                  {(p.colors || []).length > 0 && (<><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash">Colours</dt><dd>{p.colors.map((c) => c.name).join(', ')}</dd></>)}
                </dl>
              </div>
            </Accordion>

            {p.fabric && (
              <Accordion title="Fabric & technology">
                <p className="font-medium text-obsidian leading-[1.6]">{p.fabric}</p>
              </Accordion>
            )}

            {careArr.length > 0 && (
              <Accordion title="Care instructions">
                <ul className="list-disc space-y-1 pl-4 leading-[1.6]">
                  {careArr.map((c) => <li key={c}>{c}</li>)}
                </ul>
              </Accordion>
            )}

            <Accordion title="Shipping & returns">
              <div className="space-y-1.5 leading-[1.6]">
                <p>Dispatched in 24–48h via courier in plain, unmarked packaging.
                  {flatRate > 0 && <> Flat {pkr(flatRate)} nationwide; free shipping on orders over {pkr(freeThreshold)}.</>}
                  {' '}Estimated delivery: <b>{deliveryRange}</b>.</p>
                <p>For hygiene reasons, opened, worn or washed innerwear cannot be returned or exchanged. Wrong, damaged or defective items are replaced promptly — contact care with your order number.</p>
                {exchangeEnabled && <p className="text-ash">Unworn, unwashed pieces in original packaging may be exchanged within 14 days — size swaps are free.</p>}
              </div>
            </Accordion>

            <Accordion title="Size information">
              <div className="space-y-2 leading-[1.6]">
                <p>Open the size guide for measurements, or use Fit Finder for a recommendation.</p>
                <button type="button" onClick={() => setGuideOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-sagedeep underline underline-offset-4 hover:text-sagedark">
                  <Ruler size={11} aria-hidden="true" /> Open size guide
                </button>
              </div>
            </Accordion>

            <Accordion title="Product details">
              <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1 text-[12.5px]">
                {[
                  ['SKU', p.sku],
                  ['Material', p.fabric],
                  ['Tier', tierLabel],
                  ['Origin', 'Pakistan'],
                  ['Category', p.categorySlug?.replace(/-/g, ' ')],
                ].filter(([, v]) => v && String(v).trim()).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ash">{k}</dt>
                    <dd className="capitalize text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Accordion>
          </div>
        </div>
      </div>

      {bundle.length > 0 && (
        <section className="mt-12 md:mt-16" aria-labelledby="set-title">
          <ProductRow eyebrow="Complete the set" title="Pairs perfectly with" titleId="set-title" products={bundle.map(snap)} />
        </section>
      )}
      {related.length > 0 && (
        <section className="mt-12 md:mt-16" aria-labelledby="related-title">
          <ProductRow eyebrow="You may also like" title="More from the edit" titleId="related-title" products={related.map(snap)} />
        </section>
      )}
      <section id="reviews" className="scroll-mt-28 mt-12 md:mt-16">
        <ProductReviews product={p} />
        <ProductQA product={p} />
      </section>
      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <section className="mt-12 pb-4 md:mt-16" aria-labelledby="rv-title">
          <ProductRow eyebrow="Your history" title={rvCfg.title || 'Recently viewed'} titleId="rv-title"
            products={recent.filter((r) => r.slug !== p.slug).slice(0, 8)} />
        </section>
      )}

      <StickyBuyBar
        product={p} watchRef={ctaRef} size={size} color={color} needsSize={needsSize} needsColor={needsColor}
        onAdd={() => tryAdd(false)} onBuyNow={() => tryAdd(true)}
        disabled={soldOut} adding={adding} thumb={p.images?.[0]?.url}
      />
      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}
