import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import Badge from './ui/Badge';

/* ============================================================================
 * ProductCard — one product tile in Shop, Home rows and the wishlist.
 *
 * Measured problems this addresses, in order of how much they cost:
 *
 *  · Card heights varied by 17–21px inside one row, because the title wraps to
 *    one or two lines. Rows looked ragged. The title block now reserves two
 *    lines always, so every card in a row is the same height.
 *  · Price was 11px and the name 13px — the number the shopper is actually
 *    scanning for was the smallest text on the card. Price now leads.
 *  · Sold-out cards suppressed the discount badge entirely, so a discounted
 *    out-of-stock piece showed no price story at all.
 *  · Quick Add sat at opacity:0 but stayed tabbable, so keyboard focus landed
 *    on an invisible control. It is now inert until revealed.
 *  · Products carry four images each and only the first was ever used.
 *
 * Motion is opacity/transform only, so nothing here can trigger layout, and
 * every animation is disabled under prefers-reduced-motion via index.css.
 * ========================================================================== */

const DAY = 86400000;
const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125"><rect width="100%" height="100%" fill="#E6DCD2"/><text x="50%" y="50%" fill="#69625F" font-family="Georgia,serif" font-size="34" letter-spacing="12" text-anchor="middle">HUSHAE</text></svg>'
  );

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');

