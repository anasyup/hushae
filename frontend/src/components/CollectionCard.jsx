import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';
import { useApp } from '../store/AppContext';
import SizeModal from './SizeModal';

/* ============================================================================
 * HUSHAE CollectionCard — two variants, both from client references:
 *
 *  · variant="bar" (default) — exact client reference card:
 *      3/4 image #f2f0ec · hover: arrows + dash indicators + floating "+"
 *      (bottom-right) which opens an IN-CARD size overlay (no popup) ·
 *      details: title 12px medium UPPERCASE tracking-wider · price 11px
 *      struck original + semibold current
 *  · variant="pill" — PDP "Related Products" card:
 *      #f3ede2 tile · rounded Buy Now pill fade-in → SizeModal · brand line
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F2F0EC"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');
const toSentenceCase = (str) => String(str || '')
  .toLowerCase()
  .split(' ')
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ');

function CollectionCard({ product: p, priority = false, variant = 'bar', ratio = 'aspect-[3/4]' }) {
  const { addToCart } = useApp();
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [swatchIdx, setSwatchIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [modal, setModal] = useState(false);

  const pill = variant === 'pill';
  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[imgIdx] || images[0] || srcOf(p.image) || '';

  /* Hover = ONE image change (primary -> secondary), no auto-cycle.
     Mouse leave returns to the first image. Arrows still allow manual browse. */
  useEffect(() => {
    if (!isHovered) { setImgIdx(0); return; }
    if (images.length > 1) setImgIdx((i) => (i === 0 ? 1 : i));
  }, [isHovered]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = titleCase(displayName(p.name)) || 'Untitled';
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const badge = p.isNewArrival === true ? 'New' : p.isBestSeller === true ? 'Best Seller' : null;
  const sizes = p.sizes || [];

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
          <Link to={`/product/${p.slug}`} className="mb-1 mt-0.5 block font-bodoni text-[14px] font-medium text-black no-underline transition-colors duration-200 hover:text-[#666666]">
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

  /* ── BAR VARIANT — exact client reference card ───────────────────── */
  /* layered crossfade images (z-index) · 4/3 → sm:3/4 · side arrows on
     hover · full-width BUY NOW button (opens SizeModal) · centered details */
  const colors = p.colors || [];

  return (
    <article
      className="group relative flex w-full min-w-0 select-none flex-col font-sans"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Image container — 4/3 (sm 3/4), #f2f0ec */}
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block aspect-[4/3] w-full overflow-hidden bg-[#f2f0ec] sm:aspect-[3/4]">
        {/* Layered images — crossfade via z-index + opacity */}
        {[main, ...images.filter((u) => u !== main)].slice(0, 5).map((url, idx) => (
          <img
            key={`${url}-${idx}`}
            src={failed && idx === 0 ? FALLBACK : url}
            alt={idx === 0 ? `${name}, front view` : ''}
            width="900" height="1200"
            loading={priority && idx === 0 ? 'eager' : 'lazy'}
            onError={() => { if (idx === 0) setFailed(true); }}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ease-in-out ${
              idx === imgIdx ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
          />
        ))}

        {/* Badge — top right */}
        {badge && (
          <span className="absolute right-2 top-2 z-20 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-widest text-white">
            {badge}
          </span>
        )}

        {/* Side arrows — appear on hover */}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-between px-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); cycle(-1); }}
              aria-label="Previous Image"
              className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-black shadow-md transition-all hover:bg-white"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); cycle(1); }}
              aria-label="Next Image"
              className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-black shadow-md transition-all hover:bg-white"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* BUY NOW — full-width button (opens SizeModal) */}
        {!soldOut ? (
          <div className="absolute bottom-3 left-1/2 z-20 w-[85%] -translate-x-1/2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setModal(true); }}
              className="w-full bg-black py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-md transition-colors hover:bg-neutral-800"
            >
              Buy Now
            </button>
          </div>
        ) : (
          <span className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[85%] -translate-x-1/2 bg-black py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-md opacity-100">
            Sold Out
          </span>
        )}
      </Link>

      {/* 2. Details — sentence-case title + color swatches + price */}
      <div className="mt-3 space-y-1.5 text-left">
        <Link
          to={`/product/${p.slug}`}
          className="line-clamp-1 font-bodoni text-[15px] font-medium leading-snug text-[#1a1a1a] transition-colors duration-200 hover:text-[#666666] hover:underline hover:underline-offset-2"
        >
          {toSentenceCase(displayName(p.name)) || 'Untitled'}
        </Link>

        {/* Color swatches row */}
        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {colors.slice(0, 5).map((c, idx) => (
              <button
                key={`${c.name}-${idx}`}
                type="button"
                title={c.name}
                onClick={(e) => { e.preventDefault(); setSwatchIdx(idx); const ci = images.indexOf(c.image || ''); if (ci >= 0) setImgIdx(ci); }}
                className={`h-[13px] w-[13px] rounded-full transition-all ${
                  swatchIdx === idx ? 'ring-1 ring-neutral-800 ring-offset-1' : 'ring-1 ring-black/10'
                }`}
                style={{ backgroundColor: c.hex || '#EEEEEE' }}
              />
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 pt-0.5">
          {onSale && p.compareAtPrice > p.price && (
            <span className="text-[12px] text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
          )}
          <span className="text-[13px] font-medium text-[#1a1a1a]">{soldOut ? 'Sold out' : pkr(p.price)}</span>
        </div>
      </div>

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </article>
  );
}

export default CollectionCard;
