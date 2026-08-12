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
 *  · variant="bar" (default) — Givenchy studio canvas reference:
 *      3/4 canvas #f2f0ec p-6 · images object-contain + mix-blend-multiply ·
 *      hover = secondary crossfade (no zoom) · arrows + dash indicators ·
 *      floating "+" (bottom-right) opens IN-CARD size overlay (no popup) ·
 *      details CENTERED: title 11/12px medium uppercase tracking 0.15em ·
 *      price 11px medium tracking-wider (struck old + current)
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
  const [isHovered, setIsHovered] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [pickSize, setPickSize] = useState('');
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

  /* ── BAR VARIANT — Givenchy studio canvas reference ──────────────── */
  const hasSecondary = images.length > 1;

  return (
    <article
      className="group relative flex w-full min-w-0 select-none flex-col font-sans"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Studio backdrop container (Givenchy canvas) */}
      <Link
        to={`/product/${p.slug}`}
        tabIndex={-1}
        className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-[#f2f0ec] p-6"
      >
        {/* Primary image — normal state */}
        <img
          src={failed ? FALLBACK : (main || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className={`h-full w-full object-contain mix-blend-multiply transition-opacity duration-500 ease-in-out ${hasSecondary ? 'group-hover:opacity-0' : ''}`}
        />

        {/* Secondary image — isolated studio fade-in on hover */}
        {hasSecondary && (
          <img
            src={images[1]}
            alt={`${name} hover view`}
            loading="eager"
            className="absolute inset-0 h-full w-full object-contain p-6 mix-blend-multiply opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100"
          />
        )}

        {/* Badge — top right */}
        {badge && (
          <span className="absolute right-2 top-2 z-10 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-white">
            {badge}
          </span>
        )}

        {/* Arrows */}
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

        {/* Quick Add (+) — opens IN-CARD overlay */}
        {!soldOut && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setOverlayOpen((o) => !o); setPickSize(''); }}
            aria-label="Quick Add"
            className={`absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black shadow-sm backdrop-blur-md transition-all duration-300 hover:bg-black hover:text-white ${overlayOpen ? '!bg-black !text-white' : ''}`}
          >
            <span className="text-base font-light leading-none" aria-hidden="true">{overlayOpen ? '✕' : '+'}</span>
          </button>
        )}

        {/* IN-CARD slide-up size selector */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 bg-white/95 p-4 backdrop-blur-md transition-transform duration-300 ease-in-out ${
            overlayOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
          }`}
        >
          <p className="mb-2 text-center text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-400">
            Select Size
          </p>
          <div className="mb-3 flex items-center justify-center gap-1.5">
            {sizes.slice(0, 5).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={(e) => { e.preventDefault(); setPickSize(sz); }}
                className={`h-7 w-7 border text-[10px] font-medium transition-colors ${
                  pickSize === sz ? 'border-black bg-black text-white' : 'border-neutral-300 bg-transparent text-black hover:border-black'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!pickSize}
            onClick={(e) => { e.preventDefault(); addToCart(p, { size: pickSize }); setOverlayOpen(false); setPickSize(''); }}
            className="w-full bg-black py-2 text-[9px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pickSize ? `ADD ${pickSize} TO CART` : 'SELECT A SIZE'}
          </button>
        </div>
      </Link>

      {/* 2. Product details — bottom aligned, centered */}
      <div className="mt-3 space-y-1 text-center">
        <h4 className="line-clamp-1 text-[11px] font-medium uppercase tracking-[0.15em] text-[#111111] md:text-[12px]">
          {name}
        </h4>
        <div className="flex items-center justify-center gap-2">
          {onSale && p.compareAtPrice > p.price && (
            <span className="text-[11px] font-normal text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
          )}
          <span className="text-[11px] font-medium tracking-wider text-[#111111]">{soldOut ? 'Sold out' : pkr(p.price)}</span>
        </div>
      </div>
    </article>
  );
}

export default CollectionCard;
