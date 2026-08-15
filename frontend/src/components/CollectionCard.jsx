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

function CollectionCard({ product: p, priority = false, variant = 'bar', ratio = 'aspect-[3/4.7]' }) {
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
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f3ede2]" style={{ aspectRatio: '3 / 4.7' }}>
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

  /* ── BAR VARIANT — client LuxuryProductCard reference ─────────────── */
  /* White card on a flush bordered grid (border-r/b), padded p-4/lg:p-6,
     image tile 3/4, inline sizes "Add to cart :" (tap = instant add),
     house typography register for name/subtitle/price. Side arrows and the
     full-width BUY NOW (opens SizeModal) are preserved; on mobile the BUY
     NOW is always visible (no hover). */
  return (
    <article
      className="group relative flex w-full min-w-0 cursor-pointer select-none flex-col border-b border-r border-neutral-200/80 bg-white p-4 font-sans lg:p-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Image tile — 3/4, #f4f4f2 */}
      <Link
        to={`/product/${p.slug}`}
        tabIndex={-1}
        className="relative mb-4 block w-full overflow-hidden bg-[#f4f4f2] lg:mb-5"
        style={{ aspectRatio: '3 / 4' }}
      >
        {/* Image stack — crossfade on hover (no zoom) */}
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

        {/* Badge — top left */}
        {badge && (
          <span className="absolute left-3 top-3 z-20 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-white">
            {badge}
          </span>
        )}

        {/* Side arrows — appear on hover (desktop) */}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-between px-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
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

        {/* BUY NOW — always visible on mobile, hover on desktop (opens SizeModal) */}
        {!soldOut ? (
          <div className="absolute bottom-3 left-3 right-3 z-20 opacity-100 transition-all duration-300 lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setModal(true); }}
              className="flex w-full items-center justify-center gap-2 bg-black/90 px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black lg:py-3"
            >
              <span>Buy Now</span>
              <ShoppingBag size={14} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <span className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 bg-black py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-md">
            Sold Out
          </span>
        )}
      </Link>

      {/* 2. Details — inline sizes · name · subtitle · price (reference) */}
      <div className="flex flex-col">
        {sizes.length > 0 && (
          <div className="mb-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
            <span className="font-normal">Add to cart :</span>
            {sizes.slice(0, 6).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(p, { size: sz }); }}
                className="font-medium text-neutral-600 underline-offset-2 transition-colors hover:text-black hover:underline"
              >
                {sz}
              </button>
            ))}
          </div>
        )}

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

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </article>
  );
}

export default CollectionCard;
