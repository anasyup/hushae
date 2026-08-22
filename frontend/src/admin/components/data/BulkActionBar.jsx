/* ============================================================================
 * Admin UI — BulkActionBar
 * Appears when rows are selected: count + actions + clear. Muted accent.
 * ========================================================================== */

import { X } from 'lucide-react';

export default function BulkActionBar({ count, actions = [], onClear, className = '' }) {
  if (!count) return null;
  return (
    <div
      className={`mb-3 flex flex-wrap items-center gap-2 border border-white/15 bg-white/5 px-3 py-2 ${className}`}
      role="status"
    >
      <p className="text-[11px] uppercase tracking-[0.1em] text-white/80">
        <span className="tabular-nums">{count}</span> selected
      </p>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {actions.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={a.onClick}
            className={`inline-flex min-h-[32px] items-center gap-1.5 rounded-[4px] px-3 text-[11px] uppercase tracking-[0.08em] transition-colors ${
              a.tone === 'danger'
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {a.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="grid h-8 w-8 place-items-center text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
