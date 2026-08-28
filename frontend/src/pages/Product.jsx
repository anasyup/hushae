import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Heart,
  Package, RotateCcw, ShieldCheck, Truck, X, Sparkles, Check
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
 * HUSHAE Product Details — Full-Bleed Luxury Flagship (Calvin Klein / SSENSE)
 *
 * SPECIFICATION:
 *   - Edge-to-Edge Full Width Architecture (Zero left/right dead space)
 *   - Left: 7-Col Flush Editorial Photography Stack (No left gap)
 *   - Right: 5-Col Sticky Purchase Column with Balanced Interior Padding
 *   - Natural 20-22px Title Typography & Unobtrusive Jet Black Add to Bag
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

  const [p, setP] = useState(null);
  const [metaDefs, setMetaDefs] = useState([]);
  const [err, setErr] = useState(false);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [sizeErr, setSizeErr] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [complete, setComplete] = useState([]);

  const ctaRef = useRef(null);
  const sizeRef = useRef(null);

  useEffect(() => {
    api('/settings').then((d) => setMetaDefs(d.settings?.metafields || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setP(null);
    setErr(false);
    setSize('');
    setColor('');
    setQty(1);
    setSizeErr(false);
    setImgIdx(0);
    setLightboxOpen(false);
    setComplete([]);

    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors?.[0]?.name || '');
        pushRecent(d.product);
      })
      .catch(() => setErr(true));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  const discount = onSale && p.compareAtPrice > p.price
    ? Math.round((1 - p.price / p.compareAtPrice) * 100)
    : 0;

  const tryAdd = (goToCheckout = false) => {
    if (needsSize && !size) {
      setSizeErr(true);
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    addToCart(p, { size, color, quantity: qty });
    if (goToCheckout) nav('/checkout');
  };

  const stockState = () => {
    if (soldOut) return { tone: 'red', text: 'Out of Stock' };
    if (p.stock <= 5) return { tone: 'amber', text: 'Low Stock' };
    return { tone: 'green', text: 'In Stock · Dispatched in 24 Hours' };
  };

  const accordionItems = [
    {
      title: 'Fabric & Fit Details',
      content: (
        <ul className="space-y-2 text-xs text-neutral-600 font-light">
          <li><span className="font-medium text-black">Material:</span> {p.fabric || '95% Lenzing Micro-Modal, 5% Elastane'}</li>
          {metaDefs.filter((d) => d.showOnPDP !== false && p.meta && p.meta[d.id] !== undefined && p.meta[d.id] !== '' && p.meta[d.id] !== false).map((d) => (
            <li key={d.id}><span className="font-medium text-black">{d.name}:</span> {d.type === 'boolean' ? 'Yes' : String(p.meta[d.id])}</li>
          ))}
          <li><span className="font-medium text-black">Fit:</span> Second-skin tailored regular fit — runs true to size</li>
          <li><span className="font-medium text-black">Colorway:</span> {color || 'Classic'}</li>
          <li><span className="font-medium text-black">SKU:</span> {p.sku || p.slug}</li>
        </ul>
      ),
    },
    {
      title: 'Delivery & Discreet Packaging',
      content: (
        <p className="text-xs text-neutral-600 font-light leading-relaxed">
          Express Courier Delivery across Pakistan in 2–4 business days. Free shipping on orders above PKR 4,999.
          Every parcel is dispatched in a plain, unmarked outer box with zero product markings.
        </p>
      ),
    },
    {
      title: '14-Day Exchanges',
      content: (
        <p className="text-xs text-neutral-600 font-light leading-relaxed">
          Unworn pieces with original packaging are eligible for size exchanges within 14 days. Wash cold on gentle cycle and dry flat.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] pt-0 pb-24 font-sans text-[#111111] antialiased">
      <Seo
        title={`${name} — HUSHAE`}
        description={p.shortDescription || p.description?.slice(0, 160) || `${name} — premium innerwear from HUSHAE. PKR ${p.price}. COD available nationwide.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* ═══ FULL-BLEED 12-COLUMN EDGE-TO-EDGE CONTAINER (NO SIDE GAPS) ═══ */}
      <div className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen">

          {/* ── LEFT: FULL-BLEED FLUSH EDITORIAL GALLERY (FLOWS BEHIND HEADER) ── */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-7 bg-[#F6F6F6] p-0 m-0">
            {/* Edge-to-Edge Vertical Photo Stack */}
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1 w-full">
              {gallery.map((imgUrl, idx) => (
                <div
                  key={`${imgUrl}-${idx}`}
                  className="relative aspect-[3/4] w-full overflow-hidden bg-[#F6F6F6] cursor-zoom-in"
                  onClick={() => { setImgIdx(idx); setLightboxOpen(true); }}
                >
                  <img
                    src={imgUrl || FALLBACK}
                    alt={`${name} — angle ${idx + 1}`}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                    className="h-full w-full object-cover object-center transition-opacity duration-300 hover:opacity-95"
                  />
                  {idx === 0 && onSale && p.compareAtPrice > p.price && (
                    <span className="absolute left-4 top-28 bg-black px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] text-white z-10">
                      Sale
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: STICKY PURCHASE DETAILS (5 COLUMNS) ──────────────── */}
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-5 bg-white px-6 sm:px-10 md:px-14 lg:px-14 xl:px-20 pt-28 lg:pt-32 pb-12 flex flex-col justify-start">
            <div ref={ctaRef} className="lg:sticky lg:top-[124px] space-y-6 max-w-lg w-full">

              {/* Department Breadcrumb */}
              <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-neutral-400">
                <Link to="/" className="hover:text-black transition-colors">Home</Link>
                <span>/</span>
                <Link to={`/${p.gender}`} className="capitalize hover:text-black transition-colors">{p.gender}</Link>
                <span>/</span>
                <Link to={`/category/${p.categorySlug}`} className="capitalize hover:text-black transition-colors">{p.categorySlug.replace(/-/g, ' ')}</Link>
              </nav>

              {/* Title & Price Header */}
              <div className="space-y-1.5 border-b border-neutral-100 pb-5">
                <h1 className="font-sans text-[20px] md:text-[22px] font-normal text-[#000000] tracking-[-0.01em] leading-snug">
                  {name}
                </h1>

                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-[17px] md:text-[18px] font-medium text-[#000000]">
                    {pkr(p.price)}
                  </span>
                  {onSale && p.compareAtPrice > p.price && (
                    <span className="text-[13px] font-light text-neutral-400 line-through">
                      {pkr(p.compareAtPrice)}
                    </span>
                  )}
                  {onSale && p.compareAtPrice > p.price && (
                    <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-800">
                      ({discount}% Off)
                    </span>
                  )}
                </div>
              </div>

              {/* Color Swatches */}
              {p.colors?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>Color: <strong className="font-medium text-black">{color}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
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

              {/* Size Selector */}
              {needsSize && (
                <div ref={sizeRef} className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">Size: <strong className="font-medium text-black">{size || 'Select'}</strong></span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setGuideOpen(true)}
                        className="text-[11px] text-neutral-500 underline underline-offset-4 hover:text-black transition-colors"
                      >
                        Size Guide
                      </button>
                      <span className="text-neutral-300">·</span>
                      <Link
                        to="/fit-finder"
                        className="text-[11px] font-medium text-black underline underline-offset-4 hover:opacity-70 transition-opacity"
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
                          className={`h-10 min-w-[44px] px-3.5 border text-xs font-normal uppercase tracking-wider transition-all ${
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
                      <div className="flex items-center gap-2 text-[11.5px] text-neutral-500 pt-1 font-light">
                        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                        <span>{needsSize && !size ? 'Select your size' : st.text}</span>
                      </div>
                    );
                  })()}

                  {sizeErr && !size && (
                    <p className="flex items-center gap-1.5 text-xs text-red-600 pt-0.5">
                      <AlertCircle size={13} /> Please choose a size to add to bag.
                    </p>
                  )}
                </div>
              )}

              {/* Short Description */}
              <div className="pt-1 text-[13px] text-neutral-600 font-light leading-relaxed">
                <p>{p.shortDescription || p.description}</p>
              </div>

              {/* Primary Action Button */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => tryAdd(false)}
                  disabled={soldOut || (needsSize && !size)}
                  className={`flex h-[50px] w-full items-center justify-center text-xs font-medium uppercase tracking-[0.2em] transition-colors ${
                    soldOut || (needsSize && !size)
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                      : 'bg-[#000000] text-[#FFFFFF] hover:bg-neutral-800'
                  }`}
                >
                  {soldOut ? 'Sold Out' : needsSize && !size ? 'Select Size to Order' : 'Add to Bag'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleWish(p)}
                  className="flex h-10 w-full items-center justify-center gap-2 border border-neutral-200 text-xs font-normal uppercase tracking-[0.15em] text-neutral-700 hover:border-black hover:text-black transition-colors"
                >
                  <Heart size={13} className={wished ? 'fill-black text-black' : ''} />
                  <span>{wished ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                </button>
              </div>

              {/* Discreet Packaging & Delivery Reassurance Strip */}
              <div className="space-y-2 border-y border-neutral-100 py-4 text-[11.5px] text-neutral-600 font-light">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={14} className="text-black shrink-0" />
                  <span>Discreet Packaging Guaranteed</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck size={14} className="text-black shrink-0" />
                  <span>Express Delivery (2–4 Days)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <RotateCcw size={14} className="text-black shrink-0" />
                  <span>14-Day Size Exchanges</span>
                </div>
              </div>

              {/* Expandable Accordions */}
              <div className="divide-y divide-neutral-100 border-b border-neutral-100">
                {accordionItems.map((item) => (
                  <details key={item.title} className="group py-3.5">
                    <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-normal uppercase tracking-wider text-black">
                      <span>{item.title}</span>
                      <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-neutral-400" />
                    </summary>
                    <div className="pt-2.5 pb-1">
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
                RECOMMENDED EDITS
              </p>
              <h3 className="mt-2 text-2xl font-light uppercase tracking-wide text-black">
                Complete the Look
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-7 md:gap-8">
              {complete.map((pr) => (
                <CollectionCard key={pr._id || pr.slug} product={pr} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══ CUSTOMER REVIEWS SECTION ═══════════════════════════════════ */}
      <section id="reviews" className="mt-20 border-t border-neutral-100 pt-16 md:pt-20">
        <div className="mx-auto max-w-[1300px] px-6 sm:px-8 md:px-12">
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
