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
import { ProductSkeleton } from '../components/Skeletons';
import Seo, { productJsonLd } from '../components/Seo';
import StickyBuyBar from './product/StickyBuyBar';
import Accordion from './product/Accordion';

/* ============================================================================
 * HUSHAE Product Details — exact client reference ("Hushae - Product Details
 * Page").
 *   · max-w 1400, padding 40px 20px, grid 1.2fr / 0.8fr gap 60
 *   · LEFT: 2×2 image grid (3/4, #f6f6f6)
 *   · RIGHT: sticky buy box (top 90px, gap 20):
 *       title 26/400/-0.5px UPPERCASE · price 18/500 + struck old
 *       color swatches 28px (selected = 2px black ring)
 *       size grid 5-col (selected = black fill) + Size Guide link
 *       Add To Bag — full-width black, 13/600 ls 1px uppercase
 *       3 accordions: Product Description / Fabric & Care / Shipping & Returns
 *   · bottom: "Complete The Look" 4-col grid (2 on mobile)
 * Reviews, QA, recently viewed and the sticky purchase bar are kept below.
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');
const nameOf = (p) => titleCase(displayName(p?.name));

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F3EDE2"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

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
  const [bundle, setBundle] = useState([]);
  const [complete, setComplete] = useState([]); // "Pairs Well With" — never empty

  const ctaRef = useRef(null);
  const sizeRef = useRef(null);

  useEffect(() => {
    setP(null); setErr(false); setSize(''); setColor(''); setSizeErr(false); setBundle([]); setComplete([]);
    api(`/products/${slug}`)
      .then((d) => {
        setP(d.product);
        setColor(d.product.colors?.[0]?.name || '');
        pushRecent(d.product);
      })
      .catch(() => setErr(true));
  }, [slug]); // eslint-disable-line

  /* Merchant bundle → the first "Complete the Look" source. */
  useEffect(() => {
    if (!p?.bundleSlug) { setBundle([]); return; }
    let alive = true;
    api(`/products?category=${p.bundleSlug}&limit=3&sort=popular`)
      .then((x) => { if (alive) setBundle(x.products || []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [p]);

  /* ── "Complete the Look" — the section must NEVER sit empty.
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

  const needsSize = (p.sizes || []).length > 0;
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const name = nameOf(p);

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

  return (
    <div className="bg-[#fbf9f5] text-[#1a1a1a]">
      <Seo
        title={name}
        description={p.shortDescription || p.description?.slice(0, 160) || `${name} — premium innerwear from HUSHAE. PKR ${p.price}. ${p.stock > 0 ? 'In stock' : 'Out of stock'}. COD available.`}
        image={p.images?.[0]?.url}
        canonical={`/product/${p.slug}`}
        jsonLd={productJsonLd(p, typeof window !== 'undefined' ? window.location.origin : '')}
        jsonLdId="product"
      />

      {/* ═══ PDP — 1.1fr / 0.9fr split ═════════════════════════════════ */}
      <div className="mx-auto max-w-[1400px] px-6 py-10">
        <div className="grid items-start gap-[30px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-[60px]">
          {/* LEFT — vertical luxury gallery flow */}
          <div className="flex flex-col gap-4">
            {gallery.map((u, i) => (
              <div key={`${u}-${i}`} className="w-full overflow-hidden bg-[#f3ede2]" style={{ aspectRatio: '3 / 4' }}>
                <img
                  src={u}
                  alt={`${name} — view ${i + 1}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>

          {/* RIGHT — sticky white buy box */}
          <aside className="flex flex-col gap-6 border border-[#eee7dc] bg-white p-6 lg:sticky lg:top-20 lg:p-10">
            <div>
              <span className="text-[11px] uppercase tracking-[2px] text-[#888888]">HUSHAE Essentials</span>
              <h1 className="mt-1 text-[32px] font-light uppercase leading-tight tracking-[-0.5px] text-[#1a1a1a]">
                {name}
              </h1>
              <p className="mt-2 text-[20px] font-medium">
                {soldOut ? 'Sold out' : pkr(p.price)}
                {onSale && p.compareAtPrice > p.price && (
                  <span className="ml-2.5 text-[15px] font-normal text-[#999999] line-through">{pkr(p.compareAtPrice)}</span>
                )}
              </p>
            </div>

            {/* Colour — 26px circles, active = 2px black ring */}
            {p.colors?.length > 0 && (
              <div>
                <span className="mb-[10px] block text-[11px] font-semibold uppercase tracking-[1px]">Color: {color}</span>
                <div className="flex gap-3">
                  {p.colors.map((c) => {
                    const on = color === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setColor(c.name)}
                        aria-pressed={on}
                        aria-label={c.name}
                        className={`h-7 w-7 rounded-full border border-[#dddddd] transition-all duration-200 ${
                          on ? 'outline outline-2 outline-black outline-offset-2' : 'hover:outline hover:outline-1 hover:outline-black/50'
                        }`}
                        style={{ backgroundColor: c.hex || '#EEEEEE' }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size — 5-col grid, active = black fill */}
            {needsSize && (
              <div ref={sizeRef}>
                <span className="mb-[10px] block text-[11px] font-semibold uppercase tracking-[1px]">Select Size</span>
                <div className="grid grid-cols-5 gap-2">
                  {p.sizes.map((s) => {
                    const on = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => { setSize(s); setSizeErr(false); }}
                        aria-pressed={on}
                        className={`border py-3 text-[12px] font-medium transition-all duration-200 ${
                          on ? 'border-black bg-black text-white' : 'border-[#e5dfd5] bg-[#faf8f5] text-[#1a1a1a] hover:border-black hover:bg-black hover:text-white'
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

            {/* CTA group — direct purchase */}
            <div className="mt-[10px] flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => tryAdd(true)}
                disabled={soldOut || (needsSize && !size)}
                className={`w-full py-[18px] text-[12px] font-semibold uppercase tracking-[1.5px] transition-colors duration-200 ${
                  soldOut || (needsSize && !size)
                    ? 'cursor-not-allowed bg-[#f0ece5] text-[#888888]'
                    : 'bg-black text-white hover:bg-[#222222]'
                }`}
              >
                {soldOut ? 'Sold Out' : needsSize && !size ? 'Select A Size' : 'Buy Now'}
              </button>
            </div>

            {/* Accordions — Product Description / Fabric & Care / Shipping & Easy Returns */}
            <div className="mt-[10px] border-t border-[#eee7dc]">
              <Accordion title="Product Description">
                <p>{p.shortDescription || p.description}</p>
              </Accordion>
              <Accordion title="Fabric & Care">
                <p>{p.fabric}</p>
                {(p.care || []).length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    {(p.care || []).map((c) => <li key={c}>{c}</li>)}
                  </ul>
                ) : (
                  <p className="mt-2">Machine wash cold, gentle cycle. Lay flat to dry. Do not bleach.</p>
                )}
              </Accordion>
              <Accordion title="Shipping & Easy Returns">
                <p>
                  Complimentary nationwide shipping on orders over {pkr(settings?.freeShippingThreshold ?? 4999)}.
                  Hassle-free 7-day exchanges — for hygiene, innerwear is only returnable if it arrives faulty.
                </p>
              </Accordion>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ COMPLETE THE LOOK — single recommendation section ═══════ */}
      {complete.length > 0 && (
        <section className="mx-auto mt-[100px] max-w-[1400px] border-t border-[#eee7dc] px-6 pt-[50px]">
          <h2 className="mb-[30px] text-[18px] font-normal uppercase tracking-[1px]">Complete The Look</h2>
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {complete.slice(0, 4).map((pr) => <CollectionCard key={pr._id} product={pr} variant="pill" />)}
          </div>
        </section>
      )}

      {/* Reviews + QA */}
      <div id="reviews" className="mx-auto mt-20 max-w-[1400px] scroll-mt-28 px-5 md:px-10">
        <ProductReviews product={p} />
        <ProductQA product={p} />
      </div>

      {/* Recently viewed */}
      {rvCfg.enabled !== false && rvCfg.showOnProduct !== false
        && recent.filter((r) => r.slug !== p.slug).length > 0 && (
        <div className="mx-auto mt-20 max-w-[1400px] px-6 pb-4 md:px-10">
          <ProductRow eyebrow="Your history" title={rvCfg.title || 'Recently viewed'} products={recent.filter((r) => r.slug !== p.slug).slice(0, 8)} />
        </div>
      )}

      {/* Sticky bottom purchase bar */}
      <StickyBuyBar
        product={p}
        watchRef={ctaRef}
        size={size}
        needsSize={needsSize}
        onAdd={tryAdd}
        disabled={soldOut}
        thumb={p.images?.[0]?.url}
      />
    </div>
  );
}
