import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Banknote, CheckCircle2, ChevronRight, CircleDollarSign,
  Clock, CreditCard, Download, Filter, Landmark, Percent, Search,
  Smartphone, TrendingUp, Wallet, XCircle, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * PAYMENTS — Phase 6 enhanced redesign.
 *
 * Shopify-style financial command centre:
 *   - Overview tab: revenue chart, KPI cards, payment gateway status
 *   - Pending tab: quick-verify panel for COD/JazzCash/EasyPaisa payments
 *   - Transactions tab: searchable, filterable table
 *   - Methods tab: method mix analysis
 *   Top bar: total revenue + today's captures + pending count
 * ========================================================================== */

const METHOD_META = {
  COD:              { icon: Banknote,   color: '#059669', bg: 'bg-emerald-50', label: 'Cash on Delivery' },
  JazzCash:         { icon: Smartphone, color: '#dc2626', bg: 'bg-red-50',    label: 'JazzCash' },
  EasyPaisa:        { icon: Smartphone, color: '#16a34a', bg: 'bg-emerald-50',label: 'EasyPaisa' },
  'Bank Transfer':  { icon: Landmark,   color: '#2563eb', bg: 'bg-blue-50',   label: 'Bank Transfer' },
  Visa:             { icon: CreditCard, color: '#1a1f71', bg: 'bg-indigo-50', label: 'Visa / Mastercard' },
};

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

  /* --- Compute stats --- */
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

  /* --- Filtered transactions --- */
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

  if (err) return <AdminLayout title="Payments"><div className="mx-auto grid max-w-md place-items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center"><XCircle size={22} className="mb-2 text-red-600" /><p className="text-sm text-red-700">{err}</p><button onClick={load} className="mt-3 rounded-full border border-red-300 bg-white px-4 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">Try again</button></div></AdminLayout>;
  if (!stats) return <AdminLayout title="Payments"><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="animate-pulse rounded-xl bg-neutral-100 h-32 rounded-2xl" />)}</div></AdminLayout>;

  return (
    <AdminLayout title="Payments">
      {/* ── Top KPI bar ─────────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={CircleDollarSign} label="Revenue (30d)" value={pkr(stats.monthValue)} change={stats.change} tone={stats.change >= 0 ? 'up' : 'down'} />
        <KpiCard icon={CheckCircle2} label="Today's captures" value={`${stats.todayCount} payments`} sub={pkr(stats.todayValue)} tone="neutral" />
        <KpiCard icon={Clock} label="Pending verification" value={stats.pendingCount} sub={pkr(stats.pendingValue) + ' at risk'} tone={stats.pendingCount > 5 ? 'warn' : 'neutral'} />
        <KpiCard icon={Percent} label="Refunded" value={pkr(stats.refundedTotal)} tone="neutral" />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {[
            { k: 'overview',      l: 'Overview',        i: TrendingUp },
            { k: 'pending',       l: 'Pending',         i: Clock,         n: stats.pendingCount },
            { k: 'transactions',  l: 'Transactions',    i: Wallet },
            { k: 'methods',       l: 'Methods',         i: CreditCard },
          ].map((t) => {
            const active = tab === t.k;
            const I = t.i;
            return (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition ${active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'}`}>
                <I size={13} /> {t.l}{t.n != null && <span className={`rounded-full px-1.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-neutral-100'}`}>{t.n}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/settings/payments" className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-600 transition hover:bg-neutral-50">
            Payment settings <ArrowUpRight size={10} />
          </Link>
        </div>
      </div>

      {/* ═══ OVERVIEW ═══════════════════════════════════════════════════ */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue chart */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Payment revenue — 30 days</p>
                <p className="mt-1 font-sans text-2xl font-semibold text-neutral-900">{pkr(stats.monthValue)}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                {stats.change > 0 ? '▲' : stats.change < 0 ? '▼' : ''} {Math.abs(stats.change).toFixed(1)}% vs prior
              </span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="pay-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#059669" stopOpacity={0.25} /><stop offset="100%" stopColor="#059669" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => [pkr(v), 'Revenue']} />
                  <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2.2} fill="url(#pay-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Gateway health */}
          <section>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Payment gateways</p>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { title: 'Cash on Delivery', icon: Banknote, color: '#059669', enabled: settings?.paymentMethods?.cod !== false, account: 'Always active' },
                { title: 'JazzCash', icon: Smartphone, color: '#dc2626', enabled: !!settings?.paymentMethods?.jazzcash, account: settings?.paymentMethods?.jazzcashNumber || 'Not configured' },
                { title: 'EasyPaisa', icon: Smartphone, color: '#16a34a', enabled: !!settings?.paymentMethods?.easypaisa, account: settings?.paymentMethods?.easypaisaNumber || 'Not configured' },
              ].map((g) => {
                const I = g.icon;
                return (
                  <div key={g.title} className={`rounded-2xl border p-4 ${g.enabled ? 'border-neutral-200 bg-white' : 'border-neutral-200 bg-neutral-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: g.color + '15', color: g.color }}><I size={16} /></span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${g.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>{g.enabled ? 'Enabled' : 'Off'}</span>
                    </div>
                    <p className="mt-3 text-[13px] font-semibold text-neutral-900">{g.title}</p>
                    <p className="mt-1 text-[11px] text-neutral-500">{g.account}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ═══ PENDING — Quick Verify ════════════════════════════════════ */}
      {tab === 'pending' && (
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Pending payment verification</p>
              <p className="mt-1 text-[13px] text-neutral-500">{stats.pendingOrders.length} order{stats.pendingOrders.length === 1 ? '' : 's'} awaiting confirmation</p>
            </div>
          </div>
          {stats.pendingOrders.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <CheckCircle2 size={28} className="mb-2 text-emerald-500" />
              <p className="text-[14px] font-medium text-neutral-700">All payments verified</p>
              <p className="mt-1 text-[12px] text-neutral-500">No pending payments to review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead><tr className="border-b border-neutral-100 bg-neutral-50/60"><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Order</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Customer</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Method</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Amount</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Date</th><th className="table-head text-right">Actions</th></tr></thead>
                <tbody>
                  {stats.pendingOrders.slice(0, 50).map((o) => {
                    const M = METHOD_META[o.paymentMethod] || METHOD_META.COD;
                    const MIcon = M.icon;
                    const busy = busyIds.has(o._id);
                    return (
                      <tr key={o._id} className="border-b border-neutral-100 hover:bg-neutral-50/70">
                        <td className="px-3 py-2 text-[12px]"><Link to={`/admin/orders/${o._id}`} className="font-mono text-[12px] font-semibold hover:underline">{o.orderNumber}</Link></td>
                        <td className="table-cell text-[13px] font-medium">{o.customerInfo?.name}</td>
                        <td className="px-3 py-2 text-[12px]"><span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold" style={{ color: M.color }}><MIcon size={11} />{o.paymentMethod}</span></td>
                        <td className="table-cell font-sans font-semibold tabular-nums">{pkr(o.total)}</td>
                        <td className="table-cell text-[12px] text-neutral-500">{fmtDateTime(o.createdAt)}</td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button disabled={busy} onClick={() => verifyPayment(o._id, 'Verified')} className="rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50">Verify</button>
                            <button disabled={busy} onClick={() => verifyPayment(o._id, 'Confirmed')} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">Confirm</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ═══ TRANSACTIONS ═══════════════════════════════════════════════ */}
      {tab === 'transactions' && (
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="Search order#, customer, txn ID…" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !w-60 !py-2 !pl-9 !text-[13px]" />
              </div>
              <select value={txStatus} onChange={(e) => setTxStatus(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !w-36 !py-2 !text-[13px]"><option value="all">All statuses</option><option value="Paid">Paid</option><option value="Pending">Pending</option><option value="Verified">Verified</option><option value="Failed">Failed</option><option value="Refunded">Refunded</option></select>
              <select value={txMethod} onChange={(e) => setTxMethod(e.target.value)} className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 !w-36 !py-2 !text-[13px]"><option value="all">All methods</option><option value="COD">COD</option><option value="JazzCash">JazzCash</option><option value="EasyPaisa">EasyPaisa</option><option value="Bank Transfer">Bank Transfer</option></select>
            </div>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[11px] font-semibold text-white hover:bg-neutral-800"><Download size={12} /> Export CSV</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead><tr className="border-b border-neutral-100 bg-neutral-50/60"><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Order</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Date</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Customer</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Method</th><th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-neutral-400">Status</th><th className="table-head text-right">Amount</th></tr></thead>
              <tbody>
                {transactions.slice(0, 100).map((o) => {
                  const M = METHOD_META[o.paymentMethod] || METHOD_META.COD;
                  const MIcon = M.icon;
                  return (
                    <tr key={o._id} className="border-b border-neutral-100 hover:bg-neutral-50/70">
                      <td className="px-3 py-2 text-[12px]"><Link to={`/admin/orders/${o._id}`} className="font-mono text-[12px] font-semibold hover:underline">{o.orderNumber}</Link></td>
                      <td className="table-cell text-[12px] text-neutral-500">{fmtDateTime(o.createdAt)}</td>
                      <td className="px-3 py-2 text-[12px]"><p className="text-[13px] font-semibold">{o.customerInfo?.name}</p><p className="text-[11px] text-neutral-500">{o.customerInfo?.phone}</p></td>
                      <td className="px-3 py-2 text-[12px]"><span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold" style={{ color: M.color }}><MIcon size={11} />{o.paymentMethod}</span></td>
                      <td className="px-3 py-2 text-[12px]"><span className={`pill ${o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : o.paymentStatus === 'Refunded' ? 'bg-orange-100 text-orange-800' : o.paymentStatus === 'Verified' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{o.paymentStatus}</span></td>
                      <td className="table-cell text-right font-sans font-semibold tabular-nums">{pkr(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length === 0 && <div className="grid place-items-center py-14 text-center"><Wallet size={22} className="mb-2 text-neutral-300" /><p className="text-sm text-neutral-500">No transactions match your filters.</p></div>}
          </div>
        </section>
      )}

      {/* ═══ METHODS ════════════════════════════════════════════════════ */}
      {tab === 'methods' && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Payment method mix — 30 days</p>
          <div className="mt-4 space-y-3">
            {Object.entries(stats.byMethod).sort((a, b) => b[1].value - a[1].value).map(([name, m]) => {
              const M = METHOD_META[name] || { icon: CreditCard, color: '#64748b', label: name };
              const MI = M.icon;
              const totalVal = Object.values(stats.byMethod).reduce((n, x) => n + x.value, 0) || 1;
              const pct = (m.value / totalVal) * 100;
              return (
                <div key={name} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: M.color + '15', color: M.color }}><MI size={15} /></span>
                      <div><p className="text-[13px] font-semibold">{M.label}</p><p className="text-[11px] text-neutral-500">{m.count} orders · {m.paid} paid · {m.pending} pending</p></div>
                    </div>
                    <div className="text-right"><p className="font-sans text-[12px] font-semibold tabular-nums">{pkr(m.value)}</p><p className="text-[11px] text-neutral-500">{pct.toFixed(1)}%</p></div>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: M.color }} /></div>
                </div>
              );
            })}
            {Object.keys(stats.byMethod).length === 0 && <p className="py-8 text-center text-sm text-neutral-400">No payments in this range.</p>}
          </div>
        </section>
      )}
    </AdminLayout>
  );
}

function KpiCard({ icon: Icon, label, value, sub, change, tone = 'neutral' }) {
  const tones = {
    up:     { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700' },
    down:   { bg: 'bg-red-50',     text: 'text-red-700',     badge: 'bg-red-50 text-red-700' },
    warn:   { bg: 'bg-amber-50',   text: 'text-amber-700',   badge: 'bg-amber-50 text-amber-700' },
    neutral:{ bg: 'bg-neutral-100',text: 'text-neutral-700', badge: '' },
  };
  const t = tones[tone];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.bg} ${t.text}`}><Icon size={16} /></span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-1 font-sans text-[12px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] font-medium text-neutral-500">{sub}</p>}
      {typeof change === 'number' && change !== 0 && <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${t.badge}`}>{change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%</span>}
    </div>
  );
}
