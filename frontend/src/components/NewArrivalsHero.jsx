/* ============================================================================
 * NewArrivalsHero — the luxury editorial hero for the New Arrivals page.
 * A full-bleed campaign photograph with the house headline set in serif
 * UPPERCASE, a season eyebrow, a hairline rule and a quiet editorial strip
 * beneath (season / first drop / worldwide). Below the hero the standard
 * filter bar and grid continue untouched.
 * ========================================================================== */

export default function NewArrivalsHero({ count }) {
  return (
    <section className="relative w-full overflow-hidden bg-[#EFECE6]">
      {/* Campaign photograph */}
      <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9] lg:min-h-[440px]">
        <img
          src="/images/campaign/qa/editorial-modern.jpg"
          alt=""
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Bottom-weighted scrim — type sits on a quiet ground */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to top, rgba(17,17,17,0.72) 0%, rgba(17,17,17,0.45) 30%, rgba(17,17,17,0.12) 60%, rgba(17,17,17,0) 100%)',
          }}
        />

        {/* Editorial type */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[1600px] px-6 pb-12 md:px-12 md:pb-16">
            <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/90">
              The Studio Drops &bull; Season 2026
            </p>
            <h1 className="mt-4 font-sans text-4xl font-light uppercase tracking-[0.08em] text-white md:text-6xl lg:text-7xl">
              New Arrivals
            </h1>
            <div className="mt-5 h-px w-14 bg-white/50" aria-hidden="true" />
            <p className="mt-5 max-w-md text-[13px] font-light leading-[1.8] text-white/90">
              Fresh from the studio — newly engineered cuts, second-skin fabrics, and fresh seasonal colorways.
            </p>
          </div>
        </div>
      </div>

      {/* Quiet editorial strip — season · first drop · worldwide */}
      <div className="border-y border-neutral-200/80 bg-[#FAF8F5]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-500 md:justify-between md:px-12">
          <span>The New In</span>
          <span className="hidden sm:inline">·</span>
          <span>First Drop</span>
          <span className="hidden sm:inline">·</span>
          <span>{count || 0} {count === 1 ? 'Piece' : 'Pieces'}</span>
          <span className="hidden sm:inline">·</span>
          <span>Delivered Worldwide</span>
        </div>
      </div>
    </section>
  );
}
