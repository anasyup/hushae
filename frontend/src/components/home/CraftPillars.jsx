import Seam from './Seam';

/* ============================================================================
 * THE CRAFT — three quiet pillars.
 * A restrained register: small numbered markers, light tracked-caps titles,
 * fine seam rules, unhurried body copy. Space between the pillars is the
 * luxury — nothing here shouts.
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
    <section className="w-full bg-[#f6f1ea] px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1600px]">
        <header data-reveal className="border-b border-black/10 pb-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-500">The Craft</p>
          <h2 className="mt-5 font-display text-2xl font-light uppercase tracking-[0.16em] text-[#111111] md:text-3xl">
            Why Hushae
          </h2>
        </header>

        <div data-reveal-group className="mt-14 grid gap-12 md:grid-cols-3 md:gap-0">
          {PILLARS.map((p, i) => (
            <div
              key={p.n}
              data-reveal-item
              className={`md:px-12 ${i === 0 ? 'md:pl-0' : ''} ${i === 2 ? 'md:pr-0' : ''} ${
                i > 0 ? 'border-t border-black/10 pt-12 md:border-l md:border-t-0 md:pt-0' : ''
              }`}
            >
              <span className="text-[10px] font-light tracking-[0.34em] text-neutral-400">{p.n}</span>
              <h3 className="mt-5 font-display text-lg font-light uppercase tracking-[0.14em] text-[#111111]">{p.t}</h3>
              <Seam className="mt-6 w-9 text-[#111111]/50" />
              <p className="mt-6 max-w-xs text-[13px] font-light leading-[1.95] text-neutral-600">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
