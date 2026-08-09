import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { memo, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';

export default memo(function ProductCard({ product: p }) {
  const { inWishlist, toggleWish, addToCart } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const wished = inWishlist(p);
  const img = p.images?.[0]?.url || p.image;
  const sizes = p.sizes || [];
  const soldOut = p.stock === 0;
  const onSale = p.compareAtPrice && p.compareAtPrice > p.price;
  const off = onSale ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;

  return (
    <div className="group relative">
      <div className="relative overflow-hidden rounded-2xl bg-satin/50 shadow-soft">
        <Link to={`/product/${p.slug}`} aria-label={p.name}>
          <img src={img} alt={p.name} loading="lazy"
            className="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
        </Link>
        {onSale && !soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-sage/85 px-2.5 py-1 text-[10px] font-bold text-obsidian">Save {off}%</span>
        )}
        {soldOut && (
          <span className="absolute left-3 top-3 rounded-full bg-obsidian/80 px-2.5 py-1 text-[10px] font-bold text-alabaster">Sold out</span>
        )}
        <button onClick={() => toggleWish(p)} aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-alabaster/90 shadow-card transition hover:scale-105 ${wished ? 'text-obsidian' : 'text-ash'}`}>
          <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
        </button>
        {!soldOut && (
          <div className={`absolute inset-x-3 bottom-3 transition-all duration-300 ${sizePick ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}>
            {sizePick ? (
              <div className="rounded-2xl bg-alabaster/95 p-2.5 shadow-soft backdrop-blur">
                <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-ash">Select size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button key={s} onClick={() => { addToCart(p, { size: s }); setSizePick(false); }}
                      className="min-w-9 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold transition hover:border-obsidian hover:bg-obsidian hover:text-alabaster">{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={() => setSizePick(true)}
                className="w-full rounded-full bg-obsidian/90 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-alabaster backdrop-blur transition hover:bg-obsidian">Quick Add</button>
            )}
          </div>
        )}
      </div>
      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${p.slug}`} className="clamp-2 text-sm font-medium leading-snug text-obsidian hover:underline">{p.name}</Link>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold">{pkr(p.price)}</span>
          {onSale && <span className="text-xs text-ash line-through">{pkr(p.compareAtPrice)}</span>}
          {p.tier === 'Premium' && <span className="rounded-full bg-sage px-2 py-0.5 text-[9px] font-bold text-obsidian">Signature</span>}
        </div>
      </div>
    </div>
  );
});
