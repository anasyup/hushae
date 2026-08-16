import { Link } from 'react-router-dom';
import { Ban } from 'lucide-react';

/* ============================================================================
 * Cancellation Reasons — ranked list with thin 2px line bars + quiet callout.
 * Data: GET /api/admin/dashboard → cancellationReasons.
 * ========================================================================== */

export default function CancellationReasons({ reasons = [] }) {
  const total = reasons.reduce((n, r) => n + r.count, 0);
  const max = reasons.length ? reasons[0].count : 1;
  const top = reasons[0];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium" style={{ color: 'var(--fs-text-muted)' }}>Cancellation reasons</p>
        <Link to="/admin/orders?stage=issues" className="text-[12px] font-semibold transition-opacity hover:opacity-70" style={{ color: 'var(--fs-accent-soft-text)' }}>Review orders →</Link>
      </div>

      {total === 0 ? (
        <div className="mt-5 py-8 text-center">
          <Ban size={18} strokeWidth={1.2} className="mx-auto mb-2" style={{ color: 'var(--fs-text-muted)' }} />
          <p className="text-[13px]" style={{ color: 'var(--fs-text-muted)' }}>No cancellations in this period.</p>
        </div>
      ) : (
        <>
          {top && top.count > 0 && (
            <p className="mt-4 text-[13px] leading-relaxed" style={{ color: 'var(--fs-text-muted)' }}>
              <span className="font-bold" style={{ color: 'var(--fs-text-primary)' }}>{top.pct}%</span> of cancellations this period are{' '}
              <span className="font-medium" style={{ color: 'var(--fs-text-secondary)' }}>&ldquo;{top.reason}&rdquo;</span> — {top.reason === 'Out of stock' ? 'consider improving inventory sync.' : 'worth a closer look.'}
            </p>
          )}
          <div className="mt-4 space-y-3.5">
            {reasons.slice(0, 6).map((r) => (
              <div key={r.reason}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="truncate" style={{ color: 'var(--fs-text-secondary)' }}>{r.reason}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: 'var(--fs-text-muted)' }}>{r.count} · {r.pct}%</span>
                </div>
                <div className="mt-1.5 h-[2px] w-full" style={{ background: 'var(--fs-border-subtle)' }}>
                  <div className="h-full" style={{ width: `${(r.count / max) * 100}%`, background: 'var(--fs-accent)' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
