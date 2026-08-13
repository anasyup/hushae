/* ============================================================================
 * NewArrivalsLookbook — horizontal editorial lookbook (Loewe / Chloé
 * register). A quiet, snap-scrolling strip of campaign plates with small
 * tracked-caps captions. No autoplay, no gimmicks.
 * ========================================================================== */

const PLATES = [
  { img: '/images/campaign/qa/hero-women.jpg', cap: 'For Her' },
  { img: '/images/campaign/qa/hero-men.jpg', cap: 'For Him' },
  { img: '/images/campaign/qa/editorial-performance.jpg', cap: 'The Performance Edit' },
  { img: '/images/campaign/qa/hero-fabric.jpg', cap: 'The Fabric Study' },
  { img: '/images/campaign/qa/cat-women.jpg', cap: 'The Daily Rotation' },
];

export default function NewArrivalsLookbook() {
  return (
    <section className="w-full bg-[#FAF8F5] px-4 pb-20 md:px-8 md:pb-28">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-10 flex items-end justify-between border-b border-neutral-300/60 pb-6">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">
              The Lookbook
            </p>
            <h2 className="mt-3 font-serif text-2xl font-normal uppercase tracking-[0.1em] text-[#111111] md:text-3xl">
              Vol. 1 in Frame
            </h2>
          </div>
          <p className="hidden text-[9px] font-medium uppercase tracking-[0.24em] text-neutral-400 md:block">
            Swipe to explore
          </p>
        </div>

        <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-2">
          {PLATES.map((p) => (
            <figure
              key={p.cap}
              className="group relative aspect-[3/4] w-[72vw] shrink-0 snap-center overflow-hidden bg-[#EFECE6] sm:w-[46vw] lg:w-[380px]"
            >
              <img
                src={p.img}
                alt={p.cap}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <figcaption className="absolute bottom-4 left-4 bg-white/85 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-[#111111]">
                  {p.cap}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
