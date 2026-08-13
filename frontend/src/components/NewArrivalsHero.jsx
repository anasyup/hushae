import { Link } from 'react-router-dom';

/* ============================================================================
 * NewArrivalsHero — editorial campaign hero (Marni / Chloé register).
 * Full-bleed campaign photograph, season copy ('Vol. 1' like the houses),
 * large serif headline, hairline rule, dual quiet CTAs and a scroll cue.
 * ========================================================================== */

export default function NewArrivalsHero({ count }) {
  return (
    <section className="relative w-full overflow-hidden bg-[#EFECE6]">
      {/* Campaign photograph */}
      <div className="relative aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] lg:min-h-[520px]">
        <img
          src="/images/campaign/qa/hero-women.jpg"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />

        {/* Scrim — type sits on a quiet ground */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(17,17,17,0.78) 0%, rgba(17,17,17,0.45) 32%, rgba(17,17,17,0.1) 62%, rgba(17,17,17,0) 100%)',
          }}
        />

        {/* Editorial type */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[1600px] px-6 pb-14 md:px-12 md:pb-20">
            <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-white/70">
              Autumn / Winter &rsquo;26 — Vol. 1
            </p>
            <h1 className="mt-6 font-serif text-5xl font-normal uppercase leading-[1.02] tracking-[0.06em] text-white md:text-7xl lg:text-8xl">
              New
              <br />
              Arrivals
            </h1>

            <div className="mt-8 h-px w-16 bg-white/50" aria-hidden="true" />

            <p className="mt-7 max-w-md text-[13px] font-light leading-[1.9] text-white/85">
              The first drop of the season — quiet, considered pieces engineered
              in Pakistan and finished to an international standard.
            </p>

            {/* Dual CTAs */}
            <div className="mt-9 flex flex-wrap items-center gap-8">
              <Link
                to="/women"
                className="group inline-flex items-center gap-3 border-b border-white/60 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:border-white"
              >
                Shop Women
                <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
              <Link
                to="/men"
                className="group inline-flex items-center gap-3 border-b border-white/60 pb-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-white transition-colors hover:border-white"
              >
                Shop Men
                <span className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quiet editorial strip */}
      <div className="border-b border-neutral-200/80 bg-[#FAF8F5]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-4 text-[9px] font-medium uppercase tracking-[0.24em] text-neutral-400 md:justify-between md:px-12">
          <span>The New In</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>First Drop</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>{count || 0} {count === 1 ? 'Piece' : 'Pieces'}</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span>Delivered Worldwide</span>
        </div>
      </div>
    </section>
  );
}
