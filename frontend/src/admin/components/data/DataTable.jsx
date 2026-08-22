/* ============================================================================
 * Admin UI — DataTable (compact, dense)
 * Header surface-3, rows transparent with surface-2 hover, subtle borders,
 * 44–52px rows, horizontal scroll on small screens, loading skeleton rows,
 * empty state slot. Columns: { key, label, render?, align? }.
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
    <div className={`overflow-x-auto rounded-lg border border-admin-border ${className}`}>
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="border-b border-admin-border bg-admin-surface-3">
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-admin-text-muted ${
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
              <tr key={i} className="border-b border-admin-border-subtle last:border-0">
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-3">
                    <Skeleton className="h-3 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-4">
                {empty || <p className="py-8 text-center text-[13px] text-admin-text-muted">No results.</p>}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r[rowKey] ?? r.id ?? JSON.stringify(r).slice(0, 24)}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
                className={`border-b border-admin-border-subtle transition-colors last:border-0 ${
                  onRowClick ? 'cursor-pointer hover:bg-admin-surface-2' : 'hover:bg-admin-surface-2/60'
                }`}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`whitespace-nowrap px-3 py-3 align-middle ${
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
