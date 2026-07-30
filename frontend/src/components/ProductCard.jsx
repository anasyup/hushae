import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { memo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import Img from './Img';
import Badge, { SaleBadge } from './ui/Badge';

/*
 * ProductCard — the visual for one product tile in Shop / Home rows.
 * The primary image is shown at all times. Image-swapping on hover was
 * removed at user request — no auto-flip on any device, ever.
 */
function ProductCard({
  product: p,
  compact = false,
  // Theme-Editor driven overrides (settings.productSections). Defaults keep
  // every existing caller behaving exactly as before.
  ratio = null,
  showPrice = true,
  showSaleBadge = true,
  showQuickAdd = true,
  showWishlist = true,
}) {
  const { inWishlist, toggleWish, addToCart } = useApp();
  const [sizePick, setSizePick] = useState(false);

  const wished = inWishlist(p);
  const images = (p.images || []).filter((im) => im && (im.url || typeof im === 'string'));
  const primary = images[0]?.url || images[0] || p.image;
  const sizes = p.sizes || [];
  const ratioCls = ratio || (compact ? 'aspect-[3/4]' : 'aspect-[4/5]');

  return (
    <div className="group relative" onMouseLeave={() => setSizePick(false)}>
      <div className="relative overflow-hidden rounded-card bg-satin/50">
        <Link to={`/product/${p.slug}`} aria-label={p.name} className="block">
          {/* Primary image only — no hover swap */}
          <Img
            src={primary}
            alt={p.name}
            className={`w-full object-cover ${ratioCls}`}
          />
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {p.stock === 0 && <Badge variant="soldout">Sold out</Badge>}
          {showSaleBadge && p.stock !== 0 && <SaleBadge price={p.price} compareAtPrice={p.compareAtPrice} />}
          {p.isBestSeller && p.stock !== 0 && <Badge variant="best">Bestseller</Badge>}
        </div>

        {showWishlist && (
          <button
            type="button" onClick={() => toggleWish(p)}
            aria-pressed={wished}
            aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
            className={`absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-alabaster/90 shadow-e-2 transition-transform duration-base ease-standard hover:scale-105 md:right-3 md:top-3 md:h-9 md:w-9 ${wished ? 'text-obsidian' : 'text-ash'}`}>
            <Heart size={16} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}

        {showQuickAdd && p.stock > 0 && (
          <div className={`absolute inset-x-3 bottom-3 transition-all duration-base ease-entrance ${sizePick ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'}`}>
            {sizePick ? (
              <div className="rounded-card bg-alabaster/95 p-2.5 shadow-e-3 backdrop-blur">
                <p className="mb-1.5 px-1 text-label font-bold uppercase text-ash">Select size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button key={s} type="button"
                      onClick={() => { addToCart(p, { size: s }); setSizePick(false); }}
                      aria-label={`Add ${p.name}, size ${s}, to bag`}
                      className="min-w-9 rounded-control border border-line bg-white px-2.5 py-1.5 text-body-sm font-semibold transition-colors duration-fast hover:border-obsidian hover:bg-obsidian hover:text-alabaster">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setSizePick(true)}
                aria-label={`Quick add ${p.name}`}
                className="w-full rounded-full bg-obsidian/90 py-2.5 text-btn-sm font-semibold uppercase text-alabaster backdrop-blur transition-colors duration-base hover:bg-obsidian">
                Quick Add
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${p.slug}`} className="clamp-2 text-body-sm font-medium leading-snug text-obsidian hover:underline">{p.name}</Link>
        </div>
        {showPrice && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-body-sm font-semibold">{pkr(p.price)}</span>
            {p.compareAtPrice > p.price && (
              <span className="text-caption text-ash line-through">
                <span className="sr-only">Was </span>{pkr(p.compareAtPrice)}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* Product grids re-render on every cart or wishlist change; memoising keeps
   that to the one card that actually changed. */
export default memo(ProductCard);
