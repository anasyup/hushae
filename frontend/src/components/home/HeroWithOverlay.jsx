import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ============================================================================
 * HeroWithOverlay — CK monochrome luxury hero with cinematic caption overlay.
 *
 * The H1 sets the campaign name, a small tracked caps eyebrow sets season
 * context, a thin copy line tells the story. ONE primary CTA, ONE secondary.
 * Typography breathes — it sits bottom-left on desktop following the leading
 * line of the photograph and never fights the imagery.
 *
 * CALVIN KLEIN PRINCIPLE: one campaign, one headline, one CTA.
 * We render 4 slides but always with the SAME campaign overlay — every slide
 * is a different studio crop of the same collection, never different products.
 * ========================================================================== */

const SLIDES = [
  { src: '/images/campaign/qa/hero-new-1.jpg' },
  { src: '/images/campaign/qa/hero-new-2.jpg' },
  { src: '/images/campaign/qa/hero-new-3.jpg' },
  { src: '/images/campaign/qa/hero-new-4.jpg' },
];

export default function HeroWithOverlay() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <section
      className="relative aspect-[4/5] w-full overflow-hidden bg-white md:aspect-[16/9]"
      aria-roledescription="carousel"
      aria-label="Featured campaign"
    >
      {/* Slides crossfade */}
      {SLIDES.map((s, i) => (
        <div
          key={s.src}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          <img
            src={s.src}
            alt="HUSHAE — premium innerwear, made in Pakistan"
            fetchpriority={i === 0 ? 'high' : 'auto'}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </div>
      ))}

      {/* Graduated bottom scrim — gives the caption block legibility without
          darkening the whole frame. Reads as natural light, not a UI overlay. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 md:h-2/5"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 35%, rgba(0,0,0,0.18) 65%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Campaign caption — pinned bottom-left.
          Stays off the centre so the photography keeps every edge.            */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-12 pt-10 text-white md:px-16 md:pb-20 md:pt-16 lg:px-20 lg:pb-24 lg:pt-20">
        <div className="max-w-[640px]">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/80 md:text-[11px]">
            — The Daily Edit
          </p>
          <h1 className="mt-4 font-display text-[34px] font-light uppercase leading-[1.05] tracking-[0.04em] text-white md:text-[56px] md:leading-[0.98] md:tracking-[0.02em] lg:text-[68px]">
            Second Skin.
            <br className="hidden md:block" />
            <span className="block md:inline"> For every day.</span>
          </h1>
          <p className="mt-5 max-w-[40ch] text-[13px] font-normal leading-[1.6] text-white/85 md:mt-6 md:max-w-[44ch] md:text-[14px]">
            Crafted in Pakistan. Finished to an international standard. A four-piece wardrobe for the parts of you no one else sees.
          </p>

          {/* CTAs — ONE primary action, ONE quiet affordance */}
          <div className="mt-7 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4">
            <Link
              to="/shop"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 bg-white px-7 text-[11px] font-medium uppercase tracking-[0.22em] text-black transition-colors duration-300 hover:bg-white/85 md:min-h-[52px] md:px-9 md:text-[12px]"
              style={{ borderRadius: '0px' }}
            >
              Shop the Edit
              <span aria-hidden="true" className="text-[14px]">→</span>
            </Link>
            <Link
              to="/new"
              className="inline-flex min-h-[48px] items-center gap-2 border-b border-white/70 pb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors duration-300 hover:border-white md:min-h-[52px] md:text-[12px]"
              style={{ paddingTop: '14px', paddingBottom: '14px' }}
            >
              New Arrivals
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Slide arrows — luxury hairline circle */}
      <button
        type="button"
        onClick={() => setIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-transparent text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-black md:left-6"
      >
        <ChevronLeft size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => setIdx((i) => (i + 1) % SLIDES.length)}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-transparent text-white transition-all duration-300 hover:border-white hover:bg-white hover:text-black md:right-6"
      >
        <ChevronRight size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* Slide indicators */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 md:bottom-6 md:right-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === idx}
            className={`h-px w-8 transition-all duration-300 md:w-10 ${
              i === idx ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  );
}