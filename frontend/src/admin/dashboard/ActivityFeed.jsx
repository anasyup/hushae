import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { fmtDateTime } from '../../lib/format';

/* ============================================================================
 * Activity feed — REAL data from GET /api/security/audit-logs (AuditLog model,
 * written by utils/auditLogger on settings/security changes and, since this
 * pass, order status/stage changes and product create/update). No fabricated
 * events.
 * ========================================================================== */

const ACTION_LABEL = { create: 'created', update: 'updated', delete: 'deleted', stage: 'moved', status: 'updated status of', login: 'signed in' };
const TARGET_ICON = { order: 'order', product: 'product', settings: 'settings', user: 'user' };

export default function ActivityFeed() {
  const { auth } = useApp();
  const [logs, setLogs] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/security/audit-logs?limit=8', { token: auth.token })
      .then((d) => setLogs(d.logs || []))
      .catch(() => setErr('Activity unavailable for this role'));
  }, [auth.token]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--px-muted)' }}>Recent activity</p>
        <History size={14} strokeWidth={1.5} style={{ color: 'var(--px-muted)' }} aria-hidden="true" />
      </div>

      {err ? (
        <p className="mt-3 text-[13px]" style={{ color: 'var(--px-muted)' }}>{err}</p>
      ) : logs === null ? (
        <div className="mt-3 space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-8 w-full rounded-[8px]" />)}</div>
      ) : logs.length === 0 ? (
        <p className="mt-3 py-4 text-center text-[13px]" style={{ color: 'var(--px-muted)' }}>
          No activity yet. Changes to orders, products and settings will appear here.
        </p>
      ) : (
        <div className="mt-3 space-y-0">
          {logs.map((l, i) => (
            <div key={l._id || i} className="flex items-center gap-3 border-b py-2 last:border-0" style={{ borderColor: 'var(--px-border)' }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--px-accent)' }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]" style={{ color: 'var(--px-secondary)' }}>
                  <span className="font-medium" style={{ color: 'var(--px-ink)' }}>{l.user}</span>{' '}
                  {ACTION_LABEL[l.action] || l.action}{' '}
                  {TARGET_ICON[l.target] || ''} {l.target}
                  {l.targetId ? <span className="font-mono text-[11px] opacity-70"> {l.targetId}</span> : ''}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--px-muted)' }}>{fmtDateTime(l.createdAt)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
