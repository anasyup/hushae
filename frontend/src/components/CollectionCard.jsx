import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';
import { isOnSale } from '../lib/sale';
import { useApp } from '../store/AppContext';

/* ============================================================================
 * HUSHAE CollectionCard — Bespoke Luxury Standard (Dolce & Gabbana × The Row)
 *
 * SPECIFICATION:
 *   1. 3:4 Studio Portrait Canvas on #F8F8F8 Studio Ground
 *   2. Top-Right Minimalist Hairline Wishlist Heart Icon (D&G Inspired)
 *   3. Smooth 500ms Secondary Angle Crossfade on Hover
 *   4. Clean Category / Drop Eyebrow ("NEW COLLECTION" / "STUDIO ATELIER")
 *   5. Title Case Name with clean typographic hierarchy
 *   6. Tabular Price with struck compare price (if on sale)
 *   7. Dedicated Color Swatches or Colorway Count Indicator
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F8F8F8"/><text x="50%" y="50%" fill="#CCCCCC" font-family="Jost,sans-serif" font-size="14" letter-spacing="3" text-anchor="middle">HUSHAE</text></svg>'
  );

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

export default function CollectionCard({ product: p, priority = false, rank = null }) {
  const { addToCart, inWishlist, toggleWish } = useApp();
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [swatchIdx, setSwatchIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [addedSize, setAddedSize] = useState(null);

  if (!p) return null;

  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[imgIdx] || images[0] || srcOf(p.image) || '';
  const second = images[1] || '';
  const hasSwap = Boolean(second) && second !== main;

  const swatches = (p.colors || []).filter((c) => c && c.hex).slice(0, 6);
  const sizes = (p.sizes || []).slice(0, 5);
  const name = titleCase(displayName(p.name)) || 'Essential Piece';
  const soldOut = p.stock === 0;
  const onSaleP = isOnSale(p);
  const wished = inWishlist(p);

  const badge = soldOut
    ? 'Sold out'
    : onSaleP && p.compareAtPrice > p.price
    ? 'Sale'
    : p.isNewArrival === true
    ? 'New'
    : null;

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
      {/* ── 3:4 STUDIO PORTRAIT CANVAS ──────────────────────────────────── */}
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

          {/* Top-Left Subtle Tag */}
          {(badge || rank) && (
            <div className="absolute left-3 top-3 z-10">
              <span
                className={`inline-block px-2.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] ${
                  rank
                    ? 'bg-[#000000] text-[#FFFFFF]'
                    : badge === 'Sale'
                    ? 'bg-[#000000] text-[#FFFFFF]'
                    : badge === 'Sold out'
                    ? 'bg-[#000000]/70 text-[#FFFFFF]'
                    : 'bg-[#FFFFFF] text-[#000000] shadow-xs'
                }`}
              >
                {rank ? `#0${rank} Icon` : badge}
              </span>
            </div>
          )}
        </Link>

        {/* Top-Right Wishlist Heart (Dolce & Gabbana Inspired) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWish(p);
          }}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-white/80 backdrop-blur-xs text-neutral-600 transition-all hover:bg-white hover:text-black shadow-xs"
        >
          <Heart
            size={14}
            strokeWidth={1.5}
            className={wished ? 'fill-black text-black' : ''}
          />
        </button>

        {/* Desktop 1-Click Discrete Size Selector Bar on Hover */}
        {!soldOut && sizes.length > 0 && (
          <div className="absolute inset-x-2 bottom-2 z-20 hidden md:block opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
            <div className="flex items-center justify-center gap-1 bg-white/95 backdrop-blur-md p-1.5 shadow-sm border border-neutral-200/70 rounded-full">
              <span className="text-[9.5px] uppercase font-medium tracking-wider text-neutral-400 pl-2 pr-1">
                Size:
              </span>
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={(e) => handleQuickAdd(s, e)}
                  className={`flex h-6 min-w-[26px] px-1.5 items-center justify-center rounded-full text-[10px] font-medium uppercase tracking-wider transition-colors ${
                    addedSize === s
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-black hover:bg-black hover:text-white'
                  }`}
                >
                  {addedSize === s ? <Check size={11} strokeWidth={2.2} /> : s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── CLEAN & SPACIOUS LUXURY METADATA (D&G / The Row Register) ────── */}
      <div className="pt-3.5 pb-4 px-1 space-y-1 bg-white">
        {/* Line 1: Category / Atelier Eyebrow */}
        <p className="text-[9.5px] uppercase tracking-[0.22em] text-neutral-400 font-medium">
          {p.categorySlug ? p.categorySlug.replace(/-/g, ' ') : 'HUSHAE ATELIER'}
        </p>

        {/* Line 2: Product Name (Title Case) */}
        <h3 className="font-normal text-[13.5px] md:text-[14px] text-[#000000] tracking-[-0.01em] truncate leading-snug">
          <Link
            to={`/product/${p.slug}`}
            className="transition-colors hover:text-neutral-500"
            title={name}
          >
            {name}
          </Link>
        </h3>

        {/* Line 3: Price Display + Color Swatches Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5 text-[13px] md:text-[13.5px]">
          <div className="flex items-baseline gap-2">
            {soldOut ? (
              <span className="text-neutral-400 font-light text-xs">Sold out</span>
            ) : (
              <>
                <span className="font-medium text-[#000000]">
                  {pkr(p.price)}
                </span>
                {onSaleP && p.compareAtPrice > p.price && (
                  <span className="text-[11.5px] text-neutral-400 line-through font-light">
                    {pkr(p.compareAtPrice)}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Color Swatch Dots */}
          {swatches.length > 0 && (
            <div className="flex items-center gap-1.5" role="group" aria-label={`Colors for ${name}`}>
              {swatches.slice(0, 4).map((c, i) => (
                <button
                  key={`${c.name}-${i}`}
                  type="button"
                  aria-label={c.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSwatchIdx(i);
                    const ci = images.indexOf(srcOf(c.image) || '');
                    if (ci >= 0) setImgIdx(ci);
                  }}
                  className="group/swatch relative flex h-3 w-3 items-center justify-center"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full border border-black/15 transition-transform ${
                      swatchIdx === i ? 'scale-125 ring-1 ring-black/80 ring-offset-1' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-hidden="true"
                  />
                </button>
              ))}

              {p.colors && p.colors.length > 4 && (
                <span className="text-[9.5px] text-neutral-400 font-light pl-0.5">
                  +{p.colors.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
