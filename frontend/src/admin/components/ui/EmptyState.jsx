/* ============================================================================
 * Admin UI — EmptyState
 * Icon · Title · Description · optional action. Every list/admin screen
 * should render one of these instead of a blank area.
 * ========================================================================== */

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`grid place-items-center px-6 py-14 text-center ${className}`}>
      <div className="grid h-12 w-12 place-items-center rounded-[10px] border border-admin-border bg-admin-surface-2 text-admin-text-muted">
        {Icon && <Icon size={20} strokeWidth={1.6} />}
      </div>
      <h3 className="mt-4 text-[15px] font-semibold text-admin-text">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-admin-text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