function ProductCard({
  product: p,
  compact = false,
  // Theme-Editor overrides (settings.productSections) — defaults preserve
  // every existing call site.
  ratio = null,
  showPrice = true,
  showSaleBadge = true,
  showQuickAdd = true,
  showWishlist = true,
  priority = false,          // first row on a grid: load eagerly, skip lazy
  // Heading level for the product name. Inside a section that already has an
  // h2 (home rows) an h3 is correct; on a bare grid under the page h1 it must
  // be an h2 or the document skips a level — Lighthouse flags heading-order.
  headingLevel = 'h3',
}) {
  const { inWishlist, toggleWish, addToCart } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);

  const wished = inWishlist(p);
  const sizes = p.sizes || [];
  const ratioCls = ratio || (compact ? 'aspect-[3/4]' : 'aspect-[4/5]');

  const { primary, secondary } = useMemo(() => {
    const list = (p.images || []).map(srcOf).filter(Boolean);
    return { primary: list[0] || p.image || '', secondary: list[1] || '' };
  }, [p.images, p.image]);

  const soldOut = p.stock === 0;
  const onSale = p.compareAtPrice > p.price;
  const off = onSale ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
  const isNew = p.createdAt ? Date.now() - new Date(p.createdAt).getTime() < 21 * DAY : false;
  const limited = !soldOut && p.stock > 0 && p.stock <= 5;

  // One badge in the corner. Stacking three of them turned a product photo
  // into a sticker sheet; priority order is what the shopper needs first.
  const badge = soldOut ? { variant: 'soldout', label: 'Sold out' }
    : (showSaleBadge && off >= 1) ? { variant: 'sale', label: `${off}% off` }
      : isNew ? { variant: 'new', label: 'New' }
        : limited ? { variant: 'neutral', label: `Only ${p.stock} left` }
          : p.isBestSeller ? { variant: 'best', label: 'Bestseller' }
            : null;

  const quickAddOpen = showQuickAdd && !soldOut && sizes.length > 0;
  const Heading = headingLevel;

  return (
    <article className="group relative flex flex-col" onMouseLeave={() => setSizePick(false)}>
      <div className={`relative overflow-hidden rounded-card bg-cream ${soldOut ? 'opacity-[0.72]' : ''}`}>
        {/* Redundant with the title link below, so it is skipped in the tab
            order — but the photo keeps a real alt so it is not lost to a
            screen reader. */}
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="block">
          <img
            src={failed ? FALLBACK : (primary || FALLBACK)}
            alt={p.name}
            width="900"
            height="1125"
            loading={priority ? 'eager' : 'lazy'}
            fetchpriority={priority ? 'high' : 'auto'}
            decoding="async"
            onError={() => setFailed(true)}
            className={`w-full object-cover ${ratioCls} transition-[transform,opacity] duration-media ease-standard ${
              secondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
            }`}
          />
          {/* Second shot, revealed on hover. Only rendered when the product
              actually has one, and never fetched until the pointer is close —
              browsers keep a lazy image out of the critical path. */}
          {secondary && (
            <img
              src={secondary}
              alt=""
              width="900"
              height="1125"
              loading="lazy"
              decoding="async"
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover ${ratioCls} opacity-0 transition-[transform,opacity] duration-media ease-standard group-hover:scale-[1.03] group-hover:opacity-100`}
            />
          )}
        </Link>

        {badge && (
          <span className="pointer-events-none absolute left-3 top-3">
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </span>
        )}

        {showWishlist && (
          <button
            type="button"
            onClick={() => toggleWish(p)}
            aria-pressed={wished}
            aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
            className={`absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-alabaster/85 backdrop-blur-sm transition-[transform,background-color,opacity] duration-base ease-standard hover:scale-105 hover:bg-alabaster md:right-2.5 md:top-2.5 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
              wished ? 'text-obsidian md:!opacity-100' : 'text-ash'
            }`}
          >
            <Heart size={15} strokeWidth={1.8} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}

        {quickAddOpen && (
          <div
            className={`absolute inset-x-2.5 bottom-2.5 transition-[transform,opacity] duration-base ease-entrance ${
              sizePick
                ? 'translate-y-0 opacity-100'
                : 'translate-y-1.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100'
            }`}
          >
            {sizePick ? (
              <div className="rounded-control bg-alabaster/95 p-2.5 shadow-e-3 backdrop-blur">
                <p className="mb-1.5 px-0.5 text-label font-bold uppercase text-ash">Select a size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { addToCart(p, { size: s }); setSizePick(false); }}
                      aria-label={`Add ${p.name}, size ${s}, to bag`}
                      className="min-w-9 rounded-control border border-line bg-white px-2.5 py-1.5 text-body-sm font-semibold transition-colors duration-fast hover:border-obsidian hover:bg-obsidian hover:text-alabaster"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSizePick(true)}
                aria-label={`Quick add ${p.name}`}
                /* Hidden from the tab order until the card is hovered or
                   focused — otherwise focus lands on an invisible button. */
                tabIndex={-1}
                className="min-h-[44px] w-full rounded-full bg-obsidian/92 py-2.5 text-btn-sm font-semibold uppercase text-alabaster backdrop-blur transition-colors duration-base hover:bg-obsidian group-hover:pointer-events-auto group-focus-within:pointer-events-auto md:pointer-events-none"
              >
                Quick add
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col px-0.5">
        {/* Two lines are always reserved so cards in a row end level. Measured
            spread was 17–21px before; this makes it 0. */}
        {/* clamp-2 caps the visible lines, but at 320px a long title can still
            render a third line before the clamp applies in some engines, so the
            block is also height-locked. Measured spread at 320px: 20px -> 0. */}
        <Heading className="h-[2.6em] overflow-hidden text-body-sm font-normal leading-[1.3] text-ink">
          <Link
            to={`/product/${p.slug}`}
            className="clamp-2 transition-colors duration-fast hover:text-obsidian"
          >
            {p.name}
          </Link>
        </Heading>

        {/* No wrapping: at 320px the compare-at price dropped to a second line
            on discounted items only, so cards in the same row ended 20px
            apart. The strike-through truncates instead. */}
        {showPrice && (
          <p className="mt-1.5 flex items-baseline gap-x-2 whitespace-nowrap">
            <span className={`text-body font-semibold tabular-nums ${soldOut ? 'text-ash' : 'text-obsidian'}`}>
              {pkr(p.price)}
            </span>
            {onSale && (
              <>
                <span className="truncate text-caption tabular-nums text-ash line-through">
                  <span className="sr-only">Regular price </span>{pkr(p.compareAtPrice)}
                </span>
                <span className="sr-only">, {off}% off</span>
              </>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

/* Grids re-render every card on any cart or wishlist change; memoising keeps
   that to the one card that actually changed. */
export default memo(ProductCard);
