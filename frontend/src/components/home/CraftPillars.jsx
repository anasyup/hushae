/* ============================================================================
 * THE CRAFT — three pillars (Rolex / Bottega register).
 * Numbered chapters on a warm skin-tone ground, divided by seam hairlines.
 * Each pillar: mono-ish chapter number, light tracked-caps title, seam rule,
 * quiet body copy.
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
    <section className="w-full bg-[#f6f1ea] px-4 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1600px]">
        <header className="border-b border-black/15 pb-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-500">The Craft</p>
          <h2 className="mt-3 font-display text-2xl font-light uppercase tracking-[0.14em] text-[#111111] md:text-3xl">
            Why Hushae
          </h2>
        </header>

        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-0">
          {PILLARS.map((p, i) => (
            <div
              key={p.n}
              className={`md:px-10 ${i === 0 ? 'md:pl-0' : ''} ${i === 2 ? 'md:pr-0' : ''} ${
                i > 0 ? 'border-t border-black/10 pt-10 md:border-l md:border-t-0 md:pt-0' : ''
              }`}
            >
              <span className="text-[11px] font-light tracking-[0.3em] text-neutral-400">{p.n}</span>
              <h3 className="mt-4 font-display text-lg font-light uppercase tracking-[0.12em] text-[#111111]">{p.t}</h3>
              <div className="mt-5 h-px w-8 bg-[#111111]/60" aria-hidden="true" />
              <p className="mt-5 text-[13px] font-light leading-[1.9] text-neutral-600">{p.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
