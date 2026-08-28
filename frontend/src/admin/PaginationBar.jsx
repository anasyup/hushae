/* ===========================================================================
 * PaginationBar — the boss's reference pagination, shared.
 * Left: "Showing X to Y of N results" · Right: ‹ 1 2 3 … N › + per-page.
 * Used by Products, Orders (Reviews keeps its own inline copy from the
 * original pass). Styles live in products-atelier.css (.pa-pager family).
 * ========================================================================== */

function pageList(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const keep = [1, 2, page - 1, page, page + 1, pages - 1, pages]
    .filter((p) => p >= 1 && p <= pages);
  const uniq = [...new Set(keep)].sort((a, b) => a - b);
  const out = [];
  uniq.forEach((p, i) => { if (i > 0 && p - uniq[i - 1] > 1) out.push('…'); out.push(p); });
  return out;
}

export default function PaginationBar({ page, pages, total, per, onPage, onPer, perOptions }) {
  const opts = perOptions || [10, 20, 50, 100];
  const from = Math.min((page - 1) * (per || 10) + 1, total);
  const to = Math.min(page * (per || 10), total);
  return (
    <div className="pa-card pa-pager">
      <p className="pa-pager-text">
        Showing {from.toLocaleString()} to {to.toLocaleString()} of {total.toLocaleString()} results
      </p>
      <div className="pa-pager-btns">
        <button type="button" className="pa-page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
        {pageList(page, Math.max(1, pages)).map((p, i) => (
          p === '…'
            ? <span key={`e${i}`} className="pa-ellipsis" aria-hidden>…</span>
            : <button key={p} type="button" className={`pa-page-btn ${p === page ? 'on' : ''}`} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}>{p}</button>
        ))}
        <button type="button" className="pa-page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
        {onPer && (
          <select
            value={per}
            onChange={(e) => onPer(Number(e.target.value))}
            aria-label="Results per page"
            className="pa-select pa-per-select"
          >
            {opts.map((o) => <option key={o} value={o}>{o} / page</option>)}
          </select>
        )}
      </div>
    </div>
  );
}
