import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import ProductImageZoom from '../../components/ProductImageZoom';
import { ytId } from '../../lib/media';

/* HUSHAE PDP gallery: an editorial image sequence, not a copied thumbnail rail.
   Desktop shows the garment as a composed look-book; mobile stays a fast swipe deck. */
export default function ProductGallery({ media, index, onIndex, productName }) {
  const deckRef = useRef(null);
  const [dot, setDot] = useState(index);

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

  const Frame = ({ item, eager = false, ratioClass = 'aspect-[4/5]', frameClass = '' }) => {
    if (!item || item.t === 'img') {
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

  return (
    <section aria-label={`${productName} gallery`}>
      {/* Phone: full-width, deliberate swipe deck. */}
      <div className="sm:hidden">
        <div ref={deckRef} className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain">
          {media.map((item, i) => <div key={`${item.url}-${i}`} className="w-full shrink-0 snap-center px-4"><Frame item={item} eager={i === 0} frameClass="rounded-none" /></div>)}
        </div>
        {media.length > 1 && <div className="mt-3 flex items-center justify-between border-y border-line py-2">
          <button type="button" className="grid h-11 w-11 place-items-center" aria-label="Previous image" onClick={() => deckRef.current?.scrollTo({ left: Math.max(0, dot - 1) * deckRef.current.clientWidth, behavior: 'smooth' })}><ChevronLeft size={17} /></button>
          <p className="text-label font-semibold tracking-[0.18em] text-ash">{String(dot + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}</p>
          <button type="button" className="grid h-11 w-11 place-items-center" aria-label="Next image" onClick={() => deckRef.current?.scrollTo({ left: Math.min(media.length - 1, dot + 1) * deckRef.current.clientWidth, behavior: 'smooth' })}><ChevronRight size={17} /></button>
        </div>}
      </div>

      {/* Desktop: asymmetric editorial contact sheet. Every image is visible,
          making the page feel like a HUSHAE look-book rather than a marketplace. */}
      <div className="hidden sm:grid sm:grid-cols-2 sm:gap-3 lg:gap-4">
        {media.map((item, i) => {
          const lead = i === 0;
          return <button key={`${item.url}-${i}`} type="button" onClick={() => onIndex(i)} aria-label={`View image ${i + 1} of ${media.length}`} className={`group relative block overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-obsidian focus-visible:ring-offset-4 ${lead ? 'col-span-2' : ''}`}>
            <Frame item={item} eager={i === 0} ratioClass={lead ? 'aspect-[4/5] lg:aspect-[5/6]' : 'aspect-[4/5]'} frameClass="rounded-none" />
            <span className="absolute bottom-0 left-0 h-px w-0 bg-obsidian transition-all duration-slow ease-standard group-hover:w-full" aria-hidden="true" />
            {item.t === 'video' && <span className="absolute inset-0 grid place-items-center text-alabaster"><Play size={24} fill="currentColor" /></span>}
          </button>;
        })}
      </div>
      <p className="mt-3 hidden text-label tracking-[0.18em] text-ash sm:block">LOOK {String(index + 1).padStart(2, '0')} — TAP AN IMAGE TO EXPLORE</p>
    </section>
  );
}
