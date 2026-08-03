import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale, salePercent } from '../lib/sale';

/* HUSHAE v2 ProductCard — editorial minimal, no decoration.
   Single component, used everywhere. */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1125"><rect width="100%" height="100%" fill="#E3E2DF"/><text x="50%" y="50%" fill="#6E6E6B" font-family="Archivo,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');

function ProductCard({ product: p, showPrice = true, showQuickAdd = true, showWishlist = true, priority = false }) {
  const { inWishlist, toggleWish, addToCart, toast } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);
  const wished = inWishlist(p);
  const sizes = p.sizes || [];
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const off = salePercent(p);
  const { primary, secondary } = useMemo(() => {
    const list = (p.images || []).map(srcOf).filter(Boolean);
    return { primary: list[0] || p.image || '', secondary: list[1] || '' };
  }, [p.images, p.image]);

  const genderStr = p.gender === 'women' ? "Women's" : p.gender === 'men' ? "Men's" : '';
  const catName = p.categoryName || p.category?.name || p.categorySlug || '';
  const subtitle = [genderStr, catName].filter(Boolean).join(' ');

  const ease = { transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' };

  return (
    <article className="product-tile group relative flex flex-col" onMouseLeave={() => setSizePick(false)}>
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block overflow-hidden bg-[#E3E2DF]">
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
          <span className="absolute left-2 top-2 border border-[#0E0E0E] bg-white/90 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#0E0E0E]">{off}% off</span>
        )}
        {soldOut && (
          <span className="absolute left-2 top-2 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#6E6E6B]">Sold out</span>
        )}
        {showWishlist && (
          <button type="button" onClick={async (e) => { e.preventDefault(); const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
            aria-label={`${wished ? 'Remove' : 'Save'} ${p.name}`}
            className={`absolute right-2 top-2 grid h-9 w-9 place-items-center bg-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${wished ? '!opacity-100' : ''}`}>
            <Heart size={14} strokeWidth={1.5} fill={wished ? '#0E0E0E' : 'none'} className={wished ? 'text-[#0E0E0E]' : 'text-[#6E6E6B]'} />
          </button>
        )}
        {showQuickAdd && !soldOut && sizes.length > 0 && !sizePick && (
          <button type="button" onClick={(e) => { e.preventDefault(); setSizePick(true); }}
            className="absolute inset-x-0 bottom-0 translate-y-full bg-white/95 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-[#0E0E0E] opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            style={ease}>Quick add</button>
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 bg-white/95 p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {sizes.map((s) => (
                <button key={s} type="button" onClick={(e) => { e.preventDefault(); addToCart(p, { size: s }); setSizePick(false); }}
                  className="min-w-[36px] border border-[#0E0E0E] px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#0E0E0E] transition-colors hover:bg-[#0E0E0E] hover:text-white">{s}</button>
              ))}
            </div>
          </div>
        )}
      </Link>
      <div className="mt-2 flex flex-col">
        <Link to={`/product/${p.slug}`} className="text-[13px] font-medium uppercase tracking-[0.04em] text-[#0E0E0E] leading-snug hover:opacity-60">{p.name}</Link>
        {subtitle && <p className="mt-0.5 text-[11px] uppercase tracking-[0.08em] text-[#6E6E6B]">{soldOut ? 'Sold out' : subtitle}</p>}
        {showPrice && !soldOut && (
          <p className="mt-1 flex items-baseline gap-2 text-[13px]">
            <span className="font-medium tabular-nums text-[#0E0E0E]">{pkr(p.price)}</span>
            {onSale && <span className="text-[11px] text-[#6E6E6B] line-through tabular-nums">{pkr(p.compareAtPrice)}</span>}
          </p>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);
