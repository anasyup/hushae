import { Link } from 'react-router-dom';

/* ============================================================================
 * SaleBanner — the 50% OFF monetization banner at the top of the Sale page.
 * Full-bleed campaign photograph with a bold serif '50% OFF' headline, a
 * season line and a shop CTA. Quiet, premium, one clear message.
 * ========================================================================== */

export default function SaleBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-[#111111]">
      <div className="relative aspect-[4/3] sm:aspect-[16/6] lg:aspect-[21/6] lg:min-h-[340px]">
        <img
          src="/images/campaign/qa/hero-fabric.jpg"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover opacity-85"
        />

        {/* Scrim — dark, so the type owns the frame */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(17,17,17,0.82) 0%, rgba(17,17,17,0.5) 45%, rgba(17,17,17,0.15) 100%)',
          }}
        />

        {/* Type */}
        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-[1600px] px-6 md:px-12">
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-white/70">
              The Seasonal Sale
            </p>

            <h1 className="mt-5 font-serif text-5xl font-normal uppercase leading-[1.02] tracking-[0.06em] text-white md:text-7xl lg:text-8xl">
              50%
              <span className="ml-3 align-baseline text-3xl tracking-[0.18em] md:text-5xl lg:text-6xl">Off</span>
            </h1>

            <div className="mt-7 h-px w-14 bg-white/40" aria-hidden="true" />

            <p className="mt-7 max-w-md text-[13px] font-light leading-[1.9] text-white/85">
              Signature pieces, reduced for the season. Limited time — while
              the edit lasts.
            </p>

            <Link
              to="/shop"
              className="group mt-9 inline-flex items-center gap-3 border-b border-white/60 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:border-white"
            >
              Shop the Sale
              <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
