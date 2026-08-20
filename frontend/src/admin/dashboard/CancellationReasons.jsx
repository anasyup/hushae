import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';

/* ============================================================================
 * Cancellation Reasons — ranked list + top-reason callout. Data comes from
 * GET /api/admin/dashboard → cancellationReasons (already date-scoped).
 * ========================================================================== */

const BARS = ['bg-neutral-900', 'bg-neutral-500', 'bg-neutral-400', 'bg-neutral-300', 'bg-neutral-200', 'bg-neutral-200'];

export default function CancellationReasons({ reasons = [] }) {
  const total = reasons.reduce((n, r) => n + r.count, 0);
  const max = reasons.length ? reasons[0].count : 1;
  const top = reasons[0];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Cancellation reasons</p>
        <Link to="/admin/orders?stage=issues" className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">Review orders →</Link>
      </div>

      {total === 0 ? (
        <div className="mt-4 grid place-items-center rounded-xl bg-neutral-50 py-10 text-center">
          <Ban size={18} className="text-neutral-400" />
          <p className="mt-2 text-[13px] text-neutral-500">No cancellations in this period.</p>
        </div>
      ) : (
        <>
          {top && top.count > 0 && (
            <div className="mt-3 rounded-xl border border-[#DCCBA5] bg-[#F6F1E6] p-3 text-[12px] text-[#5C4A28]">
              <b>{top.pct}%</b> of cancellations this period are <b>&ldquo;{top.reason}&rdquo;</b> — {top.reason === 'Out of stock' ? 'consider improving inventory sync.' : 'worth a closer look.'}
            </div>
          )}
          <div className="mt-3 space-y-2">
            {reasons.slice(0, 6).map((r, i) => (
              <div key={r.reason}>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="truncate text-neutral-700">{r.reason}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-neutral-900">{r.count} · {r.pct}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div className={`h-full rounded-full ${BARS[i] || 'bg-neutral-300'}`} style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
