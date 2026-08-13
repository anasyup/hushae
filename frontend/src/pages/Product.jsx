import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, Box, ChevronLeft, ChevronRight, Heart, Maximize2,
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

      {/* ═══ BREADCRUMB — below the fixed transparent header (pt-24) ════ */}
      <div className="mx-auto flex max-w-[1440px] items-center gap-2 px-6 pt-24 text-[11px] uppercase tracking-widest text-neutral-500">
        <Link to="/" className="transition hover:text-black">Home</Link>
        <Chevron />
        <Link to={`/${p.gender}`} className="capitalize transition hover:text-black">{p.gender}</Link>
        <Chevron />
        <Link to={`/category/${p.categorySlug}`} className="capitalize transition hover:text-black">{p.categorySlug.replace(/-/g, ' ')}</Link>
        <Chevron />
        <span className="text-black">{name}</span>
      </div>

      {/* ═══ MAIN — 7 / 5 grid ═══════════════════════════════════════ */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-6 py-8 lg:grid-cols-12 lg:gap-16">
        {/* LEFT — gallery */}
        <div className="lg:col-span-7">
          <div className="flex flex-col-reverse gap-4 md:flex-row">
            {/* Thumbnails — vertical on desktop */}
            <div className="flex gap-3 overflow-x-auto md:flex-col md:overflow-visible">
              {gallery.map((u, i) => (
                <button
                  key={`${u}-${i}`}
                  type="button"
                  onClick={() => setImgIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`h-20 w-16 shrink-0 border transition-opacity ${i === imgIdx ? 'border-black' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            {/* Main image */}
            <div className="group relative aspect-[3/4] flex-1 overflow-hidden bg-neutral-100">
              <img
                src={gallery[imgIdx] || gallery[0] || FALLBACK}
                alt={`${name} — view ${imgIdx + 1}`}
                loading="eager"
                onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Open fullscreen"
                className="absolute right-4 top-4 bg-white/90 p-3 opacity-0 transition group-hover:opacity-100 hover:bg-white"
              >
                <Maximize2 size={16} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                aria-label="Previous image"
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-md transition-all duration-300 group-hover:opacity-100 hover:scale-105 hover:bg-white"
              >
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                aria-label="Next image"
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-md transition-all duration-300 group-hover:opacity-100 hover:scale-105 hover:bg-white"
              >
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — sticky buy box */}
        <div className="lg:col-span-5">
          <div className="space-y-6 lg:sticky lg:top-28 lg:h-fit">
            <div>
              <span className="text-[12px] font-medium uppercase tracking-[0.15em] text-neutral-500">
                {p.categoryName || p.categorySlug?.replace(/-/g, ' ') || 'HUSHAE'}
              </span>
              {/* Luxury geometric UPPERCASE title — exact reference: 17/20px,
                  regular weight, wide 0.16em tracking, relaxed leading. */}
              <h1 className="mt-2 text-[17px] font-normal uppercase leading-relaxed tracking-[0.16em] text-[#111111] md:text-[20px]">{name}</h1>
              <div id="reviews-link" className="mt-4 flex items-center gap-2">
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

            {/* Price row — geometric light price (reference: 16/18px, light, 0.08em) */}
            <div className="flex items-baseline gap-3 border-y border-neutral-200 py-4">
              <span className="text-[16px] font-light tracking-[0.08em] text-[#111111] md:text-[18px]">{pkr(p.price)}</span>
              {onSale && p.compareAtPrice > p.price && (
                <>
                  <span className="text-sm text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
                  <span className="bg-black px-2 py-1 text-[10px] font-bold uppercase text-white">Save {discount}%</span>
                </>
              )}
            </div>

            {/* Description + Read More */}
            <div className="text-sm leading-relaxed text-neutral-600">
              <p>{desc}</p>
              {p.description && p.description !== p.shortDescription && (
                <button
                  type="button"
                  onClick={() => setReadMore(!readMore)}
                  className="mt-2 text-[11px] font-medium uppercase tracking-[0.15em] text-black underline"
                >
                  {readMore ? 'Read Less' : 'Read More'}
                </button>
              )}
            </div>

            {/* Colour */}
            {p.colors?.length > 0 && (
              <div className="space-y-3">
                <div className="text-[12px] font-medium uppercase tracking-[0.15em]">
                  Color: <span className="font-normal text-neutral-500">{color}</span>
                </div>
                <div className="flex gap-4">
                  {p.colors.map((c) => {
                    const on = color === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColor(c.name)}
                        title={c.name}
                        aria-label={c.name}
                        className={`h-9 w-9 rounded-full transition ${on ? 'scale-105 ring-2 ring-black ring-offset-2' : 'hover:scale-105'}`}
                        style={{ backgroundColor: c.hex || '#EEEEEE' }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size */}
            {needsSize && (
              <div ref={sizeRef} className="space-y-3">
                <div className="flex items-center justify-between text-[12px] font-medium uppercase tracking-[0.15em]">
                  <span>Size: <span className="font-normal text-neutral-500">{size || 'Select Size'}</span></span>
                  <button type="button" onClick={() => setGuideOpen(true)} className="underline text-neutral-500 hover:text-black transition-colors">Size Guide</button>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {p.sizes.map((s) => {
                    const on = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setSize(s); setSizeErr(false); }}
                        aria-pressed={on}
                        className={`h-12 border text-[12px] font-normal uppercase tracking-[0.1em] transition-colors ${
                          on ? 'border-black bg-black text-white' : 'border-neutral-300 bg-white text-black hover:border-black'
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

            {/* Qty + Add To Cart + Heart */}
            <div className="flex gap-3">
              <div className="flex h-12 w-32 items-center justify-between border border-neutral-300 bg-white px-3">
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
                className={`flex h-12 flex-1 items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                  soldOut || (needsSize && !size) ? 'cursor-not-allowed bg-neutral-200 text-neutral-500' : 'bg-black text-white hover:bg-neutral-800'
                }`}
              >
                <ShoppingBag size={16} />
                {soldOut ? 'Sold Out' : needsSize && !size ? 'Select A Size' : 'Add To Cart'}
              </button>
              <button
                type="button"
                onClick={() => toggleWish(p)}
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                className="flex h-12 w-12 items-center justify-center border border-neutral-300 bg-white transition hover:border-black"
              >
                <Heart size={20} className={wished ? 'fill-black text-black' : ''} />
              </button>
            </div>

            {/* Buy It Now */}
            <button
              type="button"
              onClick={() => tryAdd(true)}
              disabled={soldOut || (needsSize && !size)}
              className={`h-12 w-full text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
                soldOut || (needsSize && !size) ? 'cursor-not-allowed bg-neutral-100 text-neutral-400' : 'border border-neutral-300 bg-neutral-100 hover:bg-neutral-200'
              }`}
            >
              Buy It Now
            </button>

            {/* Trust features */}
            <div className="grid grid-cols-2 gap-4 border-t border-neutral-200 pt-5 text-[11px] text-neutral-600">
              {trust.map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon size={16} className="shrink-0 text-black" strokeWidth={1.6} />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Accordions */}
            <AccordionGroup items={accordionItems} />
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

      {/* ═══ YOU MAY ALSO LIKE ════════════════════════════════════════ */}
      {complete.length > 0 && (
        <section className="border-t border-neutral-200 py-16">
          <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
            <h3 className="mb-8 text-xl font-light uppercase tracking-widest">You May Also Like</h3>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {complete.slice(0, 4).map((pr) => <CollectionCard key={pr._id} product={pr} variant="pill" />)}
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

      {/* ═══ QUESTIONS & ANSWERS ══════════════════════════════════════ */}
      <section className="border-t border-neutral-200 py-16">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-12">
          <ProductQA product={p} />
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
