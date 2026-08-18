import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SIZES, pictureSources } from '../../lib/responsiveImage';
import AtelierNotes from './AtelierNotes';

/* ============================================================================
 * HeroWithOverlay — CK monochrome luxury hero with cinematic caption overlay.
 *
 * THE SERIF MOMENT (Fraunces on H1)
 * HUSHAE uses two families: Jost (sans, workhorse) and Fraunces (serif,
 * reserved). The hero H1 is the ONE moment on the storefront where the
 * serif appears. Negative tracking (-0.005em) tightens it into display
 * register, and the clamp sizes it from 52px mobile to 96px desktop —
 * a commanding editorial scale the rest of the page deliberately avoids.
 *
 * Responsive images via <picture> AVIF/WebP allow the LCP candidate hero
 * to load the smallest possible file for the viewport.
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
      {SLIDES.map((s, i) => (
        <div
          key={s.src}
          aria-hidden={i !== idx}
          className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${i === idx ? 'opacity-100' : 'opacity-0'}`}
        >
          {/*
            AVIF/WebP <picture> for hero image — the LCP candidate.
            Falls back to JPEG for legacy browsers.
            `pictureSources` returns empty array if no optimized variant exists,
            in which case a plain <img> is rendered.
          */}
          {(() => {
            const sources = pictureSources(s.src);
            const img = (
              <img
                src={s.src}
                alt="HUSHAE — premium innerwear, made in Pakistan"
                fetchpriority={i === 0 ? 'high' : 'auto'}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover object-center"
              />
            );
            return sources.length ? (
              <picture className="block h-full w-full">
                {sources.map((src) => (
                  <source key={src.type} type={src.type} srcSet={src.srcSet} sizes={SIZES.hero} />
                ))}
                {img}
              </picture>
            ) : img;
          })()}
        </div>
      ))}

      {/* Graduated bottom scrim */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2 md:h-2/5"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.42) 35%, rgba(0,0,0,0.18) 65%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* AtelierNotes — live production indicator, Karachi workshop */}
      <AtelierNotes />

      {/* Campaign caption — bottom-left pinned */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-12 pt-10 text-white md:px-16 md:pb-20 md:pt-16 lg:px-20 lg:pb-24 lg:pt-20">
        <div className="max-w-[680px]">
          <p className="text-xs font-medium uppercase tracking-eyebrow text-white/80">
            — The Daily Edit
          </p>

          {/* THE SERIF MOMENT — Fraunces, display tracking-tight, editorial scale.
              Size ladder: 52px mobile → 80px tablet → 96px desktop. The editorial
              paragraph below gives context; the H1 does not need to describe the
              brand. */}
          <h1 className="mt-4 font-serif text-[3.25rem] font-light leading-[0.98] tracking-tight text-white md:text-[5rem] lg:text-[6rem]">
            Second Skin.
            <br />
            <span className="font-light text-white/85">For every day.</span>
          </h1>

          <p className="mt-5 max-w-[40ch] text-md font-normal leading-[1.6] text-white/80 md:mt-6 md:max-w-[44ch] md:text-lg md:leading-[1.65]">
            Crafted in Pakistan. Finished to an international standard.
            A four-piece wardrobe for the parts of you no one else sees.
          </p>

          {/* CTAs — differentiated weight: primary is white button, secondary is hairline */}
          <div className="mt-7 flex flex-wrap items-center gap-3 md:mt-10 md:gap-5">
            <Link
              to="/shop"
              className="inline-flex min-h-[52px] items-center justify-center gap-2 bg-white px-8 text-xs font-medium uppercase tracking-label text-black transition-colors duration-300 hover:bg-white/85 md:px-10"
            >
              Shop the Edit
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              to="/new"
              className="inline-flex min-h-[52px] items-center gap-2 border-b border-white/50 pb-1.5 text-xs font-medium uppercase tracking-label text-white/80 transition-colors duration-300 hover:border-white hover:text-white md:pb-2"
            >
              New Arrivals
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Slide arrows */}
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