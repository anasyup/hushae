import Seam from './Seam';

/* ============================================================================
 * THE CRAFT — three pillars (Rolex / Bottega register).
 * Numbered chapters on a warm skin-tone ground, divided by seam hairlines.
 * Each pillar: chapter number, light tracked-caps title, seam rule, quiet
 * body copy. Pillars rise in on scroll and grow a seam underline on hover.
 * ========================================================================== */

const PILLARS = [
  {
    n: '01',
    t: 'Craftsmanship',
    d: 'Seams that sit flat, elastics that hold without pressing — cut and finished in Pakistan to an international standard.',
  },
  {
    n: '02',
    t: 'Fabrics',
    d: 'Modal and cotton blends engineered for a barely-there second-skin finish that stays true wash after wash.',
  },
  {
    n: '03',
    t: 'Fit',
    d: 'A fit system built from real body measurements — sizes that disappear under everything you own.',
  },
];

export default function CraftPillars() {
  return (
    <section className="w-full bg-[#f6f1ea] px-4 py-24 md:px-8 md:py-36">
      <div className="mx-auto max-w-[1600px]">
        <header data-reveal className="border-b border-black/15 pb-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-neutral-500">02 · The Craft</p>
          <h2 className="mt-4 font-display text-2xl font-light uppercase tracking-[0.16em] text-[#111111] md:text-3xl">
            Why Hushae
          </h2>
        </header>

        <div data-reveal-group className="mt-14 grid gap-12 md:grid-cols-3 md:gap-0">
          {PILLARS.map((p, i) => (
            <div
              key={p.n}
              data-reveal-item
              className={`group relative md:px-12 ${i === 0 ? 'md:pl-0' : ''} ${i === 2 ? 'md:pr-0' : ''} ${
                i > 0 ? 'border-t border-black/10 pt-12 md:border-l md:border-t-0 md:pt-0' : ''
              }`}
            >
              <span className="text-[11px] font-light tracking-[0.34em] text-neutral-400">{p.n}</span>
              <h3 className="mt-5 font-display text-lg font-light uppercase tracking-[0.14em] text-[#111111]">{p.t}</h3>
              {/* Seam — grows on hover, the house mark animating */}
              <Seam className="mt-6 w-9 text-[#111111]/60 transition-all duration-500 group-hover:w-16" />
              <p className="mt-6 text-[13px] font-light leading-[1.95] text-neutral-600">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
