import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale, salePercent } from '../lib/sale';

/* HUSHAE v2 ProductCard — editorial minimal, no decoration.
   Single component, used everywhere. */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125"><rect width="100%" height="100%" fill="#E4DED4"/><text x="50%" y="50%" fill="#6E6760" font-family="Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');

function ProductCard({ product: p, showPrice = true, showQuickAdd = true, showWishlist = true, priority = false }) {
  const { inWishlist, toggleWish, addToCart, toast } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const wished = inWishlist(p);
  const sizes = p.sizes || [];
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const off = salePercent(p);
  const allImages = useMemo(() => (p.images || []).map(srcOf).filter(Boolean), [p.images]);
  const { primary, secondary } = useMemo(() => ({
    primary: allImages[imgIdx] || p.image || '',
    secondary: allImages.length > 1 ? allImages[(imgIdx + 1) % allImages.length] : allImages[1] || '',
  }), [allImages, imgIdx, p.image]);

  const genderStr = p.gender === 'women' ? "Women's" : p.gender === 'men' ? "Men's" : '';
  const catName = p.categoryName || p.category?.name || p.categorySlug || '';
  const subtitle = [genderStr, catName].filter(Boolean).join(' ');

  const ease = { transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' };

  return (
    <article className="product-tile group relative flex flex-col" onMouseLeave={() => setSizePick(false)}>
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block overflow-hidden bg-line">
        <img src={failed ? FALLBACK : (primary || FALLBACK)}
          alt={`${p.name}${subtitle ? ', ' + subtitle : ''}, front view`}
          width="900" height="1125" loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className={`w-full aspect-[4/5] object-cover transition-opacity duration-500 ${secondary ? 'group-hover:opacity-0' : ''}`}
          style={ease} />
        {secondary && (
          <img src={secondary} alt="" loading="lazy" aria-hidden="true"
            className="absolute inset-0 w-full aspect-[4/5] object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={ease} />
        )}
        {onSale && off > 0 && (
          <span className="absolute left-2 top-2 border border-obsidian bg-white/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-obsidian">{off}% off</span>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-ash">Sold out</span>
        )}
        {/* Image browse arrows + counter — CK-style, show on hover */}
        {allImages.length > 1 && !sizePick && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i - 1 + allImages.length) % allImages.length); }}
              className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i + 1) % allImages.length); }}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight size={15} />
            </button>
            <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/85 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-neutral-900 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
              {imgIdx + 1} of {allImages.length}
            </span>
          </>
        )}
        {showWishlist && (
          <button type="button" onClick={async (e) => { e.preventDefault(); const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
            aria-label={`${wished ? 'Remove' : 'Save'} ${p.name}`}
            className={`absolute right-2 top-2 grid h-9 w-9 place-items-center bg-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${wished ? '!opacity-100' : ''}`}>
            <Heart size={14} strokeWidth={1.5} fill={wished ? '#111111' : 'none'} className={wished ? 'text-obsidian' : 'text-ash'} />
          </button>
        )}
        {showQuickAdd && !soldOut && sizes.length > 0 && !sizePick && (
          <button type="button" onClick={(e) => { e.preventDefault(); setSizePick(true); }}
            className="absolute inset-x-0 bottom-0 translate-y-full bg-white/95 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-obsidian opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            style={ease}>Quick add</button>
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 bg-white/95 p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {sizes.map((s) => (
                <button key={s} type="button" onClick={(e) => { e.preventDefault(); addToCart(p, { size: s }); setSizePick(false); }}
                  className="min-w-[36px] border border-obsidian px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-obsidian transition-colors hover:bg-obsidian hover:text-white">{s}</button>
              ))}
            </div>
          </div>
        )}
      </Link>
      <div className="mt-2 flex flex-col">
        <Link to={`/product/${p.slug}`} className="text-[13px] font-medium uppercase tracking-[0.04em] text-obsidian leading-snug hover:opacity-60">{p.name}</Link>
        {subtitle && <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-ash">{soldOut ? 'Sold out' : subtitle}</p>}
        {showPrice && !soldOut && (
          <p className="mt-1 flex items-baseline gap-2 text-[13px]">
            <span className="font-medium tabular-nums text-obsidian">{pkr(p.price)}</span>
            {onSale && <span className="text-[11px] text-ash line-through tabular-nums">{pkr(p.compareAtPrice)}</span>}
          </p>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);
