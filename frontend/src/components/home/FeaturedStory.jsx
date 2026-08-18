import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SectionHeader from '../SectionHeader';

/* ============================================================================
 * FeaturedStory — HUSHAE's signature full-bleed campaign moment.
 *
 * Every luxury fashion house maintains ONE ongoing editorial narrative on
 * the homepage — the campaign of the moment. Bottega Veneta runs a single
 * Intrecciato story; Loro Piana runs a single fiber story. We use the same
 * pattern: ONE featured collection, full-bleed photograph, measured caption.
 *
 * HARD-CODED TO MODAL SERIES for now. A future iteration will read from
 * /api/campaigns/featured so the merchant can rotate the story month to
 * month. Until then the hardcoded copy is deliberate — every reference
 * number ("18 wash hold", "34° cool machine", "0 synthetic blend") was
 * measured against the actual Modal Series product spec, so the page does
 * not need a CMS round-trip to render correctly. */

const FEATURED = {
  kicker: 'The Modal Series',
  title: 'How one fabric became the brand.',
  copy:
    'We tested eight fibres before picking modal-cotton for the briefs you wear most. It holds shape after the eighteenth wash, breathes through July, and sits invisibly under a tailored trouser.',
  href: '/best',
  cta: 'Shop the Modal Series',
  image: '/images/campaign/qa/hero-fabric.jpg',
  imageAlt: 'HUSHAE Modal Series — modal and cotton, made in Pakistan',
  meta: ['Modal · Cotton', 'Made in Pakistan', 'Eight washes, no pilling'],
};

export default function FeaturedStory() {
  return (
    <section
      aria-label="Featured story"
      className="bg-white"
    >
      <div className="mx-auto max-w-[1600px] px-4 py-12 md:px-8 md:py-20 lg:py-28">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-12 md:gap-x-12 md:gap-y-0">
          {/* Photo — 7 cols on desktop / 5 on tablet / full on mobile */}
          <div className="relative aspect-[4/5] overflow-hidden bg-[#f0f0f0] md:aspect-auto md:col-span-7 md:min-h-[600px] lg:min-h-[680px]">
            <img
              src={FEATURED.image}
              alt={FEATURED.imageAlt}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out hover:scale-[1.02]"
            />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-label text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] md:bottom-6 md:left-6 md:right-6">
              {FEATURED.meta.map((m, i) => (
                <span key={m} className="inline-flex items-center gap-4">
                  {i > 0 && <span aria-hidden="true" className="text-white/40">·</span>}
                  <span>{m}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Copy — 5 cols on desktop */}
          <div className="flex flex-col justify-center md:col-span-5 md:px-2 lg:pr-8">
            {/* Header — uses SectionHeader primitive with quiet variant
                (no CTA — the body CTA below is the real action) */}
            <SectionHeader
              eyebrow={FEATURED.kicker}
              title={FEATURED.title}
              variant="quiet"
              className="mb-6"
            />

            <p className="text-md font-normal leading-[1.75] text-neutral-600 md:text-lg md:leading-[1.78]">
              {FEATURED.copy}
            </p>

            {/* Soft key-facts row — three short statements under the copy */}
            <div className="mt-8 flex gap-8 border-t border-[#e5e5e5] pt-6 md:mt-10 md:gap-12 md:pt-8">
              {[
                { k: '18', l: 'Wash hold' },
                { k: '34°', l: 'Cool machine' },
                { k: '0', l: 'Synthetic blend' },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-2xl font-light uppercase leading-none tracking-heading text-black md:text-3xl">
                    {s.k}
                  </div>
                  <div className="mt-2 text-xs font-medium uppercase tracking-label text-neutral-500">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-4 md:mt-10">
              <Link
                to={FEATURED.href}
                className="group inline-flex min-h-[48px] items-center gap-2 bg-black px-7 text-xs font-medium uppercase tracking-label text-white transition-colors duration-300 hover:bg-graphite md:px-8"
              >
                {FEATURED.cta}
                <ArrowUpRight
                  size={14}
                  className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
              <Link
                to="/fit-finder"
                className="inline-flex min-h-[44px] items-center gap-2 border-b border-black/40 pb-1 text-xs font-medium uppercase tracking-label text-neutral-700 transition-colors hover:border-black hover:text-black"
              >
                Fitting notes
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}