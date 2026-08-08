import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase, materialName } from '../lib/productMeta';

/* HUSHAE v3 ProductCard — CDLP exact.
 *
 * Golden rule: if you can see the UI, it's too much. The product should be
 * the only thing visible.
 *
 *   ┌──────────────────┐
 *   │   MODEL IMAGE     │  3:4, no arrows/badges/counter by default,
 *   │  (hover→flat lay) │  everything appears behind hover only
 *   ├──────────────────┤
 *   │ Everyday Bra 775 │  name + price, same line, title case, Inter 500/14
 *   │ Premium Modal    │  fabric name, Inter 400/12, #707070
 *   │ S M L XL XXL     │  sizes as a clean text row, 11px
 *   │ Slate            │  colour as text, 11px
 *   └──────────────────┘
 *
 * Tile: #F6F6F6, no borders, no shadows, 0px radius. No badges — ever.
 * Sale price prints "PKR 775 PKR 1,030" (was-price struck through).
 */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#EDEDED"/><text x="50%" y="50%" fill="#707070" font-family="Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

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

  const ease = { transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' };

  return (
    <article className="group bg-[#F6F6F6]" onMouseLeave={() => setSizePick(false)}>
      {/* ── Image — 3:4, flat-lay crossfade on hover, UI is hover-only ── */}
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block overflow-hidden bg-[#F6F6F6]">
        <img
          src={failed ? FALLBACK : (primary || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200" loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className={`w-full aspect-[3/4] object-cover transition-opacity duration-500 ${secondary ? 'group-hover:opacity-0' : ''}`}
          style={ease} />
        {secondary && (
          <img src={secondary} alt="" loading="lazy" aria-hidden="true"
            className="absolute inset-0 w-full aspect-[3/4] object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={ease} />
        )}

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
            <Heart size={14} strokeWidth={1.5} fill={wished ? '#111111' : 'none'} className={wished ? 'text-[#111111]' : 'text-[#707070]'} />
          </button>
        )}

        {/* Quick add — thin bottom bar, hover only */}
        {showQuickAdd && !soldOut && sizes.length > 0 && !sizePick && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setSizePick(true); }}
            className="absolute inset-x-0 bottom-0 translate-y-full bg-white/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#111111] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            style={ease}
          >Quick add</button>
        )}
        {showQuickAdd && soldOut && !sizePick && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-white/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#707070] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            style={ease}
          >Sold out</span>
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 bg-white/95 p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {sizes.map((s) => (
                <button key={s} type="button"
                  onClick={(e) => { e.preventDefault(); addToCart(p, { size: s }); setSizePick(false); }}
                  className="min-w-[36px] border border-[#111111] px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white"
                >{s}</button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* ── Caption — a magazine line, not an ecommerce widget ── */}
      <div className="flex flex-col p-4">
        <div className="flex items-baseline justify-between gap-3">
          <Link to={`/product/${p.slug}`} className="min-w-0 text-[14px] font-medium leading-snug text-[#111111] hover:opacity-60">
            {name}
          </Link>
          {showPrice && (
            soldOut ? (
              <span className="whitespace-nowrap text-[11px] font-normal uppercase tracking-[0.08em] text-[#707070]">Sold out</span>
            ) : (
              <span className="whitespace-nowrap text-[14px] font-medium tabular-nums text-[#111111]">
                {pkr(p.price)}
                {onSale && p.compareAtPrice > p.price && (
                  <span className="ml-1.5 text-[11px] font-normal text-[#707070] line-through tabular-nums">{pkr(p.compareAtPrice)}</span>
                )}
              </span>
            )
          )}
        </div>
        {material && <p className="mt-1 text-[12px] leading-relaxed text-[#707070]">{material}</p>}
        {sizes.length > 0 && <p className="mt-1.5 text-[11px] tracking-[0.06em] text-[#707070]">{sizes.join('  ')}</p>}
        {colour && <p className="mt-1 text-[11px] text-[#707070]">{colour}</p>}
      </div>
    </article>
  );
}

export default memo(ProductCard);
