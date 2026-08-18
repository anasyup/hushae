import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SectionHeader from '../SectionHeader';

/* ============================================================================
 * BrandStory — HUSHAE's unique positioning made visible.
 *
 * HUSHAE's story is its strongest differentiator in any market: a Pakistani
 * intimate-wear house finishing to an international standard. No other
 * luxury brand makes that claim. It deserves a measured, editorial moment
 * on the page — not a slogan footer or a sentence hidden in the about page.
 *
 * The register is restrained magazine: 7/5 photo on the left, copy on the
 * right, one quiet CTA. No badges, no images, no decorative graphics. The
 * section is the inverse of the full-bleed editorial split above it. */

export default function BrandStory() {
  return (
    <section className="border-y border-[#e5e5e5] bg-white">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 md:grid-cols-12">
        {/* Photo — 7 cols on desktop, full-width on mobile */}
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f0f0f0] md:aspect-auto md:col-span-7 md:min-h-[560px]">
          <img
            src="/images/campaign/qa/hero-fabric.jpg"
            alt="HUSHAE — Cotton modal fabric, made in Pakistan"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute bottom-4 left-4 text-xs font-medium uppercase tracking-label text-white/85 md:bottom-6 md:left-6">
            Made in Pakistan
          </div>
        </div>

        {/* Copy — 5 cols on desktop */}
        <div className="flex flex-col justify-center px-6 py-12 md:col-span-5 md:px-10 md:py-16 lg:px-16 lg:py-24">
          <SectionHeader
            eyebrow="Our Story"
            title="Crafted here. Worn everywhere."
            variant="quiet"
            className="mb-6"
          />

          <div className="space-y-4 text-md font-normal leading-[1.7] text-neutral-600 md:text-lg md:leading-[1.75]">
            <p>
              HUSHAE is a house of essentials built in Karachi — modal, cotton,
              mercerised wool — chosen at source and finished one grade higher
              than anything labelled "premium" on the high street.
            </p>
            <p>
              Every piece leaves the workshop with a 14-point check against
              the same reference standard used in Milan ateliers. The result
              is the part of your wardrobe no one else sees — quiet,
              considered, and never improvised.
            </p>
          </div>

          {/* Sign-off numbers */}
          <div className="mt-8 flex gap-8 border-t border-[#e5e5e5] pt-6 md:mt-10 md:gap-12 md:pt-8">
            {[
              { k: '01', l: 'Atelier — Karachi' },
              { k: '14', l: 'Point check' },
              { k: '30d', l: 'Easy exchange' },
            ].map((s) => (
              <div key={s.k}>
                <div className="text-2xl font-light uppercase leading-none tracking-heading text-black md:text-3xl">
                  {s.k}
                </div>
                <div className="mt-2 text-xs font-medium uppercase tracking-label text-neutral-500">
                  {s.l}
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/about"
            className="group mt-8 inline-flex min-h-[44px] items-center gap-2 self-start border-b border-black pb-1 text-xs font-medium uppercase tracking-label text-black transition-colors hover:opacity-60 md:mt-10"
          >
            Read our story
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}