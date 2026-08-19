import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';
import { isOnSale } from '../lib/sale';
import { useApp } from '../store/AppContext';
import SizeModal from './SizeModal';

/* ============================================================================
 * HUSHAE CollectionCard — Quiet Luxury Hybrid (Rains + Calvin Klein Standard)
 *
 * SPECIFICATION:
 *   1. 3:4 Studio Portrait Canvas on #F8F8F8
 *   2. Smooth 500ms Secondary Image Crossfade on Hover
 *   3. Desktop Hover Slide-Up Quick Size Selector Bar (1-Click Add to Bag)
 *   4. Minimalist Top-Left Badges (New, Sale, Sold out)
 *   5. Quiet Luxury Metadata:
 *      - Line 1: Title (Title Case) ... Price (Right-aligned, Jet Black)
 *      - Line 2: Interactive 8px Circular Color Swatches (Click/hover swaps image)
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F8F8F8"/><text x="50%" y="50%" fill="#BBBBBB" font-family="Jost,sans-serif" font-size="14" letter-spacing="3" text-anchor="middle">HUSHAE</text></svg>'
  );

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

export default function CollectionCard({ product: p, priority = false }) {
  const { addToCart } = useApp();
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [swatchIdx, setSwatchIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [addedSize, setAddedSize] = useState(null);
  const [modal, setModal] = useState(false);

  if (!p) return null;

  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[imgIdx] || images[0] || srcOf(p.image) || '';
  const second = images[1] || '';
  const hasSwap = Boolean(second) && second !== main;

  const swatches = (p.colors || []).filter((c) => c && c.hex).slice(0, 5);
  const sizes = (p.sizes || []).slice(0, 5);
  const name = titleCase(displayName(p.name)) || 'Essential Product';
  const soldOut = p.stock === 0;
  const onSaleP = isOnSale(p);

  const badge = soldOut
    ? 'Sold out'
    : onSaleP && p.compareAtPrice > p.price
    ? 'Sale'
    : p.isNewArrival === true
    ? 'New'
    : null;

  const cycle = (dir, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (images.length < 2) return;
    setImgIdx((i) => (i + dir + images.length) % images.length);
  };

  const handleQuickAdd = (selectedSize, e) => {
    e.preventDefault();
    e.stopPropagation();
    const chosenColor = p.colors?.[swatchIdx]?.name || p.colors?.[0]?.name || '';
    addToCart(p, { size: selectedSize, color: chosenColor, quantity: 1 });
    setAddedSize(selectedSize);
    setTimeout(() => setAddedSize(null), 1600);
  };

  return (
    <article
      className="group relative flex w-full min-w-0 flex-col bg-white select-none transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setImgIdx(0);
      }}
    >
      {/* ── 3:4 STUDIO CANVAS ───────────────────────────────────────────── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F8F8F8] transition-colors duration-300 group-hover:bg-[#F3F3F3]">
        <Link
          to={`/product/${p.slug}`}
          tabIndex={-1}
          aria-label={name}
          className="relative block h-full w-full overflow-hidden"
        >
          {/* Primary View */}
          <img
            src={failed ? FALLBACK : main || FALLBACK}
            alt={name}
            width="900"
            height="1200"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
            className={`h-full w-full object-cover object-center transition-opacity duration-500 ease-out ${
              hasSwap && isHovered && imgIdx === 0 ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Secondary Angle (Smooth Crossfade on Hover) */}
          {hasSwap && (
            <img
              src={second}
              alt=""
              aria-hidden="true"
              width="900"
              height="1200"
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-500 ease-out ${
                isHovered && imgIdx === 0 ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Minimalist Top-Left Badge */}
          {badge && (
            <div className="absolute left-2.5 top-2.5 z-10">
              <span
                className={`inline-block px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] ${
                  badge === 'Sale'
                    ? 'bg-[#000000] text-[#FFFFFF]'
                    : badge === 'Sold out'
                    ? 'bg-[#000000]/70 text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#000000] shadow-xs'
                }`}
              >
                {badge}
              </span>
            </div>
          )}
        </Link>

        {/* Multi-Image Hairline Browse Chevrons */}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-between px-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:flex">
            <button
              type="button"
              onClick={(e) => cycle(-1, e)}
              aria-label="Previous image"
              className="pointer-events-auto flex h-8 w-6 items-center justify-center text-black/50 hover:text-black transition-colors"
            >
              <ChevronLeft size={20} strokeWidth={1.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={(e) => cycle(1, e)}
              aria-label="Next image"
              className="pointer-events-auto flex h-8 w-6 items-center justify-center text-black/50 hover:text-black transition-colors"
            >
              <ChevronRight size={20} strokeWidth={1.2} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* ── DESKTOP SLIDE-UP QUICK SIZE SELECTOR (1-Click Add to Bag) ── */}
        {!soldOut && (
          <div className="absolute inset-x-2 bottom-2 z-20 hidden md:block opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            {sizes.length > 0 ? (
              <div className="flex items-center justify-center gap-1 bg-white/95 backdrop-blur-md p-1.5 shadow-md border border-neutral-200/80">
                <span className="text-[9.5px] uppercase font-medium tracking-wider text-neutral-500 pr-1 pl-1">
                  Add:
                </span>
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={(e) => handleQuickAdd(s, e)}
                    className={`flex h-7 min-w-[28px] px-1.5 items-center justify-center text-[10.5px] font-medium uppercase tracking-wider transition-colors ${
                      addedSize === s
                        ? 'bg-black text-white'
                        : 'bg-neutral-100/80 text-black hover:bg-black hover:text-white'
                    }`}
                  >
                    {addedSize === s ? <Check size={12} strokeWidth={2} /> : s}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleQuickAdd('', e)}
                className="flex min-h-[36px] w-full items-center justify-center bg-black text-[10.5px] font-medium uppercase tracking-[0.18em] text-white shadow-md hover:bg-neutral-800 transition-colors"
              >
                {addedSize === '' ? 'Added to Bag' : 'Quick Add'}
              </button>
            )}
          </div>
        )}
      </div>

      {modal && <SizeModal product={p} onClose={() => setModal(false)} />}

      {/* ── QUIET LUXURY METADATA AREA ───────────────────────────────────── */}
      <div className="pt-3 pb-2 px-0.5">
        {/* Line 1: Product Title & Price (Side by Side Baseline) */}
        <div className="flex items-baseline justify-between gap-2.5 text-[12.5px] sm:text-[13px]">
          <h3 className="min-w-0 truncate font-normal tracking-[-0.01em] text-[#000000]">
            <Link
              to={`/product/${p.slug}`}
              className="transition-colors hover:text-neutral-500"
              title={name}
            >
              {name}
            </Link>
          </h3>

          <div className="flex shrink-0 items-baseline gap-1.5 text-right font-normal text-[#000000]">
            {soldOut ? (
              <span className="text-neutral-400">Sold out</span>
            ) : (
              <>
                {onSaleP && p.compareAtPrice > p.price && (
                  <span className="text-[11px] text-neutral-400 line-through font-normal">
                    {pkr(p.compareAtPrice)}
                  </span>
                )}
                <span>{pkr(p.price)}</span>
              </>
            )}
          </div>
        </div>

        {/* Line 2: Circular Swatches & Subtle Fabric/Line Descriptor */}
        <div className="mt-1.5 flex items-center justify-between min-h-[16px]">
          {swatches.length > 0 ? (
            <div className="flex items-center gap-1.5" role="group" aria-label={`Colors for ${name}`}>
              {swatches.map((c, i) => (
                <button
                  key={`${c.name}-${i}`}
                  type="button"
                  aria-label={c.name || `Color ${i + 1}`}
                  title={c.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSwatchIdx(i);
                    const ci = images.indexOf(srcOf(c.image) || '');
                    if (ci >= 0) setImgIdx(ci);
                  }}
                  className="group/swatch relative flex h-3.5 w-3.5 items-center justify-center"
                >
                  <span
                    className={`h-2 w-2 rounded-full border border-black/10 transition-transform ${
                      swatchIdx === i ? 'scale-125 ring-1 ring-black/80 ring-offset-1' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-hidden="true"
                  />
                </button>
              ))}

              {p.colors && p.colors.length > 5 && (
                <span className="text-[9.5px] text-neutral-400 font-normal pl-0.5">
                  +{p.colors.length - 5}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">
              {p.gender === 'women' ? "Women's" : p.gender === 'men' ? "Men's" : 'Core'} &bull; Second Skin
            </span>
          )}

          {p.fabric && (
            <span className="text-[10px] uppercase tracking-[0.1em] text-neutral-400 font-light truncate max-w-[110px]">
              {p.fabric}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
