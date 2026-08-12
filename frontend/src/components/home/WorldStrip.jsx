/* ============================================================================
 * WORLD OF HUSHAE — the international strip.
 * A dark editorial beat that carries the "world international" promise:
 * designed in Pakistan, delivered worldwide. Numbered proof points on black —
 * the quiet-luxury way to say scale without shouting.
 * ========================================================================== */

const FACTS = [
  { v: '20+', l: 'Countries Served' },
  { v: '2–4', l: 'Day Express Delivery' },
  { v: 'COD', l: 'Cash on Delivery' },
  { v: '100%', l: 'Made in Pakistan' },
];

export default function WorldStrip() {
  return (
    <section className="w-full bg-[#111111] px-4 py-14 text-center md:px-8 md:py-20">
      <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-neutral-400">World of Hushae</p>
      <h2 className="mx-auto mt-5 max-w-3xl font-display text-2xl font-light uppercase leading-[1.3] tracking-[0.14em] text-white md:text-3xl">
        Designed in Pakistan · Delivered Worldwide
      </h2>
      <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.l}>
            <p className="font-display text-3xl font-light tracking-[0.06em] text-white md:text-4xl">{f.v}</p>
            <div className="mx-auto mt-3 h-px w-6 bg-white/30" aria-hidden="true" />
            <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.22em] text-neutral-400">{f.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
