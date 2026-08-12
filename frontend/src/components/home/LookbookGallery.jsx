import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* ============================================================================
 * THE LOOKBOOK — a horizontal, snap-scrolling editorial gallery.
 * Each plate is a real campaign photograph with a small tracked-caps
 * caption. A hairline progress seam (SVG) fills beneath the strip as you
 * move through it — GSAP + ScrollTrigger pinning the strip while the
 * progress seam draws. This is the house's own detail: a seam that measures
 * the page, like a tailor's chalk line.
 * ========================================================================== */

gsap.registerPlugin(ScrollTrigger);

const PLATES = [
  { img: '/images/campaign/qa/editorial-modern.jpg', cap: 'The Spring Silhouette' },
  { img: '/images/campaign/qa/editorial-performance.jpg', cap: 'Performance Edit' },
  { img: '/images/campaign/qa/hero-women.jpg', cap: 'For Her' },
  { img: '/images/campaign/qa/hero-men.jpg', cap: 'For Him' },
  { img: '/images/campaign/qa/hero-fabric.jpg', cap: 'The Fabric Study' },
];

export default function LookbookGallery() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const seamRef = useRef(null);
  const pathRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return undefined;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      const getDist = () => track.scrollWidth - track.clientWidth;
      const tween = gsap.to(track, {
        x: () => -getDist(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${getDist()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
      // Progress seam — the SVG hairline fills as the strip moves.
      const path = pathRef.current;
      if (path && typeof path.getTotalLength === 'function') {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(path, {
          strokeDashoffset: 0,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${getDist()}`, scrub: 1 },
        });
      }
      return () => { tween.scrollTrigger?.kill(); tween.kill(); };
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-[#fcfbf9]">
      <div className="flex h-screen flex-col justify-center px-5 py-16 md:px-10">
        <div data-reveal className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
              The Lookbook
            </p>
            <h2 className="mt-3 font-display text-2xl font-light uppercase tracking-[0.16em] text-[#111111] md:text-3xl">
              The Edit in Motion
            </h2>
          </div>
          <p className="hidden text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400 md:block">
            Scroll to move
          </p>
        </div>

        {/* Horizontal strip — snap-scrolled on touch, pinned + GSAP-scrubbed on desktop */}
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-8 md:snap-none md:overflow-visible md:pb-0 md:will-change-transform"
        >
          {PLATES.map((p) => (
            <figure
              key={p.cap}
              className="group relative aspect-[3/4] w-[78vw] shrink-0 snap-center overflow-hidden bg-[#f2f0ec] md:w-[420px]"
            >
              <img
                src={p.img}
                alt={p.cap}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <figcaption className="absolute bottom-4 left-4 bg-white/85 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-[#111111]">
                  {p.cap}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* The measuring seam — SVG hairline that fills with progress */}
        <div className="mt-4 hidden md:block">
          <svg
            ref={seamRef}
            width="100%"
            height="2"
            viewBox="0 0 1000 2"
            preserveAspectRatio="none"
            className="block w-full"
            aria-hidden="true"
          >
            <path d="M0 1 H1000" stroke="rgba(17,17,17,0.12)" strokeWidth="1" fill="none" />
            <path
              ref={pathRef}
              d="M0 1 H1000"
              stroke="#111111"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
