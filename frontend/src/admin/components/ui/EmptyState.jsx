/* ============================================================================
 * Admin UI — EmptyState (Phase 03-R)
 * Editorial: micro eyebrow, thin title, muted description, flat action.
 * ========================================================================== */

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`px-6 py-14 text-left ${className}`}>
      {Icon && <Icon size={18} strokeWidth={1.4} className="text-[#AAAAAA]" aria-hidden />}
      <p className="adm-eyebrow mt-5">No data</p>
      <h3 className="mt-2 text-[15px] font-medium tracking-tight text-black">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-[#999999]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
