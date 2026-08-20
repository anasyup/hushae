import { Fragment } from 'react';

/* ============================================================================
 * EditorialHero — the luxury editorial hero for listing pages (Women, Men,
 * Best Sellers, Shop All, category pages).
 *
 * Same register as the New Arrivals hero: a full-bleed campaign photograph,
 * the house headline set in serif UPPERCASE, a season eyebrow, a hairline
 * rule, a quiet editorial strip beneath (edit · drop · count · worldwide).
 * Type sits in the LOWER band so it stays clear of the fixed transparent
 * header above. Below the hero the filter bar and grid continue untouched.
 * ========================================================================== */

export default function EditorialHero({ img, tag, title, description, count, strip = [] }) {
  return (
    <section className="relative w-full overflow-hidden bg-[#EFECE6]">
      {/* Campaign photograph — tall editorial frame */}
      <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9] lg:min-h-[440px]">
        <img
          src={img}
          alt={title || ''}
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />

        {/* Bottom-weighted scrim — type sits on a quiet ground */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            /* Deepened in the lower band only. MEASURED on /shop at 390px the
               eyebrow sat at 2.26:1 worst / 2.90 median against a 4.5
               requirement, and the h1 at 2.85 worst. The upper 60% of the
               photograph is unchanged. */
            background:
              'linear-gradient(to top, rgba(17,17,17,0.82) 0%, rgba(17,17,17,0.58) 30%, rgba(17,17,17,0.16) 60%, rgba(17,17,17,0) 100%)',
          }}
        />

        {/* Editorial type — lower band */}
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-[1600px] px-6 pb-12 md:px-12 md:pb-16">
            {/* 10px at white/70 measured 2.26:1 — the worst contrast found on
                the storefront. Raised to 11px (the label floor) and to
                white/90, which clears 4.5:1 on the deepened scrim. */}
            {tag && (
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-white/90">{tag}</p>
            )}
            <h1 className="mt-4 font-sans text-4xl font-light uppercase tracking-[0.08em] text-white md:text-6xl lg:text-7xl">
              {title}
            </h1>
            <div className="mt-5 h-px w-14 bg-white/50" aria-hidden="true" />
            {description && (
              <p className="mt-5 max-w-md text-[13px] font-light leading-[1.8] text-white/90">{description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quiet editorial strip — edit · drop · count · worldwide */}
      {strip.length > 0 && (
        <div className="border-y border-neutral-200/80 bg-[#FAF8F5]">
          <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 py-4 text-[11px] font-medium uppercase tracking-[0.24em] text-neutral-500 md:justify-between md:px-12">
            {strip.map((s, i) => (
              <Fragment key={`${s}-${i}`}>
                {i > 0 && <span className="hidden sm:inline" aria-hidden="true">·</span>}
                <span>{s}</span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
