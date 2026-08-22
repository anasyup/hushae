import { Component, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgePercent, Box,
  Calendar, ChevronRight, CircleDollarSign, Clock, Download, Megaphone,
  MessageCircle, Package, PackagePlus, RefreshCw, ShoppingBag, Sparkles,
  TrendingUp, Truck, Users, Zap,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import { buildStatusDonut } from '../lib/statusDonut';
import { PAYMENT_STATES, TONE } from './orders/orderConstants';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import AlertsBar from './dashboard/AlertsBar';
import GoalTracker from './dashboard/GoalTracker';
import InsightsCard from './dashboard/InsightsCard';
import RangePicker, { RANGE_PRESETS, resolvePreset } from './dashboard/RangePicker';
import CancellationReasons from './dashboard/CancellationReasons';
import AbandonedCartsWidget from './dashboard/AbandonedCartsWidget';
import ReorderModal from './dashboard/ReorderModal';
import ReliabilityBadge from './ReliabilityBadge';
import { exportDashboardSummary } from './dashboard/exportSummary';

/* ============================================================================
 * DASHBOARD — Phase 6 deep redesign.
 *
 * Layout (desktop):
 *   Row 1: Greeting + live indicator
 *   Row 2: 4 KPI cards + Quick Actions card
 *   Row 3: Revenue chart (2/3) + Status donut (1/3)
 *   Row 4: Order pipeline
 *   Row 5: Goal + Insights
 *   Row 6: P&L (if costs set)
 *   Row 7: Today activity + Best sellers
 *   Row 8: Recent orders (2/3) + Low stock + Top customers (1/3)
 * ========================================================================== */

/* Per-widget error boundary — a chart that throws (bad data, library hiccup)
   degrades to a small retry card instead of blanking the whole dashboard. */
class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-[160px] place-items-center rounded-[10px] border border-white/10 bg-white/5 p-6 text-center" role="alert">
          <div>
            <p className="text-[12px] font-medium text-white/80">Couldn&apos;t render this chart</p>
            <button type="button" onClick={() => this.setState({ failed: false })} className="mt-3 rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/15">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* WhatsApp deep link for verifying a pending order — wa.me needs no API key.
   Phone is normalised to international format (Pakistan default '92'). */
const waDigits = (phone) => {
  const d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  if (d.startsWith('92')) return d;
  return `92${d}`;
};
const waVerifyLink = (o, storePhone) => {
  const phone = waDigits(o?.customerInfo?.phone);
  if (!phone) return '';
  const name = String(o?.customerInfo?.name || '').trim();
  const total = Number(o?.total || 0).toLocaleString('en-PK');
  const msg = `Hi ${name || 'there'}, this is Hushae. Confirming your order ${o.orderNumber} for PKR ${total}. Please reply YES to confirm or call us at ${storePhone} if you have questions.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
};

const statusPill = (s) =>
  s === 'Delivered' ? 'bg-white/15 text-white'
    : s === 'Cancelled' ? 'bg-white/10 text-white/80'
    : s === 'Refunded' ? 'bg-white/10 text-white/70'
    : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-white/15 text-white'
    : s === 'Ready to Ship' ? 'bg-white/10 text-white/80'
    : s === 'Processing' ? 'bg-white/10 text-white/70'
    : s === 'Confirmed' ? 'bg-white/10 text-white/70'
    : 'bg-white/10 text-white/70';

function MetricRow({ icon: Icon, label, value, change, format = 'number', to, compareLabel = 'vs. previous 30 days' }) {
  const hasRate = typeof change === 'number' && Number.isFinite(change);
  const positive = hasRate && change > 0;
  const negative = hasRate && change < 0;
  const isNew = change === null && value > 0;
  const changeText = hasRate ? Math.abs(change).toFixed(1) + '%' : '';
  const display = format === 'money' ? pkr(value) : value.toLocaleString();
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="group px-5 py-6 adm-row-hover">
      <div className="flex items-center justify-between">
        <p className="adm-label">{label}</p>
        <Icon size={13} strokeWidth={1.6} className="text-white/25" aria-hidden />
      </div>
      <p className="adm-metric mt-3 text-[36px] leading-none text-white">{display}</p>
      <div className="mt-3 flex items-center gap-2">
        {isNew ? (
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">New</span>
        ) : hasRate && change !== 0 ? (
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${positive ? 'text-white' : negative ? 'text-white/50' : 'text-white/60'}`}>
            {positive ? <ArrowUpRight size={11} /> : negative ? <ArrowDownRight size={11} /> : null}
            {changeText}
          </span>
        ) : null}
        <span className="text-[10px] uppercase tracking-[0.1em] text-white/30">{compareLabel}</span>
      </div>
    </Wrapper>
  );
}

