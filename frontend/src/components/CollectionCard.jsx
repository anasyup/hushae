import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchCats } from '../lib/catalogue';
import { pkr } from '../lib/format';
import { isOnSale } from '../lib/sale';
import { titleCase, materialName } from '../lib/productMeta';
import QuickView from './QuickView';

/* ============================================================================
 * HUSHAE CollectionCard — exact client reference ("CK Style Collection Layout").
 *   · 3/4 tile, bg #e5e5e5, main + hover image CROSSFADE (0.4s ease)
 *   · "New" badge bottom-left — #333333, 10px, 3px 8px, letter-spacing 0.5px
 *   · slider arrows (white 32px circles, soft shadow) — hover only
 *   · "Quick View" pill centred — hover only; always visible on mobile
 *   · dash indicators bottom centre — hover only; hidden on mobile
 *   · caption: swatches (12px, active black ring) · title 13/400 ·
 *     price 13/500 + struck old price (#888)
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#E5E5E5"/><text x="50%" y="50%" fill="#999999" font-family="Inter,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

function CollectionCard({ product: p, priority = false }) {
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [quickView, setQuickView] = useState(false);
  const [catLabel, setCatLabel] = useState('');

  const images = useMemo(() => (p.images || []).map(srcOf).filter(Boolean), [p.images]);
  const imgCount = images.length;
  const main = images[imgIdx] || srcOf(p.image) || '';
  const hover = imgCount > 1 ? images[(imgIdx + 1) % imgCount] : '';
  const name = titleCase(displayName(p.name)) || 'Untitled';
  const soldOut = p.stock === 0;
  const onSale = isOnSale(p);
  const caption = catLabel || materialName(p.fabric);

  useEffect(() => {
    if (!p.categorySlug) return;
    let alive = true;
    fetchCats().then((list) => { if (alive) setCatLabel(list.find((c) => c.slug === p.categorySlug)?.name || ''); });
    return () => { alive = false; };
  }, [p.categorySlug]);

  const cycle = (dir) => {
    if (imgCount < 2) return;
    setImgIdx((i) => (i + dir + imgCount) % imgCount);
  };

  return (
    <article className="group relative flex flex-col">
      <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#e5e5e5]" style={{ aspectRatio: '3 / 4' }}>
        {/* Main image */}
        <img
          src={failed ? FALLBACK : (main || FALLBACK)}
          alt={`${name}, front view`}
          width="900" height="1200"
          loading={priority ? 'eager' : 'lazy'}
          onError={() => setFailed(true)}
          className="absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-[400ms]"
          style={{ opacity: 1 }}
        />
        {/* Hover image — crossfades over the main one */}
        {hover && (
          <img
            src={hover}
            alt=""
            loading="lazy"
            aria-hidden="true"
            className="absolute inset-0 z-[2] h-full w-full object-cover opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100"
          />
        )}

        {/* New badge — bottom-left */}
        {(p.isNewArrival || p.isBestSeller === true) && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-[3] bg-[#333333] px-2 py-[3px] text-[10px] tracking-[0.5px] text-white">
            {p.isBestSeller === true ? 'Best Seller' : 'New'}
          </span>
        )}

        {/* Slider arrows — hover only */}
        {imgCount > 1 && (
          <>
            <button
              type="button" aria-label="Previous image"
              onClick={(e) => { e.preventDefault(); cycle(-1); }}
              className="absolute left-3 top-1/2 z-[4] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border-none bg-white text-black opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-opacity duration-300 group-hover:opacity-100"
            >
              <ChevronLeft size={15} aria-hidden="true" />
            </button>
            <button
              type="button" aria-label="Next image"
              onClick={(e) => { e.preventDefault(); cycle(1); }}
              className="absolute right-3 top-1/2 z-[4] grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border-none bg-white text-black opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.15)] transition-opacity duration-300 group-hover:opacity-100"
            >
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          </>
        )}

        {/* Quick View — centred pill; hover-only on desktop, always visible on mobile */}
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setQuickView(true); }}
          className="absolute bottom-[10px] left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap rounded-[20px] bg-black px-[22px] py-[10px] text-[12px] font-medium text-white opacity-100 transition-[opacity,transform] duration-300 md:bottom-[25px] md:opacity-0 md:group-hover:opacity-100"
        >
          Quick View
        </button>

        {/* Dash indicators — hover only, hidden on mobile */}
        {imgCount > 1 && (
          <div className="absolute bottom-[10px] left-1/2 z-[4] hidden -translate-x-1/2 items-center gap-1 opacity-0 transition-opacity duration-300 group-hover:opacity-100 md:flex">
            {images.map((_, i) => (
              <span key={i} className={`h-[2px] w-4 transition-colors duration-200 ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        )}
      </Link>

      {/* Caption */}
      <div className="pt-3">
        {(p.colors || []).length > 0 && (
          <div className="mb-2 flex gap-1.5">
            {(p.colors || []).slice(0, 3).map((c, i) => (
              <span key={`${c.name}-${i}`} title={c.name}
                className={`h-3 w-3 rounded-full border border-[#cccccc] ${i === 0 ? 'outline outline-1 outline-black outline-offset-1' : ''}`}
                style={{ backgroundColor: c.hex || '#EEEEEE' }} />
            ))}
          </div>
        )}
        <Link to={`/product/${p.slug}`} className="mb-1 block text-[13px] font-normal leading-snug text-black no-underline transition-colors duration-300 hover:text-[#666666]">
          {name}
        </Link>
        {caption && <p className="mb-1.5 text-[11px] text-[#777777]">{caption}</p>}
        <p className="text-[13px] font-medium text-black">
          {soldOut ? 'Sold out' : pkr(p.price)}
          {onSale && p.compareAtPrice > p.price && (
            <span className="ml-1.5 font-normal text-[#888888] line-through">{pkr(p.compareAtPrice)}</span>
          )}
        </p>
      </div>

      {quickView && (
        <QuickView
          product={{ ...p, _id: p._id }}
          onClose={() => setQuickView(false)}
        />
      )}
    </article>
  );
}

export default CollectionCard;
