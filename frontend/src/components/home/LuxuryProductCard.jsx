import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { titleCase } from '../../lib/productMeta';
import { CARD_NAME, CARD_NAME_LINK, CARD_SUBTITLE, cardSubtitle, PriceRow, SwatchRow } from '../../lib/cardType';
import SizeModal from '../SizeModal';

/* ============================================================================
 * LuxuryProductCard — the house's new-arrivals card (client reference).
 *   · 3/4 image tile on #EFECE6; layered crossfade images
 *   · badge top-left (white glass), wishlist heart top-right (hover reveal)
 *   · SIDE ARROWS on hover — cycle the gallery (same as CollectionCard)
 *   · BUY NOW button on hover — opens the SizeModal quick-add (same as
 *     CollectionCard)
 *   · details: category eyebrow · UPPERCASE name 12px tracking 0.12em ·
 *     colour swatch dots · price with struck original when on sale
 * Whole card links to the product page. Uses real product data.
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '').toUpperCase();

export default function LuxuryProductCard({ product: p, priority = false }) {
  const { toggleWish, inWishlist } = useApp();
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [modal, setModal] = useState(false);

  if (!p) return null;

  const images = (p.images || []).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
  const main = images[imgIdx] || images[0] || '';
  const name = titleCase(displayName(p.name)) || 'Untitled';
  const slug = p.slug;
  const wished = inWishlist(p);
  const soldOut = p.stock === 0;
  /* Card stays to name · subtitle · price · swatches only — no promo
     microcopy (client spec): New Season / Best Seller badges only. */
  const badge = p.isNewArrival === true
    ? 'New Season'
    : p.isBestSeller === true
      ? 'Best Seller'
      : null;
  const subtitle = cardSubtitle(p);

  /* Hover = one image change (primary -> secondary), arrows browse manually. */
  useEffect(() => {
    if (!isHovered) { setImgIdx(0); return; }
    if (images.length > 1) setImgIdx((i) => (i === 0 ? 1 : i));
  }, [isHovered]); // eslint-disable-line react-hooks/exhaustive-deps

  const cycle = (dir) => {
    if (images.length < 2) return;
    setImgIdx((i) => (i + dir + images.length) % images.length);
  };

  const FALLBACK =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#EFECE6"/></svg>');

  return (
    <div
      className="group relative flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image tile — layered crossfade + arrows + Buy Now */}
      <Link
        to={`/product/${slug}`}
        tabIndex={-1}
        aria-label={name}
        className="relative mb-4 block w-full cursor-pointer overflow-hidden bg-[#EFECE6]"
        style={{ aspectRatio: '3 / 4.7' }}
      >
        {/* Layered images — crossfade via z-index + opacity */}
        {[main, ...images.filter((u) => u !== main)].slice(0, 5).map((url, idx) => (
          <img
            key={`${url}-${idx}`}
            src={failed && idx === 0 ? FALLBACK : url}
            alt={idx === 0 ? name : ''}
            loading={priority && idx === 0 ? 'eager' : 'lazy'}
            onError={() => { if (idx === 0) setFailed(true); }}
            className={`absolute inset-0 block h-full w-full object-cover object-top transition-opacity duration-500 ease-in-out ${
              idx === imgIdx ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
          />
        ))}

        {/* Badge — top left */}
        {badge && (
          <span className="absolute left-3 top-3 z-20 bg-white/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-black backdrop-blur-sm">
            {badge}
          </span>
        )}

        {/* Wishlist — top right (hover reveal) */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggleWish(p); }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wished}
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-black opacity-0 shadow-sm transition-all hover:bg-white group-hover:opacity-100"
        >
          <Heart size={16} strokeWidth={1.5} className={wished ? 'fill-black text-black' : 'text-black'} />
        </button>

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
          <span className="pointer-events-none absolute bottom-3 left-1/2 z-20 w-[85%] -translate-x-1/2 bg-black py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white opacity-100 shadow-md">
            Sold Out
          </span>
        )}
      </Link>

      {/* Details — swatches · name · subtitle · price (shared register) */}
      <div className="px-5 pb-5">
        <SwatchRow
          product={p}
          onPick={(c, idx) => {
            const ci = images.indexOf(c.image || '');
            if (ci >= 0) setImgIdx(ci);
            else if (images.length > 1) setImgIdx(idx % images.length);
          }}
        />
        <Link
          to={`/product/${slug}`}
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

      {/* Size modal — quick add */}
      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </div>
  );
}
