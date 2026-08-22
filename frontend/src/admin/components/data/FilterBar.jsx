/* ============================================================================
 * Admin UI — FilterBar
 * Compact horizontal container for filter controls (inputs, selects, chips).
 * Wraps on small screens; keeps the table area clean.
 * ========================================================================== */

export default function FilterBar({ children, right, className = '' }) {
  return (
    <div className={`mb-3 flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}
