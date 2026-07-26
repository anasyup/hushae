import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Banknote, CheckCircle2, ChevronDown, CircleDollarSign,
  CreditCard, Download, Landmark, Percent, Search, Smartphone, TrendingUp,
  Wallet, XCircle,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/*
 * PAYMENTS — dedicated page for the money side of the business.
 * Tabs: Overview | Transactions | Payment Methods | Refunds
 * Original design — no template copy. Uses live order data.
 */

const METHOD_META = {
  COD:              { icon: Banknote,   color: '#059669', label: 'Cash on Delivery' },
  JazzCash:         { icon: Smartphone, color: '#dc2626', label: 'JazzCash' },
  EasyPaisa:        { icon: Smartphone, color: '#16a34a', label: 'EasyPaisa' },
  'Bank Transfer':  { icon: Landmark,   color: '#2563eb', label: 'Bank Transfer' },
  Visa:             { icon: CreditCard, color: '#1a1f71', label: 'Visa / Mastercard' },
};

export default function Payments() {
  const { auth, toast } = useApp();
  const [orders, setOrders] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('overview');
  const [txSearch, setTxSearch] = useState('');
  const [txStatus, setTxStatus] = useState('all');
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const [o, s] = await Promise.all([
        api('/orders/admin', { token: auth.token }),
        api('/settings'),
      ]);
      setOrders(o.orders || []);
      setSettings(s.settings || {});
      setErr('');
    } catch (e) { setErr(e?.message || 'Failed to load'); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  /* --- Compute all payments stats --- */
  const stats = useMemo(() => {
    if (!Array.isArray(orders)) return null;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(monthStart.getDate() - 30); monthStart.setHours(0, 0, 0, 0);
    const prevStart = new Date(); prevStart.setDate(prevStart.getDate() - 60); prevStart.setHours(0, 0, 0, 0);

    let totalRevenue = 0, pendingCount = 0, failedCount = 0, refundedTotal = 0;
    let todayCount = 0, todayValue = 0, monthValue = 0, prevValue = 0;
    const byMethod = {};
    const dailyMap = new Map();

    for (const o of orders) {
      const d = new Date(o.createdAt);
      const isCancelled = o.status === 'Cancelled';
      const isRefunded = o.status === 'Refunded';
      const isPending = o.paymentStatus === 'Pending';
      const isPaid = o.paymentStatus === 'Paid';
      const isFailed = o.paymentStatus === 'Failed';

      if (!isCancelled && !isRefunded) totalRevenue += o.total || 0;
      if (isPending && !isCancelled) pendingCount += 1;
      if (isFailed) failedCount += 1;
      if (isRefunded) refundedTotal += o.total || 0;

      if (d >= todayStart) {
        todayCount += 1;
        if (!isCancelled && !isRefunded) todayValue += o.total || 0;
      }
      if (d >= monthStart && !isCancelled && !isRefunded) monthValue += o.total || 0;
      if (d >= prevStart && d < monthStart && !isCancelled && !isRefunded) prevValue += o.total || 0;

      // By method
      if (!isCancelled && !isRefunded) {
        const key = o.paymentMethod || 'Other';
        byMethod[key] = byMethod[key] || { count: 0, value: 0, paid: 0, pending: 0 };
        byMethod[key].count += 1;
        byMethod[key].value += o.total || 0;
        if (isPaid) byMethod[key].paid += 1;
        else if (isPending) byMethod[key].pending += 1;
      }

      // Daily series for 30 days
      if (d >= monthStart) {
        const key = d.toISOString().slice(0, 10);
        const row = dailyMap.get(key) || { date: key, value: 0, count: 0 };
        if (!isCancelled && !isRefunded) {
          row.value += o.total || 0;
          row.count += 1;
        }
        dailyMap.set(key, row);
      }
    }

    // Fill 30-day daily
    const daily = [];
    for (let d = new Date(monthStart); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      const row = dailyMap.get(key) || { date: key, value: 0, count: 0 };
      daily.push({ ...row, label: new Date(key).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) });
    }

    const change = prevValue > 0 ? ((monthValue - prevValue) / prevValue) * 100 : (monthValue > 0 ? 100 : 0);

    return {
      totalRevenue, pendingCount, failedCount, refundedTotal,
      todayCount, todayValue, monthValue, prevValue, change,
      byMethod, daily,
    };
  }, [orders]);

  /* --- Filtered transactions for Transactions tab --- */
  const transactions = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let list = [...orders];
    if (txStatus !== 'all') {
      list = list.filter((o) => o.paymentStatus === txStatus);
    }
    if (txSearch.trim()) {
      const q = txSearch.trim().toLowerCase();
      list = list.filter((o) =>
        o.orderNumber?.toLowerCase().includes(q) ||
        o.customerInfo?.name?.toLowerCase().includes(q) ||
        o.customerInfo?.phone?.toLowerCase().includes(q) ||
        o.paymentMethod?.toLowerCase().includes(q) ||
        (o.transactionId || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [orders, txStatus, txSearch]);

  const exportCsv = () => {
    const rows = [
      ['Order', 'Date', 'Customer', 'Phone', 'Method', 'Payment Status', 'Order Status', 'Txn ID', 'Total (PKR)'],
    ];
    for (const o of transactions) {
      rows.push([
        o.orderNumber,
        new Date(o.createdAt).toISOString(),
        o.customerInfo?.name || '',
        o.customerInfo?.phone || '',
        o.paymentMethod,
        o.paymentStatus,
        o.status,
        o.transactionId || '',
        o.total || 0,
      ]);
    }
    const csv = rows.map((r) => r.map((c) => {
      const s = String(c ?? '').replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veloura-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (err) return <AdminLayout title="Payments">
    <div className="mx-auto grid max-w-md place-items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <XCircle size={22} className="mb-2 text-red-600" />
      <p className="text-sm text-red-700">{err}</p>
      <button onClick={load} className="mt-3 rounded-full border border-red-300 bg-white px-4 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">Try again</button>
    </div>
  </AdminLayout>;
  if (!stats) return <AdminLayout title="Payments">
    <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="skeleton h-32" />)}</div>
  </AdminLayout>;

  return (
    <AdminLayout title="Payments">
      {/* KPI cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Total revenue"
          value={pkr(stats.monthValue)}
          sub={<span>
            {stats.change > 0 ? '▲' : stats.change < 0 ? '▼' : ''} {Math.abs(stats.change).toFixed(1)}% <span className="text-neutral-400">from last 30d</span>
          </span>}
          tone={stats.change >= 0 ? 'green' : 'red'}
        />
        <KpiCard icon={CheckCircle2} label="Today's payments" value={stats.todayCount} sub={pkr(stats.todayValue) + ' captured today'} tone="blue" />
        <KpiCard icon={AlertTriangle} label="Pending" value={stats.pendingCount} sub="Awaiting verification" tone="amber" />
        <KpiCard icon={XCircle} label="Failed & refunded" value={stats.failedCount} sub={pkr(stats.refundedTotal) + ' refunded'} tone="red" />
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
        {[
          { k: 'overview',      l: 'Overview',        i: TrendingUp },
          { k: 'transactions',  l: 'Transactions',    i: Wallet },
          { k: 'methods',       l: 'Payment methods', i: CreditCard },
          { k: 'refunds',       l: 'Refunds',         i: Percent },
        ].map((t) => {
          const active = tab === t.k;
          const I = t.i;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition ${
                active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <I size={13} /> {t.l}
            </button>
          );
        })}
      </div>

      {/* === OVERVIEW === */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue trend */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Payments captured — 30 days</p>
                <p className="mt-1 text-[12px] text-neutral-500">Excludes cancelled and refunded orders.</p>
              </div>
              <div className="text-right">
                <p className="font-sans text-[22px] font-semibold tabular-nums leading-none text-neutral-900">{pkr(stats.monthValue)}</p>
                <p className="mt-1 text-[11px] text-neutral-400">{orders.filter((o) => new Date(o.createdAt) >= new Date(Date.now() - 30 * 864e5) && !['Cancelled', 'Refunded'].includes(o.status)).length} payments</p>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.daily} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pay-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
                  <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => [pkr(v), 'Revenue']} />
                  <Area type="monotone" dataKey="value" stroke="#059669" strokeWidth={2.2} fill="url(#pay-fill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Gateway status */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Payment gateways</p>
                <p className="mt-1 text-[12px] text-neutral-500">Wire real gateways here so customers can pay online.</p>
              </div>
              <Link to="/admin/settings/payments" className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900">Configure →</Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <GatewayTile
                title="JazzCash"
                subtitle="Mobile wallet · Pakistan"
                iconColor="#dc2626"
                enabled={!!settings?.paymentMethods?.jazzcash}
                configured={!!(settings?.integrations?.payments?.jazzcash?.merchantId)}
                accountLabel="Merchant number"
                accountValue={settings?.paymentMethods?.jazzcashNumber}
              />
              <GatewayTile
                title="EasyPaisa"
                subtitle="Mobile wallet · Pakistan"
                iconColor="#16a34a"
                enabled={!!settings?.paymentMethods?.easypaisa}
                configured={!!settings?.paymentMethods?.easypaisaNumber}
                accountLabel="Merchant number"
                accountValue={settings?.paymentMethods?.easypaisaNumber}
              />
              <GatewayTile
                title="Visa / Mastercard"
                subtitle="via SafePay gateway"
                iconColor="#1a1f71"
                enabled={!!settings?.paymentMethods?.card}
                configured={!!(settings?.integrations?.payments?.safepay?.apiKey)}
                accountLabel="SafePay client"
                accountValue={settings?.integrations?.payments?.safepay?.apiKey ? '••••••' + String(settings.integrations.payments.safepay.apiKey).slice(-4) : ''}
              />
            </div>
          </section>
        </div>
      )}

      {/* === TRANSACTIONS === */}
      {tab === 'transactions' && (
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input value={txSearch} onChange={(e) => setTxSearch(e.target.value)} placeholder="Search order#, customer, txn ID…" className="input !w-72 !py-2 !pl-9 !text-[13px]" />
              </div>
              <select value={txStatus} onChange={(e) => setTxStatus(e.target.value)} className="input !w-40 !py-2 !text-[13px]">
                <option value="all">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Refunded">Refunded</option>
              </select>
            </div>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[11px] font-semibold text-white hover:bg-neutral-800">
              <Download size={12} /> Export CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/60">
                  <th className="table-head">Order</th>
                  <th className="table-head">Date</th>
                  <th className="table-head">Customer</th>
                  <th className="table-head">Method</th>
                  <th className="table-head">Txn ID</th>
                  <th className="table-head">Status</th>
                  <th className="table-head text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((o) => {
                  const M = METHOD_META[o.paymentMethod] || METHOD_META.COD;
                  const MIcon = M.icon;
                  return (
                    <tr key={o._id} className="border-b border-neutral-100 hover:bg-neutral-50/70">
                      <td className="table-cell">
                        <Link to={`/admin/orders/${o._id}`} className="font-mono text-[12px] font-semibold hover:underline">{o.orderNumber}</Link>
                      </td>
                      <td className="table-cell text-[12px] text-neutral-500">{fmtDateTime(o.createdAt)}</td>
                      <td className="table-cell">
                        <p className="text-[13px] font-semibold">{o.customerInfo?.name}</p>
                        <p className="text-[11px] text-neutral-500">{o.customerInfo?.phone}</p>
                      </td>
                      <td className="table-cell">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold" style={{ color: M.color }}>
                          <MIcon size={11} /> {o.paymentMethod}
                        </span>
                      </td>
                      <td className="table-cell font-mono text-[11px] text-neutral-500">{o.transactionId || '—'}</td>
                      <td className="table-cell">
                        <span className={`pill ${
                          o.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800'
                          : o.paymentStatus === 'Refunded' ? 'bg-orange-100 text-orange-800'
                          : o.paymentStatus === 'Failed' ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                        }`}>{o.paymentStatus}</span>
                      </td>
                      <td className="table-cell text-right font-sans font-semibold tabular-nums">{pkr(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {transactions.length === 0 && (
              <div className="grid place-items-center py-14 text-center">
                <Wallet size={22} className="mb-2 text-neutral-300" />
                <p className="text-sm text-neutral-500">No transactions match your filters.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* === PAYMENT METHODS === */}
      {tab === 'methods' && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Method mix — 30 days</p>
            <p className="mt-1 text-[12px] text-neutral-500">Where the money actually comes from.</p>
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
                        <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: M.color + '15', color: M.color }}><MI size={15}/></span>
                        <div>
                          <p className="text-[13px] font-semibold">{M.label}</p>
                          <p className="text-[11px] text-neutral-500">{m.count} order{m.count === 1 ? '' : 's'} · {m.paid} paid · {m.pending} pending</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-sans text-[15px] font-semibold tabular-nums">{pkr(m.value)}</p>
                        <p className="text-[11px] text-neutral-500">{pct.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: M.color }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.byMethod).length === 0 && <p className="py-8 text-center text-sm text-neutral-400">No payments in this range.</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Manage methods</p>
            <p className="mt-1 text-[12px] text-neutral-500">Toggle methods on/off and add your account numbers.</p>
            <div className="mt-4 space-y-2">
              {['COD','JazzCash','EasyPaisa','Bank Transfer'].map((m) => {
                const on = ({
                  COD: !!settings?.paymentMethods?.cod,
                  JazzCash: !!settings?.paymentMethods?.jazzcash,
                  EasyPaisa: !!settings?.paymentMethods?.easypaisa,
                  'Bank Transfer': !!settings?.paymentMethods?.bank,
                })[m];
                const M = METHOD_META[m];
                const MI = M.icon;
                return (
                  <div key={m} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: M.color + '15', color: M.color }}><MI size={14}/></span>
                    <p className="flex-1 text-[13px] font-semibold">{M.label}</p>
                    <span className={`pill ${on ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'}`}>{on ? 'On' : 'Off'}</span>
                  </div>
                );
              })}
            </div>
            <Link to="/admin/settings/payments" className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-100">
              Open payment settings <ArrowUpRight size={11} />
            </Link>
          </section>
        </div>
      )}

      {/* === REFUNDS === */}
      {tab === 'refunds' && (
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 p-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Refunded orders</p>
            <p className="mt-1 text-[12px] text-neutral-500">Orders you refunded — total <b className="text-neutral-900">{pkr(stats.refundedTotal)}</b>.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/60">
                  <th className="table-head">Order</th>
                  <th className="table-head">Date</th>
                  <th className="table-head">Customer</th>
                  <th className="table-head">Method</th>
                  <th className="table-head text-right">Refunded</th>
                </tr>
              </thead>
              <tbody>
                {orders.filter((o) => o.status === 'Refunded' || o.paymentStatus === 'Refunded').map((o) => (
                  <tr key={o._id} className="border-b border-neutral-100 hover:bg-neutral-50/70">
                    <td className="table-cell">
                      <Link to={`/admin/orders/${o._id}`} className="font-mono text-[12px] font-semibold hover:underline">{o.orderNumber}</Link>
                    </td>
                    <td className="table-cell text-[12px] text-neutral-500">{fmtDateTime(o.createdAt)}</td>
                    <td className="table-cell text-[13px]">{o.customerInfo?.name}</td>
                    <td className="table-cell text-[12px]">{o.paymentMethod}</td>
                    <td className="table-cell text-right font-sans font-semibold tabular-nums text-red-700">−{pkr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.filter((o) => o.status === 'Refunded' || o.paymentStatus === 'Refunded').length === 0 && (
              <div className="grid place-items-center py-16 text-center">
                <CheckCircle2 size={22} className="mb-2 text-emerald-500" />
                <p className="text-sm font-medium text-neutral-700">No refunds in your store</p>
                <p className="mt-1 text-[11px] text-neutral-500">All orders remain in good standing.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </AdminLayout>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone = 'neutral' }) {
  const map = {
    green:   { bg: 'bg-emerald-50', text: 'text-emerald-700', subColor: 'text-emerald-700' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    subColor: 'text-blue-700' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   subColor: 'text-amber-700' },
    red:     { bg: 'bg-red-50',     text: 'text-red-700',     subColor: 'text-red-700' },
    neutral: { bg: 'bg-neutral-100',text: 'text-neutral-700', subColor: 'text-neutral-500' },
  };
  const t = map[tone];
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-sm">
      <span className={`grid h-10 w-10 place-items-center rounded-xl ${t.bg} ${t.text}`}><Icon size={16}/></span>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-1 font-sans text-[24px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">{value}</p>
      {sub && <p className={`mt-2 text-[11px] font-medium ${t.subColor}`}>{sub}</p>}
    </div>
  );
}

function GatewayTile({ title, subtitle, iconColor, enabled, configured, accountLabel, accountValue }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: iconColor + '15', color: iconColor }}>
            <CreditCard size={16} />
          </span>
          <div>
            <p className="text-[13px] font-semibold">{title}</p>
            <p className="text-[11px] text-neutral-500">{subtitle}</p>
          </div>
        </div>
        <span className={`pill ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'}`}>
          {enabled ? 'Enabled' : 'Off'}
        </span>
      </div>
      <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-[11px]">
        {accountValue ? (
          <>
            <p className="text-neutral-500">{accountLabel}</p>
            <p className="mt-0.5 font-mono font-semibold text-neutral-900">{accountValue}</p>
          </>
        ) : (
          <p className="text-neutral-500">{configured ? 'Ready — click Configure to review.' : 'Not configured yet — click Configure to set up.'}</p>
        )}
      </div>
    </div>
  );
}
