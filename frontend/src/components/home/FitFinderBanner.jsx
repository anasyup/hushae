import { Link } from 'react-router-dom';
import { ArrowRight, Ruler } from 'lucide-react';

/* ============================================================================
 * FitFinderBanner — HUSHAE's unique value prop, illustrated.
 *
 * Size inconsistency is the #1 reason innerwear gets returned. Every global
 * intimate-wear brand that has solved return rates (Hanro, CDLP, Skin) uses
 * a fit quiz on the storefront rather than relying on the size chart.
 *
 * Full-bleed black band with a single brand-tone composition: copy on the
 * left, image on the right (top on mobile). One CTA. The dark surface is
 * the only black section on the homepage, giving it magazine-spread weight
 * between the lighter product grids. */

export default function FitFinderBanner() {
  return (
    <section
      aria-label="Find your perfect fit"
      className="relative overflow-hidden bg-black text-white"
    >
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 md:grid-cols-12">
        <div className="relative z-10 flex flex-col justify-center px-6 py-12 md:col-span-7 md:px-12 md:py-16 lg:px-20 lg:py-24">
          <p className="inline-flex items-center gap-2 self-start border border-white/40 px-2.5 py-1 text-xs font-medium uppercase tracking-eyebrow text-white/85">
            <Ruler size={11} strokeWidth={1.6} aria-hidden="true" />
            Fit Finder
          </p>

          <h2 className="mt-6 font-display text-2xl font-light uppercase leading-[1.08] tracking-heading text-white md:mt-8 md:text-3xl">
            Find your perfect fit.
            <br />
            <span className="text-white/70">In under a minute.</span>
          </h2>

          <p className="mt-5 max-w-[42ch] text-md font-normal leading-[1.7] text-white/85 md:mt-6 md:text-lg md:leading-[1.75]">
            Two quick questions about how you like your essentials to sit,
            and we&rsquo;ll match you to the size that ends the
            guesswork — across bras, briefs, boxers, and lounge.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-4 md:mt-10">
            <Link
              to="/fit-finder"
              className="group inline-flex min-h-[48px] items-center justify-center gap-2 bg-white px-7 text-xs font-medium uppercase tracking-label text-black transition-colors duration-300 hover:bg-white/85 md:min-h-[52px] md:px-9"
            >
              Start the quiz
              <ArrowRight
                size={14}
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
            <Link
              to="/category/briefs"
              className="inline-flex min-h-[44px] items-center gap-2 border-b border-white/40 pb-1 text-xs font-medium uppercase tracking-label text-white/80 transition-colors hover:border-white hover:text-white"
            >
              Browse size guide
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div className="relative aspect-[4/5] overflow-hidden bg-[#1a1a1a] md:aspect-auto md:col-span-5 md:min-h-[480px]">
          <img
            src="/images/categories/briefs.jpg"
            alt="HUSHAE men's underwear — relaxed fit, comfortable cotton"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 hidden w-32 bg-gradient-to-r from-black to-transparent md:block"
          />
        </div>
      </div>
    </section>
  );
}