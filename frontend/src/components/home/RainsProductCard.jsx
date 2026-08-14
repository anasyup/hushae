import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';
import { isOnSale } from '../../lib/sale';
import SizeModal from '../SizeModal';

/* ============================================================================
 * RainsProductCard — the Rains reference card, used on the New Arrivals
 * page only. Home/global cards are untouched.
 *   · 3/4 image on #f4f4f2, hover scale + secondary image when available
 *   · black square badge top-left (New / Best Seller / Sale)
 *   · BUY NOW + bag icon — appears on hover (desktop) / always (mobile) —
 *     opens the SizeModal quick-add (real cart)
 *   · details: UPPERCASE name, price + category, circular arrow button on
 *     the right (rotates on hover, links to the product page)
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '').toUpperCase();

export default function RainsProductCard({ product: p }) {
  const [hovered, setHovered] = useState(false);
  const [modal, setModal] = useState(false);

  if (!p) return null;

  const images = (p.images || []).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
  const primary = images[0] || '';
  const secondary = images[1] || '';
  const name = displayName(p.name) || 'Untitled';
  const slug = p.slug;
  const onSale = isOnSale(p);
  const discount = onSale && p.compareAtPrice > p.price
    ? Math.round((1 - p.price / p.compareAtPrice) * 100)
    : 0;

  const badge = p.isNewArrival === true
    ? 'New'
    : p.isBestSeller === true
      ? 'Best Seller'
      : onSale && discount > 0
        ? `Save ${discount}%`
        : null;

  const category = String(p.categorySlug || '')
    .split('-')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');

  const FALLBACK =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#f4f4f2"/></svg>');

  return (
    <div
      className="group relative flex w-full cursor-pointer select-none flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 1. Studio image container */}
      <Link
        to={`/product/${slug}`}
        tabIndex={-1}
        aria-label={name}
        className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-[#f4f4f2]"
      >
        <img
          src={hovered && secondary ? secondary : primary || FALLBACK}
          alt={name}
          loading="lazy"
          onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
          className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Badge — top left, black */}
        {badge && (
          <span className="absolute left-3 top-3 z-10 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-white">
            {badge}
          </span>
        )}

        {/* 2. Buy Now / Quick add — hover (desktop), always (mobile) */}
        <div className="absolute bottom-3 left-3 right-3 z-20 translate-y-0 opacity-100 transition-all duration-300 sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setModal(true); }}
            className="flex w-full items-center justify-center gap-2 bg-black/90 py-3 px-4 text-[10px] font-medium uppercase tracking-[0.2em] text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black"
          >
            <span>Buy Now</span>
            <ShoppingBag size={14} aria-hidden="true" />
          </button>
        </div>
      </Link>

      {/* 3. Details + arrow button */}
      <div className="flex items-start justify-between gap-2 pb-1 pt-3.5">
        <div className="flex flex-col">
          <h3 className="text-[12px] font-medium uppercase leading-tight tracking-[0.08em] text-black transition-colors group-hover:text-neutral-600">
            {name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] font-semibold tracking-wide text-neutral-900">{pkr(p.price)}</span>
            {category && (
              <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                &bull; {category}
              </span>
            )}
          </div>
        </div>

        <div className="pt-0.5">
          <Link
            to={`/product/${slug}`}
            aria-label="View Product"
            className="flex h-7 w-7 items-center justify-center rounded-full text-black transition-all duration-300 group-hover:bg-black group-hover:text-white"
          >
            <ArrowRight size={16} strokeWidth={1.5} className="-rotate-45 transition-transform duration-300 group-hover:rotate-0" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </div>
  );
}
