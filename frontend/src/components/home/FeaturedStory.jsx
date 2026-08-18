import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

/* ============================================================================
 * FeaturedStory — HUSHAE's signature full-bleed campaign moment.
 *
 * WHY IT MATTERS
 *
 * Every luxury fashion house maintains ONE ongoing editorial narrative on
 * the homepage — the campaign of the moment. Bottega Veneta runs a single
 * Intrecciato story; Loro Piana runs a single fiber story; Aesop runs a
 * single ingredient story. Shoppers reading the homepage either care about
 * this story or they don't — there is no in-between.
 *
 * The point is not \"look at this product\"; the point is \"this is what
 * the house believes right now\". Three clicks in, the shopper has bought
 * a view of the world before they have bought a garment.
 *
 * DESIGN
 *
 * A 70/24 split with the photograph the larger left half, and a measured
 * caption on the right. The caption carries the campaign kicker, a single
 * bold heading, one paragraph of body, and one CTA — the same campaign
 * pattern every showcase uses, just giving it room to breathe. No badge,
 * no divider, no decorative graphic.
 *
 * The featured story in this implementation is hard-coded to the Modal +
 * Cotton platform that the brand lives on. A future iteration can read it
 * from the CMS so the merchant can rotate the story month to month. */

const FEATURED = {
  kicker: 'The Modal Series',
  title: 'How one fabric became the brand.',
  copy:
    'We tested eight fibres before picking modal-cotton for the briefs you wear most. It holds shape after the eighteenth wash, breathes through July, and sits invisibly under a tailored trouser. The Modal Series is the wardrobe that gets worn out — and is supposed to.',
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
            {/* Soft detail overlay — Carries the campaign's own meta-facts
                on the image so the caption column can stay clean. Photography
                does the visual work, the meta-facts do the proof-of-work. */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] md:bottom-6 md:left-6 md:right-6 md:text-[11px]">
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
            <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-neutral-500 md:text-[11px]">
              <span className="inline-block h-px w-6 translate-y-[3px] bg-neutral-400 align-middle md:w-8" aria-hidden="true" />
              <span className="ml-3">{FEATURED.kicker}</span>
            </p>

            <h2 className="mt-5 font-display text-[28px] font-light uppercase leading-[1.1] tracking-[0.06em] text-black md:mt-7 md:text-[36px] md:leading-[1.08] lg:text-[44px]">
              {FEATURED.title}
            </h2>

            <p className="mt-6 text-[14px] font-normal leading-[1.75] text-neutral-600 md:mt-7 md:text-[15px] md:leading-[1.78]">
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
                  <div className="font-display text-[22px] font-light uppercase leading-none tracking-[0.04em] text-black md:text-[28px]">
                    {s.k}
                  </div>
                  <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500 md:text-[11px]">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-4 md:mt-10">
              <Link
                to={FEATURED.href}
                className="group inline-flex min-h-[48px] items-center gap-2 bg-black px-7 text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors duration-300 hover:bg-[#333333] md:px-8 md:text-[12px]"
                style={{ borderRadius: '0px' }}
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
                className="inline-flex min-h-[44px] items-center gap-2 border-b border-black/40 pb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-700 transition-colors hover:border-black hover:text-black"
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