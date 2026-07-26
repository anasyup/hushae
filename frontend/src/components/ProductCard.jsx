import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import Img from './Img';

/*
 * ProductCard — the visual for one product tile in Shop / Home rows.
 * IMPORTANT: hover-swap of the second image runs ONLY on real pointer-fine
 * devices (desktop with a mouse). Touch devices show the primary image
 * only, so nothing "auto-changes" while the customer scrolls.
 */
export default function ProductCard({ product: p, compact = false }) {
  const { inWishlist, toggleWish, addToCart } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [hover, setHover] = useState(false);
  const [canHover, setCanHover] = useState(false); // true only on mice / trackpads

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHover(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  const wished = inWishlist(p);
  const images = (p.images || []).filter((im) => im && (im.url || typeof im === 'string'));
  const primary = images[0]?.url || images[0] || p.image;
  const secondary = images[1]?.url || images[1] || null;
  const sizes = p.sizes || [];

  // Only mouse devices flip images. On touch, `showSecondary` stays false.
  const showSecondary = canHover && hover && !!secondary;

  const mouseHandlers = canHover
    ? {
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => { setHover(false); setSizePick(false); },
      }
    : {};

  return (
    <div className="group relative" {...mouseHandlers}>
      <div className="relative overflow-hidden rounded-2xl bg-satin/50">
        <Link to={`/product/${p.slug}`} aria-label={p.name} className="block">
          {/* Primary image — always visible unless a real hover swap is happening */}
          <Img
            src={primary}
            alt={p.name}
            className={`w-full object-cover transition-opacity duration-500 ${compact ? 'aspect-[3/4]' : 'aspect-[4/5]'} ${showSecondary ? 'opacity-0' : 'opacity-100'}`}
          />
          {/* Secondary image — only mounted on hover-capable devices */}
          {canHover && secondary && (
            <Img
              src={secondary}
              alt={p.name}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${showSecondary ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
        </Link>

        {p.compareAtPrice && <span className="pill absolute left-3 top-3 bg-sage/85 text-obsidian">Save {Math.round((1 - p.price / p.compareAtPrice) * 100)}%</span>}
        {p.stock === 0 && <span className="pill absolute left-3 top-3 bg-obsidian/80 text-alabaster">Sold out</span>}

        <button onClick={() => toggleWish(p)} aria-label="Wishlist"
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-alabaster/90 shadow-card transition hover:scale-105 ${wished ? 'text-obsidian' : 'text-ash'}`}>
          <Heart size={16} fill={wished ? 'currentColor' : 'none'} />
        </button>

        {p.stock > 0 && (
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
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-semibold">{pkr(p.price)}</span>
          {p.compareAtPrice && <span className="text-xs text-ash line-through">{pkr(p.compareAtPrice)}</span>}
        </div>
      </div>
    </div>
  );
}
