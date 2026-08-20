import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';
import { isOnSale } from '../lib/sale';
import { useApp } from '../store/AppContext';

/* ============================================================================
 * HUSHAE CollectionCard — Quiet Luxury (Calvin Klein / The Row standard)
 *
 * SPECIFICATION:
 *   1. 3:4 Studio Portrait Canvas on #F8F8F8 Ground
 *   2. Smooth 500ms Secondary-Angle Crossfade on Hover (the ONLY motion)
 *   3. Desktop Hover Slide-Up Quick-Add — flat white bar, hairline border,
 *      no blur, no shadow, no label
 *   4. Status as plain tracked text (Sale / Sold out / New) — no boxed badges
 *   5. Clean Metadata: title, price row, delicate swatch dots
 *
 * Deliberately absent (removed as visual noise against luxury reference
 * standards): in-card image chevrons, "#01 Icon" rank plaques, backdrop-blur
 * panels, swatch scale/ring animations.
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F8F8F8"/><text x="50%" y="50%" fill="#CCCCCC" font-family="Jost,sans-serif" font-size="14" letter-spacing="3" text-anchor="middle">HUSHAE</text></svg>'
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

  if (!p) return null;

  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[imgIdx] || images[0] || srcOf(p.image) || '';
  const second = images[1] || '';
  const hasSwap = Boolean(second) && second !== main;

  const swatches = (p.colors || []).filter((c) => c && c.hex).slice(0, 6);
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
      className="group relative flex w-full min-w-0 select-none flex-col bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setImgIdx(0);
      }}
    >
      {/* ── 3:4 STUDIO CANVAS ───────────────────────────────────────────── */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#F8F8F8]">
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

          {/* Status — plain tracked text, no plaque */}
          {badge && (
            <span
              className={`absolute left-3 top-3 z-10 text-[10px] font-medium uppercase tracking-[0.18em] ${
                badge === 'Sold out' ? 'text-neutral-400' : 'text-black'
              }`}
            >
              {badge}
            </span>
          )}
        </Link>

        {/* ── DESKTOP SLIDE-UP QUICK ADD — flat, hairline, edge to edge ── */}
        {!soldOut && (
          <div className="absolute inset-x-0 bottom-0 z-20 hidden translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 md:block">
            {sizes.length > 0 ? (
              <div className="flex items-center justify-center gap-0.5 border-t border-[#EAEAEA] bg-white/95 py-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={(e) => handleQuickAdd(s, e)}
                    aria-label={`Add size ${s} to bag`}
                    className={`flex h-8 min-w-[32px] items-center justify-center px-1.5 text-[10.5px] font-medium uppercase tracking-wider transition-colors ${
                      addedSize === s
                        ? 'bg-black text-white'
                        : 'text-black hover:bg-black hover:text-white'
                    }`}
                  >
                    {addedSize === s ? <Check size={12} strokeWidth={2} aria-hidden="true" /> : s}
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => handleQuickAdd('', e)}
                className="flex min-h-[36px] w-full items-center justify-center border-t border-[#EAEAEA] bg-white/95 text-[10.5px] font-medium uppercase tracking-[0.18em] text-black transition-colors hover:bg-black hover:text-white"
              >
                {addedSize === '' ? 'Added to Bag' : 'Add to Bag'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── METADATA ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5 bg-white px-0.5 pt-3.5 pb-4 md:pt-4 md:pb-5">
        {/* Line 1: Product Title */}
        <h3 className="truncate text-[13px] font-normal leading-snug tracking-[-0.01em] text-black md:text-[14px]">
          <Link
            to={`/product/${p.slug}`}
            className="transition-colors hover:text-neutral-500"
            title={name}
          >
            {name}
          </Link>
        </h3>

        {/* Line 2: Price */}
        <div className="flex items-baseline gap-2 text-[13px] md:text-[14px]">
          {soldOut ? (
            <span className="font-normal text-neutral-400">Sold out</span>
          ) : (
            <>
              <span className="font-medium text-black">{pkr(p.price)}</span>
              {onSaleP && p.compareAtPrice > p.price && (
                <span className="text-[11.5px] font-normal text-neutral-400 line-through">
                  {pkr(p.compareAtPrice)}
                </span>
              )}
            </>
          )}
        </div>

        {/* Line 3: Swatches */}
        {swatches.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1" role="group" aria-label={`Colors for ${name}`}>
            {swatches.map((c, i) => (
              <button
                key={`${c.name}-${i}`}
                type="button"
                aria-label={c.name || `Color ${i + 1}`}
                aria-pressed={swatchIdx === i}
                title={c.name}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSwatchIdx(i);
                  const ci = images.indexOf(srcOf(c.image) || '');
                  if (ci >= 0) setImgIdx(ci);
                }}
                className="relative flex h-4 w-4 items-center justify-center"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full border transition-colors ${
                    swatchIdx === i ? 'border-black ring-1 ring-black ring-offset-1' : 'border-black/15'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-hidden="true"
                />
              </button>
            ))}

            {p.colors && p.colors.length > 6 && (
              <span className="pl-0.5 text-[9.5px] font-normal text-neutral-400">
                +{p.colors.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
