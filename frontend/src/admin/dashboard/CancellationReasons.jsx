import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';

/* ============================================================================
 * Cancellation Reasons — ranked list with thin line bars and a quiet top-reason
 * callout. Data: GET /api/admin/dashboard → cancellationReasons.
 * ========================================================================== */

const INK = 'var(--px-ink)';
const MUTED = 'var(--px-muted)';
const FAINT = 'var(--px-faint)';

export default function CancellationReasons({ reasons = [] }) {
  const total = reasons.reduce((n, r) => n + r.count, 0);
  const max = reasons.length ? reasons[0].count : 1;
  const top = reasons[0];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: MUTED }}>Cancellation reasons</p>
        <Link to="/admin/orders?stage=issues" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: MUTED }}>Review orders →</Link>
      </div>

      {total === 0 ? (
        <div className="mt-6 py-10 text-center">
          <Ban size={20} strokeWidth={1.2} className="mx-auto mb-3" style={{ color: FAINT }} />
          <p className="text-[13px]" style={{ color: MUTED }}>No cancellations in this period.</p>
        </div>
      ) : (
        <>
          {top && top.count > 0 && (
            <p className="mt-4 text-[13px] leading-relaxed" style={{ color: MUTED }}>
              <span className="text-[18px] font-semibold" style={{ color: INK }}>{top.pct}%</span> of cancellations this period are{' '}
              <span className="font-medium" style={{ color: INK }}>&ldquo;{top.reason}&rdquo;</span> — {top.reason === 'Out of stock' ? 'consider improving inventory sync.' : 'worth a closer look.'}
            </p>
          )}
          <div className="mt-5 space-y-4">
            {reasons.slice(0, 6).map((r) => (
              <div key={r.reason}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="truncate" style={{ color: INK }}>{r.reason}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: MUTED }}>{r.count} · {r.pct}%</span>
                </div>
                <div className="mt-1.5 h-[2px] w-full" style={{ background: 'rgba(26,24,21,0.08)' }}>
                  <div className="h-full" style={{ width: `${(r.count / max) * 100}%`, background: 'rgba(26,24,21,0.35)' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
