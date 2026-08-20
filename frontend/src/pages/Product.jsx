import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Heart,
  Package, RotateCcw, ShieldCheck, Star, Truck, X, Sparkles, Check
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

/* ============================================================================
 * HUSHAE Product Details — Pure Editorial Luxury PDP (Calvin Klein / SKIMS)
 *
 * SPECIFICATION:
 *   - Pure White (#FFFFFF) seamless canvas throughout (no mismatched beige splits)
 *   - Balanced 12-Column Grid (7-col Gallery / 5-col Sticky Details)
 *   - 3:4 Studio Photography with Minimal Fullscreen Lightbox
 *   - Precision Size Selector with Live Stock & Fit Studio Link
 *   - Pakistan Luxury Assurance Box (4 Pillars)
 *   - Native Minimalist Accordions & Clean Curated Recommendations
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');
const nameOf = (p) => titleCase(displayName(p?.name));

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F8F8F8"/><text x="50%" y="50%" fill="#CCCCCC" font-family="Jost,sans-serif" font-size="14" letter-spacing="3" text-anchor="middle">HUSHAE</text></svg>'
  );

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
  const [complete, setComplete] = useState([]);

  const ctaRef = useRef(null);
  const sizeRef = useRef(null);

  useEffect(() => {
    setP(null);
    setErr(false);
    setSize('');
    setColor('');
    setQty(1);
    setSizeErr(false);
    setImgIdx(0);
    setLightboxOpen(false);
    setReadMore(false);
    setComplete([]);

    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors?.[0]?.name || '');
        pushRecent(d.product);
      })
      .catch(() => setErr(true));
  }, [slug]); // eslint-disable-line

  /* Curated related products */
  useEffect(() => {
    if (!p) return;
    let alive = true;
    api(`/products?category=${p.categorySlug}&limit=4&sort=popular`)
      .then((x) => {
        if (alive) setComplete((x.products || []).filter((pr) => pr.slug !== p.slug).slice(0, 4));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [p]);

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
      <div className="mx-auto max-w-[1440px] px-6 pt-[140px] pb-24 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-neutral-100 text-neutral-400"><Package size={22} /></span>
        <h1 className="mt-6 text-2xl font-light uppercase tracking-wide text-black">This piece has moved on</h1>
        <p className="mx-auto mt-2 max-w-sm text-xs text-neutral-500">It may be sold out or no longer part of the edit.</p>
        <Link to="/shop" className="inline-flex min-h-[44px] items-center justify-center bg-black px-8 text-xs font-medium uppercase tracking-widest text-white mt-6 hover:bg-neutral-800 transition-colors">
          Browse All Pieces
        </Link>
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
    if (soldOut) return { tone: 'red', text: 'Out of Stock' };
    if (p.stock <= 5) return { tone: 'amber', text: `Only ${p.stock} pieces remaining` };
    return { tone: 'green', text: 'In Stock · Ready to dispatch' };
  };

  const accordionItems = [
    {
      title: 'Details & Fabric Composition',
      content: (
        <ul className="space-y-1.5 text-xs text-neutral-600 font-light">
          <li><span className="font-normal text-black">Fabric:</span> {p.fabric || 'Premium Micro-Modal Stretch Blend'}</li>
          <li><span className="font-normal text-black">Fit:</span> Tailored second-skin fit — true to size</li>
          <li><span className="font-normal text-black">Color:</span> {color || 'Onyx'}</li>
          <li><span className="font-normal text-black">SKU:</span> {p.sku || p.slug}</li>
        </ul>
      ),
    },
    {
      title: 'Delivery & Discreet Packaging',
      content: (
        <p className="text-xs text-neutral-600 font-light leading-relaxed">
          Dispatched in 24 hours. Delivered nationwide across Pakistan in 2–4 business days via express courier.
          100% unmarked, plain, tamper-proof outer packaging guaranteed.
        </p>
      ),
    },
    {
      title: '14-Day Exchanges & Care',
      content: (
        <p className="text-xs text-neutral-600 font-light leading-relaxed">
          14-day size exchange policy on all unworn pieces. Machine wash cold on gentle cycle, lay flat to dry to preserve elasticity.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] pt-[130px] pb-20 font-sans text-[#111111] antialiased">
      <Seo
        title={`${name} — HUSHAE`}
        description={p.shortDescription || p.description?.slice(0, 160) || `${name} — premium innerwear from HUSHAE. PKR ${p.price}. COD available nationwide.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* ═══ MAIN 12-COLUMN LUXURY PRODUCT CONTAINER ════════════════════ */}
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 md:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">

          {/* ── LEFT: EDITORIAL GALLERY (7 COLUMNS) ─────────────────────── */}
          <div className="space-y-4 lg:col-span-7">
            {/* Primary Portrait Photo */}
            <div className="group relative aspect-[3/4] w-full overflow-hidden bg-[#F8F8F8]">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`View ${name} fullscreen`}
                className="block h-full w-full cursor-zoom-in"
              >
                <img
                  src={gallery[imgIdx] || gallery[0] || FALLBACK}
                  alt={`${name} — view ${imgIdx + 1}`}
                  loading="eager"
                  decoding="async"
                  onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                  className="h-full w-full object-cover object-center transition-all duration-300"
                />
              </button>

              {/* Gallery Hairline Arrows */}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                    aria-label="Previous photo"
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-black/60 hover:text-black transition-colors"
                  >
                    <ChevronLeft size={28} strokeWidth={1.2} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                    aria-label="Next photo"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-black/60 hover:text-black transition-colors"
                  >
                    <ChevronRight size={28} strokeWidth={1.2} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation Strip */}
            {gallery.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pt-1">
                {gallery.map((u, idx) => (
                  <button
                    key={`${u}-${idx}`}
                    type="button"
                    onClick={() => setImgIdx(idx)}
                    aria-label={`View photo ${idx + 1}`}
                    className={`relative aspect-[3/4] w-20 shrink-0 overflow-hidden bg-[#F8F8F8] transition-all ${
                      idx === imgIdx
                        ? 'ring-1 ring-black opacity-100'
                        : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={u}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover object-center"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: STICKY PURCHASE DETAILS (5 COLUMNS) ──────────────── */}
          <div className="lg:col-span-5">
            <div ref={ctaRef} className="lg:sticky lg:top-[120px] space-y-6">

              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.2em] text-neutral-400">
                <Link to="/" className="hover:text-black transition-colors">Home</Link>
                <span>/</span>
                <Link to={`/${p.gender}`} className="capitalize hover:text-black transition-colors">{p.gender}</Link>
                <span>/</span>
                <Link to={`/category/${p.categorySlug}`} className="capitalize hover:text-black transition-colors">{p.categorySlug.replace(/-/g, ' ')}</Link>
              </nav>

              {/* Title & Price Header */}
              <div className="space-y-2 border-b border-neutral-100 pb-5">
                <h1 className="font-sans text-2xl sm:text-3xl font-light uppercase tracking-tight text-[#000000] leading-tight">
                  {name}
                </h1>

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-xl sm:text-2xl font-medium text-[#000000]">
                    {pkr(p.price)}
                  </span>
                  {onSale && p.compareAtPrice > p.price && (
                    <span className="text-sm font-light text-neutral-400 line-through">
                      {pkr(p.compareAtPrice)}
                    </span>
                  )}
                  {onSale && p.compareAtPrice > p.price && (
                    <span className="bg-black px-2 py-0.5 text-[9.5px] font-medium uppercase tracking-widest text-white">
                      Save {discount}%
                    </span>
                  )}
                </div>
              </div>

              {/* Color Selector */}
              {p.colors?.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">
                    Color: <span className="text-black font-normal">{color}</span>
                  </span>
                  <div className="flex items-center gap-2.5">
                    {p.colors.map((c) => {
                      const on = color === c.name;
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setColor(c.name)}
                          title={c.name}
                          aria-label={c.name}
                          className={`relative flex h-5 w-5 items-center justify-center rounded-full transition-transform ${
                            on ? 'ring-1 ring-black ring-offset-2 scale-110' : 'hover:scale-105'
                          }`}
                        >
                          <span
                            className="h-full w-full rounded-full border border-black/15"
                            style={{ backgroundColor: c.hex || '#EEEEEE' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector & Fit Guide Link */}
              {needsSize && (
                <div ref={sizeRef} className="space-y-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-widest">
                    <span className="text-neutral-500 font-medium">Select Size</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setGuideOpen(true)}
                        className="text-neutral-500 underline underline-offset-4 hover:text-black transition-colors"
                      >
                        Size Guide
                      </button>
                      <span className="text-neutral-300">·</span>
                      <Link
                        to="/fit-finder"
                        className="text-black font-medium underline underline-offset-4 hover:opacity-70 transition-opacity"
                      >
                        Fit Studio &rarr;
                      </Link>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {p.sizes.map((s) => {
                      const on = size === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => { setSize(s); setSizeErr(false); }}
                          className={`h-11 min-w-[48px] px-3 border text-xs font-medium uppercase tracking-wider transition-colors ${
                            on
                              ? 'border-black bg-black text-white'
                              : 'border-neutral-200 bg-white text-black hover:border-black'
                          }`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stock Availability */}
                  {(() => {
                    const st = stockState();
                    const dot = st.tone === 'green' ? 'bg-emerald-500' : st.tone === 'amber' ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div className="flex items-center gap-2 text-xs text-neutral-600 pt-1 font-light">
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                        <span>{needsSize && !size ? 'Choose your size to confirm dispatch.' : st.text}</span>
                      </div>
                    );
                  })()}

                  {sizeErr && !size && (
                    <p className="flex items-center gap-1.5 text-xs text-red-600 pt-1">
                      <AlertCircle size={13} /> Please select your size before adding to bag.
                    </p>
                  )}
                </div>
              )}

              {/* Short Scannable Description */}
              <div className="space-y-1.5 pt-1 text-xs sm:text-[13px] text-neutral-600 font-light leading-relaxed">
                <p>{desc}</p>
                {p.description && p.description !== p.shortDescription && (
                  <button
                    type="button"
                    onClick={() => setReadMore(!readMore)}
                    className="text-xs font-normal text-black underline underline-offset-4 hover:opacity-60 transition-opacity"
                  >
                    {readMore ? 'Read Less' : 'Read Full Description'}
                  </button>
                )}
              </div>

              {/* Primary Action & Wishlist */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => tryAdd(false)}
                  disabled={soldOut || (needsSize && !size)}
                  className={`flex h-12 w-full items-center justify-center text-xs font-medium uppercase tracking-[0.2em] transition-colors ${
                    soldOut || (needsSize && !size)
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-[#000000] text-[#FFFFFF] hover:bg-neutral-800'
                  }`}
                >
                  {soldOut ? 'Sold Out' : needsSize && !size ? 'Select a Size' : 'Add to Bag'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleWish(p)}
                  className="flex h-11 w-full items-center justify-center gap-2 border border-neutral-200 text-xs font-medium uppercase tracking-[0.18em] text-black hover:border-black transition-colors"
                >
                  <Heart size={14} className={wished ? 'fill-black text-black' : ''} />
                  <span>{wished ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                </button>
              </div>

              {/* Pakistan Luxury Assurance Box (4 Pillars) */}
              <div className="grid grid-cols-2 gap-3.5 border-y border-neutral-100 py-5 text-[11px] text-neutral-700">
                <div className="flex items-center gap-2.5">
                  <Truck size={15} className="shrink-0 text-black" />
                  <span>Express 2–4 Days Nationwide</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className="shrink-0 text-black" />
                  <span>100% Plain Discreet Parcel</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <RotateCcw size={15} className="shrink-0 text-black" />
                  <span>14-Day Size Exchange</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Package size={15} className="shrink-0 text-black" />
                  <span>Cash on Delivery Available</span>
                </div>
              </div>

              {/* Native Editorial Accordions */}
              <div className="divide-y divide-neutral-100 border-b border-neutral-100">
                {accordionItems.map((item) => (
                  <details key={item.title} className="group py-3.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium uppercase tracking-wider text-black">
                      <span>{item.title}</span>
                      <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-neutral-400" />
                    </summary>
                    <div className="pt-3 pb-1">
                      {item.content}
                    </div>
                  </details>
                ))}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ═══ BELOW THE FOLD: COMPLETE THE LOOK / CURATED PICKS ═══════════ */}
      {complete.length > 0 && (
        <section className="mt-24 border-t border-neutral-100 pt-16 md:pt-20">
          <div className="mx-auto max-w-[1600px] px-6 sm:px-8 md:px-12">
            <div className="mb-10 text-center">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-400">
                CURATED COMPLEMENTS
              </p>
              <h3 className="mt-2 text-2xl font-light uppercase tracking-wide text-black">
                Complete the Look
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
              {complete.map((pr) => (
                <CollectionCard key={pr._id || pr.slug} product={pr} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CUSTOMER REVIEWS SECTION ═══════════════════════════════════ */}
      <section id="reviews" className="mt-20 border-t border-neutral-100 pt-16 md:pt-20">
        <div className="mx-auto max-w-[1400px] px-6 sm:px-8 md:px-12">
          <ProductReviews product={p} />
        </div>
      </section>

      {/* Mobile Sticky Buy Bar */}
      <StickyBuyBar
        product={p}
        watchRef={ctaRef}
        size={size}
        needsSize={needsSize}
        onAdd={() => tryAdd(false)}
        disabled={soldOut}
        thumb={p.images?.[0]?.url}
      />

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 p-6">
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
            className="absolute right-6 top-6 text-white p-2"
          >
            <X size={24} />
          </button>
          <img
            src={gallery[imgIdx] || gallery[0]}
            alt=""
            className="max-h-[85vh] max-w-full object-contain"
          />
          {gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                aria-label="Previous"
                className="absolute left-6 p-4 text-white hover:opacity-70"
              >
                <ChevronLeft size={36} strokeWidth={1.2} />
              </button>
              <button
                type="button"
                onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                aria-label="Next"
                className="absolute right-6 p-4 text-white hover:opacity-70"
              >
                <ChevronRight size={36} strokeWidth={1.2} />
              </button>
            </>
          )}
        </div>
      )}

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}
