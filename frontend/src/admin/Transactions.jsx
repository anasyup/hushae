import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * TRANSACTIONS LEDGER — every payment across COD / wallets / cards.
 * The money trail for online payments: method, state, gateway ref, amount.
 * ========================================================================== */

const stateBadge = (s) => {
  if (s === 'Confirmed') return 'od-b-green';
  if (s === 'Verified') return 'od-b-blue';
  if (s === 'Failed' || s === 'Expired') return 'od-b-red';
  return 'od-b-yellow';
};

export default function Transactions() {
  const { auth, toast } = useApp();
  const [rows, setRows] = useState(null);
  const [method, setMethod] = useState('all');
  const [state, setState] = useState('all');

  const load = useCallback(async () => {
    try {
      const d = await api(`/orders/manage/transactions?method=${encodeURIComponent(method)}&state=${encodeURIComponent(state)}`, { token: auth?.token });
      setRows(d.transactions || []);
    } catch (e) {
      toast?.(e.message || 'Could not load transactions');
      setRows([]);
    }
  }, [auth?.token, method, state, toast]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!rows?.length) { toast?.('Nothing to export'); return; }
    const head = 'Order,Customer,Method,State,Reference,Total,Date';
    const body = rows.map((t) =>
      [t.id, `"${(t.customer || '').replace(/"/g, '""')}"`, t.method, t.state, t.ref, t.total, new Date(t.at).toISOString()].join(','));
    const blob = new Blob([[head, ...body].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totals = (rows || []).reduce((a, t) => {
    a.count += 1;
    a.sum += t.total || 0;
    if (t.state === 'Confirmed' || t.state === 'Verified') a.confirmed += t.total || 0;
    return a;
  }, { count: 0, sum: 0, confirmed: 0 });

  return (
    <AdminLayout title="Transactions">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Finance</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Transactions</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Every payment across COD, wallets and cards — the complete money trail.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="adm-chip" aria-label="Filter by method" style={{ height: 34 }}>
            <option value="all">All methods</option>
            {['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Visa'].map((m) => <option key={m}>{m}</option>)}
          </select>
          <select value={state} onChange={(e) => setState(e.target.value)} className="adm-chip" aria-label="Filter by state" style={{ height: 34 }}>
            <option value="all">All states</option>
            {['Pending', 'Verified', 'Confirmed', 'Failed', 'Expired'].map((m) => <option key={m}>{m}</option>)}
          </select>
          <button type="button" className="adm-chip" onClick={load}><RefreshCcw size={13} /> Refresh</button>
          <button type="button" className="adm-chip solid" onClick={exportCsv}><Download size={13} /> Export CSV</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 border-y sm:grid-cols-3" style={{ borderColor: 'var(--admin-border)' }}>
        {[
          ['Transactions', String(totals.count)],
          ['Gross volume', pkr(totals.sum)],
          ['Confirmed', pkr(totals.confirmed)],
        ].map(([label, value], i) => (
          <div key={label} className="px-5 py-5" style={i > 0 ? { borderLeft: '1px solid var(--admin-border)' } : undefined}>
            <p className="adm-label">{label}</p>
            <p className="adm-metric mt-2 text-[24px] leading-none">{value}</p>
          </div>
        ))}
      </div>

      <div className="od-table-wrap">
        <table className="od-tbl">
          <thead>
            <tr>
              <th>Order</th><th>Customer</th><th>Method</th><th>State</th><th>Reference</th><th>Total</th><th>Date</th>
            </tr>
          </thead>
          <tbody>
            {!rows && (
              <tr><td colSpan={7}><div className="od-skel" style={{ height: 20 }} /></td></tr>
            )}
            {rows && rows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--adm-label)' }}>No transactions for these filters yet.</td></tr>
            )}
            {rows && rows.map((t) => (
              <tr key={t.id}>
                <td className="od-strong">{t.id}</td>
                <td>{t.customer}</td>
                <td>{t.method}</td>
                <td><span className={`od-b ${stateBadge(t.state)}`}><span className="dot" />{t.state}</span></td>
                <td style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--adm-label)' }}>{t.ref || '—'}</td>
                <td className="od-strong">{pkr(t.total)}</td>
                <td style={{ color: 'var(--adm-label)' }}>{fmtDateTime(t.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
