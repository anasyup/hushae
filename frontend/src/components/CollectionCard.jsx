import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { titleCase } from '../lib/productMeta';
import { CARD_NAME, CARD_NAME_LINK, CARD_SUBTITLE, cardSubtitle, PriceRow, SwatchRow } from '../lib/cardType';
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
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F2F0EC"/><text x="50%" y="50%" fill="#999999" font-family="Jost,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

function CollectionCard({ product: p, priority = false, variant = 'bar', ratio = 'aspect-[3/4.2]' }) {
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
  const badge = p.isNewArrival === true ? 'New' : p.isBestSeller === true ? 'Best Seller' : null;
  const subtitle = cardSubtitle(p);
  const sizes = p.sizes || [];

  const cycle = (dir) => {
    if (images.length < 2) return;
    setImgIdx((i) => (i + dir + images.length) % images.length);
  };

  /* ── PILL VARIANT (PDP Related Products) ─────────────────────────── */
  if (pill) {
    return (
      <article className="group relative flex flex-col">
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f3ede2]" style={{ aspectRatio: '3 / 4.2' }}>
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
        <div className="px-5 pb-5 pt-4">
          <SwatchRow
            product={p}
            onPick={(c, idx) => { setSwatchIdx(idx); const ci = images.indexOf(c.image || ''); if (ci >= 0) setImgIdx(ci); }}
          />
          <Link
            to={`/product/${p.slug}`}
            className={`${CARD_NAME} ${CARD_NAME_LINK} block`}
          >
            {name}
          </Link>
          {subtitle && (
            <p className={`${CARD_SUBTITLE} mt-[3px]`}>{subtitle}</p>
          )}
          <div className="mt-[3px] flex flex-wrap items-center gap-2">
            <PriceRow product={p} soldOut={soldOut} />
          </div>
        </div>
        {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
      </article>
    );
  }

  /* ── BAR VARIANT — client ProductCard reference (Rains register) ──── */
  /* 3/4 image on #f4f4f2 · hover scale 1.05 (image stack) · badge top-left
     · side arrows on hover · full-width BUY NOW (bag icon, glass black)
     · details follow the shared card-type register: swatches · name (14/500
       #22335A) · subtitle (fabric) · price · circular arrow */
  return (
    <article
      className="group relative flex w-full min-w-0 cursor-pointer select-none flex-col font-sans"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Image container — 3/4, #f4f4f2 */}
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block aspect-[3/4.2] w-full overflow-hidden bg-[#f4f4f2]">
        {/* Image stack — crossfade + gentle zoom on hover */}
        <div className={`absolute inset-0 transition-transform duration-700 ease-out ${isHovered ? 'scale-105' : 'scale-100'}`}>
          {[main, ...images.filter((u) => u !== main)].slice(0, 5).map((url, idx) => (
            <img
              key={`${url}-${idx}`}
              src={failed && idx === 0 ? FALLBACK : url}
              alt={idx === 0 ? `${name}, front view` : ''}
              width="900" height="1200"
              loading={priority && idx === 0 ? 'eager' : 'lazy'}
              onError={() => { if (idx === 0) setFailed(true); }}
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ease-in-out ${
                idx === imgIdx ? 'z-10 opacity-100' : 'z-0 opacity-0'
              }`}
            />
          ))}
        </div>

        {/* Badge — top left */}
        {badge && (
          <span className="absolute left-3 top-3 z-20 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-white">
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

        {/* BUY NOW — full-width (opens SizeModal) */}
        {!soldOut ? (
          <div className="absolute bottom-3 left-3 right-3 z-20 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setModal(true); }}
              className="flex w-full items-center justify-center gap-2 bg-black/90 px-4 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black"
            >
              <span>Buy Now</span>
              <ShoppingBag size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <span className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 bg-black py-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-md">
            Sold Out
          </span>
        )}
      </Link>

      {/* 2. Details — swatches · name · subtitle · price · arrow (client register) */}
      <div className="flex items-start justify-between gap-3 px-5 pb-5 pt-4">
        <div className="flex min-w-0 flex-col">
          <SwatchRow
            product={p}
            onPick={(c, idx) => { setSwatchIdx(idx); const ci = images.indexOf(c.image || ''); if (ci >= 0) setImgIdx(ci); }}
          />
          <Link
            to={`/product/${p.slug}`}
            className={`${CARD_NAME} ${CARD_NAME_LINK} line-clamp-1`}
          >
            {name}
          </Link>

          {subtitle && (
            <p className={`${CARD_SUBTITLE} mt-[3px] line-clamp-1`}>{subtitle}</p>
          )}

          <div className="mt-[3px] flex flex-wrap items-center gap-2">
            <PriceRow product={p} soldOut={soldOut} />
          </div>
        </div>

        <div className="pt-0.5">
          <Link
            to={`/product/${p.slug}`}
            aria-label="View Product"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black transition-all duration-300 group-hover:bg-black group-hover:text-white"
          >
            <ArrowRight size={16} strokeWidth={1.5} className="-rotate-45 transition-transform duration-300 group-hover:rotate-0" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </article>
  );
}

export default CollectionCard;
