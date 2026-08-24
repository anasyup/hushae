/* ============================================================================
 * Admin UI — Pagination
 * Compact: prev/next + page x of y + optional total count. 36px buttons.
 * ========================================================================== */

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, onChange, className = '' }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between gap-3 px-1 pt-3 ${className}`}>
      <p className="text-[11px] uppercase tracking-[0.1em] text-[#999999]">
        {total !== undefined ? `${total.toLocaleString()} results · ` : ''}
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
          className="grid h-8 w-8 place-items-center rounded-[4px] border border-[#DCDCDC] text-[#555555] transition-colors hover:border-white/45 hover:text-black disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
          className="grid h-8 w-8 place-items-center rounded-[4px] border border-[#DCDCDC] text-[#555555] transition-colors hover:border-white/45 hover:text-black disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
