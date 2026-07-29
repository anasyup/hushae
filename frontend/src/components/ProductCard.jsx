import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import Img from './Img';

/*
 * ProductCard — the visual for one product tile in Shop / Home rows.
 * The primary image is shown at all times. Image-swapping on hover was
 * removed at user request — no auto-flip on any device, ever.
 */
export default function ProductCard({
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
      <div className="relative overflow-hidden rounded-2xl bg-satin/50">
        <Link to={`/product/${p.slug}`} aria-label={p.name} className="block">
          {/* Primary image only — no hover swap */}
          <Img
            src={primary}
            alt={p.name}
            className={`w-full object-cover ${ratioCls}`}
          />
        </Link>

        {showSaleBadge && p.compareAtPrice && <span className="pill absolute left-3 top-3 bg-sage/85 text-obsidian">Save {Math.round((1 - p.price / p.compareAtPrice) * 100)}%</span>}
        {p.stock === 0 && <span className="pill absolute left-3 top-3 bg-obsidian/80 text-alabaster">Sold out</span>}

        {showWishlist && (
          <button onClick={() => toggleWish(p)} aria-label="Wishlist"
            className={`absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-alabaster/90 shadow-card transition hover:scale-105 md:right-3 md:top-3 md:h-9 md:w-9 ${wished ? 'text-obsidian' : 'text-ash'}`}>
            <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
          </button>
        )}

        {showQuickAdd && p.stock > 0 && (
          <div className={`absolute inset-x-3 bottom-3 transition-all duration-300 ${sizePick ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'}`}>
            {sizePick ? (
              <div className="rounded-2xl bg-alabaster/95 p-2.5 shadow-soft backdrop-blur">
                <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-ash">Select size</p>
                <div className="flex flex-wrap gap-1.5">
                  {sizes.map((s) => (
                    <button key={s} onClick={() => { addToCart(p, { size: s }); setSizePick(false); }}
                      className="min-w-9 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-semibold transition hover:border-obsidian hover:bg-obsidian hover:text-alabaster">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button onClick={() => setSizePick(true)}
                className="w-full rounded-full bg-obsidian/90 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-alabaster backdrop-blur transition hover:bg-obsidian">
                Quick Add
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/product/${p.slug}`} className="clamp-2 text-sm font-medium leading-snug text-obsidian hover:underline">{p.name}</Link>
        </div>
        {showPrice && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-semibold">{pkr(p.price)}</span>
            {p.compareAtPrice && <span className="text-xs text-ash line-through">{pkr(p.compareAtPrice)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
