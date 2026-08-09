import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase, materialName } from '../lib/productMeta';

/* HUSHAE ProductCard — v4 "minimal 3D, cool" (used on every grid: home,
 * category, shop, rails, product page).
 *
 * The 3D is an accent, never decoration:
 *   · the image tile follows the cursor with a subtle perspective tilt
 *     (max ~5-6deg, desktop + fine pointer + reduced-motion OFF only)
 *   · on hover the card lifts with a warm floating shadow — no hard box
 *   · flat lay crossfades in with a 1.02 zoom (the one allowed motion)
 *
 * Default state stays completely clean — the product is the only thing
 * visible. Hover only: tilt, lift, arrows, counter, wishlist heart, thin
 * Quick add bar.
 *
 * Caption — a magazine line, refined:
 *   Everyday Bra           775
 *   Premium Modal
 *   S M L XL · Slate
 * Sale prints "PKR 600 ~~PKR 800~~". No badges except a quiet "New" chip.
 */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#EFE8DC"/><text x="50%" y="50%" fill="#8B8A87" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');

/* Brand name lives in the header — strip it from card names. */
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

  /* ── 3D tilt — cursor-follow perspective. Desktop + fine pointer only,
        and never when the visitor asked for reduced motion. ─────────── */
  const tiltRef = useRef(null);
  const [tilt, setTilt] = useState(null); // { rx, ry }
  const [tiltable, setTiltable] = useState(false);
  useEffect(() => {
    let fine = false, reduce = false;
    try { fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches; } catch { /* noop */ }
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* noop */ }
    setTiltable(fine && !reduce);
  }, []);

  const onTilt = (e) => {
    if (!tiltable) return;
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ rx: -py * 5, ry: px * 6 });
  };
  const clearTilt = () => setTilt(null);

  const ease = { transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)' };

  return (
    <article
      className="group"
      onMouseMove={onTilt}
      onMouseLeave={() => { setSizePick(false); clearTilt(); }}
    >
      {/* ── Image — tilts + lifts on hover, flat lay crossfades ────────── */}
      <Link
        to={`/product/${p.slug}`}
        tabIndex={-1}
        className="relative block overflow-hidden bg-sand transition-shadow duration-hover ease-luxury group-hover:shadow-[0_30px_60px_-30px_rgba(26,27,28,0.35)]"
      >
        {/* tilt layer — in-flow ratio so the card always has real height */}
        <div
          ref={tiltRef}
          className={`relative ${ratio} overflow-hidden transition-transform duration-[350ms] ease-luxury`}
          style={tilt
            ? { transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(1.015)` }
            : undefined}
        >
          <img
            src={failed ? FALLBACK : (primary || FALLBACK)}
            alt={`${name}, front view`}
            width="900" height="1200" loading={priority ? 'eager' : 'lazy'}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-hover ease-luxury group-hover:scale-[1.02] ${secondary ? 'transition-[opacity,transform] duration-[300ms] group-hover:opacity-0' : ''}`}
            style={ease}
          />
          {secondary && (
            <img src={secondary} alt="" loading="lazy" aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[300ms] group-hover:opacity-100"
              style={ease}
            />
          )}
        </div>

        {/* New arrivals — quiet white chip */}
        {p.isNewArrival && (
          <span className="pointer-events-none absolute left-2 top-2 z-10 bg-white/90 px-2 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-charcoal">
            New
          </span>
        )}

        {/* Browse arrows + counter — hover only */}
        {allImages.length > 1 && !sizePick && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i - 1 + allImages.length) % allImages.length); }}
              className="absolute left-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-charcoal opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => { e.preventDefault(); setImgIdx((i) => (i + 1) % allImages.length); }}
              className="absolute right-2 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-charcoal opacity-0 transition-opacity duration-300 hover:bg-white group-hover:opacity-100"
            >
              <ChevronRight size={14} />
            </button>
            <span className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 bg-white/85 px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] text-charcoal opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {String(imgIdx + 1).padStart(2, '0')} / {String(allImages.length).padStart(2, '0')}
            </span>
          </>
        )}

        {/* Wishlist heart — hover only, top-right, gold when wished */}
        {showWishlist && (
          <button
            type="button"
            onClick={async (e) => { e.preventDefault(); const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
            aria-label={`${wished ? 'Remove' : 'Save'} ${name}`}
            className={`absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/85 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${wished ? '!opacity-100' : ''}`}
          >
            <Heart size={14} strokeWidth={1.6} fill={wished ? 'currentColor' : 'none'} className={wished ? 'text-gold' : 'text-smoke'} />
          </button>
        )}

        {/* Quick add — thin bar, hover only; gold on its own hover */}
        {showQuickAdd && !soldOut && sizes.length > 0 && !sizePick && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setSizePick(true); }}
            className="absolute inset-x-0 bottom-0 z-10 translate-y-full bg-pearl/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-charcoal opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-gold hover:text-white"
            style={ease}
          >Quick add</button>
        )}
        {showQuickAdd && soldOut && !sizePick && (
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-full bg-pearl/95 py-2.5 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-smoke opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
            style={ease}
          >Sold out</span>
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-pearl/95 p-3">
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

      {/* ── Caption — magazine line ── */}
      <div className="mt-4 flex flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <Link to={`/product/${p.slug}`} className="min-w-0 text-[13px] font-medium leading-snug normal-case text-charcoal transition-colors duration-300 hover:text-smoke">
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
        {material && <p className="mt-1.5 text-[11px] leading-relaxed text-smoke">{material}</p>}
        {(sizes.length > 0 || colour) && (
          <p className="mt-1.5 text-[10px] tracking-[0.08em] text-smoke">
            {sizes.join('  ')}
            {colour && <><span className="mx-1.5 text-clay">·</span>{colour}</>}
          </p>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);
