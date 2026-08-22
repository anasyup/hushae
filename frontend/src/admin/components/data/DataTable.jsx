/* ============================================================================
 * Admin UI — DataTable (Phase 03-R)
 * Flat, edge-to-edge, hairline rows. Header = uppercase micro-label on a
 * bottom hairline. No container rounding, no card feel.
 * ========================================================================== */

import { Skeleton } from '../ui/Skeleton';

export default function DataTable({
  columns,
  rows,
  loading = false,
  empty,
  onRowClick,
  className = '',
  rowKey = '_id',
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/12">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`whitespace-nowrap px-4 py-2.5 text-[9px] font-medium uppercase tracking-[0.16em] text-white/35 ${
                  c.align === 'right' ? 'text-right' : ''
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-white/5 last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <Skeleton className="h-2.5 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-4">
                {empty || <p className="py-8 text-[12px] text-white/40">No results.</p>}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r[rowKey] ?? r.id ?? JSON.stringify(r).slice(0, 24)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`adm-row-hover border-b border-white/5 last:border-0 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`whitespace-nowrap px-4 py-3 align-middle ${
                      c.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {c.render ? c.render(r) : r[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
