/* ============================================================================
 * NewArrivalsClosing — full-bleed closing band (LV / Hermès register).
 * A dark editorial beat: campaign photography, a short house statement, and
 * a quiet newsletter CTA linking to the home newsletter section.
 * ========================================================================== */

export default function NewArrivalsClosing() {
  return (
    <section className="relative w-full overflow-hidden bg-[#111111]">
      <div className="relative aspect-[4/5] sm:aspect-[16/7]">
        <img
          src="/images/campaign/qa/hero-fabric.jpg"
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-70"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(17,17,17,0.85) 0%, rgba(17,17,17,0.4) 55%, rgba(17,17,17,0.15) 100%)' }}
        />

        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-[1600px] px-6 pb-14 md:px-12 md:pb-20">
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-white/60">
              The House
            </p>
            <h2 className="mt-5 max-w-2xl font-serif text-3xl font-normal uppercase leading-[1.2] tracking-[0.1em] text-white md:text-5xl">
              Designed in Pakistan. Delivered Worldwide.
            </h2>

            <div className="mt-8 h-px w-14 bg-white/40" aria-hidden="true" />

            <p className="mt-7 max-w-md text-[13px] font-light leading-[1.9] text-white/80">
              Be the first to know — private previews of the next drop,
              seasonal edits and members-only offers.
            </p>

            <a
              href="#newsletter"
              className="group mt-9 inline-flex items-center gap-3 border-b border-white/60 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:border-white"
            >
              Join the List
              <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                &rarr;
              </span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
