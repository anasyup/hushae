/* ============================================================================
 * Admin UI — Card
 * Standard admin card: surface #111113, 1px subtle border, 10px radius,
 * 16–20px padding. Quiet, dense, structured. No floating shadows.
 * ========================================================================== */

export default function Card({ className = '', title, description, actions, footer, children, ...rest }) {
  return (
    <section
      className={`rounded-[10px] border border-admin-border bg-admin-surface ${className}`}
      {...rest}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h3 className="text-[15px] font-semibold text-admin-text">{title}</h3>}
            {description && <p className="mt-0.5 text-[12px] text-admin-text-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
      {footer && <div className="border-t border-admin-border-subtle px-5 py-3">{footer}</div>}
    </section>
  );
}
