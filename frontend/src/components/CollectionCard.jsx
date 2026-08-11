import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';
import SizeModal from './SizeModal';

/* ============================================================================
 * HUSHAE CollectionCard — two variants, both from client references:
 *
 *  · variant="bar" (default) — minimal reference card:
 *      swatches on TOP (10px) · title 13px normal capitalize line-clamp-1 ·
 *      price 11px (struck original + current) · image #f7f5f0 3/4, hover =
 *      secondary image swap + scale 1.05 · NO overlay/badge/arrows
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

  /* ── BAR VARIANT — minimal reference card ────────────────────────── */
  /* Swatches on TOP · title 13px normal capitalize · price 11px ·
     image #f7f5f0, hover = secondary image swap + scale 1.05 ·
     NO overlay, NO badge, NO arrows. Click opens the product page. */
  const colors = p.colors || [];

  return (
    <article className="group min-w-0 cursor-pointer font-sans">
      {/* Color swatches — above the image (reference) */}
      {colors.length > 0 && (
        <div className="mb-2 flex items-center gap-1.5">
          {colors.slice(0, 4).map((c, i) => (
            <span
              key={`${c.name}-${i}`}
              title={c.name}
              className="h-2.5 w-2.5 rounded-full border border-neutral-300"
              style={{ backgroundColor: c.hex || '#EEEEEE' }}
            />
          ))}
          {colors.length > 4 && (
            <span className="ml-0.5 text-[10px] text-neutral-400">+{colors.length - 4}</span>
          )}
        </div>
      )}

      {/* Title — exact reference typography */}
      <h3 className="line-clamp-1 mb-1 font-sans text-[13px] font-normal capitalize leading-[18px] tracking-normal text-[#1e1e1e]">
        {name}
      </h3>

      {/* Price */}
      <div className="flex items-center gap-2 font-sans text-[11px] leading-[14px]">
        {onSale && p.compareAtPrice > p.price && (
          <span className="text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
        )}
        <span className="font-medium text-[#1e1e1e]">{soldOut ? 'Sold out' : pkr(p.price)}</span>
      </div>

      {/* Image — hover swaps to secondary + scale */}
      <Link
        to={`/product/${p.slug}`}
        tabIndex={-1}
        className="relative mt-2 block w-full overflow-hidden bg-[#f7f5f0]"
        style={{ aspectRatio: '3 / 4' }}
      >
        <img
          src={failed ? FALLBACK : (images[imgIdx] || images[0] || srcOf(p.image) || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {/* Secondary image crossfade on hover */}
        {images.length > 1 && (
          <img
            src={images[(imgIdx + 1) % images.length]}
            alt=""
            loading="lazy"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
      </Link>
    </article>
  );
}


export default CollectionCard;
