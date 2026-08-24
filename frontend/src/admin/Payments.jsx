import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, EditorialEmpty, EditorialError, MonoStatus, TableSkeleton } from './orders/orderUi';
import { MonoLine, RankedBars } from './analytics/charts';

const TABS = [
  ['overview', 'Overview'],
  ['pending', 'Pending'],
  ['transactions', 'Transactions'],
  ['methods', 'Methods'],
];

export default function Payments() {
  const { auth, toast } = useApp();
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('overview');
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('all');
  const [txMethod, setTxMethod] = useState('all');
  const [err, setErr] = useState('');
  const [busyIds, setBusyIds] = useState(new Set());

  const load = async () => {
    try {
      const [o, s] = await Promise.all([
        api('/orders/admin', { token: auth.token }),
        api('/settings/admin', { token: auth.token }),
      ]);
      setOrders(o.orders || []);
      setSettings(s.settings || {});
      setErr('');
    } catch (e) { setErr(e?.message || 'Failed to load'); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const verifyPayment = async (orderId, status) => {
    setBusyIds((s) => new Set(s).add(orderId));
    try {
      await api(`/orders/manage/${orderId}/payment`, { method: 'PATCH', token: auth.token, body: { paymentStatus: status } });
      toast(`Payment marked as ${status}`);
      load();
    } catch (e) { toast(e.message || 'Failed'); }
    setBusyIds((s) => { const n = new Set(s); n.delete(orderId); return n; });
  };

  const stats = useMemo(() => {
    if (!Array.isArray(orders)) return null;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(monthStart.getDate() - 30);
    const prevStart = new Date(); prevStart.setDate(prevStart.getDate() - 60);

    let totalRevenue = 0, pendingCount = 0, pendingValue = 0, verifiedCount = 0, refundedTotal = 0;
    let todayCount = 0, todayValue = 0, monthValue = 0, prevValue = 0;
    const byMethod = {};
    const dailyMap = new Map();
    const pendingOrders = [];

    for (const o of orders) {
      const d = new Date(o.createdAt);
      const isCancelled = o.status === 'Cancelled';
      const isRefunded = o.status === 'Refunded';
      const isPending = o.paymentStatus === 'Pending';
      const isVerified = o.paymentStatus === 'Verified';

      if (!isCancelled && !isRefunded) totalRevenue += o.total || 0;
      if (isPending && !isCancelled) { pendingCount += 1; pendingValue += o.total || 0; pendingOrders.push(o); }
      if (isVerified) verifiedCount += 1;
      if (isRefunded) refundedTotal += o.total || 0;
      if (d >= todayStart) { todayCount += 1; if (!isCancelled && !isRefunded) todayValue += o.total || 0; }
      if (d >= monthStart && !isCancelled && !isRefunded) monthValue += o.total || 0;
      if (d >= prevStart && d < monthStart && !isCancelled && !isRefunded) prevValue += o.total || 0;

      if (!isCancelled && !isRefunded) {
        const key = o.paymentMethod || 'Other';
        byMethod[key] = byMethod[key] || { count: 0, value: 0, paid: 0, pending: 0 };
        byMethod[key].count += 1;
        byMethod[key].value += o.total || 0;
        if (o.paymentStatus === 'Paid') byMethod[key].paid += 1;
        else if (isPending) byMethod[key].pending += 1;
      }
      if (d >= monthStart) {
        const key = d.toISOString().slice(0, 10);
        const row = dailyMap.get(key) || { date: key, value: 0, count: 0 };
        if (!isCancelled && !isRefunded) { row.value += o.total || 0; row.count += 1; }
        dailyMap.set(key, row);
      }
    }

    const daily = [];
    for (let d = new Date(monthStart); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const row = dailyMap.get(key) || { date: key, value: 0, count: 0 };
      daily.push({ ...row, label: new Date(key).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) });
    }

    const change = prevValue > 0 ? ((monthValue - prevValue) / prevValue) * 100 : (monthValue > 0 ? 100 : 0);
    return { totalRevenue, pendingCount, pendingValue, verifiedCount, refundedTotal, todayCount, todayValue, monthValue, prevValue, change, byMethod, daily, pendingOrders };
  }, [orders]);

  const transactions = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let list = [...orders];
    if (txStatus !== 'all') list = list.filter((o) => o.paymentStatus === txStatus);
    if (txMethod !== 'all') list = list.filter((o) => o.paymentMethod === txMethod);
    if (txSearch.trim()) {
      const q = txSearch.trim().toLowerCase();
      list = list.filter((o) => o.orderNumber?.toLowerCase().includes(q) || o.customerInfo?.name?.toLowerCase().includes(q) || o.customerInfo?.phone?.toLowerCase().includes(q) || (o.transactionId || '').toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, txStatus, txMethod, txSearch]);

  const exportCsv = () => {
    const rows = [['Order', 'Date', 'Customer', 'Phone', 'Method', 'Payment Status', 'Total (PKR)']];
    for (const o of transactions) rows.push([o.orderNumber, new Date(o.createdAt).toISOString(), o.customerInfo?.name || '', o.customerInfo?.phone || '', o.paymentMethod, o.paymentStatus, o.total || 0]);
    const csv = rows.map((r) => r.map((c) => { const s = String(c ?? '').replace(/"/g, '""'); return /[",\n]/.test(s) ? `"${s}"` : s; }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `hushae-payments-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (err) {
    return (
      <AdminLayout title="Payments">
        <PageHeader title="Payments" description="Revenue, pending verification and method mix." />
        <EditorialError title="Unable to load payments" description={err} onRetry={load} />
      </AdminLayout>
    );
  }
  if (!stats) {
    return (
      <AdminLayout title="Payments">
        <PageHeader title="Payments" description="Revenue, pending verification and method mix." />
        <TableSkeleton rows={6} />
      </AdminLayout>
    );
  }

  const kpis = [
    ['Revenue (30d)', pkr(stats.monthValue), `${stats.change > 0 ? '+' : ''}${stats.change.toFixed(1)}% vs prior`],
    ["Today's captures", `${stats.todayCount}`, pkr(stats.todayValue)],
    ['Pending', String(stats.pendingCount), pkr(stats.pendingValue)],
    ['Refunded', pkr(stats.refundedTotal), ''],
  ];

  const gateways = [
    { title: 'Cash on Delivery', enabled: settings?.paymentMethods?.cod !== false, account: 'Always active' },
    { title: 'JazzCash', enabled: !!settings?.paymentMethods?.jazzcash, account: settings?.paymentMethods?.jazzcashNumber || 'Not configured' },
    { title: 'EasyPaisa', enabled: !!settings?.paymentMethods?.easypaisa, account: settings?.paymentMethods?.easypaisaNumber || 'Not configured' },
  ];

  return (
    <AdminLayout title="Payments">
      <PageHeader
        title="Payments"
        description="Revenue, pending verification and method mix."
        actions={<Link to="/admin/settings/payments" className={btnGhost}>Payment settings</Link>}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Snapshot</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-[#EAEAEA] lg:grid-cols-4">
          {kpis.map(([l, v, s]) => (
            <div key={l} className="px-5 py-6">
              <p className="adm-label">{l}</p>
              <p className="adm-metric mt-3 text-[22px] text-black">{v}</p>
              {s && <p className="mt-1 text-[11px] text-[#AAAAAA]">{s}</p>}
            </div>
          ))}
        </div>
      </section>

      <div className="mb-8 flex flex-wrap gap-1.5">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={tab === k ? btnSolid : btnGhost}>
            {l}{k === 'pending' ? ` ${stats.pendingCount}` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <section className="mb-10">
            <p className="adm-index">02 — Revenue, 30 days</p>
            <MonoLine data={stats.daily} k="value" fmt={pkr} />
          </section>
          <section>
            <p className="adm-index">03 — Gateways</p>
            <div className="border-y border-[#EAEAEA]">
              {gateways.map((g) => (
                <div key={g.title} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0F0] py-4 last:border-0">
                  <div>
                    <p className="text-[13px] text-black">{g.title}</p>
                    <p className="mt-0.5 text-[12px] text-[#AAAAAA]">{g.account}</p>
                  </div>
                  <MonoStatus label={g.enabled ? 'ENABLED' : 'OFF'} dim={!g.enabled} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'pending' && (
        <section>
          <p className="adm-index">02 — Pending verification</p>
          {stats.pendingOrders.length === 0 ? (
            <EditorialEmpty title="All payments verified" description="No pending payments to review." />
          ) : (
            <>
              <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.8fr_1.1fr_0.8fr_0.7fr_1fr_1fr] md:gap-3">
                {['Order', 'Customer', 'Method', 'Amount', 'Date', 'Action'].map((h) => <p key={h} className="adm-label">{h}</p>)}
              </div>
              {stats.pendingOrders.slice(0, 50).map((o) => (
                <div key={o._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[0.8fr_1.1fr_0.8fr_0.7fr_1fr_1fr] md:items-center md:gap-3">
                  <Link to={`/admin/orders/${o._id}`} className="font-mono text-[12px] text-black hover:underline">{o.orderNumber}</Link>
                  <span className="text-[13px] text-[#333333]">{o.customerInfo?.name}</span>
                  <span className="text-[12px] uppercase tracking-[0.12em] text-[#999999]">{o.paymentMethod}</span>
                  <span className="tabular-nums text-[13px] text-black">{pkr(o.total)}</span>
                  <span className="text-[12px] text-[#AAAAAA]">{fmtDateTime(o.createdAt)}</span>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busyIds.has(o._id)} onClick={() => verifyPayment(o._id, 'Verified')} className={btnGhost}>Verify</button>
                    <button type="button" disabled={busyIds.has(o._id)} onClick={() => verifyPayment(o._id, 'Confirmed')} className={btnSolid}>Confirm</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {tab === 'transactions' && (
        <section>
          <p className="adm-index">02 — Transactions</p>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="Search order, customer, txn ID" className={`${ctl} min-w-[180px] flex-1 sm:max-w-xs`} />
            <select value={txStatus} onChange={(e) => setTxStatus(e.target.value)} className={`${ctl} w-36`}>
              <option value="all">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Failed">Failed</option>
              <option value="Refunded">Refunded</option>
            </select>
            <select value={txMethod} onChange={(e) => setTxMethod(e.target.value)} className={`${ctl} w-36`}>
              <option value="all">All methods</option>
              <option value="COD">COD</option>
              <option value="JazzCash">JazzCash</option>
              <option value="EasyPaisa">EasyPaisa</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <button type="button" onClick={exportCsv} className={btnSolid}>Export CSV</button>
          </div>
          {transactions.length === 0 ? (
            <EditorialEmpty title="No transactions" description="No transactions match your filters." />
          ) : (
            <>
              <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.8fr_1fr_1.2fr_0.8fr_0.6fr_0.7fr] md:gap-3">
                {['Order', 'Date', 'Customer', 'Method', 'Status', 'Amount'].map((h) => <p key={h} className="adm-label">{h}</p>)}
              </div>
              {transactions.slice(0, 100).map((o) => (
                <div key={o._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[0.8fr_1fr_1.2fr_0.8fr_0.6fr_0.7fr] md:items-center md:gap-3">
                  <Link to={`/admin/orders/${o._id}`} className="font-mono text-[12px] text-black hover:underline">{o.orderNumber}</Link>
                  <span className="text-[12px] text-[#AAAAAA]">{fmtDateTime(o.createdAt)}</span>
                  <div>
                    <p className="text-[13px] text-black">{o.customerInfo?.name}</p>
                    <p className="text-[11px] text-[#AAAAAA]">{o.customerInfo?.phone}</p>
                  </div>
                  <span className="text-[12px] uppercase tracking-[0.12em] text-[#999999]">{o.paymentMethod}</span>
                  <MonoStatus label={String(o.paymentStatus || '').toUpperCase()} dim={['Pending', 'Failed', 'Refunded'].includes(o.paymentStatus)} />
                  <span className="tabular-nums text-[13px] text-black">{pkr(o.total)}</span>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {tab === 'methods' && (
        <section>
          <p className="adm-index">02 — Method mix</p>
          <RankedBars
            rows={Object.entries(stats.byMethod).sort((a, b) => b[1].value - a[1].value).map(([name, m]) => ({
              label: name,
              value: m.value,
              sub: `${m.count} · ${m.paid} paid`,
            }))}
            fmt={pkr}
            empty="No payments in this range."
          />
        </section>
      )}
    </AdminLayout>
  );
}
