import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase, materialName } from '../lib/productMeta';

/* HUSHAE ProductCard — Quiet Architecture (CDLP × Jacquemus).
 *
 * Golden rule: if you can see the UI, it's too much.
 *
 *   ┌──────────────┐
 *   │   IMAGE 3:4  │  no bg, no border, no shadow — bleeds into the
 *   │ (hover: flat │  2px architectural mosaic the grid provides.
 *   │  lay + 1.02) │  default state: completely clean.
 *   └──────────────┘  hover only: arrows, counter, wishlist heart,
 *   Everyday Bra 775  thin "Quick add" bar.
 *   Premium Modal
 *   S M L XL
 *   Slate
 *
 * Caption is a magazine line: name + price same line (Inter 400 / 500, 13px),
 * material (11px smoke), sizes (10px smoke), colour (10px smoke).
 * Sale prints "PKR 600 ~~PKR 800~~". No badges — ever.
 */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#EDEDED"/><text x="50%" y="50%" fill="#8B8A87" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');

/* Brand name lives in the header — repeating "HUSHAE" on every card reads
   like keyword stuffing. Strip it from display names. */
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

function ProductCard({ product: p, showPrice = true, showQuickAdd = true, showWishlist = true, priority = false }) {
  const { inWishlist, toggleWish, addToCart, toast } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const wished = inWishlist(p);
  const sizes = p.sizes || [];
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const allImages = useMemo(() => (p.images || []).map(srcOf).filter(Boolean), [p.images]);
  const { primary, secondary } = useMemo(() => ({
    primary: allImages[imgIdx] || p.image || '',
    secondary: allImages.length > 1 ? allImages[(imgIdx + 1) % allImages.length] : allImages[1] || '',
  }), [allImages, imgIdx, p.image]);

  const name = titleCase(displayName(p.name)) || 'Untitled';
  const material = materialName(p.fabric);
  const colour = p.colors?.[0]?.name || '';

  const ease = { transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)' };

  return (
    <article className="group" onMouseLeave={() => setSizePick(false)}>
      {/* ── Image — 3:4, bleeds to the edge, hover = flat lay + 1.02 zoom ── */}
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block overflow-hidden bg-[#F5F3EF]">
        {/* zoom layer — in-flow with the 3:4 ratio so the card has real height;
            only the imagery scales, overlays stay put */}
        <div className="relative aspect-[3/4] overflow-hidden transition-transform duration-hover ease-luxury group-hover:scale-[1.02]">
          <img
            src={failed ? FALLBACK : (primary || FALLBACK)}
            alt={`${name}, front view`}
            width="900" height="1200" loading={priority ? 'eager' : 'lazy'}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[300ms] ${secondary ? 'group-hover:opacity-0' : ''}`}
            style={ease} />
          {secondary && (
            <img src={secondary} alt="" loading="lazy" aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[300ms] group-hover:opacity-100"
              style={ease} />
          )}
        </div>

        {/* Browse arrows + counter — hidden behind hover ONLY */}
        {allImages.length > 1 && !sizePick && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i - 1 + allImages.length) % allImages.length); }}
              className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-neutral-900 opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i + 1) % allImages.length); }}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-neutral-900 opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight size={14} />
            </button>
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/80 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-900 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {imgIdx + 1} of {allImages.length}
            </span>
          </>
        )}

        {/* Wishlist heart — hover only, top-right; stays visible once wished */}
        {showWishlist && (
          <button
            type="button"
            onClick={async (e) => { e.preventDefault(); const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
            aria-label={`${wished ? 'Remove' : 'Save'} ${name}`}
            className={`absolute right-2 top-2 grid h-8 w-8 place-items-center bg-white/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${wished ? '!opacity-100' : ''}`}
          >
            <Heart size={14} strokeWidth={1.5} fill={wished ? '#1A1B1C' : 'none'} className={wished ? 'text-charcoal' : 'text-smoke'} />
          </button>
        )}

        {/* Quick add — thin bottom bar, hover only */}
        {showQuickAdd && !soldOut && sizes.length > 0 && !sizePick && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setSizePick(true); }}
            className="absolute inset-x-0 bottom-0 translate-y-full bg-white/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-charcoal opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            style={ease}
          >Quick add</button>
        )}
        {showQuickAdd && soldOut && !sizePick && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-white/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-smoke opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            style={ease}
          >Sold out</span>
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 bg-white/95 p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {sizes.map((s) => (
                <button key={s} type="button"
                  onClick={(e) => { e.preventDefault(); addToCart(p, { size: s }); setSizePick(false); }}
                  className="min-w-[36px] border border-charcoal px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-charcoal transition-colors hover:bg-charcoal hover:text-white"
                >{s}</button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* ── Caption — a magazine line, 12px below the image ── */}
      <div className="mt-3 flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <Link to={`/product/${p.slug}`} className="min-w-0 text-[13px] font-normal leading-snug text-charcoal hover:opacity-60">
            {name}
          </Link>
          {showPrice && (
            soldOut ? (
              <span className="whitespace-nowrap text-[10px] font-normal uppercase tracking-[0.08em] text-smoke">Sold out</span>
            ) : (
              <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-charcoal">
                {pkr(p.price)}
                {onSale && p.compareAtPrice > p.price && (
                  <span className="ml-1.5 text-[11px] font-normal text-smoke line-through tabular-nums">{pkr(p.compareAtPrice)}</span>
                )}
              </span>
            )
          )}
        </div>
        {material && <p className="mt-1 text-[11px] leading-relaxed text-smoke">{material}</p>}
        {sizes.length > 0 && <p className="mt-1.5 text-[10px] tracking-[0.06em] text-smoke">{sizes.join('  ')}</p>}
        {colour && <p className="mt-1 text-[10px] text-smoke">{colour}</p>}
      </div>
    </article>
  );
}

export default memo(ProductCard);
