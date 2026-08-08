import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import ProductImageZoom from '../../components/ProductImageZoom';
import { ytId } from '../../lib/media';

/* ============================================================================
 * HUSHAE PDP gallery — luxury spec.
 *
 * Desktop: ONE large main image (magnifier zoom 2.5x via ProductImageZoom) +
 * a thumbnail strip below. Clicking a thumb crossfades the main image (300ms).
 * If there is only one image, the main fills the column and no strip renders.
 *
 * Mobile: full-width horizontal swipe deck with snap + dot indicators.
 *
 * Videos (YouTube / mp4) are supported in both modes.
 * ========================================================================== */

const CROSSFADE = 'opacity-100';
const HIDDEN = 'opacity-0';

export default function ProductGallery({ media, index, onIndex, productName }) {
  const deckRef = useRef(null);
  const [dot, setDot] = useState(index);

  useEffect(() => { setDot(index); }, [index]);

  /* Mobile swipe deck — sync the active index from scroll position. */
  useEffect(() => {
    const el = deckRef.current;
    if (!el) return undefined;
    let timer;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setDot(next);
        onIndex(next);
      }, 80);
    };
    el.addEventListener('scroll', sync, { passive: true });
    return () => { clearTimeout(timer); el.removeEventListener('scroll', sync); };
  }, [onIndex]);

  useEffect(() => {
    setDot(index);
    const el = deckRef.current;
    if (el && Math.round(el.scrollLeft / Math.max(1, el.clientWidth)) !== index) {
      el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
    }
  }, [index]);

  const isVideo = (item) => item && item.t !== 'img';

  const Frame = ({ item, eager = false, ratioClass = 'aspect-[4/5]', frameClass = '' }) => {
    if (!isVideo(item)) {
      return <ProductImageZoom src={item?.url} alt={item?.alt || productName} eager={eager} ratioClass={ratioClass} frameClass={frameClass} />;
    }
    const id = ytId(item.url);
    return id ? (
      <div className={`${ratioClass} ${frameClass} overflow-hidden bg-obsidian`}>
        <iframe src={`https://www.youtube.com/embed/${id}?rel=0`} title={`${productName} video`} className="h-full w-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
      </div>
    ) : (
      <video src={item.url} className={`${ratioClass} ${frameClass} w-full object-cover bg-obsidian`} controls autoPlay muted loop playsInline />
    );
  };

  if (!media.length) return <div className="aspect-[4/5] bg-satin" />;

  const single = media.length === 1;

  return (
    <section aria-label={`${productName} gallery`}>
      {/* ── PHONE: full-width swipe deck with dots ─────────────────────── */}
      <div className="sm:hidden">
        <div ref={deckRef} className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
          {media.map((item, i) => (
            <div key={`${item.url}-${i}`} className="w-full shrink-0 snap-center px-4">
              <Frame item={item} eager={i === 0} frameClass="rounded-none" />
            </div>
          ))}
        </div>
        {media.length > 1 && (
          <div className="mt-3 flex items-center justify-between border-y border-line py-2">
            <button type="button" className="grid h-11 w-11 place-items-center" aria-label="Previous image" onClick={() => deckRef.current?.scrollTo({ left: Math.max(0, dot - 1) * deckRef.current.clientWidth, behavior: 'smooth' })}><ChevronLeft size={17} /></button>
            {/* Dots */}
            <div className="flex items-center gap-2">
              {media.map((m, i) => (
                <button key={i} type="button" aria-label={`Go to image ${i + 1}`} onClick={() => deckRef.current?.scrollTo({ left: i * deckRef.current.clientWidth, behavior: 'smooth' })}
                  className={`h-1.5 rounded-full transition-all duration-300 ${dot === i ? 'w-6 bg-obsidian' : 'w-1.5 bg-neutral-300'}`} />
              ))}
            </div>
            <button type="button" className="grid h-11 w-11 place-items-center" aria-label="Next image" onClick={() => deckRef.current?.scrollTo({ left: Math.min(media.length - 1, dot + 1) * deckRef.current.clientWidth, behavior: 'smooth' })}><ChevronRight size={17} /></button>
          </div>
        )}
      </div>

      {/* ── DESKTOP: main image + thumbnail strip with crossfade ───────── */}
      <div className="hidden sm:block">
        {/* Main image — the active one crossfades in over the previous (300ms) */}
        <div className="group/main relative aspect-[4/5] overflow-hidden bg-satin">
          {media.map((item, i) => (
            <div key={`${item.url}-${i}`} aria-hidden={i !== index}
              className={`absolute inset-0 transition-opacity duration-300 ease-out ${i === index ? CROSSFADE : HIDDEN}`}>
              <Frame item={item} eager={i === 0} ratioClass="aspect-[4/5]" frameClass="absolute inset-0" />
            </div>
          ))}
          {/* Editorial counter */}
          <span className="pointer-events-none absolute right-4 top-4 z-10 bg-white/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-900 backdrop-blur">
            {String(index + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
          </span>

          {/* SKIMS-style prev/next arrows — appear on hover */}
          {!single && (
            <>
              <button
                type="button"
                onClick={() => onIndex((index - 1 + media.length) % media.length)}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 opacity-0 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white group-hover/main:opacity-100"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => onIndex((index + 1) % media.length)}
                aria-label="Next image"
                className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 opacity-0 shadow-sm backdrop-blur transition-all duration-300 hover:bg-white group-hover/main:opacity-100"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail strip — 80px, horizontal scroll on overflow */}
        {!single && (
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {media.map((item, i) => (
              <button
                key={`${item.url}-${i}`}
                type="button"
                onClick={() => onIndex(i)}
                aria-label={`View image ${i + 1} of ${media.length}`}
                aria-current={i === index}
                className={`relative h-20 w-20 shrink-0 overflow-hidden border transition-all duration-200 ${
                  i === index ? 'border-obsidian' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                {isVideo(item) ? (
                  <span className="grid h-full w-full place-items-center bg-obsidian text-white"><Play size={16} fill="currentColor" /></span>
                ) : (
                  <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-ash">
          {single ? 'LOOK' : 'HOVER TO ZOOM · TAP A THUMBNAIL TO EXPLORE'}
        </p>
      </div>
    </section>
  );
}
