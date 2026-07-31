import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import Img from '../../components/Img';
import ProductImageZoom from '../../components/ProductImageZoom';
import { ytId } from '../../lib/media';
import { SIZES } from '../../lib/responsiveImage';

/* ============================================================================
 * Product gallery.
 *
 * Desktop keeps the thumbnail rail beside a sticky main frame. Mobile becomes
 * a real swipe deck with scroll-snap and a dot indicator, because the previous
 * build gave phones the same thumbnail strip — a 64px tap target under a photo
 * the shopper had already learned to swipe.
 *
 * Accessibility the old version had none of: the rail is a tablist, each thumb
 * reports aria-selected, arrow keys move between them, and the first image is
 * eager + high priority so it can be the LCP element instead of arriving late.
 * ========================================================================== */
export default function ProductGallery({ media, index, onIndex, productName }) {
  const railRef = useRef(null);
  const deckRef = useRef(null);
  const [dot, setDot] = useState(index);

  // Keep the mobile deck and the shared index in step, without fighting the
  // user's own scroll: only react to a settled position.
  useEffect(() => {
    const el = deckRef.current;
    if (!el) return undefined;
    let t;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const i = Math.round(el.scrollLeft / el.clientWidth);
        setDot(i);
        onIndex(i);
      }, 90);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); el.removeEventListener('scroll', onScroll); };
  }, [onIndex]);

  // When a colour swatch jumps the gallery, bring the deck along.
  useEffect(() => {
    setDot(index);
    const el = deckRef.current;
    if (el && Math.round(el.scrollLeft / el.clientWidth) !== index) {
      el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
    }
  }, [index]);

  const onRailKey = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const last = media.length - 1;
    const next = e.key === 'Home' ? 0
      : e.key === 'End' ? last
        : e.key === 'ArrowRight' ? Math.min(last, index + 1)
          : Math.max(0, index - 1);
    onIndex(next);
    railRef.current?.querySelectorAll('[role="tab"]')[next]?.focus();
  };

  const active = media[index] || media[0];

  const Frame = ({ m, eager, ratioClass }) => {
    if (!m || m.t === 'img') {
      return <ProductImageZoom src={m?.url} alt={m?.alt || productName} eager={eager} ratioClass={ratioClass} />;
    }
    const yt = ytId(m.url);
    return yt ? (
      <div className="overflow-hidden rounded-panel bg-obsidian">
        <iframe
          src={`https://www.youtube.com/embed/${yt}?rel=0`}
          title={`${productName} video`}
          className="aspect-[4/5] w-full"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    ) : (
      <div className="overflow-hidden rounded-panel bg-obsidian">
        <video src={m.url} className="aspect-[4/5] w-full object-cover" controls autoPlay muted loop playsInline />
      </div>
    );
  };

  return (
    <div className="lg:sticky lg:top-24 lg:self-start">
      {/* ── Mobile: swipe deck ─────────────────────────────────────────── */}
      <div className="sm:hidden">
        <div
          ref={deckRef}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          aria-label={`${productName} images`}
        >
          {/* aspect-[4/5] locks each slide's box before the image decodes.
              Without it the deck grew 745px -> 759px at 320px wide, measured
              as a 0.0149 shift. */}
          {media.map((m, i) => (
            <div key={i} className="aspect-[4/5] w-full shrink-0 snap-center px-4">
              <Frame m={m} eager={i === 0} />
            </div>
          ))}
        </div>

        {media.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {media.map((m, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1} of ${media.length}`}
                aria-current={i === dot}
                onClick={() => {
                  const el = deckRef.current;
                  if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
                }}
                /* 44px hit area around a 6px dot — the dot itself stays small. */
                className="grid h-11 w-5 place-items-center"
              >
                <span
                  className={`block rounded-full transition-all duration-base ease-standard ${
                    i === dot ? 'h-1.5 w-5 bg-obsidian' : 'h-1.5 w-1.5 bg-stone'
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tablet and up: rail + single frame ─────────────────────────── */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-[76px_1fr] lg:gap-4">
        <div
          ref={railRef}
          role="tablist"
          aria-orientation="vertical"
          aria-label={`${productName} images`}
          onKeyDown={onRailKey}
          className="flex flex-col gap-2 lg:gap-3"
        >
          {media.map((m, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              tabIndex={i === index ? 0 : -1}
              aria-label={m.t === 'video' ? 'Product video' : `Image ${i + 1} of ${media.length}`}
              onClick={() => onIndex(i)}
              className={`shrink-0 overflow-hidden rounded-control border-2 transition-[border-color,opacity] duration-base ${
                i === index ? 'border-obsidian' : 'border-transparent opacity-65 hover:opacity-100'
              }`}
            >
              {m.t === 'img' ? (
                /* 64 CSS px wide = 128 device px. Without an explicit sizes it
                   inherited SIZES.card and pulled the 800px variant for each
                   postage stamp — measured 4 x 800px files to draw 4 thumbs.
                   4/5 matches the main frame so the rail reads as the same
                   garment, not a set of differently-cropped stamps. */
                <Img src={m.url} alt="" sizes={SIZES.railThumb} className="aspect-[4/5] h-auto w-16 object-cover lg:w-[68px]" />
              ) : (
                <span className="relative flex aspect-[4/5] h-auto w-16 items-center justify-center bg-obsidian text-alabaster lg:w-[68px]">
                  {ytId(m.url) && (
                    <img
                      src={`https://img.youtube.com/vi/${ytId(m.url)}/hqdefault.jpg`}
                      alt="" loading="lazy" decoding="async"
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                    />
                  )}
                  <Play size={17} fill="currentColor" className="relative" aria-hidden="true" />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 4/5 up to lg, then 3/4 of the panel's own height on large screens.
            Expressed as an aspect so the box is still reserved before the
            image decodes — a min-height would have reintroduced the layout
            shift the 4/5 lock was added to fix. */}
        <div role="tabpanel" aria-live="polite">
          <Frame m={active} eager ratioClass="aspect-[4/5] lg:aspect-[3/4]" />
        </div>
      </div>
    </div>
  );
}
