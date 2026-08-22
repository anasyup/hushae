/* ===========================================================================
 * Orders — editorial primitives. Light-first (full-white theme).
 * Presentation only. No API, no status-transition logic.
 * ========================================================================== */

export const ctl =
  'h-8 w-full rounded-[4px] border border-[#DCDCDC] bg-white px-3 text-[12px] text-black outline-none transition-colors placeholder:text-[#777777] hover:border-[#999999] focus:border-black';

export const ctlInline =
  'h-8 rounded-[4px] border border-[#DCDCDC] bg-white px-3 text-[12px] text-black outline-none transition-colors hover:border-[#999999] focus:border-black';

export const btnGhost =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-[#D8D8D8] bg-white px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-black transition-colors hover:border-black disabled:opacity-35';

export const btnSolid =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] bg-black px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-[#FFFFFF] transition-colors hover:bg-black/80 disabled:opacity-35';

export const btnIcon =
  'grid h-8 w-8 place-items-center rounded-[4px] border border-[#D8D8D8] text-[#555555] transition-colors hover:border-black hover:text-black disabled:opacity-35';

/** Map payment fields to a monochrome label. */
export function paymentLabel(o) {
  const state = o?.paymentState || (o?.paymentStatus === 'Paid' ? 'Confirmed' : o?.paymentStatus || 'Pending');
  if (state === 'Confirmed' || o?.paymentStatus === 'Paid') return 'PAID';
  return String(state).toUpperCase();
}

export function fulfillmentLabel(o) {
  return String(o?.stage || o?.status || '—').toUpperCase();
}

/** Dim (low-opacity) for terminal / waiting states. */
export function isDimStatus(label) {
  const s = String(label || '').toUpperCase();
  return ['PENDING', 'CANCELLED', 'REFUNDED', 'RETURNED', 'FAILED', 'EXPIRED', 'FAILED DELIVERY'].includes(s);
}

export function MonoStatus({ label, dim }) {
  if (!label) return null;
  const quiet = dim ?? isDimStatus(label);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.16em] ${quiet ? 'text-[#777777]' : 'text-black'}`}>
      <span aria-hidden className={`h-1 w-1 rounded-full ${quiet ? 'bg-[#999999]' : 'bg-black'}`} />
      {label}
    </span>
  );
}

function pageItems(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push('…');
  out.push(pages);
  return out;
}

export function EditorialPagination({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 border-t border-[#EAEAEA] pt-6">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#777777] transition-colors hover:text-black disabled:opacity-25"
      >
        ← Previous
      </button>
      <div className="flex items-center gap-3 sm:gap-4">
        {pageItems(page, pages).map((n, i) => (
          n === '…' ? (
            <span key={`e${i}`} className="text-[12px] text-[#999999]">…</span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`adm-metric min-w-[1.25rem] text-[13px] transition-colors ${n === page ? 'text-black' : 'text-[#999999] hover:text-black'}`}
            >
              {String(n).padStart(2, '0')}
            </button>
          )
        ))}
      </div>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#777777] transition-colors hover:text-black disabled:opacity-25"
      >
        Next →
      </button>
    </nav>
  );
}

export function EditorialEmpty({ title, description, action }) {
  return (
    <div className="border-y border-[#EAEAEA] px-5 py-16 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-black">{title}</p>
      {description && <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#777777]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function EditorialError({ title, description, onRetry }) {
  return (
    <div className="border-y border-[#EAEAEA] px-5 py-14 text-center" role="alert">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-black">{title}</p>
      {description && <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#777777]">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className={`${btnGhost} mt-6`}>
          Try again
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="border-y border-[#EAEAEA]" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 items-center gap-4 border-b border-[#F0F0F0] px-2 py-4 last:border-0">
          <div className="col-span-2 h-3 animate-pulse bg-[#F0F0F0]" />
          <div className="col-span-3 h-3 animate-pulse bg-[#F7F7F7]" />
          <div className="col-span-2 h-3 animate-pulse bg-[#F7F7F7]" />
          <div className="col-span-2 h-3 animate-pulse bg-[#F7F7F7]" />
          <div className="col-span-2 h-3 animate-pulse bg-[#F0F0F0]" />
          <div className="col-span-1 h-3 animate-pulse bg-[#F7F7F7]" />
        </div>
      ))}
    </div>
  );
}
