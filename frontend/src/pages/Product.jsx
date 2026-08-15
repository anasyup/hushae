import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Box, ChevronDown, ChevronLeft, ChevronRight, Heart,
  Package, RotateCcw, ShieldCheck, Star, Truck, X,
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
import SizeGuideModal from '../components/SizeGuideModal';
import { ProductSkeleton } from '../components/Skeletons';
import Seo, { productJsonLd } from '../components/Seo';
import StickyBuyBar from './product/StickyBuyBar';
import AccordionGroup from './product/Accordion';

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
  const relatedRef = useRef(null);
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

                        {/* ═══ MAIN — main image + horizontal thumbnail strip + details (v11) ═══ */}
      <main className="grid w-full min-h-screen grid-cols-1 pt-16 lg:grid-cols-12 lg:pt-0">
        {/* LEFT — main big image + bottom horizontal thumbnail list */}
        <div className="flex flex-col justify-between bg-[#EFECE6] p-0 m-0 lg:col-span-6 xl:col-span-7">
          {/* 1. Top big main display image — fixed aspect ratio (3/4 mobile, 4/5 desktop) */}
          <div className="group relative aspect-[3/4] w-full overflow-hidden bg-[#EFECE6] p-0 m-0 lg:aspect-[4/5]">
            {/* Clicking the photo opens the lightbox */}
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`View ${name} fullscreen`}
              className="block h-full w-full"
            >
              <img
                src={gallery[imgIdx] || gallery[0] || FALLBACK}
                alt={`${name} — main view`}
                loading="eager"
                onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                className="block h-full w-full object-cover object-center transition-all duration-300"
              />
            </button>

            {/* Left arrow */}
            {gallery.length > 1 && (
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-black opacity-80 shadow-sm transition-all hover:bg-white hover:opacity-100"
              >
                <ChevronLeft size={24} strokeWidth={1.5} />
              </button>
            )}

            {/* Right arrow */}
            {gallery.length > 1 && (
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/70 text-black opacity-80 shadow-sm transition-all hover:bg-white hover:opacity-100"
              >
                <ChevronRight size={24} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* 2. Bottom remaining images — horizontal list */}
          {gallery.length > 1 && (
            <div className="w-full overflow-x-auto bg-[#FAF8F5] p-4">
              <div className="flex min-w-max items-center gap-3">
                {gallery.map((u, idx) => (
                  <button
                    key={`${u}-${idx}`}
                    type="button"
                    onClick={() => setImgIdx(idx)}
                    aria-label={`View image ${idx + 1}`}
                    aria-current={idx === imgIdx}
                    className={`relative h-24 w-20 overflow-hidden rounded-md border-2 transition-all duration-200 lg:h-28 lg:w-24 ${
                      idx === imgIdx
                        ? 'scale-105 border-black opacity-100 shadow-md'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={u}
                      alt={`Thumbnail ${idx + 1}`}
                      loading="lazy"
                      onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                      className="block h-full w-full object-cover object-top"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — details section (top padding clears the fixed header) */}
        <div className="relative flex flex-col justify-start bg-[#FAF8F5] px-8 pb-10 pt-24 sm:px-14 lg:col-span-6 lg:px-16 lg:pt-28 xl:col-span-5">
          <div ref={ctaRef} className="space-y-6">
            {/* Breadcrumb — 10px tracking 0.2em uppercase */}
            <nav className="space-x-1.5 text-[10px] font-light uppercase tracking-[0.2em] text-neutral-400">
              <Link to="/" className="transition hover:text-black">Home</Link>
              <span>/</span>
              <Link to={`/${p.gender}`} className="capitalize transition hover:text-black">{p.gender}</Link>
              <span>/</span>
              <Link to={`/category/${p.categorySlug}`} className="capitalize transition hover:text-black">{p.categorySlug.replace(/-/g, ' ')}</Link>
              <span>/</span>
              <span className="font-normal text-black">{name}</span>
            </nav>

            {/* Title & price — serif 28/32, filled black SAVE badge */}
            <div className="space-y-2 border-b border-neutral-300/60 pb-6">
              <h1 className="font-serif text-[28px] font-normal uppercase tracking-[0.06em] text-[#111111] lg:text-[32px]">
                {name}
              </h1>

              <div className="flex items-center gap-3 pt-1">
                {onSale && p.compareAtPrice > p.price && (
                  <span className="text-[13px] font-light text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
                )}
                <span className="text-[20px] font-medium text-[#111111]">{pkr(p.price)}</span>
                {onSale && p.compareAtPrice > p.price && (
                  <span className="bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest text-white">
                    Save {discount}%
                  </span>
                )}
              </div>

              {/* Filled stars — only when real reviews exist */}
              {rating > 0 && (
                <div id="reviews-link" className="flex items-center gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-2"
                  >
                    <span className="flex text-black">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={14} className={`${s <= Math.round(rating) ? 'fill-black text-black' : 'text-neutral-300'}`} />
                      ))}
                    </span>
                    <span className="font-light text-neutral-500">({p.ratingCount || 0} Reviews)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Colors — circles with inner swatch */}
            {p.colors?.length > 0 && (
              <div className="space-y-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-800">
                  Color: <span className="font-light text-neutral-500">{color}</span>
                </span>
                <div className="flex items-center gap-3">
                  {p.colors.map((c) => {
                    const on = color === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColor(c.name)}
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={on}
                        className={`h-7 w-7 rounded-full border p-0.5 transition-all ${
                          on ? 'scale-105 border-black ring-1 ring-black' : 'border-transparent'
                        }`}
                      >
                        <span className="block h-full w-full rounded-full" style={{ backgroundColor: c.hex || '#EEEEEE' }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sizes — grid-cols-5 h-11 */}
            {needsSize && (
              <div ref={sizeRef} className="space-y-3">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em]">
                  <span className="font-medium text-neutral-800">Select Size</span>
                  <button type="button" onClick={() => setGuideOpen(true)} className="text-neutral-400 underline transition hover:text-black">
                    Size Guide
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {p.sizes.map((s) => {
                    const on = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setSize(s); setSizeErr(false); }}
                        aria-pressed={on}
                        className={`h-11 border text-[11px] font-medium tracking-widest transition-all ${
                          on ? 'border-black bg-black text-white' : 'border-neutral-300 bg-transparent text-neutral-800 hover:border-black'
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

            {/* Description */}
            <div className="space-y-2 pt-1 text-[13px] font-light leading-relaxed text-neutral-600">
              <p>{desc}</p>
              {p.description && p.description !== p.shortDescription && (
                <button
                  type="button"
                  onClick={() => setReadMore(!readMore)}
                  className="text-[11px] font-medium text-neutral-500 underline transition hover:text-black"
                >
                  {readMore ? 'Read Less' : 'Read More'}
                </button>
              )}
            </div>

            {/* CTA buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => tryAdd(false)}
                disabled={soldOut || (needsSize && !size)}
                className={`h-[3.25rem] w-full text-[11px] font-medium uppercase tracking-[0.25em] transition-colors ${
                  soldOut || (needsSize && !size) ? 'cursor-not-allowed bg-neutral-200 text-neutral-500' : 'bg-[#111111] text-white hover:bg-neutral-800'
                }`}
              >
                {soldOut ? 'Sold Out' : needsSize && !size ? 'Select a Size' : 'Add to Bag'}
              </button>
              <button
                type="button"
                onClick={() => toggleWish(p)}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                className="flex h-12 w-full items-center justify-center gap-2 border border-neutral-300 bg-transparent text-[11px] font-medium uppercase tracking-[0.2em] text-black transition-colors hover:border-black"
              >
                <Heart size={16} strokeWidth={1.2} className={wished ? 'fill-black text-black' : ''} />
                <span>{wished ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            {/* Trust badges — 3-col uppercase */}
            <div className="grid grid-cols-3 gap-2 border-y border-neutral-200/80 py-4 text-[10px] uppercase tracking-widest text-neutral-600">
              {[
                [Truck, 'Express'],
                [RotateCcw, '14-Day Returns'],
                [ShieldCheck, 'Discreet Box'],
              ].map(([Icon, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon size={16} className="shrink-0 text-neutral-800" strokeWidth={1.2} />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Accordion info — native disclosure */}
            <div className="space-y-2 pt-1 text-[12px]">
              {accordionItems.map((item) => (
                <details key={item.title} className="group cursor-pointer border-b border-neutral-200/80 pb-3">
                  <summary className="flex list-none items-center justify-between text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-800">
                    {item.title}
                    <ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <div className="pt-2 text-[11px] font-light leading-relaxed text-neutral-500">
                    {item.content}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </main>




      {/* ═══ EDITORIAL FEATURE ════════════════════════════════════════ */}
      <section className="my-16 border-y border-neutral-200 bg-white py-20">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-6 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">Editorial Feature</span>
            <h2 className="text-3xl font-light normal-case lg:text-4xl">Crafted for Everyday Movement</h2>
            <p className="text-sm leading-relaxed text-neutral-600">
              {p.fabric ? `Built in ${p.fabric.toLowerCase()} — engineered in Pakistan and finished to an international standard.` : ''}
              {p.shortDescription || ''}
            </p>
            <div className="grid grid-cols-2 gap-6 border-t pt-6">
              <div>
                <h4 className="text-xs font-bold uppercase">Ethical Production</h4>
                <p className="mt-2 text-xs text-neutral-500">Responsibly made, garment-dyed in small batches.</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase">Handcrafted Finish</h4>
                <p className="mt-2 text-xs text-neutral-500">Finished by experienced artisans.</p>
              </div>
            </div>
          </div>
          <div className="aspect-[4/3] overflow-hidden bg-neutral-100">
            <img
              src="/images/campaign/qa/editorial-modern.jpg"
              alt="Editorial"
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
        </div>
      </section>

      {/* ═══ FEATURE CARDS ════════════════════════════════════════════ */}
      <section className="mx-auto mb-20 grid max-w-[1440px] grid-cols-1 gap-6 px-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          ['Premium Materials', 'Premium materials selected for durability and comfort.'],
          ['Tailored Precision', 'Designed for movement while maintaining a clean silhouette.'],
          ['Signature Detailing', 'Minimal hardware engineered for everyday functionality.'],
          ['Lifetime Repairs', 'We stand behind our craftsmanship and quality.'],
        ].map(([t, d]) => (
          <div key={t} className="border border-neutral-200 bg-white p-6">
            <h4 className="text-xs font-bold uppercase tracking-widest">{t}</h4>
            <p className="mt-3 text-xs leading-relaxed text-neutral-500">{d}</p>
          </div>
        ))}
      </section>

      {/* ═══ YOU MAY ALSO LIKE — bigger cards + arrow carousel ════════ */}
      {complete.length > 0 && (
        <section className="border-t border-neutral-200 py-16">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
            {/* Header — title left, arrows right */}
            <div className="mb-8 flex items-end justify-between">
              <h3 className="text-xl font-light uppercase tracking-widest">You May Also Like</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => relatedRef.current?.scrollBy({ left: -380, behavior: 'smooth' })}
                  aria-label="Previous products"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-black transition-all hover:border-black hover:bg-black hover:text-white"
                >
                  <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => relatedRef.current?.scrollBy({ left: 380, behavior: 'smooth' })}
                  aria-label="Next products"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-black transition-all hover:border-black hover:bg-black hover:text-white"
                >
                  <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Carousel track — bigger fixed-width cards */}
            <div
              ref={relatedRef}
              className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-2"
            >
              {complete.slice(0, 8).map((pr) => (
                <div key={pr._id} className="w-[280px] shrink-0 snap-start sm:w-[320px] md:w-[340px]">
                  <CollectionCard product={pr} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Recently viewed — grid of cards (reference structure) */}
      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <section className="border-t border-neutral-200 py-16">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
            <h3 className="mb-8 text-xl font-light uppercase tracking-widest">{rvCfg.title || 'Recently Viewed'}</h3>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {recent.filter((r) => r.slug !== p.slug).slice(0, 4).map((pr) => (
                <CollectionCard key={pr._id || pr.slug} product={pr} />
              ))}
            </div>
          </div>
        </section>
      )}


      {/* ═══ CUSTOMER REVIEWS ═════════════════════════════════════════ */}
      <section id="reviews" className="scroll-mt-28 border-t border-neutral-200 py-16">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <ProductReviews product={p} />
        </div>
      </section>

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
