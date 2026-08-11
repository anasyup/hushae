import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Package } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';
import { isVideo } from '../lib/media';
import CollectionCard from '../components/CollectionCard';
import ProductRow from '../components/ProductRow';
import ProductReviews from '../components/ProductReviews';
import ProductQA from '../components/reviews/ProductQA';
import SizeGuideModal from '../components/SizeGuideModal';
import { ProductSkeleton } from '../components/Skeletons';
import Seo, { productJsonLd } from '../components/Seo';
import StickyBuyBar from './product/StickyBuyBar';

/* ============================================================================
 * HUSHAE Product Details — exact client reference (John Lewis ANYDAY PDP).
 *   · breadcrumb (12px #777) · bg #fcfbf9
 *   · hero grid 1fr 1fr gap 50 (max-w 1400, 20/30/60 padding)
 *   · LEFT: main 3/4 image + thumbnail strip (80px, active black border)
 *   · RIGHT: brand tag · title 32/400 (NOT uppercase) · price row
 *     (26/600 + old 16 + gold-star rating badge) · desc · colour 32px ·
 *     size 6-col + "View Size Chart" · TWO CTAs (Add To Cart white outline
 *     + Buy Now black)
 *   · tabs: Product Reviews (full component) / Description / Additional Info
 *   · bottom: Related Products 4-col (pill cards) + View All
 * Recently viewed + sticky purchase bar kept.
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');
const nameOf = (p) => titleCase(displayName(p?.name));

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F4EFE9"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const TABS = [
  ['reviews', 'Product Reviews'],
  ['description', 'Description'],
  ['info', 'Additional Info'],
];

export default function Product() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { addToCart, pushRecent, recent, settings } = useApp();
  const rvCfg = settings?.customerExperience?.recentlyViewed || {};

  const [p, setP] = useState(null);
  const [err, setErr] = useState(false);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [sizeErr, setSizeErr] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);
  const [tab, setTab] = useState('reviews');
  const [bundle, setBundle] = useState([]);
  const [complete, setComplete] = useState([]); // "Related Products" — never empty

  const ctaRef = useRef(null);
  const sizeRef = useRef(null);

  useEffect(() => {
    setP(null); setErr(false); setSize(''); setColor(''); setSizeErr(false); setImgIdx(0); setTab('reviews'); setBundle([]); setComplete([]);
    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors?.[0]?.name || '');
        pushRecent(d.product);
      })
      .catch(() => setErr(true));
  }, [slug]); // eslint-disable-line

  /* Merchant bundle → the first "Related Products" source. */
  useEffect(() => {
    if (!p?.bundleSlug) { setBundle([]); return; }
    let alive = true;
    api(`/products?category=${p.bundleSlug}&limit=3&sort=popular`)
      .then((x) => { if (alive) setBundle(x.products || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [p]);

  /* ── "Related Products" — the section must NEVER sit empty.
     Priority: merchant bundle → same-category picks. */
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

  /* Gallery = plain images from the media list (videos fall back to image). */
  const gallery = useMemo(() => {
    const imgs = (media || []).filter((m) => m.t === 'img').map((m) => m.url).filter(Boolean);
    if (imgs.length) return imgs;
    const first = media?.[0]?.url || p?.image || '';
    return first ? [first] : [];
  }, [media, p]);

  if (err) {
    return (
      <div className="mx-auto max-w-[1400px] px-5 py-24 text-center">
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
  const rating = Number(p.ratingAvg || 0);
  const current = gallery[imgIdx] || gallery[0] || FALLBACK;

  const tryAdd = (goToCheckout = false) => {
    if (needsSize && !size) {
      setSizeErr(true);
      sizeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      sizeRef.current?.querySelector('button')?.focus();
      return;
    }
    addToCart(p, { size, color });
    if (goToCheckout) nav('/checkout');
  };

  const ctaDisabled = soldOut || (needsSize && !size);
  const ctaLabel = soldOut ? 'Sold Out' : needsSize && !size ? 'Select Size' : null;

  return (
    <div className="bg-[#fcfbf9] text-[#1a1a1a]">
      <Seo
        title={name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${name} — premium innerwear from HUSHAE. PKR ${p.price}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* ═══ BREADCRUMB ═════════════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[1400px] px-6 pb-2.5 pt-5 text-[12px] text-[#777777]">
        <Link to="/" className="transition hover:text-black">Homepage</Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <Link to={`/${p.gender}`} className="capitalize transition hover:text-black">{p.gender}</Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <Link to={`/category/${p.categorySlug}`} className="capitalize transition hover:text-black">{p.categorySlug.replace(/-/g, ' ')}</Link>
        <span className="mx-1.5" aria-hidden="true">/</span>
        <strong>{name}</strong>
      </nav>

      {/* ═══ PRODUCT HERO — 1fr / 1fr ════════════════════════════════ */}
      <div className="mx-auto max-w-[1400px] px-6 pb-[60px] pt-5">
        <div className="grid grid-cols-1 gap-[30px] lg:grid-cols-2 lg:gap-[50px]">
          {/* LEFT — main image + thumbnails */}
          <div className="flex flex-col gap-4">
            <div className="relative w-full overflow-hidden bg-[#f4efe9]" style={{ aspectRatio: '3 / 4' }}>
              <img
                src={current}
                alt={`${name} — view ${imgIdx + 1}`}
                loading="eager"
                onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                className="h-full w-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-3">
                {gallery.map((u, i) => (
                  <button
                    key={`${u}-${i}`}
                    type="button"
                    onClick={() => setImgIdx(i)}
                    aria-label={`View image ${i + 1}`}
                    aria-pressed={i === imgIdx}
                    className={`w-20 shrink-0 overflow-hidden border bg-[#f4efe9] transition-colors duration-200 ${i === imgIdx ? 'border-black' : 'border-transparent hover:border-[#999999]'}`}
                    style={{ aspectRatio: '3 / 4' }}
                  >
                    <img src={u} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — product info */}
          <div className="flex flex-col gap-[18px]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[1px] text-[#888888]">HUSHAE Essentials</p>
              <h1 className="mt-1 text-[32px] font-normal normal-case leading-[1.2] tracking-[-0.5px] text-[#1a1a1a]">
                {name}
              </h1>
            </div>

            {/* Price + rating row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eeeeee] pb-[15px]">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[26px] font-semibold text-[#111111]">{soldOut ? 'Sold out' : pkr(p.price)}</span>
                {onSale && p.compareAtPrice > p.price && (
                  <span className="text-[16px] text-[#999999] line-through">{pkr(p.compareAtPrice)}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {rating > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-[20px] bg-[#f4f4f4] px-2.5 py-1 text-[13px] font-medium text-[#111111]">
                    <span className="text-[#d4af37]" aria-hidden="true">★</span> {rating.toFixed(1)}
                  </span>
                )}
                <span className="text-[12px] text-[#666666]">{p.stock > 0 ? 'In stock' : 'Out of stock'}</span>
              </div>
            </div>

            <p className="text-[13px] leading-[1.6] text-[#555555]">
              {p.shortDescription || p.description}
            </p>

            {/* Colour — 32px swatches */}
            {p.colors?.length > 0 && (
              <div>
                <span className="mb-2 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.5px]">Color: {color}</span>
                <div className="flex gap-2.5">
                  {p.colors.map((c) => {
                    const on = color === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColor(c.name)}
                        aria-pressed={on}
                        aria-label={c.name}
                        className={`h-8 w-8 rounded-full border border-[#dddddd] transition-all duration-200 ${
                          on ? 'outline outline-2 outline-black outline-offset-2' : 'hover:outline hover:outline-1 hover:outline-black/50'
                        }`}
                        style={{ backgroundColor: c.hex || '#EEEEEE' }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size — 6-col grid + size chart */}
            {needsSize && (
              <div ref={sizeRef}>
                <span className="mb-2 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.5px]">
                  Size: {size || 'Select'}
                  <button type="button" onClick={() => setGuideOpen(true)} className="text-[11px] font-normal normal-case tracking-normal text-[#666666] underline underline-offset-2 transition hover:text-black">
                    View Size Chart
                  </button>
                </span>
                <div className="grid grid-cols-6 gap-2">
                  {p.sizes.map((s) => {
                    const on = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setSize(s); setSizeErr(false); }}
                        aria-pressed={on}
                        className={`border bg-white py-2.5 text-center text-[12px] font-medium transition-all duration-200 ${
                          on ? 'border-[#111111] bg-[#111111] text-white' : 'border-[#e2e2e2] text-[#1a1a1a] hover:border-[#111111] hover:bg-[#111111] hover:text-white'
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
              </div>
            )}

            {/* CTA group — Add To Cart + Buy Now */}
            <div className="mt-2.5 flex gap-3">
              <button
                type="button"
                onClick={() => tryAdd(false)}
                disabled={ctaDisabled}
                className={`flex-1 border py-4 text-[12px] font-semibold uppercase tracking-[1px] transition-colors duration-200 ${
                  ctaDisabled ? 'cursor-not-allowed border-[#e2e2e2] bg-[#f7f5f2] text-[#999999]'
                    : 'border-[#111111] bg-white text-[#111111] hover:bg-[#f4f4f4]'
                }`}
              >
                {ctaLabel || 'Add To Cart'}
              </button>
              <button
                type="button"
                onClick={() => tryAdd(true)}
                disabled={ctaDisabled}
                className={`flex-1 border py-4 text-[12px] font-semibold uppercase tracking-[1px] transition-colors duration-200 ${
                  ctaDisabled ? 'cursor-not-allowed border-[#e2e2e2] bg-[#f7f5f2] text-[#999999]'
                    : 'border-[#111111] bg-[#111111] text-white hover:bg-[#333333]'
                }`}
              >
                {ctaLabel || 'Buy Now'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ TABS — Reviews / Description / Additional Info ═══════════ */}
      <section className="mx-auto max-w-[1400px] px-6 pb-10">
        <div className="flex gap-[30px] overflow-x-auto border-b border-[#eeeeee]">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`whitespace-nowrap border-b-2 py-3 text-[14px] font-semibold transition-colors duration-200 ${
                tab === key ? 'border-[#111111] text-[#111111]' : 'border-transparent text-[#888888] hover:text-[#111111]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'reviews' && (
          <div id="reviews" className="scroll-mt-28 pt-8">
            <ProductReviews product={p} />
            <ProductQA product={p} />
          </div>
        )}

        {tab === 'description' && (
          <div className="max-w-3xl pt-8 text-[14px] leading-[1.7] text-[#444444]">
            <p>{p.shortDescription || p.description}</p>
            <h3 className="mt-8 text-[12px] font-semibold uppercase tracking-[1px] text-[#111111]">Fabric</h3>
            <p className="mt-2">{p.fabric}</p>
          </div>
        )}

        {tab === 'info' && (
          <div className="max-w-3xl pt-8 text-[14px] leading-[1.7] text-[#444444]">
            <h3 className="text-[12px] font-semibold uppercase tracking-[1px] text-[#111111]">Care</h3>
            {(p.care || []).length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(p.care || []).map((c) => <li key={c}>{c}</li>)}
              </ul>
            ) : (
              <p className="mt-2">Machine wash cold, gentle cycle. Lay flat to dry. Do not bleach.</p>
            )}
            <h3 className="mt-8 text-[12px] font-semibold uppercase tracking-[1px] text-[#111111]">Shipping &amp; Easy Returns</h3>
            <p className="mt-2">
              Complimentary nationwide shipping on orders over {pkr(settings?.freeShippingThreshold ?? 4999)}.
              Hassle-free 7-day exchanges — for hygiene, innerwear is only returnable if it arrives faulty.
            </p>
          </div>
        )}
      </section>

      {/* ═══ RELATED PRODUCTS ═════════════════════════════════════════ */}
      {complete.length > 0 && (
        <section className="mx-auto mt-[60px] max-w-[1400px] px-6">
          <div className="mb-[25px] flex items-center justify-between">
            <h3 className="text-[20px] font-medium uppercase tracking-[0.5px]">Related Products</h3>
            <Link to="/shop" className="text-[12px] font-semibold uppercase underline underline-offset-4 transition hover:text-[#666666]">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {complete.slice(0, 4).map((pr) => <CollectionCard key={pr._id} product={pr} variant="pill" />)}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <div className="mx-auto mt-[60px] max-w-[1400px] px-6 pb-4">
          <ProductRow eyebrow="Your history" title={rvCfg.title || 'Recently viewed'} products={recent.filter((r) => r.slug !== p.slug).slice(0, 8)} />
        </div>
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

      <SizeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} gender={p.gender} isBra={isBra} />
    </div>
  );
}
