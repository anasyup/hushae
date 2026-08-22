/* ============================================================================
 * Admin UI — PageHeader (Phase 02 page-header foundation)
 *
 *   Page title                        Actions
 *   Short description / breadcrumb
 *
 * Reusable across admin pages. Pages adopt it progressively (Phase 03+);
 * AdminLayout already provides the breadcrumb + container foundation.
 * ========================================================================== */

export default function PageHeader({ title, description, breadcrumbs, actions, className = '' }) {
  return (
    <div className={`mb-6 flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1 text-[12px] text-admin-text-muted">
            {breadcrumbs.map((c, i) => (
              <span key={c.to ?? c.label} className="inline-flex items-center">
                {i > 0 && <span className="mx-1 text-admin-text-muted/50">/</span>}
                {c.to && i < breadcrumbs.length - 1 ? (
                  <a href={c.to} className="transition-colors hover:text-admin-text">
                    {c.label}
                  </a>
                ) : (
                  <span className="font-medium text-admin-text-2">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-admin-text">{title}</h1>
        {description && <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-admin-text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
