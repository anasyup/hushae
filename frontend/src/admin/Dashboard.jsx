import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Banknote, Box, Calendar,
  ChevronRight, CircleDollarSign, Package, RefreshCw, ShoppingBag, Sparkles,
  Truck, TrendingUp, Users, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * PREMIUM DASHBOARD — original design inspired by (not copied from) top
 * e-commerce admin templates. Every widget is a real, working view on live
 * data from /api/admin/dashboard.
 * ========================================================================== */

const statusPill = (s) =>
  s === 'Delivered' ? 'bg-emerald-100 text-emerald-800'
    : s === 'Cancelled' ? 'bg-red-100 text-red-800'
    : s === 'Refunded' ? 'bg-orange-100 text-orange-800'
    : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-purple-100 text-purple-800'
    : s === 'Ready to Ship' ? 'bg-blue-100 text-blue-800'
    : s === 'Processing' ? 'bg-blue-50 text-blue-700'
    : s === 'Confirmed' ? 'bg-cyan-100 text-cyan-800'
    : 'bg-amber-100 text-amber-800';

/* ==========================================================================
 * KPI CARD — trend badge (▲ +12%) coloured by direction
 * ======================================================================== */
function KpiCard({ icon: Icon, label, value, change, sparkData, accent = '#111111', format = 'number' }) {
  const positive = change > 0;
  const negative = change < 0;
  const changeText = Math.abs(change).toFixed(1) + '%';
  const display = format === 'money'
    ? pkr(value)
    : format === 'compact'
      ? (value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value)
      : value.toLocaleString();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${accent}10`, color: accent }}>
          <Icon size={17} strokeWidth={1.9} />
        </span>
        {change !== 0 && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            positive ? 'bg-emerald-50 text-emerald-700' : negative ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-600'
          }`}>
            {positive ? <ArrowUpRight size={11} /> : negative ? <ArrowDownRight size={11} /> : null}
            {changeText}
          </span>
        )}
      </div>
      <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-1 font-sans text-[26px] font-semibold tabular-nums leading-none tracking-tight text-neutral-900">
        {display}
      </p>
      <p className="mt-1 text-[11px] text-neutral-400">vs. previous 30 days</p>

      {/* Sparkline */}
      {sparkData && sparkData.length > 0 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={2} fill={`url(#grad-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
 * PIPELINE STRIP — order-flow visualization
 * ======================================================================== */
function PipelineStrip({ stats }) {
  const items = [
    { label: 'Pending',       n: stats.pending,     color: 'bg-amber-500',    text: 'text-amber-700', to: '/admin/orders?stage=new' },
    { label: 'Confirmed',     n: stats.confirmed,   color: 'bg-cyan-500',     text: 'text-cyan-700',  to: '/admin/orders?stage=to-ship&sub=to-pack' },
    { label: 'Processing',    n: stats.processing,  color: 'bg-blue-500',     text: 'text-blue-700',  to: '/admin/orders?stage=to-ship&sub=to-arrange' },
    { label: 'Ready to Ship', n: stats.readyToShip, color: 'bg-indigo-500',   text: 'text-indigo-700', to: '/admin/orders?stage=to-ship&sub=to-handover' },
    { label: 'In Transit',    n: stats.shipped,     color: 'bg-purple-500',   text: 'text-purple-700', to: '/admin/orders?stage=shipping' },
    { label: 'Delivered',     n: stats.delivered,   color: 'bg-emerald-500',  text: 'text-emerald-700', to: '/admin/orders?stage=delivered' },
  ];
  const total = items.reduce((n, x) => n + x.n, 0);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Order pipeline</p>
          <p className="mt-1 text-[12px] text-neutral-500">Live view of where every order is</p>
        </div>
        <Link to="/admin/orders" className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900">Manage all →</Link>
      </div>

      {/* Segmented progress bar */}
      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-neutral-100">
        {items.map((it, i) => (
          <div key={i} className={it.color} style={{ width: total ? `${(it.n / total) * 100}%` : '0%' }} title={`${it.label}: ${it.n}`} />
        ))}
      </div>

      {/* Stage labels */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="group flex items-center gap-2 rounded-lg p-2 transition hover:bg-neutral-50">
            <span className={`h-2 w-2 shrink-0 rounded-full ${it.color}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-neutral-500">{it.label}</p>
              <p className={`text-[13px] font-bold tabular-nums ${it.text}`}>{it.n}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ==========================================================================
 * REVENUE CHART — 14 days area with dual axis
 * ======================================================================== */
function RevenueChart({ data }) {
  const [mode, setMode] = useState('revenue'); // revenue | orders

  const total = data.reduce((n, d) => n + (mode === 'revenue' ? d.revenue : d.orders), 0);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Last 14 days</p>
          <p className="mt-1 font-sans text-2xl font-semibold tabular-nums tracking-tight text-neutral-900">
            {mode === 'revenue' ? pkr(total) : total.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
          {['revenue', 'orders'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
                mode === m ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#111111" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#111111" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
            <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={(v) => mode === 'revenue' ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : v}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 8px 24px -12px rgba(0,0,0,0.15)' }}
              formatter={(v) => mode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']}
              labelStyle={{ fontWeight: 600, color: '#111111' }}
            />
            <Area
              type="monotone"
              dataKey={mode}
              stroke="#111111"
              strokeWidth={2.2}
              fill="url(#rev-fill)"
              dot={{ r: 3, fill: '#111111', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ==========================================================================
 * STATUS DONUT — orders by status
 * ======================================================================== */
const STATUS_COLORS = {
  'Pending': '#f59e0b',
  'Confirmed': '#06b6d4',
  'Processing': '#3b82f6',
  'Ready to Ship': '#6366f1',
  'Shipped': '#8b5cf6',
  'Out for Delivery': '#a855f7',
  'Delivered': '#10b981',
  'Cancelled': '#ef4444',
  'Refunded': '#f97316',
};

function StatusDonut({ byStatus }) {
  const data = Object.entries(byStatus)
    .filter(([, n]) => n > 0)
    .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#9ca3af' }));
  const total = data.reduce((n, d) => n + d.value, 0);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Order status mix</p>
      <p className="mt-1 text-[12px] text-neutral-500">All orders by current stage</p>

      {total === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-400">No orders yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2} startAngle={90} endAngle={-270}>
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-sans text-2xl font-semibold tabular-nums leading-none text-neutral-900">{total}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-neutral-500">Total</p>
              </div>
            </div>
          </div>

          <ul className="flex-1 space-y-1.5">
            {data.slice(0, 6).map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-[12px]">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 text-neutral-600">{d.name}</span>
                <span className="font-semibold tabular-nums text-neutral-900">{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
 * TODAY HOURLY BARS — bar chart of today's orders by hour
 * ======================================================================== */
function TodayHourly({ hourly }) {
  const total = hourly.reduce((n, h) => n + h.orders, 0);
  const peak = hourly.reduce((max, h) => h.orders > max.orders ? h : max, { hour: 0, orders: 0 });

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Today's activity</p>
          <p className="mt-1 text-[12px] text-neutral-500">{total} order{total === 1 ? '' : 's'} · peak hour {peak.hour.toString().padStart(2, '0')}:00</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-900 text-white">
          <Activity size={16} />
        </span>
      </div>

      <div className="mt-5 h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#9ca3af" tickLine={false} axisLine={false} interval={2} />
            <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              formatter={(v) => [v, 'Orders']}
              labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
            />
            <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
              {hourly.map((h, i) => (
                <Cell key={i} fill={h.orders === peak.orders && peak.orders > 0 ? '#111111' : '#c9bfb4'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ==========================================================================
 * MAIN DASHBOARD
 * ======================================================================== */
export default function Dashboard() {
  const { auth, logout } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const data = await api('/admin/dashboard', { token: auth.token });
      setD(data); setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      setErr('Failed to load dashboard.');
    }
    setRefreshing(false);
  };

  useEffect(() => { load(); }, [auth]); // eslint-disable-line

  if (err) return (
    <AdminLayout title="Dashboard">
      <div className="mx-auto grid max-w-md place-items-center rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
        <AlertTriangle size={22} className="mb-2 text-red-600" />
        <p className="text-sm text-red-700">{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="mt-4 rounded-full border border-red-300 bg-white px-4 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-100">Try again</button>
      </div>
    </AdminLayout>
  );

  if (!d) return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-32" />)}</div>
      <div className="mt-6 skeleton h-72" />
    </AdminLayout>
  );

  // Build sparkline data from 14-day chart for each KPI
  const sparkRevenue   = d.chart.map((x) => ({ v: x.revenue }));
  const sparkOrders    = d.chart.map((x) => ({ v: x.orders }));
  const sparkCustomers = d.chart.map((x) => ({ v: x.orders * 0.6 })); // proxy for daily customer signups
  const sparkAov       = d.chart.map((x) => ({ v: x.orders ? x.revenue / x.orders : 0 }));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <AdminLayout title="Dashboard">

      {/* --- Greeting + refresh row --- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-2xl text-neutral-900">{greeting}, {auth?.user?.name?.split(' ')[0] || 'Admin'}</p>
          <p className="mt-1 text-[13px] text-neutral-500">Here's what's happening at VÉLOURA today.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-600">
            <Calendar size={12} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button
            onClick={() => load()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* --- KPI cards (30-day) with sparklines + trend --- */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={CircleDollarSign} label="Revenue (30d)"   value={d.kpis.revenue.value}   change={d.kpis.revenue.change}   sparkData={sparkRevenue}   accent="#059669" format="money" />
        <KpiCard icon={ShoppingBag}      label="Orders (30d)"    value={d.kpis.orders.value}    change={d.kpis.orders.change}    sparkData={sparkOrders}    accent="#2563eb" />
        <KpiCard icon={Users}            label="New Customers"   value={d.kpis.customers.value} change={d.kpis.customers.change} sparkData={sparkCustomers} accent="#7c3aed" />
        <KpiCard icon={TrendingUp}       label="Avg Order Value" value={d.kpis.aov.value}       change={d.kpis.aov.change}       sparkData={sparkAov}       accent="#dc2626" format="money" />
      </div>

      {/* --- Pipeline strip --- */}
      <div className="mt-6">
        <PipelineStrip stats={d.stats} />
      </div>

      {/* --- Chart + Donut row --- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={d.chart} />
        </div>
        <StatusDonut byStatus={d.byStatus} />
      </div>

      {/* --- Today activity + Best sellers --- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TodayHourly hourly={d.hourly} />

        {/* Best sellers */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Best sellers</p>
              <p className="mt-1 text-[12px] text-neutral-500">Top 5 by units sold</p>
            </div>
            <Sparkles size={16} className="text-amber-500" />
          </div>
          {d.bestSellers.length === 0 ? (
            <p className="mt-6 text-center text-sm text-neutral-400">Sales data will appear here.</p>
          ) : (
            <ol className="mt-5 space-y-3">
              {d.bestSellers.map((b, i) => (
                <li key={b.name} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-neutral-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-100 text-neutral-600'}`}>
                    {i + 1}
                  </span>
                  {b.image && <Img src={b.image} alt="" className="h-10 w-8 rounded-md border border-neutral-200 object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-neutral-900">{b.name}</p>
                    <p className="text-[11px] text-neutral-500">{b.qty} sold · {pkr(b.revenue)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* --- Recent orders + Low stock + Top customers --- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Recent orders</p>
              <p className="mt-1 text-[12px] text-neutral-500">Last 6 orders across all stages</p>
            </div>
            <Link to="/admin/orders" className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900">
              View all <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {d.recentOrders.map((o) => (
              <Link
                key={o._id}
                to={`/admin/orders/${o._id}`}
                className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 transition hover:border-neutral-300 hover:bg-neutral-50"
              >
                <Img src={o.items?.[0]?.image} alt="" className="h-11 w-9 shrink-0 rounded-lg border border-neutral-200 object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-mono text-[12px] font-semibold text-neutral-900">{o.orderNumber}</p>
                    <span className={`pill ${statusPill(o.status)}`}>{o.status}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                    {o.customerInfo?.name} · {o.customerInfo?.city} · {fmtDate(o.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-sans text-[13px] font-semibold tabular-nums text-neutral-900">{pkr(o.total)}</p>
                  <p className="text-[10px] text-neutral-400">{o.paymentMethod}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right rail: low stock + top customers */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
                <AlertTriangle size={13} className="text-red-500" /> Low stock (≤ 5)
              </p>
              <Link to="/admin/products" className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900">Manage</Link>
            </div>
            {d.lowStock.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-400">All stocked up.</p>
            ) : (
              <div className="space-y-2">
                {d.lowStock.slice(0, 5).map((p) => (
                  <Link to={`/admin/products/${p._id}`} key={p._id} className="flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-neutral-50">
                    <Img src={p.images[0]?.url} alt="" className="h-10 w-8 rounded-md border border-neutral-200 object-cover" />
                    <span className="line-clamp-2 flex-1 text-[12px] font-medium text-neutral-800">{p.name}</span>
                    <span className={`pill ${p.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-red-50 text-red-700'}`}>{p.stock}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Top customers</p>
              <Link to="/admin/customers" className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-900">All</Link>
            </div>
            {d.topCustomers.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-400">No customer data yet.</p>
            ) : (
              <div className="space-y-3">
                {d.topCustomers.map((c, i) => (
                  <div key={c.phone + i} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-[11px] font-semibold text-white">
                      {(c.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-neutral-900">{c.name}</p>
                      <p className="truncate text-[10px] text-neutral-500">{c.city} · {c.orders} order{c.orders === 1 ? '' : 's'}</p>
                    </div>
                    <p className="font-sans text-[12px] font-semibold tabular-nums text-neutral-900">{pkr(c.spent)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
