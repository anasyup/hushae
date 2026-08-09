import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase, materialName } from '../lib/productMeta';

/* HUSHAE ProductCard — Calvin Klein register.
 * Clean, flat, silent. The photography carries the card.
 *   · flat tile, no border, no shadow, no rounded corners
 *   · hover = second image crossfades + whisper zoom (1.02)
 *   · UI (arrows, counter, heart, quick-add) appears only on hover
 *   · caption: name | price → material → sizes · colour
 */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F0F0F0"/><text x="50%" y="50%" fill="#707070" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

function ProductCard({
  product: p,
  showPrice = true,
  showQuickAdd = true,
  showWishlist = true,
  priority = false,
  ratio = 'aspect-[3/4]',
}) {
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
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block overflow-hidden bg-sand">
        <div className={`relative ${ratio} overflow-hidden transition-transform duration-hover ease-luxury group-hover:scale-[1.02]`} style={ease}>
          <img
            src={failed ? FALLBACK : (primary || FALLBACK)}
            alt={`${name}, front view`}
            width="900" height="1200" loading={priority ? 'eager' : 'lazy'}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[300ms] ${secondary ? 'group-hover:opacity-0' : ''}`}
            style={ease}
          />
          {secondary && (
            <img src={secondary} alt="" loading="lazy" aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[300ms] group-hover:opacity-100"
              style={ease}
            />
          )}
        </div>

        {p.isNewArrival && (
          <span className="pointer-events-none absolute left-2 top-2 z-10 bg-white/90 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-[#111111]">
            New
          </span>
        )}

        {allImages.length > 1 && !sizePick && (
          <>
            <button type="button" aria-label="Previous image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i - 1 + allImages.length) % allImages.length); }}
              className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#111111] opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100">
              <ChevronLeft size={14} />
            </button>
            <button type="button" aria-label="Next image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i + 1) % allImages.length); }}
              className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#111111] opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100">
              <ChevronRight size={14} />
            </button>
            <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 bg-white/85 px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] text-[#111111] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {String(imgIdx + 1).padStart(2, '0')} / {String(allImages.length).padStart(2, '0')}
            </span>
          </>
        )}

        {showWishlist && (
          <button type="button"
            onClick={async (e) => { e.preventDefault(); const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
            aria-label={`${wished ? 'Remove' : 'Save'} ${name}`}
            className={`absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/85 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${wished ? '!opacity-100' : ''}`}>
            <Heart size={14} strokeWidth={1.6} fill={wished ? 'currentColor' : 'none'} className={wished ? 'text-[#C9A96E]' : 'text-[#707070]'} />
          </button>
        )}

        {showQuickAdd && !soldOut && sizes.length > 0 && !sizePick && (
          <button type="button" onClick={(e) => { e.preventDefault(); setSizePick(true); }}
            className="absolute inset-x-0 bottom-0 z-10 translate-y-full bg-white/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#111111] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:text-[#C9A96E]"
            style={ease}>
            Quick add
          </button>
        )}
        {showQuickAdd && soldOut && !sizePick && (
          <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full bg-white/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#707070] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" style={ease}>
            Sold out
          </span>
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-white/95 p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {sizes.map((s) => (
                <button key={s} type="button"
                  onClick={(e) => { e.preventDefault(); addToCart(p, { size: s }); setSizePick(false); }}
                  className="min-w-[36px] border border-[#111111] px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#111111] transition-colors hover:bg-[#111111] hover:text-white">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Link>

      <div className="mt-3 flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <Link to={`/product/${p.slug}`} className="min-w-0 text-[13px] font-medium leading-snug normal-case text-[#111111] transition-colors duration-300 hover:text-[#707070]">
            {name}
          </Link>
          {showPrice && (
            soldOut ? (
              <span className="whitespace-nowrap text-[10px] font-normal uppercase tracking-[0.08em] text-[#707070]">Sold out</span>
            ) : (
              <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-[#111111]">
                {pkr(p.price)}
                {onSale && p.compareAtPrice > p.price && (
                  <span className="ml-1.5 text-[11px] font-normal text-[#707070] line-through tabular-nums">{pkr(p.compareAtPrice)}</span>
                )}
              </span>
            )
          )}
        </div>
        {material && <p className="mt-1 text-[11px] leading-relaxed text-[#707070]">{material}</p>}
        {(sizes.length > 0 || colour) && (
          <p className="mt-1 text-[10px] tracking-[0.08em] text-[#707070]">
            {sizes.join('  ')}
            {colour && <><span className="mx-1.5 text-[#E5E5E5]">·</span>{colour}</>}
          </p>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);
