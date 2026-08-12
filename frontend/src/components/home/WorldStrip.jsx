/* ============================================================================
 * WORLD OF HUSHAE — the international strip.
 * A dark editorial beat that carries the "world international" promise:
 * designed in Pakistan, delivered worldwide. Numbers count up as they enter
 * view — the quiet-luxury way to say scale without shouting.
 * ========================================================================== */

const FACTS = [
  { v: '20+', count: 20, suffix: '+', l: 'Countries Served' },
  { v: '2–4', l: 'Day Express Delivery' },
  { v: 'COD', l: 'Cash on Delivery' },
  { v: '100%', count: 100, suffix: '%', l: 'Made in Pakistan' },
];

export default function WorldStrip() {
  return (
    <section className="w-full bg-[#111111] px-4 py-16 text-center md:px-8 md:py-24">
      <p data-reveal className="text-[11px] font-medium uppercase tracking-[0.32em] text-neutral-400">
        03 · World of Hushae
      </p>
      <h2
        data-reveal
        data-delay="0.08"
        className="mx-auto mt-6 max-w-3xl font-display text-2xl font-light uppercase leading-[1.32] tracking-[0.16em] text-white md:text-3xl"
      >
        Designed in Pakistan · Delivered Worldwide
      </h2>

      <div data-reveal-group className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4">
        {FACTS.map((f) => (
          <div key={f.l} data-reveal-item>
            {f.count ? (
              <p
                data-count={f.count}
                data-suffix={f.suffix}
                className="font-display text-3xl font-light tracking-[0.08em] text-white md:text-4xl"
              >
                {f.v}
              </p>
            ) : (
              <p className="font-display text-3xl font-light tracking-[0.08em] text-white md:text-4xl">{f.v}</p>
            )}
            <div className="mx-auto mt-4 h-px w-7 bg-white/30" aria-hidden="true" />
            <p className="mt-4 text-[10px] font-medium uppercase tracking-[0.24em] text-neutral-400">{f.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
