import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { pkr } from '../../lib/format';
import { isOnSale } from '../../lib/sale';

/* ============================================================================
 * LuxuryProductCard — the house's new-arrivals card (client reference).
 *   · 3/4 image tile on #EFECE6; primary photo crossfades to the second
 *     photo on hover with a gentle scale (LV / Gucci register)
 *   · badge top-left (white glass pill), wishlist heart top-right (appears
 *     on hover, fills when saved)
 *   · QUICK ADD SIZE bar slides up on hover — choosing a size adds to bag
 *     with that size and opens the drawer (real cart, not a mock)
 *   · details: UPPERCASE name 12px tracking 0.12em + colour swatch dots +
 *     price with struck original when on sale
 * Whole card links to the product page. Uses real product data.
 * ========================================================================== */

const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '').toUpperCase();

export default function LuxuryProductCard({ product: p, priority = false }) {
  const { addToCart, toggleWish, inWishlist, setDrawerOpen } = useApp();
  if (!p) return null;

  const images = (p.images || []).map((i) => (typeof i === 'string' ? i : i?.url)).filter(Boolean);
  const primary = images[0];
  const hover = images[1];
  const name = displayName(p.name) || 'Untitled';
  const slug = p.slug;
  const wished = inWishlist(p);
  const onSale = isOnSale(p);
  const discount = onSale && p.compareAtPrice > p.price
    ? Math.round((1 - p.price / p.compareAtPrice) * 100)
    : 0;

  const badge = p.isNewArrival === true
    ? 'New Season'
    : p.isBestSeller === true
      ? 'Best Seller'
      : onSale && discount > 0
        ? `Save ${discount}%`
        : null;

  const colors = (p.colors || []).filter((c) => c && c.hex).slice(0, 4);
  const sizes = p.sizes || [];
  const firstColor = colors[0]?.name || (p.colors?.[0]?.name) || '';

  const quickAdd = (size) => {
    addToCart(p, { size, color: firstColor, quantity: 1 });
    setDrawerOpen(true);
  };

  const FALLBACK =
    'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#EFECE6"/></svg>');

  return (
    <div className="group relative flex flex-col">
      {/* Image tile — hover crossfade + quick add */}
      <Link
        to={`/product/${slug}`}
        tabIndex={-1}
        aria-label={name}
        className="relative mb-4 block w-full cursor-pointer overflow-hidden bg-[#EFECE6]"
        style={{ aspectRatio: '3 / 4' }}
      >
        {/* Primary image */}
        <img
          src={primary || FALLBACK}
          alt={name}
          loading={priority ? 'eager' : 'lazy'}
          onError={(e) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; }}
          className="block h-full w-full object-cover object-top transition-opacity duration-700 group-hover:opacity-0"
        />

        {/* Secondary hover image — crossfade + scale */}
        {hover && (
          <img
            src={hover}
            alt=""
            aria-hidden="true"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className="absolute inset-0 block h-full w-full object-cover object-top opacity-0 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
          />
        )}

        {/* Badge — top left */}
        {badge && (
          <span className="absolute left-3 top-3 bg-white/90 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.2em] text-black backdrop-blur-sm">
            {badge}
          </span>
        )}

        {/* Wishlist — top right (hover reveal) */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); toggleWish(p); }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wished}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-black opacity-0 shadow-sm transition-all hover:bg-white group-hover:opacity-100"
        >
          <Heart size={16} strokeWidth={1.5} className={wished ? 'fill-black text-black' : 'text-black'} />
        </button>

        {/* Quick add sizes — slides up on hover */}
        {sizes.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full border-t border-neutral-200 bg-white/95 p-3 backdrop-blur-md transition-transform duration-300 ease-out group-hover:translate-y-0">
            <span className="mb-2 block text-center text-[9px] font-medium uppercase tracking-[0.2em] text-neutral-400">
              Quick Add Size
            </span>
            <div className="flex items-center justify-center gap-1.5">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => { e.preventDefault(); quickAdd(s); }}
                  aria-label={`Add ${name} in size ${s}`}
                  className="flex h-7 w-7 items-center justify-center border border-neutral-300 text-[10px] font-medium tracking-wider text-black transition-colors hover:border-black hover:bg-black hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* Details */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Link
            to={`/product/${slug}`}
            className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#111111] transition-colors group-hover:underline"
          >
            {name}
          </Link>
          {colors.length > 0 && (
            <span className="flex items-center gap-1 pl-2">
              {colors.map((c) => (
                <span
                  key={c.name || c.hex}
                  className="h-2 w-2 rounded-full border border-neutral-300"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[12px] font-medium text-[#111111]">{pkr(p.price)}</span>
          {onSale && p.compareAtPrice > p.price && (
            <span className="text-[11px] font-light text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
