/* ============================================================================
 * Admin UI — BulkActionBar
 * Appears when rows are selected: count + actions + clear. Muted accent.
 * ========================================================================== */

import { X } from 'lucide-react';

export default function BulkActionBar({ count, actions = [], onClear, className = '' }) {
  if (!count) return null;
  return (
    <div
      className={`mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-admin-accent/30 bg-admin-accent-soft px-3 py-2 ${className}`}
      role="status"
    >
      <p className="text-[13px] font-medium text-admin-text">
        <span className="tabular-nums">{count}</span> selected
      </p>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={a.onClick}
            className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition ${
              a.tone === 'danger'
                ? 'bg-admin-danger/15 text-admin-danger hover:bg-admin-danger/25'
                : 'bg-admin-surface-2 text-admin-text-2 hover:bg-admin-surface-3 hover:text-admin-text'
            }`}
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="grid h-8 w-8 place-items-center rounded-lg text-admin-text-muted transition hover:bg-admin-surface-2 hover:text-admin-text"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
