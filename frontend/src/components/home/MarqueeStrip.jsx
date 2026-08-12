/* ============================================================================
 * MarqueeStrip — the slow editorial ticker under the hero.
 * A quiet, uppercase, widely-tracked line of house claims separated by the
 * cross seam mark — the way a fashion house signs the pause between the hero
 * and the first chapter. CSS-driven (GPU transform), loops seamlessly,
 * pauses for prefers-reduced-motion.
 * ========================================================================== */

const CLAIMS = [
  'Second Skin',
  'First Choice',
  'Designed in Pakistan',
  'Delivered Worldwide',
  'The Maison Est. 2026',
];

function Row() {
  return (
    <>
      {CLAIMS.map((t) => (
        <span
          key={t}
          className="flex items-center gap-10 pr-10 font-display text-[11px] font-light uppercase tracking-[0.42em] text-white/75"
        >
          {t}
          {/* Cross seam mark between claims */}
          <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 text-white/35" aria-hidden="true">
            <path d="M0 6 H12 M6 0 V12" stroke="currentColor" strokeWidth="1" />
          </svg>
        </span>
      ))}
    </>
  );
}

export default function MarqueeStrip() {
  return (
    <div className="relative z-10 overflow-hidden border-y border-white/10 bg-[#111111] py-4" aria-hidden="true">
      <div className="marquee-track flex w-max items-center whitespace-nowrap will-change-transform">
        <Row />
        <Row />
      </div>
    </div>
  );
}
