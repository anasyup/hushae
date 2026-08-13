/* ============================================================================
 * ProductSectionHeader — the house's section header for PDP chapters.
 * A fine seam rule leading into a tracked-caps eyebrow, then a light
 * UPPERCASE title. The same quiet register used across the storefront.
 * ========================================================================== */

export default function ProductSectionHeader({ eyebrow, title, align = 'left', className = '' }) {
  const center = align === 'center';
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''} ${className}`}>
      <div className={`flex items-center gap-4 ${center ? 'justify-center' : ''}`}>
        <span className="h-px w-8 bg-[#111111]/50" aria-hidden="true" />
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-neutral-400">{eyebrow}</p>
        {center && <span className="h-px w-8 bg-[#111111]/50" aria-hidden="true" />}
      </div>
      <h2 className="mt-4 font-display text-2xl font-light uppercase tracking-[0.14em] text-[#111111] md:text-3xl">
        {title}
      </h2>
    </div>
  );
}
