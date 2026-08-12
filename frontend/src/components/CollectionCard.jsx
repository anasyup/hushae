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

  /* ── BAR VARIANT — exact client reference card ───────────────────── */
  const colors = p.colors || [];

  return (
    <article
      className="group relative flex w-full min-w-0 flex-col font-sans"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Image box — 3/4, #f2f0ec, whole card links to product */}
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f2f0ec]" style={{ aspectRatio: '3 / 4' }}>
        <img
          src={failed ? FALLBACK : (images[imgIdx] || images[0] || srcOf(p.image) || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Badge — top right */}
        {badge && (
          <span className="absolute right-2 top-2 z-10 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
            {badge}
          </span>
        )}

        {/* Hover arrows */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => { e.preventDefault(); cycle(-1); }}
              className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black opacity-0 shadow-md transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => { e.preventDefault(); cycle(1); }}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black opacity-0 shadow-md transition hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}

        {/* Dash indicators */}
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

        {/* Buy Now pill — opens SizeModal (Select Size → ADD TO CART) */}
        {!soldOut ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setModal(true); }}
            className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-6 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white shadow-lg transition-all duration-200 hover:bg-neutral-800 md:opacity-0 md:group-hover:opacity-100"
          >
            Buy Now
          </button>
        ) : (
          <span className="pointer-events-none absolute bottom-5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black px-6 py-2.5 text-[10px] font-medium uppercase tracking-widest text-white shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100">
            Sold Out
          </span>
        )}
      </Link>

      {/* 2. Details — title uppercase tracking-wider, price struck + semibold */}
      <Link to={`/product/${p.slug}`} className="mt-3 space-y-1 text-left">
        <h4 className="line-clamp-1 text-[12px] font-medium uppercase tracking-wider text-[#111111]">
          {name}
        </h4>
        <div className="flex items-center gap-2">
          {onSale && p.compareAtPrice > p.price && (
            <span className="text-[11px] text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
          )}
          <span className="text-[11px] font-semibold text-black">{soldOut ? 'Sold out' : pkr(p.price)}</span>
        </div>
      </Link>

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </article>
  );
}

export default CollectionCard;