function QuickActions() {
  /* Exactly ONE primary action — "Add product", the most frequent daily task.
     Everything else is an equal-weight outline/ghost button. */
  const actions = [
    { to: '/admin/orders', icon: ShoppingBag, label: 'View orders' },
    { to: '/admin/products/new', icon: PackagePlus, label: 'Add product', primary: true },
    { to: '/admin/promotions/new', icon: Megaphone, label: 'New promo' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'Discounts' },
  ];
  return (
    <div className="p-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Quick actions</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors duration-150 ${
              a.primary
                ? 'border-white bg-white text-black hover:bg-white/85'
                : 'border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10'
            }`}
          >
            <a.icon size={17} strokeWidth={1.8} />
            <span className="text-[12px] font-medium leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProfitTile({ icon: Icon, label, value, change, tone = 'neutral', format = 'money', hint }) {
  const display = format === 'money' ? pkr(value) : format === 'percent' ? `${value}%` : value.toLocaleString();
  return (
    <div className="rounded-[10px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white"><Icon size={13} /></span>
        {typeof change === 'number' && change !== 0 && (
          <span className={`text-[12px] font-medium ${change > 0 ? 'text-white' : 'text-white/60'}`}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">{label}</p>
      <p className="mt-0.5 font-sans text-[14px] font-semibold leading-none tabular-nums tracking-tight text-white">{display}</p>
      {hint && <p className="mt-1.5 text-[12px] text-white/40">{hint}</p>}
    </div>
  );
}

function StockRow({ product: p, onSaved, onReorder }) {
  const { auth, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(p.stock));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) { toast('Enter a valid quantity'); return; }
    setBusy(true);
    try { await api(`/products/${p._id}/stock`, { method: 'PATCH', token: auth.token, body: { stock: n } }); toast(`${p.name} → ${n} in stock`); setEditing(false); onSaved?.(); }
    catch { toast('Could not update stock'); }
    setBusy(false);
  };
  if (editing) return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 p-1.5">
      <Img src={p.images?.[0]?.url} alt="" className="h-10 w-8 shrink-0 rounded-md border border-white/10 object-cover" />
      <input type="number" min="0" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} className="w-full min-w-0 rounded-md border border-white/15 bg-[#0A0A0A] px-2 py-1.5 text-[12px] tabular-nums text-white outline-none focus:border-white/40" />
      <button onClick={save} disabled={busy} className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-[12px] font-medium text-black disabled:opacity-50">Save</button>
      <button onClick={() => setEditing(false)} className="shrink-0 rounded-md px-1.5 py-1.5 text-[12px] font-medium text-white/50 hover:text-white">Cancel</button>
    </div>
  );
  return (
    <div className="group flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-white/5">
      <Link to={`/admin/products/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3"><Img src={p.images?.[0]?.url} alt="" className="h-10 w-8 shrink-0 rounded-md border border-white/10 object-cover" /><span className="line-clamp-2 flex-1 text-[12px] font-medium text-white/85">{p.name}</span></Link>
      <button onClick={() => { setValue(String(p.stock)); setEditing(true); }} title="Update stock" className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition hover:ring-2 hover:ring-white/25 ${p.stock === 0 ? 'bg-white/15 text-white' : 'bg-white/10 text-white/80'}`}>{p.stock} ✎</button>
      {p.reorderStatus === 'pending' ? (
        <button onClick={() => onReorder?.(p)} title="Reorder pending — tap to mark received" className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white transition hover:ring-2 hover:ring-white/25">Reorder pending</button>
      ) : (
        <button onClick={() => onReorder?.(p)} title="Reorder" className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-black transition hover:bg-white/85">Reorder</button>
      )}
    </div>
  );
}

function PipelineStrip({ stats }) {
  /* Monochrome funnel — white opacity hierarchy per stage */
  const items = [
    { label: 'Pending', n: stats.pending, fill: 'rgba(255,255,255,0.85)', to: '/admin/orders?group=new' },
    { label: 'Confirmed', n: stats.confirmed, fill: 'rgba(255,255,255,0.65)', to: '/admin/orders?status=Confirmed&group=all' },
    { label: 'Processing', n: stats.processing, fill: 'rgba(255,255,255,0.5)', to: '/admin/orders?group=processing' },
    { label: 'Ready', n: stats.readyToShip, fill: 'rgba(255,255,255,0.38)', to: '/admin/orders?group=to-ship' },
    { label: 'In Transit', n: stats.shipped, fill: 'rgba(255,255,255,0.26)', to: '/admin/orders?group=shipped' },
    { label: 'Delivered', n: stats.delivered, fill: 'rgba(255,255,255,0.16)', to: '/admin/orders?group=delivered' },
  ];
  /* Fixed-width equal segments — a funnel has 6 stages regardless of volume, so
     each stage keeps ~16.6% of the bar. A stage with orders is tinted its own
     colour; an empty stage stays a light neutral placeholder (never collapsed
     to zero width). Hovering a segment shows the exact count. */
  return (
    <div className="p-0">
      <div className="flex items-center justify-between">
        <div><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Order pipeline</p><p className="mt-0.5 text-[12px] text-white/40">Where every order is right now</p></div>
        <Link to="/admin/orders" className="text-[12px] font-medium text-white/60 transition hover:text-white">Manage all →</Link>
      </div>
      <div className="mt-4 grid h-2.5 grid-cols-6 gap-0.5">
        {items.map((it) => (
          <div key={it.label} className="group relative">
            <div
              className="h-full w-full transition-colors"
              style={{ backgroundColor: it.n > 0 ? it.fill : 'rgba(255,255,255,0.05)' }}
              role="img"
              aria-label={`${it.label}: ${it.n} order${it.n === 1 ? '' : 's'}`}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-medium text-black opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100">
              {it.label}: {it.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="group flex items-center gap-2 rounded-lg p-2 transition hover:bg-white/5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: it.n > 0 ? it.fill : 'rgba(255,255,255,0.06)' }} />
            <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-white/50">{it.label}</p><p className={`text-[13px] font-semibold tabular-nums ${it.n > 0 ? 'text-white' : 'text-white/40'}`}>{it.n}</p></div>
          </Link>
        ))}
      </div>
      {stats.pending > 0 && (
        <Link to="/admin/orders?group=new" className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 transition hover:bg-white/10">
          <span className="min-w-0 text-[12px] font-medium text-white/80"><b className="tabular-nums text-white">{stats.pending}</b> new order{stats.pending === 1 ? '' : 's'} waiting to be confirmed</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-black">Review now <ChevronRight size={11} /></span>
        </Link>
      )}
    </div>
  );
}

function RevenueChart({ data, rangeLabel }) {
  const [mode, setMode] = useState('revenue');
  const total = data.reduce((n, d) => n + (mode === 'revenue' ? d.revenue : d.orders), 0);
  return (
    <div className="p-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">{rangeLabel || 'Selected period'}</p><p className="mt-1 font-sans text-[26px] font-semibold tabular-nums text-white">{mode === 'revenue' ? pkr(total) : total.toLocaleString()}</p></div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
          {['revenue', 'orders'].map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-md px-3 py-1 text-[11px] font-medium uppercase tracking-wider transition ${mode === m ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}>{m}</button>
          ))}
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs><linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.16} /><stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} />
            <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} tickLine={false} axisLine={false} tickFormatter={(v) => mode === 'revenue' ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : v} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#111111', fontSize: 12, color: '#fff' }} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} formatter={(v) => mode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']} />
            <Area type="monotone" dataKey={mode} stroke="#FFFFFF" strokeWidth={2} fill="url(#rev-fill)" dot={{ r: 2.5, fill: '#FFFFFF', stroke: '#0A0A0A', strokeWidth: 1.5 }} activeDot={{ r: 4.5, fill: '#FFFFFF' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const DONUT_MONO = [
  'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.68)', 'rgba(255,255,255,0.5)',
  'rgba(255,255,255,0.38)', 'rgba(255,255,255,0.28)', 'rgba(255,255,255,0.2)',
  'rgba(255,255,255,0.14)', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.05)',
];

function StatusDonut({ byStatus }) {
  const { segments, total } = buildStatusDonut(byStatus);
  return (
    <div className="p-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Order status mix</p>
      {total === 0 ? <p className="py-16 text-center text-[13px] text-white/40">No orders yet.</p> : (
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={segments} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} startAngle={90} endAngle={-270}>{segments.map((d, i) => <Cell key={i} fill={DONUT_MONO[i % DONUT_MONO.length]} />)}</Pie></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="font-sans text-2xl font-semibold tabular-nums leading-none text-white">{total}</p><p className="mt-1 text-[11px] uppercase tracking-wider text-white/50">Total</p></div></div>
          </div>
          <ul className="flex-1 space-y-1.5">{segments.map((d, i) => <li key={d.name} className="flex items-center gap-2 text-[12px]"><span className="h-2 w-2 rounded-full" style={{ background: DONUT_MONO[i % DONUT_MONO.length] }} /><span className="flex-1 text-white/60">{d.name}</span><span className="font-semibold tabular-nums text-white">{d.value}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

function TodayHourly({ hourly }) {
  const total = hourly.reduce((n, h) => n + h.orders, 0);
  const peak = hourly.reduce((max, h) => h.orders > max.orders ? h : max, { hour: 0, orders: 0 });
  return (
    <div className="p-0">
      <div className="flex items-center justify-between"><div><p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/50">Today&apos;s activity</p><p className="mt-0.5 text-[12px] text-white/40">{total} order{total === 1 ? '' : 's'} · peak {peak.hour.toString().padStart(2, '0')}:00</p></div><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-white"><Activity size={15} /></span></div>
      {total === 0 ? (
        <div className="mt-5 grid h-32 place-items-center rounded-lg bg-white/5 text-center">
          <p className="text-[13px] font-medium text-white/50">No orders yet today</p>
        </div>
      ) : (
        <div className="mt-5 h-32 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}><XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} stroke="rgba(255,255,255,0.15)" tickLine={false} axisLine={false} interval={2} /><YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} stroke="rgba(255,255,255,0.15)" tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip contentStyle={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: '#111111', fontSize: 12, color: '#fff' }} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} formatter={(v) => [v, 'Orders']} labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`} /><Bar dataKey="orders" radius={[4, 4, 0, 0]}>{hourly.map((h, i) => <Cell key={i} fill={h.orders === peak.orders && peak.orders > 0 ? '#FFFFFF' : 'rgba(255,255,255,0.25)'} />)}</Bar></BarChart></ResponsiveContainer></div>
      )}
    </div>
  );
}

