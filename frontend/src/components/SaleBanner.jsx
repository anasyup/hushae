import { Link } from 'react-router-dom';

/* ============================================================================
 * SaleBanner — the 50% OFF monetization banner at the top of the Sale page.
 * Full-bleed 4K campaign photograph, taller frame, and the type sits in the
 * LOWER band of the banner (clear of the fixed transparent header above it),
 * the way an editorial cover sets its line. Quiet, premium, one message.
 * ========================================================================== */

export default function SaleBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-[#111111]">
      <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] lg:min-h-[460px]">
        {/* 4K campaign photograph */}
        <img
          src="/images/sale/sale-4k-banner.jpg"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Scrim — dark lower band so the type owns the frame */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(17,17,17,0.88) 0%, rgba(17,17,17,0.5) 38%, rgba(17,17,17,0.08) 70%, rgba(17,17,17,0) 100%)',
          }}
        />

        {/* Type — lower band, clear of the fixed header */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[1600px] px-6 pb-10 md:px-12 md:pb-14">
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-white/70">
              The Seasonal Sale
            </p>

            <h1 className="mt-4 font-serif text-5xl font-normal uppercase leading-[1.02] tracking-[0.06em] text-white md:text-7xl lg:text-8xl">
              50%
              <span className="ml-3 align-baseline text-3xl tracking-[0.18em] md:text-5xl lg:text-6xl">Off</span>
            </h1>

            <div className="mt-6 h-px w-14 bg-white/40" aria-hidden="true" />

            <p className="mt-6 max-w-md text-[13px] font-light leading-[1.9] text-white/85">
              Signature pieces, reduced for the season. Limited time — while
              the edit lasts.
            </p>

            <Link
              to="/shop"
              className="group mt-8 inline-flex items-center gap-3 border-b border-white/60 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:border-white"
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
