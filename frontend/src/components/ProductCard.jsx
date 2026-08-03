import { Link } from 'react-router-dom';
import { Check, Heart, Scale } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import Badge from './ui/Badge';
import { SIZES, pictureSources } from '../lib/responsiveImage';

/* ============================================================================
 * ProductCard — redesigned with exact Nike-style centered aesthetic.
 *
 * Clean borderless grid tile with centered typography:
 *   - Bold title in sentence case (centered).
 *   - Light category subtitle (centered).
 *   - Price in medium weight (centered).
 *   - Wishlist heart positioned elegantly at the top-left of the image.
 *   - Promo badges positioned elegantly at the top-right of the image.
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
  ratio = null,
  showPrice = true,
  sizeKey = 'card',
  showSaleBadge = true,
  showQuickAdd = true,
  showWishlist = true,
  priority = false,
  headingLevel = 'h3',
  marketingBadges = null,
  promos = null,
  maxBadges = 2,
}) {
  const { inWishlist, toggleWish, addToCart, inCompare, toggleCompare, settings, toast } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);

  const wished = inWishlist(p);
  const compared = inCompare(p);
  const cxc = settings?.customerExperience?.compare;
  const cmpOn = cxc ? (cxc.enabled !== false && cxc.showOnCard !== false) : false;
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

  const serverBadges = (marketingBadges || []).slice(0, Math.max(1, maxBadges));
  const promoBadges = (promos || [])
    .filter((x) => x.badge?.text)
    .map((x) => ({ id: `p-${x.id}`, label: x.badge.text, tone: x.type === 'flash' ? 'sale' : 'sage' }));

  const TONE_TO_VARIANT = { sale: 'sale', new: 'new', accent: 'best', urgent: 'neutral', sage: 'sage' };
  const fromServer = [...promoBadges, ...serverBadges]
    .slice(0, Math.max(1, maxBadges))
    .map((b) => ({ variant: TONE_TO_VARIANT[b.tone] || 'neutral', label: b.label, key: b.id }));

  const STANDING_MARKDOWN = 25;
  const legacyBadge = (showSaleBadge && off > STANDING_MARKDOWN) ? { variant: 'sale', label: `${off}% off` }
    : isNew ? { variant: 'quiet', label: 'New' }
      : limited ? { variant: 'neutral', label: `Only ${p.stock} left` }
        : p.isBestSeller ? { variant: 'best', label: 'Bestseller' }
          : null;

  const badges = soldOut
    ? [{ variant: 'soldout', label: 'Sold out', key: 'sold' }]
    : fromServer.length ? fromServer
      : legacyBadge ? [{ ...legacyBadge, key: 'legacy' }] : [];

  const quickAddOpen = showQuickAdd && !soldOut && sizes.length > 0;
  const Heading = headingLevel;

  // Format subtitle as Category and Gender (e.g. "Women's Bra" or "Men's Boxer")
  const getSubtitle = () => {
    const genderStr = p.gender === 'women' ? "Women's" : p.gender === 'men' ? "Men's" : "Unisex";
    // Deduce category name from categories or slugs
    const catName = p.categoryName || p.category?.name || (p.slug?.includes('bra') ? 'Bras' : p.slug?.includes('boxer') ? 'Boxers' : 'Essentials');
    return `${genderStr} ${catName}`;
  };

  return (
    <article className="group relative flex flex-col" onMouseLeave={() => setSizePick(false)}>
      {/* Image Container — clean borders, no thick roundings */}
      <div className={`relative overflow-hidden rounded-[4px] bg-[#F4F4F4] ring-1 ring-inset ring-transparent transition-[box-shadow] duration-slow ease-standard group-hover:ring-neutral-200 ${soldOut ? 'opacity-[0.75]' : ''}`}>
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="block">
          <picture>
            {pictureSources(failed ? '' : primary).map((s) => (
              <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={SIZES[sizeKey] || SIZES.card} />
            ))}
            <img
              src={failed ? FALLBACK : (primary || FALLBACK)}
              alt={p.name}
              width="900"
              height="1125"
              sizes={SIZES[sizeKey] || SIZES.card}
              loading={priority ? 'eager' : 'lazy'}
              fetchpriority={priority ? 'high' : 'auto'}
              decoding="async"
              onError={() => setFailed(true)}
              className={`w-full object-cover ${ratioCls} transition-[transform,opacity] duration-[700ms] ease-standard motion-reduce:transition-none ${
                secondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.015]'
              }`}
            />
          </picture>
          {secondary && (
            <picture>
              {pictureSources(secondary).map((s) => (
                <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={SIZES[sizeKey] || SIZES.card} />
              ))}
              <img
                src={secondary}
                alt=""
                width="900"
                height="1125"
                sizes={SIZES[sizeKey] || SIZES.card}
                loading="lazy"
                decoding="async"
                aria-hidden="true"
                className={`absolute inset-0 h-full w-full object-cover ${ratioCls} opacity-0 transition-[transform,opacity] duration-[700ms] ease-standard motion-reduce:transition-none group-hover:scale-[1.015] group-hover:opacity-100`}
              />
            </picture>
          )}
        </Link>

        {/* Badges on TOP-RIGHT (Nike style) */}
        {badges.length > 0 && (
          <span className="pointer-events-none absolute right-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 md:right-4 md:top-4">
            {badges.map((b) => <Badge key={b.key} variant={b.variant}>{b.label}</Badge>)}
          </span>
        )}

        {/* Wishlist on TOP-LEFT (Nike style) */}
        {showWishlist && (
          <button
            type="button"
            onClick={async () => { const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
            aria-pressed={wished}
            aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
            className={`absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/90 backdrop-blur-[2px] shadow-sm transition-[background-color,opacity,color] duration-base ease-standard hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
              wished ? 'text-red-500 !opacity-100' : 'text-neutral-600'
            }`}
          >
            <Heart size={15} strokeWidth={2} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
          </button>
        )}

        {/* Compare */}
        {cmpOn && (
          <button
            type="button"
            onClick={async () => { const r = await toggleCompare(p); if (r && r.ok === false) toast(r.message); }}
            aria-pressed={compared}
            aria-label={`${compared ? 'Remove' : 'Add'} ${p.name} ${compared ? 'from' : 'to'} compare`}
            className={`absolute left-3 top-[3.6rem] grid h-10 w-10 place-items-center rounded-full bg-white/90 backdrop-blur-[2px] shadow-sm transition-[background-color,opacity,color] duration-base ease-standard hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
              compared ? 'text-neutral-900 !opacity-100' : 'text-neutral-400'
            }`}
          >
            {compared
              ? <Check size={14} strokeWidth={2.5} aria-hidden="true" />
              : <Scale size={14} strokeWidth={1.8} aria-hidden="true" />}
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
              <div className="rounded-[4px] bg-white/95 p-2.5 shadow-sm backdrop-blur">
                <p className="mb-1.5 px-0.5 text-[10px] font-bold uppercase text-neutral-400">Select a size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { addToCart(p, { size: s }); setSizePick(false); }}
                      aria-label={`Add ${p.name}, size ${s}, to bag`}
                      className="min-w-9 rounded-[2px] border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold tracking-[0.04em] transition-colors duration-base ease-standard hover:border-neutral-900 hover:bg-neutral-900 hover:text-white"
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
                tabIndex={-1}
                className="min-h-[42px] w-full translate-y-full rounded-[2px] bg-white/90 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-neutral-900 backdrop-blur-[2px] transition-[transform,background-color] duration-slow ease-standard hover:bg-white group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:pointer-events-auto md:pointer-events-none"
              >
                Quick add
              </button>
            )}
          </div>
        )}
      </div>

      {/* Centered Borderless Caption (Nike Style) */}
      <div className="mt-4 flex flex-1 flex-col items-center text-center">
        {/* Title: sentence case, semibold, centered */}
        <Heading className="font-sans text-[14px] font-semibold text-neutral-900 leading-snug">
          <Link
            to={`/product/${p.slug}`}
            className="transition-colors duration-fast hover:text-neutral-500"
          >
            {p.name}
          </Link>
        </Heading>

        {/* Subtitle (Category): light gray, small, centered */}
        <p className="mt-1 text-[12px] text-neutral-500 font-light">
          {getSubtitle()}
        </p>

        {/* Price: medium weight, centered */}
        {showPrice && (
          <p className="mt-1.5 flex items-baseline justify-center gap-x-2 whitespace-nowrap text-[14px]">
            <span className={`font-semibold ${onSale ? 'text-neutral-900 font-bold' : 'text-neutral-900'}`}>
              {pkr(p.price)}
            </span>
            {onSale && (
              <span className="text-[12px] text-neutral-400 line-through font-light">
                {pkr(p.compareAtPrice)}
              </span>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);
