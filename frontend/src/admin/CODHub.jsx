import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, PhoneCall, Truck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * COD COMMAND CENTER — the Pakistan-commerce differentiator, one screen.
 * Verification queue + reconciliation + exposure, with one-click jump-ins.
 * Read-only aggregator: it changes nothing, so nothing can break.
 * ========================================================================== */

export default function CODHub() {
  const { auth } = useApp();
  const [queue, setQueue] = useState(null);
  const [recon, setRecon] = useState(null);

  const load = useCallback(async () => {
    const [q, r] = await Promise.all([
      api('/orders/manage/verification-queue', { token: auth?.token }).catch(() => null),
      api('/orders/manage/cod-recon', { token: auth?.token }).catch(() => null),
    ]);
    setQueue(q ? (q.orders || q.queue || []) : []);
    setRecon(r || { rows: [], totals: { count: 0, expected: 0, collected: 0 } });
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  const pendingCalls = queue?.length ?? 0;
  const t = recon?.totals || { expected: 0, collected: 0 };
  const outstanding = Math.max(0, (t.expected || 0) - (t.collected || 0));
  const topCouriers = (recon?.rows || []).filter((r) => r.outstanding > 0).slice(0, 5);

  return (
    <AdminLayout title="COD Command">
      <div className="mb-6">
        <p className="adm-eyebrow" style={{ padding: 0 }}>Operations</p>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>COD Command Center</h2>
        <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
          Verify calls, collected cash and exposure — the three numbers that run COD.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 border-y sm:grid-cols-3" style={{ borderColor: 'var(--admin-border)' }}>
        {[
          ['Awaiting verification calls', String(pendingCalls)],
          ['COD in transit (expected)', pkr(t.expected || 0)],
          ['Outstanding vs collected', pkr(outstanding)],
        ].map(([label, value], i) => (
          <div key={label} className="px-5 py-5" style={i > 0 ? { borderLeft: '1px solid var(--admin-border)' } : undefined}>
            <p className="adm-label">{label}</p>
            <p className="adm-metric mt-2 text-[24px] leading-none">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Link to="/admin/verification-queue" className="block border p-5 transition-colors hover:border-[var(--od-black,#111)]"
          style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)', textDecoration: 'none' }}>
          <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            <PhoneCall size={14} /> Verification queue
          </p>
          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--adm-label)' }}>
            {pendingCalls > 0
              ? `${pendingCalls} order${pendingCalls === 1 ? '' : 's'} waiting for a confirmation call — oldest first, one tap to verify or cancel.`
              : 'Queue clear — no orders waiting for calls. New unverified COD lands here after 24h.'}
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Open queue <ArrowRight size={11} />
          </p>
        </Link>

        <Link to="/admin/cod-recon" className="block border p-5 transition-colors hover:border-[var(--od-black,#111)]"
          style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)', textDecoration: 'none' }}>
          <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            <Banknote size={14} /> Courier reconciliation
          </p>
          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: 'var(--adm-label)' }}>
            Expected vs collected cash per courier. Mark batches collected when the
            courier remits — payment state updates everywhere automatically.
          </p>
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: 'var(--admin-text)' }}>
            Open reconciliation <ArrowRight size={11} />
          </p>
        </Link>
      </div>

      {topCouriers.length > 0 && (
        <div className="mt-8">
          <p className="adm-eyebrow">Highest exposure right now</p>
          <div className="mt-2">
            {topCouriers.map((r) => (
              <div key={r.courier} className="flex items-center justify-between border-b py-3" style={{ borderColor: 'var(--admin-border-subtle)' }}>
                <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>
                  <Truck size={13} style={{ color: 'var(--adm-label)' }} /> {r.courier}
                </p>
                <p className="text-[13px] font-semibold tabular-nums" style={{ color: '#f59e0b' }}>{pkr(r.outstanding)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--adm-label)' }}>
            Outstanding COD by courier for shipped-to-delivered orders. Chase the top one first.
          </p>
        </div>
      )}
    </AdminLayout>
  );
}