/* ==========================================================================
 * MAIN DASHBOARD
 * ======================================================================== */
export default function Dashboard() {
  const { auth, logout, settings } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [smart, setSmart] = useState(null);
  const [goal, setGoal] = useState(null);
  const [reorder, setReorder] = useState(null);

  /* Date range — persisted to localStorage + URL query params so a refresh
     never resets the selection. Defaults to the last 30 days. */
  const [range, setRange] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromQ = sp.get('from'); const toQ = sp.get('to');
      if (fromQ && toQ) return { preset: 'custom', from: fromQ, to: toQ };
      const saved = JSON.parse(localStorage.getItem('hushae.dashRange') || 'null');
      if (saved?.preset && saved.preset !== 'custom') {
        const r = resolvePreset(saved.preset);
        if (r) return { preset: saved.preset, from: r.from, to: r.to };
      }
      if (saved?.preset === 'custom' && saved.from && saved.to) return saved;
    } catch { /* ignore */ }
    const r = resolvePreset('30d');
    return { preset: '30d', from: r.from, to: r.to };
  });

  const applyRange = (r) => {
    setRange(r);
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(r)); } catch { /* ignore */ }
    const sp = new URLSearchParams(window.location.search);
    if (r.preset === 'custom') { sp.set('from', r.from); sp.set('to', r.to); }
    else { sp.delete('from'); sp.delete('to'); }
    const q = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
  };

  const load = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const qs = `from=${range.from}&to=${range.to}`;
      const [data, ins, al, sm, gl] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token: auth.token }),
        api(`/orders/insights/dashboard?${qs}`, { token: auth.token }).catch(() => null),
        api('/dashboard/alerts', { token: auth.token }).catch(() => null),
        api('/dashboard/insights', { token: auth.token }).catch(() => null),
        api('/dashboard/goal', { token: auth.token }).catch(() => null),
      ]);
      setD(data); if (ins) setInsights(ins); setAlerts(al?.alerts || []); setSmart(sm?.insights || []);
      if (gl) setGoal(gl); setLastSync(new Date()); setErr('');
    } catch (e) { if (e?.status === 401) { logout(); return; } setErr('Failed to load dashboard.'); }
    setRefreshing(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [auth, range]);
  useEffect(() => { if (!auth?.token) return; const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [auth, range]);

  if (err) return <AdminLayout title="Dashboard"><div className="mx-auto grid max-w-md place-items-center rounded-[10px] border border-white/10 bg-white/5 p-10 text-center"><AlertTriangle size={22} className="mb-2 text-white/80" /><p className="text-sm text-white">{err}</p><button onClick={() => { setErr(''); load(); }} className="mt-4 rounded-lg border border-white/20 bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white transition hover:bg-white/15">Try again</button></div></AdminLayout>;
  if (!d) return <AdminLayout title="Dashboard"><div className="grid gap-4 md:grid-cols-5">{[1,2,3,4,5].map((i) => <div key={i} className="h-32 animate-pulse rounded-[10px] bg-white/5" />)}</div><div className="mt-4 h-72 animate-pulse rounded-[10px] bg-white/5" /><div className="mt-4 grid gap-4 lg:grid-cols-2">{[1,2].map((i) => <div key={i} className="h-64 animate-pulse rounded-[10px] bg-white/5" />)}</div></AdminLayout>;

  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; })();
  const cmpLabel = 'vs previous period';
  const rangeLabel = range.preset === 'custom'
    ? `${range.from} – ${range.to}`
    : (RANGE_PRESETS.find((p) => p.key === range.preset)?.label || 'Selected period');

  const todayTiles = [
    { label: 'Confirm now', hint: 'New / pending', n: d.stats?.pending || 0, to: '/admin/orders?group=new', tone: 'amber' },
    { label: 'Pack & ship', hint: 'Ready to leave', n: d.stats?.readyToShip || 0, to: '/admin/orders?group=to-ship', tone: 'blue' },
    { label: 'On the road', hint: 'In transit', n: d.stats?.shipped || 0, to: '/admin/orders?group=shipped', tone: 'violet' },
    { label: 'Restock', hint: '≤ 10 units', n: (d.lowStock || []).length, to: '/admin/products', tone: 'red' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* ── HEADER (Phase 02 PageHeader foundation) ──────────────────── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="adm-eyebrow">Hushae · Performance</p>
          <h1 className="mt-2 text-[26px] font-medium tracking-tight text-white">
            {greeting}, {auth?.user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="mt-1 text-[13px] text-white/40">A concise overview of your store performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/60">
            <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
            Live{lastSync ? ` · ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <span className="hidden items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white/35 sm:inline-flex">
            <Calendar size={11} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <RangePicker value={range} onChange={applyRange} />
          <button onClick={() => load()} disabled={refreshing} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-white/20 px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/70 transition-colors hover:border-white/45 hover:text-white disabled:opacity-40">
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => exportDashboardSummary({ d, goal, alerts, insights: smart, storeName: 'HUSHAE', compareLabel: cmpLabel })} className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-white/20 px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/70 transition-colors hover:border-white/45 hover:text-white">
            <Download size={11} /> Export
          </button>
        </div>
      </div>

      {/* ── 01 · PRIMARY BUSINESS SIGNAL ─────────────────────────────── */}
      <section className="mb-10">
        <p className="adm-index">01 — Primary signal</p>
        <div className="adm-divide-x grid grid-cols-2 border-y border-white/10 lg:grid-cols-4">
          <MetricRow icon={CircleDollarSign} label="Revenue" value={d.kpis.revenue.value} change={d.kpis.revenue.change} format="money" to="/admin/analytics" compareLabel={cmpLabel} />
          <MetricRow icon={ShoppingBag} label="Orders" value={d.kpis.orders.value} change={d.kpis.orders.change} to="/admin/orders" compareLabel={cmpLabel} />
          <MetricRow icon={Users} label="New customers" value={d.kpis.customers.value} change={d.kpis.customers.change} to="/admin/customers" compareLabel="in the selected period" />
          <MetricRow icon={TrendingUp} label="Avg order value" value={d.kpis.aov.value} change={d.kpis.aov.change} format="money" to="/admin/analytics" compareLabel={cmpLabel} />
        </div>
      </section>

      {/* ── 02 · PERFORMANCE ─────────────────────────────────────────── */}
      <section className="mb-10">
        <p className="adm-index">02 — Performance</p>
        <div className="grid border-y border-white/10 lg:grid-cols-3">
          <div className="p-5 lg:col-span-2 lg:border-r lg:border-white/10">
            <ChartBoundary><RevenueChart data={d.chart} rangeLabel={rangeLabel} /></ChartBoundary>
          </div>
          <div className="p-5">
            <ChartBoundary><StatusDonut byStatus={d.byStatus} /></ChartBoundary>
          </div>
        </div>
      </section>

      {/* ── 03 · COMMERCE ACTIVITY ───────────────────────────────────── */}
      <section className="mb-10">
        <p className="adm-index">03 — Commerce activity</p>
        <div className="grid border-b border-white/10 lg:grid-cols-3">
          <div className="lg:col-span-2 lg:border-r lg:border-white/10">
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <p className="adm-label">Recent orders</p>
              <Link to="/admin/orders" className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white">
                View all →
              </Link>
            </div>
            <div className="adm-divide-y">
              {d.recentOrders.map((o) => (
                <div key={o._id} className="flex items-center gap-3 px-5 py-3 adm-row-hover">
                  <Link to={`/admin/orders/${o._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Img src={o.items?.[0]?.image} alt="" className="h-10 w-8 shrink-0 border border-white/10 object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <p className="truncate font-mono text-[12px] font-medium text-white">{o.orderNumber}</p>
                        <span className={`text-[9px] font-medium uppercase tracking-[0.14em] ${statusPill(o.status)}`}>{o.status}</span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-white/35">{o.customerInfo?.name} · {o.customerInfo?.city} · {fmtDate(o.createdAt)}</p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    {o.status === 'Pending' && waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '') && (
                      <a href={waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '')} target="_blank" rel="noreferrer" aria-label={`Verify ${o.orderNumber} via WhatsApp`} title="Verify via WhatsApp" className="grid h-7 w-7 shrink-0 place-items-center text-white/50 transition-colors hover:bg-white/10 hover:text-white">
                        <MessageCircle size={13} />
                      </a>
                    )}
                    <div className="text-right">
                      <p className="adm-metric text-[15px] text-white">{pkr(o.total)}</p>
                      <p className="text-[10px] uppercase tracking-[0.1em] text-white/35">{o.paymentMethod}</p>
                    </div>
                  </div>
                </div>
              ))}
              {d.recentOrders.length === 0 && (
                <p className="px-5 py-10 text-[12px] text-white/35">No orders in this period.</p>
              )}
            </div>
          </div>

          <div className="p-5">
            <p className="adm-label mb-4">Best sellers</p>
            {d.bestSellers.length === 0 ? (
              <p className="py-8 text-[12px] text-white/35">Sales data will appear here.</p>
            ) : (
              <ol className="adm-divide-y">
                {d.bestSellers.map((b, i) => (
                  <li key={b.name} className="flex items-baseline gap-4 py-3">
                    <span className="adm-metric w-6 text-[18px] text-white/30">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-white/90">{b.name}</p>
                      <p className="mt-0.5 text-[11px] text-white/35">{b.qty} sold · {pkr(b.revenue)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* ── 04 · PRODUCT & INVENTORY ─────────────────────────────────── */}
      <section className="mb-10">
        <p className="adm-index">04 — Product & inventory</p>
        <div className="grid border-b border-white/10 lg:grid-cols-2">
          <div className="p-5 lg:border-r lg:border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <p className="adm-label">Low stock · ≤ 10</p>
              <Link to="/admin/products" className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white">Manage</Link>
            </div>
            {d.lowStock.length === 0 ? (
              <p className="py-6 text-[12px] text-white/35">All stocked up.</p>
            ) : (
              <div className="adm-divide-y">{d.lowStock.slice(0, 5).map((p) => <StockRow key={p._id} product={p} onSaved={() => load(true)} onReorder={setReorder} />)}</div>
            )}
          </div>
          <div className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="adm-label">Top customers</p>
              <Link to="/admin/customers" className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white">All</Link>
            </div>
            {d.topCustomers.length === 0 ? (
              <p className="py-6 text-[12px] text-white/35">No customer data yet.</p>
            ) : (
              <ol className="adm-divide-y">
                {d.topCustomers.map((c, i) => (
                  <li key={c.phone + i} className="flex items-center gap-3 py-3">
                    <span className="adm-metric w-6 text-[16px] text-white/30">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-white/90">{c.name}</p>
                        <ReliabilityBadge reliability={c.reliability} compact />
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-white/35">{c.city} · {c.orders} order{c.orders === 1 ? '' : 's'}</p>
                    </div>
                    <p className="adm-metric text-[13px] text-white">{pkr(c.spent)}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </section>

      {/* ── 05 · OPERATIONS ───────────────────────────────────────────── */}
      <section className="mb-4">
        <p className="adm-index">05 — Operations</p>
        <AlertsBar alerts={alerts} />

        {/* Attention counts */}
        <div className="adm-divide-x grid grid-cols-2 border-y border-white/10 lg:grid-cols-4">
          {todayTiles.map((t) => (
            <Link key={t.label} to={t.to} className="group px-5 py-4 adm-row-hover">
              <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/35">{t.label}</p>
              <p className="adm-metric mt-2 text-[26px] text-white">{t.n}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.1em] text-white/25 group-hover:text-white/50">{t.hint}</p>
            </Link>
          ))}
        </div>

        <div className="border-t border-white/10">
          <div className="p-5"><QuickActions /></div>
        </div>

        <div className="border-b border-white/10">
          <div className="p-5"><PipelineStrip stats={d.stats} /></div>

          <div className="grid border-t border-white/10 lg:grid-cols-2">
            <div className="p-5 lg:border-r lg:border-white/10">
              <GoalTracker goal={goal} onSaved={() => load(true)} />
            </div>
            <div className="p-5">
              <InsightsCard insights={smart} />
            </div>
          </div>

          {d.kpis.profit && (d.kpis.profit.value !== 0 || d.kpis.cost.value !== 0) && (
            <div className="border-t border-white/10 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="adm-label">Profit &amp; loss</p>
                  <p className="mt-0.5 text-[11px] text-white/35">{rangeLabel} · based on cost prices</p>
                </div>
                <Link to="/admin/products" className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/50 transition-colors hover:text-white">Manage costs →</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <ProfitTile label="Gross profit" value={d.kpis.profit.value} change={d.kpis.profit.change} tone={d.kpis.profit.value >= 0 ? 'green' : 'red'} format="money" icon={TrendingUp} />
                <ProfitTile label="Cost of goods" value={d.kpis.cost.value} tone="neutral" format="money" icon={Package} hint="What you paid for products sold" />
                <ProfitTile label="Profit margin" value={d.kpis.margin.value} tone={d.kpis.margin.value >= 40 ? 'green' : d.kpis.margin.value >= 20 ? 'amber' : 'red'} format="percent" icon={CircleDollarSign} hint="Profit as % of revenue" />
              </div>
              {d.kpis.cost.value === 0 && <div className="mt-4 border border-white/10 bg-white/5 p-3 text-[12px] text-white/70">💡 Set <b className="text-white">Cost / Wholesale price</b> on each product for accurate profit tracking.</div>}
            </div>
          )}

          {insights && (
            <div className="grid border-t border-white/10 lg:grid-cols-2">
              <div className="p-5 lg:border-r lg:border-white/10">
                <p className="adm-label mb-4">Payment health</p>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_STATES.map((p) => { const n = insights.paymentBreakdown?.[p.key] || 0; if (!n) return null; return <span key={p.key} className="text-[10px] font-medium uppercase tracking-[0.1em] text-white/60">{p.label} · <span className="text-white">{n}</span></span>; })}
                  {!Object.values(insights.paymentBreakdown || {}).some((n) => Number(n) > 0) && <span className="text-[12px] text-white/35">No orders in this period</span>}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-[12px]">
                  <p className="flex justify-between"><span className="text-white/40">Verification rate</span><span className="font-medium text-white">{insights.kpis.paymentVerifiedRate}%</span></p>
                  <p className="flex justify-between"><span className="text-white/40">Avg time to ship</span><span className="font-medium text-white">{insights.avgShipHours ? (insights.avgShipHours < 1 ? `${Math.round(insights.avgShipHours * 60)}m` : `${insights.avgShipHours}h`) : '—'}</span></p>
                  <p className="flex justify-between"><span className="text-white/40">Issue rate</span><span className={`font-medium ${insights.kpis.issueRate > 5 ? 'text-white' : 'text-white/70'}`}>{insights.kpis.issueRate}%</span></p>
                </div>
              </div>
              <div className="p-5">
                <p className="adm-label mb-3">Peak order hours</p>
                {!insights.hourly?.some((h) => h.orders > 0) ? (
                  <div className="grid h-[140px] place-items-center bg-white/5 text-center"><p className="text-[12px] text-white/40">No orders in this period</p></div>
                ) : (
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={insights.hourly} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip labelFormatter={(h) => `${h}:00 – ${h}:59`} contentStyle={{ borderRadius: 4, border: '1px solid rgba(255,255,255,0.12)', background: '#0D0D0D', fontSize: 12, color: '#fff' }} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} />
                      <Bar dataKey="orders" fill="rgba(255,255,255,0.5)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          <div className="grid border-t border-white/10 lg:grid-cols-2">
            <div className="p-5 lg:border-r lg:border-white/10">
              <CancellationReasons reasons={d.cancellationReasons || []} />
            </div>
            <div className="p-5">
              <AbandonedCartsWidget />
            </div>
          </div>

          <div className="border-t border-white/10 p-5">
            <ChartBoundary><TodayHourly hourly={d.hourly} /></ChartBoundary>
          </div>
        </div>
      </section>

      {reorder && <ReorderModal product={reorder} onClose={() => setReorder(null)} onSaved={() => load(true)} />}
    </AdminLayout>
  );
}
