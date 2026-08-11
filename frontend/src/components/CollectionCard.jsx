import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';
import SizeModal from './SizeModal';

/* ============================================================================
 * HUSHAE CollectionCard — two variants, both from client references:
 *
 *  · variant="bar" (default) — exact CK tight-grid reference:
 *      4/5 image #e8e8e8 · hover: 28px arrows + Buy Now pill (bottom-6,
 *      opens SizeModal) + black dash indicators · swatches BELOW image with
 *      ring selection · title 12px font-normal capitalize tracking-normal · price 12px font-medium
 *  · variant="pill" — PDP "Related Products" card:
 *      #f3ede2 tile · rounded Buy Now pill fade-in · brand line · 13/500
 *      title · 13/600 price + gold-star rating
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#E5E2E0"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

function CollectionCard({ product: p, priority = false, variant = 'bar', ratio = 'aspect-[3/4]' }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [modal, setModal] = useState(false);
  const [swatchIdx, setSwatchIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  /* Auto slideshow on hover — cycles images every 1.5s, resets on leave */
  useEffect(() => {
    if (!isHovered || images.length <= 1) { setImgIdx(0); return undefined; }
    const t = setInterval(() => setImgIdx((i) => (i + 1) % images.length), 1500);
    return () => clearInterval(t);
  }, [isHovered, images.length]);
  const pill = variant === 'pill';

  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[imgIdx] || images[0] || srcOf(p.image) || '';
  const name = titleCase(displayName(p.name)) || 'Untitled';
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const badge = p.isNewArrival === true ? 'New' : p.isBestSeller === true ? 'Best Seller' : null;

  const cycle = (dir) => {
    if (images.length < 2) return;
    setImgIdx((i) => (i + dir + images.length) % images.length);
  };

  /* ── PILL VARIANT (PDP Related Products) ─────────────────────────── */
  if (pill) {
    return (
      <article className="group relative flex flex-col">
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f3ede2]" style={{ aspectRatio: '3 / 4' }}>
          <img
            src={failed ? FALLBACK : (main || FALLBACK)}
            alt={`${name}, front view`}
            width="900" height="1200"
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setModal(true); }}
            className="absolute bottom-[10px] left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-black px-[22px] py-2.5 text-[11px] font-semibold uppercase tracking-[1px] text-white opacity-100 transition-opacity duration-300 hover:bg-[#222222] md:bottom-[15px] md:opacity-0 md:group-hover:opacity-100"
          >
            Buy Now
          </button>
        </Link>
        <div className="pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#888888]">HUSHAE</p>
          <Link to={`/product/${p.slug}`} className="mb-1 mt-0.5 block text-[13px] font-medium text-black no-underline transition-colors duration-200 hover:text-[#666666]">
            {name}
          </Link>
          <p className="text-[13px] font-semibold">
            {soldOut ? 'Sold out' : pkr(p.price)}
            {onSale && p.compareAtPrice > p.price && (
              <span className="ml-1.5 font-normal text-[#999999] line-through">{pkr(p.compareAtPrice)}</span>
            )}
          </p>
          {Number(p.ratingAvg || 0) > 0 && (
            <p className="mt-1 text-[11px] text-[#666666]">
              <span className="text-[#d4af37]" aria-hidden="true">★</span> {Number(p.ratingAvg).toFixed(1)}
            </p>
          )}
        </div>
        {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
      </article>
    );
  }

  /* ── BAR VARIANT — exact CK tight-grid reference card ────────────── */
  /* 4/5 image #e8e8e8 (carousel) · hover: 28px arrows + Buy Now pill
     (bottom-6) + black dash indicators · swatches BELOW image with ring
     selection · title 12px font-normal capitalize tracking-normal · price 12px font-medium */
  const colors = p.colors || [];

  return (
    <article
      className="group flex min-w-0 cursor-pointer flex-col font-sans"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Image box — 4/5, light grey, carousel on hover (whole card links to product) */}
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f5f3ee]" style={{ aspectRatio: '4 / 5' }}>
        <img
          src={failed ? FALLBACK : (images[imgIdx] || images[0] || srcOf(p.image) || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1125"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-opacity duration-300"
        />

        {/* Badge — top right */}
        {badge && (
          <span className="absolute right-2 top-2 z-10 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
            {badge}
          </span>
        )}

        {/* Hover controls */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => { e.preventDefault(); cycle(-1); }}
              className="absolute left-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black opacity-0 shadow-md transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => { e.preventDefault(); cycle(1); }}
              className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black opacity-0 shadow-md transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}

        {/* Buy Now pill */}
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
          {soldOut ? (
            <span className="pointer-events-none whitespace-nowrap rounded-full bg-black px-7 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white opacity-100 shadow-lg md:opacity-0 md:group-hover:opacity-100">
              Sold Out
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setModal(true); }}
              className="whitespace-nowrap rounded-full bg-black px-7 py-2.5 text-[11px] font-medium uppercase tracking-wider text-white opacity-100 shadow-lg transition-all duration-200 hover:bg-neutral-800 md:opacity-0 md:group-hover:opacity-100"
            >
              Buy Now
            </button>
          )}
        </div>

        {/* Dash indicators — active black w-5, inactive neutral-400 w-3 */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1 group-hover:flex md:flex">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                aria-label={`Image ${idx + 1}`}
                onClick={(e) => { e.preventDefault(); setImgIdx(idx); }}
                className={`h-[2px] border-0 transition-all duration-300 ${idx === imgIdx ? 'w-4 bg-black' : 'w-2 bg-black/30'}`}
              />
            ))}
          </div>
        )}
      </Link>

      {/* 2. Color swatches — BELOW image, ring selection */}
      {colors.length > 0 && (
        <div className="mt-3 flex items-center gap-2 px-1">
          {colors.slice(0, 4).map((c, idx) => (
            <button
              key={`${c.name}-${idx}`}
              type="button"
              title={c.name}
              onClick={() => { setSwatchIdx(idx); const ci = images.indexOf(c.image || ''); if (ci >= 0) setImgIdx(ci); }}
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full p-[1px] transition-all ${swatchIdx === idx ? 'ring-1 ring-black ring-offset-1' : ''}`}
            >
              <span className="block h-full w-full rounded-full border border-black/10" style={{ backgroundColor: c.hex || '#EEEEEE' }} />
            </button>
          ))}
          {colors.length > 4 && (
            <span className="text-[10px] font-sans text-neutral-400">+{colors.length - 4}</span>
          )}
        </div>
      )}

      {/* 3. Title + price */}
      <Link to={`/product/${p.slug}`} className="mt-2 space-y-1 px-1">
        <h3 className="line-clamp-1 text-[12px] font-normal capitalize tracking-normal text-[#1e1e1e]">
          {name}
        </h3>
        <div className="flex items-center gap-2 text-[12px]">
          {onSale && p.compareAtPrice > p.price && (
            <span className="text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
          )}
          <span className="font-medium text-[#1e1e1e]">{soldOut ? 'Sold out' : pkr(p.price)}</span>
        </div>
      </Link>

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </article>
  );
}

export default CollectionCard;
