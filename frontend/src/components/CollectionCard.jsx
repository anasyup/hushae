import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { pkr } from '../lib/format';
import { titleCase } from '../lib/productMeta';
import { isOnSale } from '../lib/sale';
import { CARD_NAME, CARD_NAME_LINK, CARD_SUBTITLE, cardSubtitle, PriceRow, SwatchRow } from '../lib/cardType';
import { useApp } from '../store/AppContext';
import SizeModal from './SizeModal';

/* ============================================================================
 * HUSHAE CollectionCard — two variants, both from client references:
 *
 *  · variant="minimal" (default) — Sale-page reference card (now the
 *      unified card for every page per merchant request):
 *      4/5 image on #f6f5f3 · UPPERCASE title 12px/700 · price + swatches
 *  · variant="bar" — exact client reference card:
 *      3/4 image #f2f0ec · hover: arrows + dash indicators + floating "+"
 *      (bottom-right) which opens an IN-CARD size overlay (no popup) ·
 *      details: title 12px medium UPPERCASE tracking-wider · price 11px
 *      struck original + semibold current
 *  · variant="pill" — PDP "Related Products" card:
 *      #f3ede2 tile · rounded Buy Now pill fade-in → SizeModal · brand line
 * ========================================================================== */

const FALLBACK =
  'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><rect width="100%" height="100%" fill="#F2F0EC"/><text x="50%" y="50%" fill="#999999" font-family="Jost,Helvetica,Arial,sans-serif" font-size="16" letter-spacing="4" text-anchor="middle">HUSHAE</text></svg>');

const srcOf = (im) => (typeof im === 'string' ? im : im?.url || '');
const displayName = (name) => String(name || '').replace(/^HUSHAE\s+/i, '');

