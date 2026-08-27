import { useCallback, useEffect, useState } from 'react';
import { Banknote, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * COD RECONCILIATION — expected vs collected cash, per courier.
 *
 * The daily cash question for a COD business: "kitna aana tha, kitna aa
 * gaya?" One table answers it. "Mark collected" uses the existing bulk
 * mark-paid pipeline, so reconciliation and payment state can never drift.
 * ========================================================================== */

export default function CODRecon() {
  const { auth, toast } = useApp();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const d = await api('/orders/manage/cod-recon', { token: auth?.token });
      setData(d);
    } catch {
      setData({ rows: [], totals: { count: 0, expected: 0, collected: 0 } });
    }
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  const markCollected = async (row) => {
    if (!row.outstandingIds?.length) return;
    setBusy(row.courier);
    try {
      const res = await api('/orders/manage/bulk', {
        method: 'POST', token: auth.token,
        body: { action: 'mark-paid', ids: row.outstandingIds },
      });
      toast?.(res.failedCount ? `${res.okCount} collected · ${res.failedCount} failed` : `${res.okCount} orders marked collected`);
      await load();
    } catch (e) {
      toast?.(e.message || 'Could not mark collected');
    }
    setBusy(null);
  };

  const t = data?.totals || { count: 0, expected: 0, collected: 0 };

  return (
    <AdminLayout title="COD Reconciliation">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Finance</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>COD Reconciliation</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Shipped-to-Delivered COD orders · expected vs collected, per courier.
          </p>
        </div>
        <button type="button" onClick={load} className="adm-chip">
          <RefreshCcw size={13} strokeWidth={1.6} /> Refresh
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 border-y sm:grid-cols-3" style={{ borderColor: 'var(--admin-border)' }}>
        {[
          ['COD expected', pkr(t.expected)],
          ['Collected', pkr(t.collected)],
          ['Outstanding', pkr(Math.max(0, t.expected - t.collected))],
        ].map(([label, value], i) => (
          <div key={label} className="px-5 py-5" style={i > 0 ? { borderLeft: `1px solid var(--admin-border)` } : undefined}>
            <p className="adm-label">{label}</p>
            <p className="adm-metric mt-2 text-[26px] leading-none">{value}</p>
          </div>
        ))}
      </div>

      {!data && <p className="py-10 text-center text-[12px]" style={{ color: 'var(--adm-label)' }}>Loading…</p>}
      {data && data.rows.length === 0 && (
        <div className="py-16 text-center">
          <Banknote size={22} strokeWidth={1.4} style={{ color: 'var(--adm-label)', margin: '0 auto' }} />
          <p className="mt-3 text-[14px] font-semibold">No COD orders in transit.</p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Shipped COD orders with a courier will appear here for reconciliation.
          </p>
        </div>
      )}
      {data && data.rows.length > 0 && (
        <div>
          <div className="hidden grid-cols-[1.4fr_0.5fr_1fr_1fr_1fr_auto] gap-3 border-b py-2 md:grid" style={{ borderColor: 'var(--admin-border)' }}>
            {['Courier', 'Orders', 'Expected', 'Collected', 'Outstanding', ''].map((h) => (
              <p key={h} className="adm-label">{h}</p>
            ))}
          </div>
          {data.rows.map((r) => (
            <div key={r.courier} className="grid grid-cols-2 items-center gap-3 border-b py-4 md:grid-cols-[1.4fr_0.5fr_1fr_1fr_1fr_auto]" style={{ borderColor: 'var(--admin-border-subtle)' }}>
              <p className="text-[13px] font-semibold">{r.courier}</p>
              <p className="text-[12px] tabular-nums" style={{ color: 'var(--adm-label)' }}>{r.count}</p>
              <p className="text-[13px] tabular-nums">{pkr(r.expected)}</p>
              <p className="text-[13px] tabular-nums" style={{ color: '#10b981' }}>{pkr(r.collected)}</p>
              <p className="text-[13px] font-semibold tabular-nums" style={{ color: r.outstanding > 0 ? '#f59e0b' : 'var(--adm-label)' }}>
                {pkr(r.outstanding)}
              </p>
              <button
                type="button"
                disabled={busy === r.courier || !r.outstandingIds?.length}
                onClick={() => markCollected(r)}
                className="adm-chip solid disabled:opacity-40"
              >
                {busy === r.courier ? 'Marking…' : 'Mark collected'}
              </button>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
