/* ============================================================================
 * Admin UI — Pagination
 * Compact: prev/next + page x of y + optional total count. 36px buttons.
 * ========================================================================== */

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, onChange, className = '' }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between gap-3 px-1 pt-3 ${className}`}>
      <p className="text-[12px] text-admin-text-muted">
        {total !== undefined ? `${total.toLocaleString()} results · ` : ''}
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className="grid h-9 w-9 place-items-center rounded-lg border border-admin-border bg-admin-surface-2 text-admin-text-2 transition hover:bg-admin-surface-3 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className="grid h-9 w-9 place-items-center rounded-lg border border-admin-border bg-admin-surface-2 text-admin-text-2 transition hover:bg-admin-surface-3 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
