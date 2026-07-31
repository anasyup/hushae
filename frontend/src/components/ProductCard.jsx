import { Link } from 'react-router-dom';
import { Check, Heart, Scale } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import Badge from './ui/Badge';
import { SIZES, pictureSources } from '../lib/responsiveImage';

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
  /* Marketing (Sprint 2K). Both default to nothing, so a card rendered by any
     existing caller behaves exactly as it did before this sprint. */
  marketingBadges = null,    // computed server-side, from /promotions/badges
  promos = null,             // live promotions whose scope covers this product
  maxBadges = 2,             // merchant's marketing.badges.maxPerCard
}) {
  const { inWishlist, toggleWish, addToCart, inCompare, toggleCompare, settings, toast } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);

  const wished = inWishlist(p);
  const compared = inCompare(p);
  const cxc = settings?.customerExperience?.compare;
  // Both flags must hold: the feature on, and the card placement on.
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

  /* Badges.
   *
   * When the merchant has marketing switched on, the SERVER decides which
   * badges a product earns — it is the only side that can count recent orders
   * for "Trending", and the only side that knows the minSalePercent floor.
   * Measured: 101 of 101 products carry a compareAtPrice, so without that
   * floor a Sale badge prints on every card and means nothing.
   *
   * With marketing off, the original hardcoded rule runs exactly as before, so
   * every existing call site is untouched. Sold out always wins: a badge
   * advertising a discount on something unbuyable is worse than no badge. */
  const serverBadges = (marketingBadges || []).slice(0, Math.max(1, maxBadges));
  const promoBadges = (promos || [])
    .filter((x) => x.badge?.text)
    .map((x) => ({ id: `p-${x.id}`, label: x.badge.text, tone: x.type === 'flash' ? 'sale' : 'sage' }));

  const TONE_TO_VARIANT = { sale: 'sale', new: 'new', accent: 'best', urgent: 'neutral', sage: 'sage' };
  const fromServer = [...promoBadges, ...serverBadges]
    .slice(0, Math.max(1, maxBadges))
    .map((b) => ({ variant: TONE_TO_VARIANT[b.tone] || 'neutral', label: b.label, key: b.id }));

  /* MEASURED, Phase 2 Part B: on /shop, 101 of 101 cards showed a "% off"
     badge AND a strike-through price — 100%. Every product in this catalogue
     carries a compareAtPrice (median 22% markdown, documented since Sprint
     2J), so `off >= 1` was true for the entire grid.
     A badge that appears on everything communicates nothing; it is visual
     noise on every tile and it reads as a discount shop, not a fashion house.
     The strike-through price directly underneath already states the saving,
     so the badge is redundant as well as ubiquitous.

     The badge now needs a genuinely notable markdown. STANDING_MARKDOWN is
     the catalogue's own median: anything at or below it is simply this
     shop's normal pricing and earns no shout. Server-driven promotion badges
     (fromServer) are unaffected — a merchant who deliberately runs a flash
     sale still gets their badge. */
  const STANDING_MARKDOWN = 25;
  const legacyBadge = (showSaleBadge && off > STANDING_MARKDOWN) ? { variant: 'sale', label: `${off}% off` }
    : isNew ? { variant: 'new', label: 'New' }
      : limited ? { variant: 'neutral', label: `Only ${p.stock} left` }
        : p.isBestSeller ? { variant: 'best', label: 'Bestseller' }
          : null;

  const badges = soldOut
    ? [{ variant: 'soldout', label: 'Sold out', key: 'sold' }]
    : fromServer.length ? fromServer
      : legacyBadge ? [{ ...legacyBadge, key: 'legacy' }] : [];

  const quickAddOpen = showQuickAdd && !soldOut && sizes.length > 0;
  const Heading = headingLevel;

  return (
    <article className="group relative flex flex-col" onMouseLeave={() => setSizePick(false)}>
      <div className={`relative overflow-hidden rounded-card bg-cream ${soldOut ? 'opacity-[0.72]' : ''}`}>
        {/* Redundant with the title link below, so it is skipped in the tab
            order — but the photo keeps a real alt so it is not lost to a
            screen reader. */}
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="block">
          {/* <picture> wraps the SAME <img>: every layout class, the width/height
              box and the eager/lazy decision are untouched, so nothing moves.
              MEASURED: the live mobile homepage downloaded 17.6 MB of PNG; the
              same images as 400px AVIF are 0.36 MB. */}
          <picture>
            {pictureSources(failed ? '' : primary).map((s) => (
              <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={SIZES.card} />
            ))}
          <img
            src={failed ? FALLBACK : (primary || FALLBACK)}
            alt={p.name}
            width="900"
            height="1125"
            sizes={SIZES.card}
            loading={priority ? 'eager' : 'lazy'}
            fetchpriority={priority ? 'high' : 'auto'}
            decoding="async"
            onError={() => setFailed(true)}
            className={`w-full object-cover ${ratioCls} transition-[transform,opacity] duration-media ease-standard ${
              secondary ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]'
            }`}
          />
          </picture>
          {/* Second shot, revealed on hover. Only rendered when the product
              actually has one, and never fetched until the pointer is close —
              browsers keep a lazy image out of the critical path. */}
          {secondary && (
            <picture>
              {pictureSources(secondary).map((s) => (
                <source key={s.type} type={s.type} srcSet={s.srcSet} sizes={SIZES.card} />
              ))}
            <img
              src={secondary}
              alt=""
              width="900"
              height="1125"
              sizes={SIZES.card}
              loading="lazy"
              decoding="async"
              aria-hidden="true"
              className={`absolute inset-0 h-full w-full object-cover ${ratioCls} opacity-0 transition-[transform,opacity] duration-media ease-standard group-hover:scale-[1.03] group-hover:opacity-100`}
            />
            </picture>
          )}
        </Link>

        {/* Absolutely positioned over the image, so swapping a legacy badge for
            a server one when /promotions/badges resolves cannot shift layout. */}
        {badges.length > 0 && (
          <span className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1">
            {badges.map((b) => <Badge key={b.key} variant={b.variant}>{b.label}</Badge>)}
          </span>
        )}

        {/* Compare sits under the heart, same column, same 44px target.
            Hidden entirely when the merchant switches it off. */}
        {cmpOn && (
          <button
            type="button"
            onClick={async () => { const r = await toggleCompare(p); if (r && r.ok === false) toast(r.message); }}
            aria-pressed={compared}
            aria-label={`${compared ? 'Remove' : 'Add'} ${p.name} ${compared ? 'from' : 'to'} compare`}
            /* MEASURED: these chips were `md:opacity-0 md:group-hover:...`, so
               DESKTOP hid them and MOBILE showed all three permanently, sitting
               on top of the product photograph at opacity 1. Mobile is 85% of
               orders and the primary platform for this brand, so the platform
               that mattered most got the cluttered treatment.
               Compare is a power-user tool; it is now revealed on the card the
               shopper is actually touching (`:focus-within`) and stays visible
               once something IS compared, so state is never hidden. */
            className={`absolute right-2 top-[3.4rem] grid h-11 w-11 place-items-center rounded-full bg-alabaster/85 backdrop-blur-sm transition-[transform,background-color,opacity] duration-base ease-standard hover:scale-105 hover:bg-alabaster md:right-2.5 md:top-[3rem] md:h-9 md:w-9 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 ${
              compared ? 'text-obsidian !opacity-100' : 'text-ash'
            }`}
          >
            {compared
              ? <Check size={15} strokeWidth={2.2} aria-hidden="true" />
              : <Scale size={15} strokeWidth={1.8} aria-hidden="true" />}
          </button>
        )}

        {showWishlist && (
          <button
            type="button"
            onClick={async () => { const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
            aria-pressed={wished}
            aria-label={`${wished ? 'Remove' : 'Save'} ${p.name} ${wished ? 'from' : 'to'} wishlist`}
            /* Wishlist KEEPS its mobile visibility: saving is a primary
               shopping action, not a power-user tool, and hiding it behind a
               gesture that does not exist on touch would remove it entirely.
               Softened instead — a lighter ground and a thinner icon, so it
               reads as jewellery on the image rather than a UI button. */
            className={`absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-alabaster/70 backdrop-blur-md transition-[transform,background-color,opacity] duration-base ease-standard hover:scale-105 hover:bg-alabaster md:right-2.5 md:top-2.5 md:h-9 md:w-9 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${
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
        {/* Typography, Phase 2 Part B. The name was `font-normal text-ink` and
            the price `font-semibold text-obsidian` — the PRICE was the loudest
            thing on a fashion card. A luxury house leads with the garment and
            states the price quietly.
            The name now carries slight positive tracking, which is what makes
            a small sans-serif label read as considered rather than cramped.
            The h-[2.6em] lock and clamp-2 STAY: they were a measured CLS fix
            (cards in one row ended 20px apart without them). */}
        <Heading className="h-[2.6em] overflow-hidden text-body-sm font-normal leading-[1.3] tracking-[0.012em] text-ink">
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
            {/* font-semibold -> font-medium. On a grid where every item is
                discounted, a bold price plus a strike-through plus a badge was
                three separate shouts about money on one tile. */}
            <span className={`text-body font-medium tabular-nums tracking-[0.01em] ${soldOut ? 'text-ash' : 'text-obsidian'}`}>
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