function CollectionCard({ product: p, priority = false, variant = 'minimal', ratio = 'aspect-[3/4.7]' }) {
  const { addToCart } = useApp();
  const [imgIdx, setImgIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [swatchIdx, setSwatchIdx] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [modal, setModal] = useState(false);

  const pill = variant === 'pill';
  const minimal = variant === 'minimal';
  const images = (p.images || []).map(srcOf).filter(Boolean);
  const main = images[imgIdx] || images[0] || srcOf(p.image) || '';

  /* Hover = ONE image change (primary -> secondary), no auto-cycle.
     Mouse leave returns to the first image. Arrows still allow manual browse. */
  useEffect(() => {
    if (!isHovered) { setImgIdx(0); return; }
    if (images.length > 1) setImgIdx((i) => (i === 0 ? 1 : i));
  }, [isHovered]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = titleCase(displayName(p.name)) || 'Untitled';
  const soldOut = p.stock === 0;
  const badge = p.isNewArrival === true ? 'New' : p.isBestSeller === true ? 'Best Seller' : null;
  const subtitle = cardSubtitle(p);
  const sizes = p.sizes || [];

  const cycle = (dir) => {
    if (images.length < 2) return;
    setImgIdx((i) => (i + dir + images.length) % images.length);
  };

  /* ── PILL VARIANT (PDP Related Products) ─────────────────────────── */
  if (pill) {
    return (
      <article className="group relative flex flex-col">
        <Link to={`/product/${p.slug}`} tabIndex={-1} className="relative block w-full overflow-hidden bg-[#f3ede2]" style={{ aspectRatio: '3 / 4.7' }}>
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
        <div className="px-5 pb-5 pt-4">
          <SwatchRow
            product={p}
            onPick={(c, idx) => { setSwatchIdx(idx); const ci = images.indexOf(c.image || ''); if (ci >= 0) setImgIdx(ci); }}
          />
          <Link
            to={`/product/${p.slug}`}
            className={`${CARD_NAME} ${CARD_NAME_LINK} block`}
          >
            {name}
          </Link>
          {subtitle && (
            <p className={`${CARD_SUBTITLE} mt-[3px]`}>{subtitle}</p>
          )}
          <div className="mt-[3px] flex flex-wrap items-center gap-2">
            <PriceRow product={p} soldOut={soldOut} />
          </div>
        </div>
        {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
      </article>
    );
  }

  /* ── MINIMAL VARIANT — client Sale-grid reference ─────────────────── */
  /* Hairline full-bleed grid cell: 3/4.3 image on --pg-panel, hover image
     swap (secondary crossfades in) + 1.015 zoom, top-left badge, clickable
     colour swatches that switch the preview image, name 13px/500 sentence
     case, price row muted with struck compare-at. The whole cell links to
     the PDP; swatch buttons are real buttons nested outside the <a>. */
  if (minimal) {
    const swatches = (p.colors || []).filter((c) => c && c.hex).slice(0, 5);
    const minName = displayName(p.name) || 'Untitled';
    const onSaleP = isOnSale(p);
    const second = images[1] || '';
    const hasSwap = Boolean(second) && second !== main;
    const minBadge = soldOut ? null
      : onSaleP && p.compareAtPrice > p.price ? 'Sale'
      : p.isNewArrival === true ? 'New'
      : null;

    return (
      <article className="group relative flex w-full min-w-0 flex-col bg-white">
        <Link
          to={`/product/${p.slug}`}
          aria-label={minName}
          className="relative block w-full overflow-hidden bg-[var(--pg-panel,#f5f4f2)]"
          style={{ aspectRatio: '3 / 4.3' }}
        >
          {minBadge && (
            <span
              className={`absolute left-[10px] top-[10px] z-[2] rounded-[2px] px-2 py-1 text-[10.5px] uppercase tracking-[0.04em] ${
                minBadge === 'Sale' ? 'bg-[#141312] text-white' : 'bg-white text-[#141312]'
              }`}
            >
              {minBadge}
            </span>
          )}
          {soldOut && (
            <span className="absolute left-[10px] top-[10px] z-[2] rounded-[2px] bg-white px-2 py-1 text-[10.5px] uppercase tracking-[0.04em] text-[#141312]">
              Sold out
            </span>
          )}

          <img
            src={failed ? FALLBACK : (main || FALLBACK)}
            alt={minName}
            width="900" height="1200"
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none group-hover:scale-[1.015] ${
              hasSwap ? 'group-hover:opacity-0' : ''
            }`}
          />
          {hasSwap && (
            <img
              src={second}
              alt=""
              aria-hidden="true"
              width="900" height="1200"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none group-hover:scale-[1.015] group-hover:opacity-100"
            />
          )}

          {/* BUY NOW — always visible on mobile (no hover on touch), hover on lg+ */}
          {!soldOut && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setModal(true); }}
              className="absolute bottom-2 left-2 right-2 z-[3] flex items-center justify-center gap-1.5 bg-black/90 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black lg:bottom-3 lg:left-3 lg:right-3 lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
            >
              <span>Buy Now</span>
              <ShoppingBag size={13} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </Link>

        {modal && <SizeModal product={p} onClose={() => setModal(false)} />}
        <div className="px-[10px] pb-1 pt-[10px]">
          {/* Colour swatches.
              MEASURED: these rendered at 12x12 CSS px carrying a .hit-24
              helper — a 24px pseudo-element hit area with only 6px (gap-1.5)
              between neighbours, 297 instances sitewide. Two problems:
              24px is the bare WCAG 2.2 AA floor and well under the 44px iOS /
              48px Android guidance, and because the pitch was 18px while the
              hit boxes were 24px, ADJACENT HIT AREAS OVERLAPPED BY 6px. In the
              overlap the later sibling wins, so a tap on the right edge of one
              dot selected the NEXT colour. These are not decorative — tapping
              one swaps the card's preview image.

              Fixed by making the button itself the target instead of a
              pseudo-element: a 24px button with the 14px dot centred inside,
              4px apart. Pitch is 28px against a 24px target, so the hit areas
              tile with clearance and can never overlap — a tap always resolves
              to the dot under the finger. Row height 14px -> 24px, applied
              uniformly to every card, so no card shifts relative to another. */}
          {swatches.length > 0 && (
            <div className="mb-2 flex h-6 items-center gap-1" role="group" aria-label={`Colours for ${minName}`}>
              {swatches.map((c, i) => (
                <button
                  key={`${c.name}-${i}`}
                  type="button"
                  aria-label={c.name || `Colour ${i + 1}`}
                  aria-pressed={swatchIdx === i}
                  title={c.name}
                  onClick={() => {
                    setSwatchIdx(i);
                    const ci = images.indexOf(srcOf(c.image) || '');
                    if (ci >= 0) setImgIdx(ci);
                  }}
                  className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full"
                >
                  <span
                    className="block h-3.5 w-3.5 rounded-full border border-black/[.12]"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden="true"
                  />
                  {swatchIdx === i && (
                    <span className="pointer-events-none absolute inset-[2px] rounded-full border border-[#141312]" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}

          <h3 className="mb-1 font-sans text-[13px] font-medium normal-case leading-snug tracking-normal text-[#141312]">
            <Link to={`/product/${p.slug}`} className="transition-opacity hover:opacity-60">
              {minName}
            </Link>
          </h3>

          {/* Price row. #83817a measured 3.9:1 on white against a 4.5
              requirement, and the struck compare-at then had opacity-60 on
              top of that, taking it to roughly 2.3:1 — the was-price appears
              on every sale card sitewide and was the least readable text in
              any product grid. #6b6961 is 5.5:1, and the strike-through plus
              the darker current price already carry the "this is the old one"
              signal without dimming it into illegibility. */}
          <p className="flex flex-wrap items-baseline gap-2 text-[13px] text-[#6b6961]">
            {soldOut ? (
              <span className="text-[#141312]">Sold out</span>
            ) : (
              <>
                {onSaleP && p.compareAtPrice > p.price && (
                  <span className="line-through">{pkr(p.compareAtPrice)}</span>
                )}
                <span className="font-medium text-[#141312]">{pkr(p.price)}</span>
              </>
            )}
          </p>
        </div>
      </article>
    );
  }

  /* ── BAR VARIANT — client Rains-style card reference ─────────────── */
  /* 3/4 image on #f5f5f5 with hover image swap (secondary fades in) ·
     overlay colour swatches bottom-left (10px circles) · info row: name
     11px/600 UPPERCASE + price group (old struck #888, current #000 600) ·
     colour count line 10px #777. Side arrows + full-width BUY NOW (SizeModal)
     are preserved from the previous register, as is the top-left badge. */
  if (true) {
    const swatches = (p.colors || []).filter((c) => c && c.hex).slice(0, 4);
    const onSaleP = isOnSale(p);
    const second = images[1] || '';
    return (
      <article className="group relative flex w-full min-w-0 cursor-pointer select-none flex-col">
        <Link
          to={`/product/${p.slug}`}
          tabIndex={-1}
          aria-label={name}
          className="relative mb-3 block w-full overflow-hidden bg-[#f5f5f5]"
          style={{ aspectRatio: '3 / 4' }}
        >
          {/* Main image + hover swap */}
          <img
            src={failed ? FALLBACK : (main || FALLBACK)}
            alt={name}
            width="900" height="1200"
            loading={priority ? 'eager' : 'lazy'}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-opacity duration-300 ease-out"
          />
          {second && !failed && (
            <img
              src={second}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
            />
          )}

          {/* Badge — top left */}
          {badge && (
            <span className="absolute left-3 top-3 z-20 bg-black px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] text-white">
              {badge}
            </span>
          )}

          {/* Side arrows — plain < > chevrons (no circle), appear on hover */}
          {images.length > 1 && (
            <div className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-between px-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 lg:flex">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); cycle(-1); }}
                aria-label="Previous Image"
                className="pointer-events-auto flex h-8 w-8 items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform hover:scale-110"
              >
                <ChevronLeft size={26} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); cycle(1); }}
                aria-label="Next Image"
                className="pointer-events-auto flex h-8 w-8 items-center justify-center text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-transform hover:scale-110"
              >
                <ChevronRight size={26} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          )}

          {/* BUY NOW — full-width (opens SizeModal) */}
          {!soldOut ? (
            <div className="absolute bottom-2 left-2 right-2 z-20 opacity-100 transition-all duration-300 lg:bottom-3 lg:left-3 lg:right-3 lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setModal(true); }}
                className="flex w-full items-center justify-center gap-2 bg-black/90 px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black lg:py-3"
              >
                <span>Buy Now</span>
                <ShoppingBag size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <span className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 bg-black py-3 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white shadow-md">
              Sold Out
            </span>
          )}

          {/* Overlay colour swatches — bottom-left (Rains style) */}
          {swatches.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex gap-[5px]">
              {swatches.map((c, i) => (
                <span
                  key={`${c.name}-${i}`}
                  className="inline-block h-[10px] w-[10px] rounded-full border border-black/15 shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          )}
        </Link>

        {/* Rains info row — name | price, then colour count */}
        <div className="flex items-baseline justify-between gap-2 text-[11px] uppercase tracking-[0.8px]">
          <span className="min-w-0 truncate font-semibold text-[#111111]">{name}</span>
          <div className="flex shrink-0 items-center gap-1.5">
            {soldOut ? (
              <span className="font-semibold text-[#111111]">Sold out</span>
            ) : (
              <>
                {onSaleP && p.compareAtPrice > p.price && (
                  <span className="text-[10px] text-[#888888] line-through">{pkr(p.compareAtPrice)}</span>
                )}
                <span className={`${onSaleP && p.compareAtPrice > p.price ? 'font-semibold text-[#000000]' : 'font-semibold text-[#000000]'}`}>
                  {pkr(p.price)}
                </span>
              </>
            )}
          </div>
        </div>
        {swatches.length > 0 && (
          <p className="mt-1 text-[10px] tracking-[0.5px] text-[#777777]">
            {swatches.length} {swatches.length === 1 ? 'Color' : 'Colors'}
          </p>
        )}
      </article>
    );
  }
}

export default CollectionCard;
