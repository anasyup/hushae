import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase, materialName } from '../lib/productMeta';

/* ============================================================================
 * HUSHAE CollectionCard — exact client reference ("Hushae - Women Collection").
 *   · 3/4 tile, bg #f6f6f6, image zooms 1.05 on hover (0.6s cubic-bezier)
 *   · black badge top-left (New / Best Seller) — 10px, 4px 8px
 *   · white circle wishlist heart top-right — always visible, 32px, soft shadow
 *   · "+ Quick Add" slides up on hover (always visible on mobile ≤768px),
 *     inverts to black on hover
 *   · caption: colour swatches (12px, active = black ring) · title (13/500)
 *     · category (11 #777) · price (13/600) + struck old price (#999)
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F6F6F6"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

/* One shared category slug → name lookup for every card (single request). */
let catMap = null;
let catPromise = null;
const ensureCatMap = () => {
  if (catMap) return Promise.resolve(catMap);
  if (!catPromise) {
    catPromise = api('/categories')
      .then((d) => { catMap = Object.fromEntries((d.categories || []).map((c) => [c.slug, c.name])); return catMap; })
      .catch(() => { catMap = {}; return catMap; });
  }
  return catPromise;
};

const ZOOM = { transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)' };

function CollectionCard({ product: p, priority = false }) {
  const { inWishlist, toggleWish, addToCart, toast } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);
  const [catLabel, setCatLabel] = useState('');
  const wished = inWishlist(p);
  const sizes = p.sizes || [];
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);

  const img = p.images?.[0]?.url || srcOf(p.image) || '';
  const name = titleCase(displayName(p.name)) || 'Untitled';
  const badge = p.isBestSeller === true ? 'Best Seller' : p.isNewArrival ? 'New' : null;
  const caption = catLabel || materialName(p.fabric);

  useEffect(() => {
    if (!p.categorySlug) return;
    let alive = true;
    ensureCatMap().then((m) => { if (alive) setCatLabel(m[p.categorySlug] || ''); });
    return () => { alive = false; };
  }, [p.categorySlug]);

  return (
    <article className="group relative flex flex-col" onMouseLeave={() => setSizePick(false)}>
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f6f6f6]" style={{ aspectRatio: '3 / 4' }}>
        <img
          src={failed ? FALLBACK : (img || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.05]"
          style={ZOOM}
        />

        {badge && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 bg-[#000000] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.5px] text-[#ffffff]">
            {badge}
          </span>
        )}

        {/* Wishlist — white circle, always visible */}
        <button
          type="button"
          onClick={async (e) => { e.preventDefault(); const r = await toggleWish(p); if (r && r.ok === false) toast(r.message); }}
          aria-label={`${wished ? 'Remove' : 'Save'} ${name}`}
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-transform duration-200 hover:scale-110"
        >
          <Heart size={16} strokeWidth={1.8} fill={wished ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>

        {/* Quick add — slides up on hover; always visible on mobile */}
        {!sizePick && (
          soldOut ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 translate-y-0 bg-[rgba(255,255,255,0.95)] py-3 text-center text-[11px] font-semibold uppercase tracking-[1px] text-[#777777] md:translate-y-full md:group-hover:translate-y-0">
              Sold out
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); if (sizes.length > 0) setSizePick(true); else addToCart(p, {}); }}
              className="absolute inset-x-0 bottom-0 z-10 translate-y-0 bg-[rgba(255,255,255,0.95)] py-3 text-center text-[11px] font-semibold uppercase tracking-[1px] text-[#000000] transition-transform duration-300 hover:bg-[#000000] hover:text-[#ffffff] md:translate-y-full md:group-hover:translate-y-0"
            >
              + Quick Add
            </button>
          )
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 z-10 bg-[rgba(255,255,255,0.97)] p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {sizes.map((s) => (
                <button key={s} type="button"
                  onClick={(e) => { e.preventDefault(); addToCart(p, { size: s }); setSizePick(false); }}
                  className="min-w-[34px] border border-[#000000] px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[#000000] transition-colors hover:bg-[#000000] hover:text-[#ffffff]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* Caption */}
      <div className="pt-3.5">
        {(p.colors || []).length > 0 && (
          <div className="mb-2 flex gap-1.5">
            {(p.colors || []).slice(0, 3).map((c, i) => (
              <span key={`${c.name}-${i}`} title={c.name}
                className={`h-3 w-3 rounded-full border border-[#dddddd] ${i === 0 ? 'outline outline-1 outline-[#000000] outline-offset-2' : ''}`}
                style={{ backgroundColor: c.hex || '#EEEEEE' }} />
            ))}
          </div>
        )}
        <Link to={`/product/${p.slug}`} className="mb-1 block text-[13px] font-medium leading-snug text-[#111111] no-underline transition-colors duration-300 hover:text-[#666666]">
          {name}
        </Link>
        {caption && <p className="mb-1.5 text-[11px] text-[#777777]">{caption}</p>}
        <p className="text-[13px] font-semibold text-[#000000]">
          {soldOut ? 'Sold out' : pkr(p.price)}
          {onSale && p.compareAtPrice > p.price && (
            <span className="ml-1.5 text-[13px] font-normal text-[#999999] line-through">{pkr(p.compareAtPrice)}</span>
          )}
        </p>
      </div>
    </article>
  );
}

export default CollectionCard;
