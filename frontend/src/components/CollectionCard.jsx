import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';

/* ============================================================================
 * HUSHAE CollectionCard — two variants, both from client references:
 *
 *  · variant="bar"  (default) — luxury warm-nude card:
 *      #f4f1ea tile · main image scales 1.03 (0.8s cubic-bezier(0.16,1,0.3,1))
 *      while the second image crossfades (0.4s) · black "+ BUY NOW" bar slides
 *      up from the bottom (desktop hover-only, always visible on mobile) ·
 *      meta: 10px swatches · name 12/400 ls 0.3px · cost 12/500
 *
 *  · variant="pill" — "Complete The Look" PDP card:
 *      #f5efe6 tile · centred "Buy Now" pill (radius 20, 10px 24px, 11/600
 *      ls 0.5px) fades in on hover (always visible on mobile) · meta:
 *      title 13/500 · price 12px #555
 *
 * Buy Now always opens a size pick when the product needs one, otherwise it
 * adds straight to the bag. Sold-out shows a disabled label.
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F4F1EA"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

/* Luxury ease — 0.8s zoom on the main image. */
const EASE = { transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' };

function CollectionCard({ product: p, priority = false, variant = 'bar' }) {
  const { addToCart } = useApp();
  const [sizePick, setSizePick] = useState(false);
  const [failed, setFailed] = useState(false);
  const pill = variant === 'pill';

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
      <Link
        to={`/product/${p.slug}`}
        tabIndex={-1}
        className={`relative block w-full overflow-hidden ${pill ? 'bg-[#f3ede2]' : 'bg-[#f4f1ea]'}`}
        style={{ aspectRatio: '3 / 4' }}
      >
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

        {!sizePick && (
          soldOut ? (
            pill ? (
              <span className="pointer-events-none absolute bottom-[10px] left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-black px-[22px] py-2.5 text-[11px] font-semibold uppercase tracking-[1px] text-white opacity-100 md:bottom-[15px] md:opacity-0 md:group-hover:opacity-100">
                Sold Out
              </span>
            ) : (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] translate-y-0 bg-[#000000] py-3.5 text-center text-[11px] font-medium uppercase tracking-[2px] text-white md:translate-y-full md:group-hover:translate-y-0">
                Sold Out
              </span>
            )
          ) : pill ? (
            /* Centred pill — fades in on hover; always visible on mobile */
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); buy(); }}
              className="absolute bottom-[10px] left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-black px-[22px] py-2.5 text-[11px] font-semibold uppercase tracking-[1px] text-white opacity-100 transition-opacity duration-300 hover:bg-[#222222] md:bottom-[15px] md:opacity-0 md:group-hover:opacity-100"
            >
              Buy Now
            </button>
          ) : (
            /* Bottom bar — slides up on hover; always visible on mobile */
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
      <div className="pt-3">
        {!pill && (p.colors || []).length > 0 && (
          <div className="mb-1.5 flex gap-1.5">
            {(p.colors || []).slice(0, 3).map((c, i) => (
              <span key={`${c.name}-${i}`} title={c.name}
                className="h-[10px] w-[10px] rounded-full border border-black/15"
                style={{ backgroundColor: c.hex || '#EEEEEE' }} />
            ))}
          </div>
        )}
        {pill && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#888888]">HUSHAE</p>
        )}
        <Link
          to={`/product/${p.slug}`}
          className={`block no-underline transition-colors duration-200 hover:text-[#666666] ${pill ? 'mb-1 mt-0.5 text-[13px] font-medium' : 'text-[12px] font-normal tracking-[0.3px]'}`}
        >
          {name}
        </Link>
        {pill ? (
          <>
            <p className="text-[13px] font-semibold">
              {soldOut ? 'Sold out' : pkr(p.price)}
              {onSale && p.compareAtPrice > p.price && (
                <span className="ml-1.5 font-normal text-[#999999] line-through">{pkr(p.compareAtPrice)}</span>
              )}
            </p>
            {Number(p.ratingAvg || 0) > 0 && (
              <p className="mt-1 text-[11px] text-[#666666]">
                <span className="text-[#d4af37]" aria-hidden="true">★</span> {Number(p.ratingAvg).toFixed(1)}
              </p>
            )}
          </>
        ) : (
          <p className="mt-[3px] text-[12px] font-medium">
            {soldOut ? 'Sold out' : pkr(p.price)}
            {onSale && p.compareAtPrice > p.price && (
              <span className="ml-1.5 font-normal text-[#888888] line-through">{pkr(p.compareAtPrice)}</span>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

export default CollectionCard;
