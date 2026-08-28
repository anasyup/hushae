import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * SYSTEM STATUS — read-only diagnostics: API health, data volumes and the
 * audit trail (which doubles as the error log — every sensitive action and
 * failure lands here). Changes nothing; cannot break anything.
 * ========================================================================== */

export default function SystemStatus() {
  const { auth } = useApp();
  const [health, setHealth] = useState(null);
  const [counts, setCounts] = useState(null);
  const [logs, setLogs] = useState(null);
  const [notes, setNotes] = useState(null);

  const load = useCallback(async () => {
    const [h, c, l, n] = await Promise.all([
      api('/health').catch(() => null),
      api('/orders/manage/counts', { token: auth?.token }).catch(() => null),
      api('/security/audit-logs', { token: auth?.token }).catch(() => null),
      api('/notifications?limit=10', { token: auth?.token }).catch(() => null),
    ]);
    setHealth(h);
    setCounts(c);
    setLogs(l?.logs || l?.entries || []);
    setNotes(n);
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  const apiUp = !!health?.ok;

  return (
    <AdminLayout title="System Status">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Settings</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>System Status</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Live health, data volumes and the audit trail — read-only diagnostics.
          </p>
        </div>
        <button type="button" className="adm-chip" onClick={load}><RefreshCcw size={13} /> Refresh</button>
      </div>

      <div className="mb-6 grid grid-cols-2 border-y lg:grid-cols-4" style={{ borderColor: 'var(--admin-border)' }}>
        {[
          ['API', apiUp ? 'Operational' : health === null ? 'Checking…' : 'Down'],
          ['Orders', counts ? String(counts.total ?? '—') : '—'],
          ['Gross value', counts?.revenue != null ? pkr(counts.revenue) : '—'],
          ['Unread alerts', notes ? String(notes.unread ?? 0) : '—'],
        ].map(([label, value], i) => (
          <div key={label} className="px-5 py-5" style={i > 0 ? { borderLeft: '1px solid var(--admin-border)' } : undefined}>
            <p className="adm-label">{label}</p>
            <p className="adm-metric mt-2 text-[20px] leading-none" style={label === 'API' && apiUp ? { color: '#10b981' } : undefined}>
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <p className="adm-eyebrow">Activity & error log</p>
        {logs && logs.length === 0 && (
          <p className="mt-3 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            No audit entries yet — sensitive actions (staff changes, JWT rotation,
            bulk actions, payment flips) will appear here.
          </p>
        )}
        {logs && logs.length > 0 && (
          <div className="mt-2">
            {logs.slice(0, 12).map((l, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b py-2.5" style={{ borderColor: 'var(--admin-border-subtle)' }}>
                <Activity size={12} style={{ color: 'var(--adm-label)' }} />
                <p className="min-w-0 truncate text-[12px]" style={{ color: 'var(--admin-text)' }}>
                  <b>{l.actor || l.email || 'system'}</b> · {l.action} {l.entity || ''} {l.target || ''}
                </p>
                <p className="text-[11px] tabular-nums" style={{ color: 'var(--adm-label)' }}>{fmtDateTime(l.at || l.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
        {!logs && <p className="mt-3 text-[12px]" style={{ color: 'var(--adm-label)' }}>Loading audit trail…</p>}
      </div>
    </AdminLayout>
  );
}
