/* ============================================================================
 * THE MAISON LINE — a quiet, type-only statement.
 * No imagery, no colour blocks — just the house's promise set in light
 * tracked caps with a hairline beneath. The luxury of saying little.
 * ========================================================================== */

export default function MaisonLine() {
  return (
    <section className="w-full bg-[#fcfbf9] px-4 py-24 text-center md:py-32">
      <div className="mx-auto max-w-3xl">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">The Maison</p>
        <p className="mt-8 font-display text-2xl font-light uppercase leading-[1.45] tracking-[0.12em] text-[#111111] md:text-4xl md:leading-[1.35]">
          Designed in Pakistan.
          <br />
          Finished to an international standard.
        </p>
        <div className="mx-auto mt-10 h-px w-12 bg-[#111111]/50" aria-hidden="true" />
      </div>
    </section>
  );
}
