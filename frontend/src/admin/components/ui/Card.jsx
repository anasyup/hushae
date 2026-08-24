/* ============================================================================
 * Admin UI — Panel (Phase 03-R)
 * Cards are no longer the default container. This is a FLAT panel with a
 * hairline border and zero radius — used only where grouping genuinely
 * helps. Most dashboard sections use dividers/rows instead of panels.
 * ========================================================================== */

export default function Panel({ className = '', title, description, actions, children, ...rest }) {
  return (
    <section className={`border border-[#EAEAEA] bg-[#0A0A0A] ${className}`} {...rest}>
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 border-b border-[#F0F0F0] px-5 py-3.5">
          <div className="min-w-0">
            {title && <h3 className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#555555]">{title}</h3>}
            {description && <p className="mt-0.5 text-[12px] text-[#AAAAAA]">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
