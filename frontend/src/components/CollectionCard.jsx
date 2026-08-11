import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase } from '../lib/productMeta';
import SizeModal from './SizeModal';

/* ============================================================================
 * HUSHAE CollectionCard — two variants, both from client references:
 *
 *  · variant="bar" (default) — "Fashion Product Grid" card:
 *      #e5e2e0 tile · image zooms 1.015 on hover · "New"/"Best Seller" badge
 *      bottom-left (#5b5b5b, radius 2) · hover overlay: 38px white arrow
 *      circles + centred "Buy Now" pill (radius 24, bottom 62) that opens the
 *      SizeModal + clickable dash indicators · 14px swatches with "+N" ·
 *      title 14/500 · price row 14px (struck original + current)
 *  · variant="pill" — PDP "Related Products" card:
 *      #f3ede2 tile · rounded Buy Now pill fade-in · brand line · 13/500
 *      title · 13/600 price + gold-star rating
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#E5E2E0"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

function CollectionCard({ product: p, priority = false, variant = 'bar', ratio = 'aspect-[3/4]' }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [swatch, setSwatch] = useState(0);
  const [modal, setModal] = useState(false);
  const pill = variant === 'pill';

  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[imgIdx] || images[0] || srcOf(p.image) || '';
  const name = titleCase(displayName(p.name)) || 'Untitled';
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const badge = p.isNewArrival === true ? 'New' : p.isBestSeller === true ? 'Best Seller' : null;

  const cycle = (dir) => {
    if (images.length < 2) return;
    setImgIdx((i) => (i + dir + images.length) % images.length);
  };

  const pickSwatch = (i) => {
    setSwatch(i);
    const c = (p.colors || [])[i];
    if (c?.image) {
      const idx = images.indexOf(c.image);
      if (idx >= 0) setImgIdx(idx);
    }
  };

  /* ── PILL VARIANT (PDP Related Products) ─────────────────────────── */
  if (pill) {
    return (
      <article className="group relative flex flex-col">
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f3ede2]" style={{ aspectRatio: '3 / 4' }}>
          <img
            src={failed ? FALLBACK : (main || FALLBACK)}
            alt={`${name}, front view`}
            width="900" height="1200"
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setModal(true); }}
            className="absolute bottom-[10px] left-1/2 z-[5] -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-black px-[22px] py-2.5 text-[11px] font-semibold uppercase tracking-[1px] text-white opacity-100 transition-opacity duration-300 hover:bg-[#222222] md:bottom-[15px] md:opacity-0 md:group-hover:opacity-100"
          >
            Buy Now
          </button>
        </Link>
        <div className="pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-[#888888]">HUSHAE</p>
          <Link to={`/product/${p.slug}`} className="mb-1 mt-0.5 block text-[13px] font-medium text-black no-underline transition-colors duration-200 hover:text-[#666666]">
            {name}
          </Link>
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
        </div>
        {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
      </article>
    );
  }

  /* ── BAR VARIANT — Fashion Product Grid ──────────────────────────── */
  const colors = p.colors || [];

  return (
    <article className="group relative min-w-0">
      <Link to={`/product/${p.slug}`} tabIndex={-1} className={`relative mb-3 block w-full overflow-hidden bg-[#e5e2e0] ${ratio}`}>
        <img
          src={failed ? FALLBACK : (main || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-[350ms] group-hover:scale-[1.015]"
        />

        {badge && (
          <span className="pointer-events-none absolute bottom-2 left-2 z-[5] rounded-[2px] bg-[#5b5b5b] px-[7px] py-1 text-[11px] font-medium leading-none text-white">
            {badge}
          </span>
        )}

        {/* Hover overlay — arrows, Buy Now, indicators */}
        <div className="absolute inset-0 z-[4] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => { e.preventDefault(); cycle(-1); }}
                className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border-0 bg-white/90 text-black shadow transition-opacity duration-300 hover:bg-white"
              >
                <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => { e.preventDefault(); cycle(1); }}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border-0 bg-white/90 text-black shadow transition-opacity duration-300 hover:bg-white"
              >
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </>
          )}

          {soldOut ? (
            <span className="pointer-events-none absolute bottom-[55px] left-1/2 min-w-[120px] -translate-x-1/2 rounded-[24px] bg-black px-5 py-[11px] text-center text-[11px] font-bold text-white md:bottom-[62px] md:min-w-[150px] md:px-7 md:py-[13px] md:text-[12px]">
              Sold Out
            </span>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setModal(true); }}
              className="absolute bottom-[55px] left-1/2 min-w-[120px] -translate-x-1/2 whitespace-nowrap rounded-[24px] border-0 bg-black px-5 py-[11px] text-[11px] font-bold tracking-[0.2px] text-white opacity-100 transition-[background,transform] duration-200 hover:scale-[1.03] hover:bg-[#222222] md:bottom-[62px] md:min-w-[150px] md:px-7 md:py-[13px] md:text-[12px] md:opacity-0 md:group-hover:opacity-100"
            >
              Buy Now
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-[16px] left-1/2 flex -translate-x-1/2 items-center gap-[5px] md:bottom-5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Image ${i + 1}`}
                  onClick={(e) => { e.preventDefault(); setImgIdx(i); }}
                  className={`h-[2px] border-0 transition-colors duration-200 ${i === imgIdx ? 'bg-white' : 'bg-white/65'}`}
                  style={{ width: 22 }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Swatches */}
      {colors.length > 0 && (
        <div className="mb-[5px] flex min-h-[31px] items-center gap-[7px] pt-[11px]">
          {colors.slice(0, 4).map((c, i) => (
            <button
              key={`${c.name}-${i}`}
              type="button"
              title={c.name}
              onClick={() => pickSwatch(i)}
              aria-label={c.name}
              className={`h-[14px] w-[14px] flex-0 rounded-full border border-[#cfcfcf] transition-transform duration-150 hover:scale-110 ${
                swatch === i ? 'outline outline-1 outline-black outline-offset-2' : ''
              }`}
              style={{ backgroundColor: c.hex || '#EEEEEE' }}
            />
          ))}
          {colors.length > 4 && (
            <span className="ml-px whitespace-nowrap text-[12px] text-[#555555]">+{colors.length - 4}</span>
          )}
        </div>
      )}

      {/* Details */}
      <div className="flex flex-col">
        <Link to={`/product/${p.slug}`} className="line-clamp-1 text-xs font-semibold uppercase tracking-wider text-black no-underline transition-colors duration-200 hover:text-[#666666]">
          {name}
        </Link>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {onSale && p.compareAtPrice > p.price && (
            <span className="font-normal text-neutral-400 line-through">{pkr(p.compareAtPrice)}</span>
          )}
          <span className="text-neutral-500">
            {soldOut ? 'Sold out' : pkr(p.price)}
          </span>
        </div>
      </div>

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
    </article>
  );
}

export default CollectionCard;
