/* ============================================================================
 * Admin UI — PageHeader (Phase 03-R editorial)
 * Eyebrow + title + description + actions. Hairline bottom border.
 * ========================================================================== */

export default function PageHeader({ title, eyebrow, description, breadcrumbs, actions, className = '' }) {
  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6 ${className}`}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="adm-eyebrow mb-2 flex items-center gap-1.5">
            {breadcrumbs.map((c, i) => (
              <span key={c.to ?? c.label} className="inline-flex items-center">
                {i > 0 && <span className="mx-1 text-white/20">/</span>}
                {c.to && i < breadcrumbs.length - 1 ? (
                  <a href={c.to} className="transition-colors hover:text-white">{c.label}</a>
                ) : (
                  <span className="font-medium text-white/70">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <p className="adm-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[26px] font-medium tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/40">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
