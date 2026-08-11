import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';

/* ============================================================================
 * HUSHAE ProductCard — the brand's single card design (exact client reference,
 * warm-nude luxury card). Used everywhere: home, sale, search, rails, PDP.
 *   · 3/4 tile, bg #f4f1ea, main image scales 1.03 (0.8s cubic-bezier
 *     (0.16,1,0.3,1)) while the second image crossfades over it (0.4s)
 *   · "+ BUY NOW" — black bar slides up from the bottom (desktop hover-only,
 *     always visible on mobile); opens a size pick when needed, else adds
 *     straight to the bag
 *   · meta: 10px swatches · name 12/400 ls 0.3px · cost 12/500 (+ struck old)
 * `ratio` / `priority` are honoured for editorial layouts (The Edit).
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F4F1EA"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

const EASE = { transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' };

function ProductCard({ product: p, priority = false, ratio = 'aspect-[3/4]', compact = false }) {
  const { addToCart } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);

  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[0] || srcOf(p.image) || '';
  const hover = images[1] || '';
  const name = titleCase(displayName(p.name)) || 'Untitled';
  const sizes = p.sizes || [];
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);

  const buy = () => {
    if (sizes.length) setSizePick(true);
    else addToCart(p, {});
  };

  return (
    <article className="group relative flex flex-col" onMouseLeave={() => setSizePick(false)}>
      <Link to={`/product/${p.slug}`} tabIndex={-1} className={`relative block w-full overflow-hidden bg-[#f4f1ea] ${ratio}`}>
        {/* Main image — zooms on hover */}
        <img
          src={failed ? FALLBACK : (main || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-[transform,opacity] duration-[800ms] group-hover:scale-[1.03]"
          style={EASE}
        />
        {/* Hover image — crossfades over the main one */}
        {hover && (
          <img
            src={hover}
            alt=""
            loading="lazy"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100"
          />
        )}

        {/* + BUY NOW — slides up on hover; always visible on mobile */}
        {!sizePick && (
          soldOut ? (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] translate-y-0 bg-[#000000] py-3.5 text-center text-[11px] font-medium uppercase tracking-[2px] text-white md:translate-y-full md:group-hover:translate-y-0">
              Sold Out
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); buy(); }}
              className="absolute inset-x-0 bottom-0 z-[5] translate-y-0 bg-[#000000] py-3.5 text-center text-[11px] font-medium uppercase tracking-[2px] text-white transition-transform duration-300 hover:bg-[#1a1a1a] md:translate-y-full md:group-hover:translate-y-0"
              style={EASE}
            >
              + Buy Now
            </button>
          )
        )}
        {sizePick && (
          <div className="absolute inset-x-0 bottom-0 z-[5] bg-[#000000] p-3">
            <div className="flex flex-wrap justify-center gap-1.5">
              {sizes.map((s) => (
                <button key={s} type="button"
                  onClick={(e) => { e.preventDefault(); addToCart(p, { size: s }); setSizePick(false); }}
                  className="min-w-[34px] border border-white/60 px-2 py-1.5 text-[11px] font-medium uppercase tracking-[0.05em] text-white transition-colors hover:bg-white hover:text-black">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </Link>

      {/* Meta */}
      <div className={`${compact ? 'pt-2.5' : 'pt-3'}`}>
        {(p.colors || []).length > 0 && (
          <div className="mb-1.5 flex gap-1.5">
            {(p.colors || []).slice(0, 3).map((c, i) => (
              <span key={`${c.name}-${i}`} title={c.name}
                className="h-[10px] w-[10px] rounded-full border border-black/15"
                style={{ backgroundColor: c.hex || '#EEEEEE' }} />
            ))}
          </div>
        )}
        <Link to={`/product/${p.slug}`} className="block text-[12px] font-normal tracking-[0.3px] text-black no-underline transition-colors duration-200 hover:text-[#666666]">
          {name}
        </Link>
        <p className="mt-[3px] text-[12px] font-medium">
          {soldOut ? 'Sold out' : pkr(p.price)}
          {onSale && p.compareAtPrice > p.price && (
            <span className="ml-1.5 font-normal text-[#888888] line-through">{pkr(p.compareAtPrice)}</span>
          )}
        </p>
      </div>
    </article>
  );
}

export default memo(ProductCard);
