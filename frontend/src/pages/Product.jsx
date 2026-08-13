import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Box, ChevronLeft, ChevronRight, Heart,
  Minus, Package, Plus, RotateCcw, ShieldCheck, ShoppingBag, Star, Truck, X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';
import { isVideo } from '../lib/media';
import CollectionCard from '../components/CollectionCard';
import ProductReviews from '../components/ProductReviews';
import ProductQA from '../components/reviews/ProductQA';
import SizeGuideModal from '../components/SizeGuideModal';
import { ProductSkeleton } from '../components/Skeletons';
import Seo, { productJsonLd } from '../components/Seo';
import StickyBuyBar from './product/StickyBuyBar';
import AccordionGroup from './product/Accordion';
import ProductSectionHeader from './product/ProductSectionHeader';

/* ============================================================================
 * HUSHAE Product Details — exact client reference ("Atelier" luxury PDP).
 *   · bg #FAF9F6 · max-w 1440 · 12-col grid (7 / 5), sticky buy box
 *   · LEFT: gallery — main 3/4 + vertical thumbnail column (64×80) + hover
 *     arrows + expand → fullscreen Lightbox
 *   · RIGHT: eyebrow · title 30/36 font-light · star rating + reviews link ·
 *     price row (2xl + struck + "Save N%" badge) · Read More toggle ·
 *     colour 36px ring swatches · size 6-col h-11 + size guide · stock
 *     indicator (green/amber/red) · qty + Add To Cart + heart · Buy It Now ·
 *     trust 2×2 · 3 accordions (Details & Fit / Shipping & Returns / Care)
 *   · editorial feature section · feature cards · reviews · "You May Also
 *     Like" · recently viewed · sticky purchase bar
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');
const nameOf = (p) => titleCase(displayName(p?.name));

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F5F5F5"/><text x="50%" y="50%" fill="#999999" font-family="Jost,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

export default function Product() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addToCart, inWishlist, toggleWish, pushRecent, recent, settings } = useApp();
  const rvCfg = settings?.customerExperience?.recentlyViewed || {};

  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeErr, setSizeErr] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [readMore, setReadMore] = useState(false);
  const [bundle, setBundle] = useState([]);
  const [complete, setComplete] = useState([]); // "You May Also Like" — never empty

  const ctaRef = useRef(null);
  const sizeRef = useRef(null);

  useEffect(() => {
    setP(null); setErr(false); setSize(''); setColor(''); setQty(1); setSizeErr(false); setImgIdx(0);
    setLightboxOpen(false); setReadMore(false); setBundle([]); setComplete([]);
    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors?.[0]?.name || '');
        pushRecent(d.product);
      })
      .catch(() => setErr(true));
  }, [slug]); // eslint-disable-line

  /* Merchant bundle → first "You May Also Like" source. */
  useEffect(() => {
    if (!p?.bundleSlug) { setBundle([]); return; }
    let alive = true;
    api(`/products?category=${p.bundleSlug}&limit=3&sort=popular`)
      .then((x) => { if (alive) setBundle(x.products || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [p]);

  /* ── "You May Also Like" — never empty: bundle → same-category picks. */
  useEffect(() => {
    if (!p) return;
    if (bundle.length) { setComplete(bundle.slice(0, 4)); return; }
    let alive = true;
    api(`/products?category=${p.categorySlug}&limit=4&sort=popular`)
      .then((x) => { if (alive) setComplete((x.products || []).filter((pr) => pr.slug !== p.slug).slice(0, 4)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [p, bundle]); // eslint-disable-line

  const media = useMemo(() => {
    if (!p) return [];
    const imgs = (p.images || []).map((im) => ({ t: isVideo(im.url) ? 'video' : 'img', url: im.url, alt: im.alt || p.name }));
    return p.video && !imgs.some((m) => m.url === p.video)
      ? [...imgs, { t: 'video', url: p.video, alt: `${p.name} video` }]
      : imgs;
  }, [p]);

  const gallery = useMemo(() => {
    const imgs = (media || []).filter((m) => m.t === 'img').map((m) => m.url).filter(Boolean);
    if (imgs.length) return imgs;
    const first = media?.[0]?.url || p?.image || '';
    return first ? [first] : [];
  }, [media, p]);

  if (err) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#F0F0F0] text-[#696969]"><Package size={22} /></span>
        <h1 className="mt-6 text-3xl font-medium uppercase tracking-[0.04em] text-[#111111]">This piece has moved on</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#696969]">It may be sold out or no longer part of the edit.</p>
        <Link to="/shop" className="btn-primary mt-8">Back to Shop</Link>
      </div>
    );
  }
  if (!p) return <ProductSkeleton />;

  const isBra = p.categorySlug === 'bras';
  const needsSize = (p.sizes || []).length > 0;
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const name = nameOf(p);
  const wished = inWishlist(p);
  const rating = Number(p.ratingAvg || 0);
  const discount = onSale && p.compareAtPrice > p.price
    ? Math.round((1 - p.price / p.compareAtPrice) * 100)
    : 0;
  const maxQty = soldOut ? 1 : Math.max(1, Math.min(10, p.stock || 10));
  const desc = readMore ? (p.description || p.shortDescription) : (p.shortDescription || p.description);

  const tryAdd = (goToCheckout = false) => {
    if (needsSize && !size) {
      setSizeErr(true);
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      sizeRef.current?.querySelector('button')?.focus();
      return;
    }
    addToCart(p, { size, color, quantity: qty });
    if (goToCheckout) nav('/checkout');
  };

  const stockState = () => {
    if (soldOut) return { tone: 'red', text: 'Out of stock' };
    if (p.stock <= 5) return { tone: 'amber', text: `Only ${p.stock} left in stock` };
    return { tone: 'green', text: 'In Stock — Ready to ship' };
  };

  const trust = [
    [Truck, `Free Express Delivery over ${pkr(settings?.freeShippingThreshold ?? 4999)}`],
    [RotateCcw, 'Complimentary 14-Day Returns'],
    [ShieldCheck, 'Secure & Discreet Packaging'],
    [Box, 'Dispatched within 24 Hours'],
  ];

  const accordionItems = [
    {
      title: 'Product Details & Fit',
      content: (
        <ul className="space-y-2">
          <li><strong>Material:</strong> {p.fabric}</li>
          <li><strong>Fit:</strong> Tailored regular fit — fits true to size</li>
          <li><strong>Colour:</strong> {color}</li>
          <li><strong>SKU:</strong> {p.sku || p.slug}</li>
        </ul>
      ),
    },
    {
      title: 'Shipping & Returns',
      content: (
        <p>
          Express delivery nationwide in 2–4 working days. Free shipping over {pkr(settings?.freeShippingThreshold ?? 4999)}.
          Unworn pieces exchange within 14 days — for hygiene, innerwear is only returnable if it arrives faulty.
        </p>
      ),
    },
    {
      title: 'Garment Care',
      content: (p.care || []).length > 0
        ? (
          <ul className="list-disc space-y-1 pl-5">
            {(p.care || []).map((c) => <li key={c}>{c}</li>)}
          </ul>
        )
        : <p>Machine wash cold, gentle cycle. Lay flat to dry. Do not bleach.</p>,
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-20 font-sans text-[#1A1A1A] antialiased lg:pb-0">
      <Seo
        title={name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${name} — premium innerwear from HUSHAE. PKR ${p.price}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* ═══ MAIN — CALVIN KLEIN SPLIT (6/7 gallery · 6/5 buy box) ═════ */}
      <main className="mx-auto grid w-full max-w-[1600px] grid-cols-1 lg:grid-cols-12">
        {/* LEFT — sticky full-height gallery (CK reference v4) */}
        <div className="relative lg:col-span-6 xl:col-span-7">
          <div className="group relative h-[70vh] overflow-hidden bg-[#F4F2EE] lg:sticky lg:top-0 lg:h-screen">
            {/* Clicking the photograph opens the lightbox (no visible icon,
                per the CK reference: 'no fullscreen icon') */}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="View fullscreen"
              className="block h-full w-full cursor-zoom-in"
            >
              <img
                src={gallery[imgIdx] || gallery[0] || FALLBACK}
                alt={`${name} — view ${imgIdx + 1}`}
                loading="eager"
                onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                className="h-full w-full object-cover object-center transition-all duration-500 ease-in-out"
              />
            </button>
            {/* Floating circular arrows — ALWAYS visible (CK reference v5) */}
            {gallery.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                  aria-label="Previous image"
                  className="absolute left-6 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-sm transition-all hover:scale-105 hover:bg-white"
                >
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                  aria-label="Next image"
                  className="absolute right-6 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black shadow-md transition-all hover:scale-105 hover:bg-white"
                >
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              </>
            )}
          </div>
          {/* NO bottom thumbnail overlay — ultra-clean full image (CK reference v5) */}
        </div>

        {/* RIGHT — CK clean typography & selection */}
        <div className="mx-auto flex w-full max-w-xl flex-col justify-center space-y-8 px-6 py-10 sm:px-12 lg:col-span-6 lg:px-16 lg:py-20 xl:col-span-5">
          {/* Breadcrumb — uppercase (CK reference v2) */}
          <nav className="text-[11px] font-light uppercase tracking-wider text-neutral-400">
            <Link to="/" className="transition hover:text-black">Home</Link>
            <span className="mx-1">/</span>
            <Link to={`/${p.gender}`} className="capitalize transition hover:text-black">{p.gender}</Link>
            <span className="mx-1">/</span>
            <Link to={`/category/${p.categorySlug}`} className="capitalize transition hover:text-black">{p.categorySlug.replace(/-/g, ' ')}</Link>
            <span className="mx-1">/</span>
            <span className="text-black">{name}</span>
          </nav>

          {/* Title & pricing — CK v4: UPPERCASE 24/28 tracking 0.1em */}
          <div className="space-y-2 border-b border-neutral-100 pb-6">
            <h1 className="text-[24px] font-normal uppercase tracking-[0.1em] text-[#111111] sm:text-[28px]">
              {name}
            </h1>

            <div className="flex items-center gap-3 pt-1">
              {onSale && p.compareAtPrice > p.price && (
                <span className="text-[14px] font-light text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
              )}
              <span className="text-[18px] font-semibold text-[#111111]">{pkr(p.price)}</span>
              {onSale && p.compareAtPrice > p.price && (
                <span className="bg-[#111111] px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest text-white">
                  Save {discount}%
                </span>
              )}
            </div>

            {/* Reviews link */}
            <div id="reviews-link" className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2"
              >
                <span className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className={`${s <= Math.round(rating) ? 'fill-black text-black' : 'text-neutral-300'}`} />
                  ))}
                </span>
                {rating > 0 && <span className="text-xs font-semibold underline">{rating.toFixed(1)}</span>}
                {rating > 0 && <span className="text-xs text-neutral-500">({p.ratingCount || 0} Reviews)</span>}
              </button>
            </div>
          </div>

          {/* Colour — CK RECTANGULAR VARIANT CARDS (image per colour).
              The product's own gallery photos stand in for per-variant shots
              (data has no per-colour images); selecting a card also moves the
              gallery to that colour's plate. */}
          {p.colors?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-[0.15em] text-neutral-800">
                  Color: <span className="font-light text-neutral-500">{color}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {p.colors.map((c, idx) => {
                  const on = color === c.name;
                  const cardImg = gallery[idx % gallery.length] || FALLBACK;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => { setColor(c.name); setImgIdx(idx % gallery.length); }}
                      title={c.name}
                      aria-label={c.name}
                      aria-pressed={on}
                      className={`group relative h-28 w-20 overflow-hidden rounded-sm border bg-[#EFECE6] p-1 transition-all duration-300 ${
                        on ? 'border-black ring-1 ring-black' : 'border-transparent hover:border-neutral-400'
                      }`}
                    >
                      <img
                        src={cardImg}
                        alt={c.name}
                        className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size — CK grid v2 (uppercase tracking-widest) */}
          {needsSize && (
            <div ref={sizeRef} className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-[12px] uppercase tracking-[0.15em]">
                <span className="font-medium text-neutral-800">Size</span>
                <button type="button" onClick={() => setGuideOpen(true)} className="text-neutral-500 underline transition hover:text-black">
                  Size Guide
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {p.sizes.map((s) => {
                  const on = size === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setSize(s); setSizeErr(false); }}
                      aria-pressed={on}
                      className={`h-11 border text-[12px] font-medium uppercase tracking-widest transition-all ${
                        on ? 'border-black bg-black text-white' : 'border-neutral-200 bg-white text-black hover:border-black'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              {/* Stock indicator */}
              {(() => {
                const st = stockState();
                const dot = st.tone === 'green' ? 'bg-emerald-600' : st.tone === 'amber' ? 'bg-amber-600' : 'bg-red-600';
                const txt = st.tone === 'green' ? 'text-emerald-700' : st.tone === 'amber' ? 'text-amber-700' : 'text-red-600';
                return (
                  <div className={`flex items-center gap-2 text-xs ${txt}`}>
                    <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
                    {needsSize && !size ? 'Select a size to view availability.' : st.text}
                  </div>
                );
              })()}
              {sizeErr && !size && (
                <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle size={16} /> Please select a size before continuing.
                </div>
              )}
            </div>
          )}

          {/* Description + Read More */}
          <div className="space-y-2 pt-2 text-sm leading-relaxed text-neutral-600">
            <p>{desc}</p>
            {p.description && p.description !== p.shortDescription && (
              <button
                type="button"
                onClick={() => setReadMore(!readMore)}
                className="text-[12px] font-medium text-neutral-500 underline transition hover:text-black"
              >
                {readMore ? 'Read Less' : 'Read More'}
              </button>
            )}
          </div>

          {/* Actions — CK buttons */}
          <div className="space-y-3 pt-4">
            <div className="flex gap-3">
              <div className="flex h-14 w-32 shrink-0 items-center justify-between border border-neutral-300 bg-white px-3">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Decrease quantity">
                  <Minus size={16} />
                </button>
                <span className="text-[13px] font-medium">{qty}</span>
                <button type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty} aria-label="Increase quantity">
                  <Plus size={16} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => tryAdd(false)}
                disabled={soldOut || (needsSize && !size)}
                className={`flex h-[3.25rem] flex-1 items-center justify-center gap-2 text-[12px] font-medium uppercase tracking-[0.2em] transition-colors ${
                  soldOut || (needsSize && !size) ? 'cursor-not-allowed bg-neutral-200 text-neutral-500' : 'bg-[#111111] text-white hover:bg-neutral-800'
                }`}
              >
                <ShoppingBag size={16} />
                {soldOut ? 'Sold Out' : needsSize && !size ? 'Select a Size' : 'Add to Bag'}
              </button>
            </div>

            {/* Wishlist — CK outline (full width) */}
            <button
              type="button"
              onClick={() => toggleWish(p)}
              aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              className="flex h-12 w-full items-center justify-center gap-2 border border-neutral-300 text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:border-black"
            >
              <Heart size={16} strokeWidth={1.5} className={wished ? 'fill-black text-black' : ''} />
              <span>{wished ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
            </button>

            {/* Buy It Now — outline */}
            <button
              type="button"
              onClick={() => tryAdd(true)}
              disabled={soldOut || (needsSize && !size)}
              className={`h-12 w-full text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                soldOut || (needsSize && !size) ? 'cursor-not-allowed bg-neutral-100 text-neutral-400' : 'border border-neutral-300 bg-white text-black hover:border-black'
              }`}
            >
              Buy It Now
            </button>
          </div>

          {/* Trust features — CK badges (icons + tracking-wide) */}
          <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-6 text-[11px] tracking-wide text-neutral-600">
            {trust.map(([Icon, text]) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon size={16} className="shrink-0 text-neutral-800" strokeWidth={1.5} />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Accordions */}
          <AccordionGroup items={accordionItems} />
        </div>
      </main>

      {/* ═══ THE DETAILS — editorial 2-col (FWRD / Givenchy / Bottega register) ═══ */}
      <section className="mx-auto w-full max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid items-start gap-14 lg:grid-cols-12 lg:gap-20">
            {/* Left — the details, set quietly */}
            <div className="lg:col-span-7">
              <ProductSectionHeader eyebrow="The Details" title={name} />

              <p className="max-w-prose text-[15px] font-light leading-[2.1] text-neutral-600">
                {p.description || p.shortDescription || desc}
              </p>

              {/* Detail rows — label / value, hairline divided */}
              <dl className="mt-10 border-t border-neutral-200">
                {[
                  ['Fabric', p.fabric],
                  ['Fit', 'Tailored regular fit — fits true to size'],
                  ['Colour', color],
                  ['SKU', p.sku || p.slug],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-6 border-b border-neutral-200 py-4">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">{k}</dt>
                    <dd className="text-right text-[13px] font-light text-neutral-700">{v}</dd>
                  </div>
                ))}
              </dl>

              {/* Care + Shipping — two quiet columns */}
              <div className="mt-10 grid gap-10 sm:grid-cols-2">
                <div>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">Garment Care</h3>
                  <ul className="mt-4 space-y-2">
                    {(p.care || []).length > 0
                      ? (p.care || []).map((c) => (
                          <li key={c} className="flex items-start gap-2 text-[13px] font-light leading-relaxed text-neutral-600">
                            <span className="mt-2 h-px w-3 shrink-0 bg-neutral-300" aria-hidden="true" />
                            {c}
                          </li>
                        ))
                      : <li className="text-[13px] font-light leading-relaxed text-neutral-600">Machine wash cold, gentle cycle. Lay flat to dry. Do not bleach.</li>}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">Shipping & Returns</h3>
                  <p className="mt-4 text-[13px] font-light leading-[1.9] text-neutral-600">
                    Express delivery nationwide in 2–4 working days. Free shipping over {pkr(settings?.freeShippingThreshold ?? 4999)}.
                    Unworn pieces exchange within 14 days — for hygiene, innerwear is only returnable if it arrives faulty.
                  </p>
                </div>
              </div>
            </div>

            {/* Right — tall detail photograph */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden bg-[#F2F0EC]">
                <img
                  src={gallery[1] || gallery[0] || '/images/campaign/qa/editorial-modern.jpg'}
                  alt={`${name} — detail`}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 bg-white/85 px-3 py-1.5 backdrop-blur-sm">
                  <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-[#111111]">{name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ THE HUSHAE STANDARD — full-bleed brand band ═══════════════ */}
      <section className="relative w-full overflow-hidden bg-[#111111]">
        <div className="relative aspect-[4/5] sm:aspect-[16/9]">
          <img
            src="/images/campaign/qa/hero-fabric.jpg"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10">
              <div className="max-w-xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/70">The Hushae Standard</p>
                <h2 className="mt-5 font-display text-2xl font-light uppercase leading-[1.25] tracking-[0.12em] text-white md:text-3xl">
                  Crafted for Everyday Movement
                </h2>
                <p className="mt-6 text-[14px] font-light leading-[1.9] text-white/85">
                  {p.fabric ? `Built in ${p.fabric.toLowerCase()} — ` : ''}engineered in Pakistan and finished to an international standard.
                </p>
              </div>

              {/* Three quiet pillars */}
              <div className="mt-12 grid gap-10 border-t border-white/15 pt-10 sm:grid-cols-3">
                {[
                  ['Craftsmanship', 'Seams that sit flat, elastics that hold without pressing.'],
                  ['Materials', 'Premium fabrics selected for durability and quiet comfort.'],
                  ['Fit', 'Tailored to move with you — a clean silhouette that lasts.'],
                ].map(([t, d]) => (
                  <div key={t}>
                    <span className="block h-px w-7 bg-white/40" aria-hidden="true" />
                    <h3 className="mt-4 text-[12px] font-medium uppercase tracking-[0.2em] text-white">{t}</h3>
                    <p className="mt-3 text-[13px] font-light leading-[1.8] text-white/70">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CUSTOMER REVIEWS ═════════════════════════════════════════ */}
      <section id="reviews" className="scroll-mt-24 border-t border-neutral-200 py-20 md:py-24">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <ProductSectionHeader eyebrow="Social Proof" title="Customer Reviews" />
          <ProductReviews product={p} />
        </div>
      </section>

      {/* ═══ QUESTIONS & ANSWERS ══════════════════════════════════════ */}
      <section className="border-t border-neutral-200 py-20 md:py-24">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <ProductSectionHeader eyebrow="Assistance" title="Questions & Answers" />
          <ProductQA product={p} />
        </div>
      </section>

      {/* ═══ COMPLETE THE LOOK ════════════════════════════════════════ */}
      {complete.length > 0 && (
        <section className="border-t border-neutral-200 py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
            <ProductSectionHeader eyebrow="The Edit" title="Complete the Look" />
            <div className="grid grid-cols-2 gap-x-1 gap-y-10 md:grid-cols-4">
              {complete.slice(0, 4).map((pr) => <CollectionCard key={pr._id} product={pr} variant="pill" />)}
            </div>
          </div>
        </section>
      )}

      {/* ═══ RECENTLY VIEWED ══════════════════════════════════════════ */}
      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <section className="border-t border-neutral-200 py-20 md:py-24">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
            <ProductSectionHeader eyebrow="Continue Browsing" title={rvCfg.title || 'Recently Viewed'} />
            <div className="grid grid-cols-2 gap-x-1 gap-y-10 md:grid-cols-4">
              {recent.filter((r) => r.slug !== p.slug).slice(0, 4).map((pr) => (
                <CollectionCard key={pr._id || pr.slug} product={pr} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sticky bottom purchase bar */}
      <StickyBuyBar
        product={p}
        watchRef={ctaRef}
        size={size}
        needsSize={needsSize}
        onAdd={() => tryAdd(false)}
        disabled={soldOut}
        thumb={p.images?.[0]?.url}
      />

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-6">
          <button type="button" onClick={() => setLightboxOpen(false)} aria-label="Close" className="absolute right-6 top-6 text-white">
            <X size={28} />
          </button>
          <img src={gallery[imgIdx] || gallery[0]} alt={`${name} fullscreen`} className="max-h-[85vh] max-w-full object-contain" />
          <button type="button" onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)} aria-label="Previous" className="absolute left-5 p-4 text-white">
            <ArrowLeft size={28} />
          </button>
          <button type="button" onClick={() => setImgIdx((i) => (i + 1) % gallery.length)} aria-label="Next" className="absolute right-5 p-4 text-white">
            <ArrowRight size={28} />
          </button>
          <span className="absolute bottom-6 text-xs text-white">{imgIdx + 1} / {gallery.length}</span>
        </div>
      )}

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}

function Chevron() {
  return <span className="text-neutral-400" aria-hidden="true">›</span>;
}
