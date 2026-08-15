import { Component, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgePercent, Box,
  Calendar, ChevronRight, CircleDollarSign, Clock, Download, Megaphone,
  MessageCircle, Package, PackageCheck, PackagePlus, RefreshCw, ShoppingBag, Sparkles,
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
import RangePicker, { resolvePreset } from './dashboard/RangePicker';
import CancellationReasons from './dashboard/CancellationReasons';
import AbandonedCartsWidget from './dashboard/AbandonedCartsWidget';
import ReorderModal from './dashboard/ReorderModal';
import ReliabilityBadge from './ReliabilityBadge';
import { exportDashboardSummary } from './dashboard/exportSummary';
import { useCountUp, Rise, staggerOf } from './ui/Animate';

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
        <div className="grid min-h-[160px] place-items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center" role="alert">
          <div>
            <p className="text-[12px] font-semibold text-neutral-700">Couldn&apos;t render this chart</p>
            <button type="button" onClick={() => this.setState({ failed: false })} className="mt-3 rounded-full border border-neutral-300 bg-white px-4 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50">Retry</button>
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
  s === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : s === 'Cancelled' ? 'bg-red-100 text-red-800'
    : s === 'Refunded' ? 'bg-orange-100 text-orange-800' : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-purple-100 text-purple-800'
    : s === 'Ready to Ship' ? 'bg-blue-100 text-blue-800' : s === 'Processing' ? 'bg-blue-50 text-blue-700'
    : s === 'Confirmed' ? 'bg-cyan-100 text-cyan-800' : 'bg-amber-100 text-amber-800';

function KpiCard({ icon: Icon, label, value, change, sparkData, accent = '#111111', format = 'number', to, compareLabel = 'vs. previous 30 days' }) {
  /* change === null means "no meaningful rate from zero" (backend growthPct):
     current > 0 → show a neutral "New" chip; current === 0 → show nothing. */
  const hasRate = typeof change === 'number' && Number.isFinite(change);
  const positive = hasRate && change > 0; const negative = hasRate && change < 0;
  const isNew = change === null && value > 0;
  const changeText = hasRate ? Math.abs(change).toFixed(1) + '%' : '';
  // Number ticker — animates 0 → value over ~700ms (instant under reduced motion).
  const animated = useCountUp(value, { duration: 700 });
  const display = format === 'money'
    ? pkr(Math.round(animated))
    : format === 'percent'
      ? `${Math.round(animated)}%`
      : Math.round(animated).toLocaleString();
  // Subtle identity wash — each card's icon colour at ~4% opacity, top-left.
  const wash = { background: `linear-gradient(135deg, ${accent}0A 0%, #FFFFFF 55%)` };
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${accent}1A`, color: accent }}><Icon size={17} strokeWidth={1.9} /></span>
        {isNew ? <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[12px] font-bold text-neutral-700">New</span>
          : hasRate && change !== 0 && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold ${positive ? 'bg-emerald-50 text-emerald-700' : negative ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-600'}`}>{positive ? <ArrowUpRight size={11} /> : negative ? <ArrowDownRight size={11} /> : null}{changeText}</span>}
      </div>
      <p className="mt-4 text-[12px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className="mt-1.5 font-sans text-[28px] font-bold tabular-nums leading-none tracking-tight text-neutral-900">{display}</p>
      <p className="mt-2 text-[12px] text-neutral-500">{compareLabel}</p>
      {sparkData?.length > 0 && <div className="mt-4 h-10"><ResponsiveContainer width="100%" height="100%"><AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}><defs><linearGradient id={`spk-${label}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity={0.28} /><stop offset="100%" stopColor={accent} stopOpacity={0} /></linearGradient></defs><Area type="monotone" dataKey="v" stroke={accent} strokeWidth={2} fill={`url(#spk-${label})`} isAnimationActive animationDuration={700} animationEasing="ease-out" /></AreaChart></ResponsiveContainer></div>}
    </>
  );
  const cls = `relative overflow-hidden rounded-xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${to ? 'cursor-pointer' : ''}`;
  return to ? <Link to={to} className={cls} style={wash}>{inner}</Link> : <div className={cls} style={wash}>{inner}</div>;
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
    <div className="relative overflow-hidden rounded-xl border border-neutral-900 bg-neutral-900 p-5 text-white shadow-lg">
      {/* subtle brand wash so the hero card reads intentional, not flat */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #9C2C4E 0%, transparent 70%)' }} />
      <p className="text-[13px] font-bold uppercase tracking-widest text-neutral-400">Quick actions</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className={`relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-150 ease-out ${
              a.primary
                ? 'border-brand bg-brand text-white shadow-brand hover:bg-brand-deep hover:scale-[1.02] active:scale-[0.98]'
                : 'border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10 active:bg-white/15'
            }`}
          >
            <a.icon size={18} strokeWidth={1.8} />
            <span className="text-[12px] font-semibold leading-tight">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProfitTile({ icon: Icon, label, value, change, tone = 'neutral', format = 'money', hint }) {
  const toneMap = { green: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-100' }, amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-100' }, red: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-100' }, neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700', ring: 'ring-neutral-100' } };
  const t = toneMap[tone];
  const display = format === 'money' ? pkr(value) : format === 'percent' ? `${value}%` : value.toLocaleString();
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 ring-1 ${t.ring}`}>
      <div className="flex items-center justify-between"><span className={`grid h-8 w-8 place-items-center rounded-lg ${t.bg} ${t.text}`}><Icon size={13} /></span>{typeof change === 'number' && change !== 0 && <span className={`text-[13px] font-bold ${change > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%</span>}</div>
      <p className="mt-3 text-[13px] font-bold uppercase tracking-widest text-neutral-500">{label}</p>
      <p className={`mt-0.5 font-sans text-[13px] font-semibold leading-none tabular-nums tracking-tight ${t.text}`}>{display}</p>
      {hint && <p className="mt-1.5 text-[13px] text-neutral-500">{hint}</p>}
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
    <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-1.5">
      <Img src={p.images?.[0]?.url} alt="" className="h-10 w-8 shrink-0 rounded-md border border-neutral-200 object-cover" />
      <input type="number" min="0" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} className="w-full min-w-0 rounded-md border border-neutral-300 px-2 py-1.5 text-[12px] tabular-nums outline-none focus:border-neutral-900" />
      <button onClick={save} disabled={busy} className="shrink-0 rounded-md bg-neutral-900 px-2.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50">Save</button>
      <button onClick={() => setEditing(false)} className="shrink-0 rounded-md px-1.5 py-1.5 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">Cancel</button>
    </div>
  );
  return (
    <div className="group flex items-center gap-3 rounded-lg p-1.5 transition hover:bg-neutral-50">
      <Link to={`/admin/products/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3"><Img src={p.images?.[0]?.url} alt="" className="h-10 w-8 shrink-0 rounded-md border border-neutral-200 object-cover" /><span className="line-clamp-2 flex-1 text-[12px] font-medium text-neutral-800">{p.name}</span></Link>
      <button onClick={() => { setValue(String(p.stock)); setEditing(true); }} title="Update stock" className={`pill shrink-0 transition hover:ring-2 hover:ring-neutral-300 ${p.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-red-50 text-red-700'}`}>{p.stock} ✎</button>
      {p.reorderStatus === 'pending' ? (
        <button onClick={() => onReorder?.(p)} title="Reorder pending — tap to mark received" className="pill shrink-0 bg-amber-100 text-amber-800 transition hover:ring-2 hover:ring-amber-300">Reorder pending</button>
      ) : (
        <button onClick={() => onReorder?.(p)} title="Reorder" className="pill shrink-0 bg-neutral-900 text-white transition hover:bg-neutral-800">Reorder</button>
      )}
    </div>
  );
}

function PipelineStrip({ stats }) {
  const items = [
    { label: 'Pending', n: stats.pending, color: 'bg-amber-500', text: 'text-amber-700', to: '/admin/orders?group=new' },
    { label: 'Confirmed', n: stats.confirmed, color: 'bg-cyan-500', text: 'text-cyan-700', to: '/admin/orders?group=processing' },
    { label: 'Processing', n: stats.processing, color: 'bg-blue-500', text: 'text-blue-700', to: '/admin/orders?group=processing' },
    { label: 'Ready', n: stats.readyToShip, color: 'bg-indigo-500', text: 'text-indigo-700', to: '/admin/orders?group=to-ship' },
    { label: 'In Transit', n: stats.shipped, color: 'bg-purple-500', text: 'text-purple-700', to: '/admin/orders?group=shipped' },
    { label: 'Delivered', n: stats.delivered, color: 'bg-emerald-500', text: 'text-emerald-700', to: '/admin/orders?group=delivered' },
  ];
  /* Fixed-width equal segments — a funnel has 6 stages regardless of volume, so
     each stage keeps ~16.6% of the bar. A stage with orders is tinted its own
     colour; an empty stage stays a light neutral placeholder (never collapsed
     to zero width). Hovering a segment shows the exact count. */
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <div><p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Order pipeline</p><p className="mt-1 text-[12px] text-neutral-500">Where every order is right now</p></div>
        <Link to="/admin/orders" className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">Manage all →</Link>
      </div>
      <div className="mt-4 grid h-3 grid-cols-6 gap-0.5">
        {items.map((it) => (
          <div key={it.label} className="group relative">
            <div
              className={`h-full w-full ${it.n > 0 ? it.color : 'bg-neutral-200'}`}
              role="img"
              aria-label={`${it.label}: ${it.n} order${it.n === 1 ? '' : 's'}`}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
              {it.label}: {it.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="group flex items-center gap-2 rounded-lg p-2 transition hover:bg-neutral-50">
            <span className={`h-2 w-2 shrink-0 rounded-full ${it.n > 0 ? it.color : 'bg-neutral-200'}`} />
            <div className="min-w-0 flex-1"><p className="truncate text-[12px] text-neutral-500">{it.label}</p><p className={`text-[13px] font-bold tabular-nums ${it.n > 0 ? it.text : 'text-neutral-400'}`}>{it.n}</p></div>
          </Link>
        ))}
      </div>
      {stats.pending > 0 && (
        <Link to="/admin/orders?group=new" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 transition hover:border-amber-300 hover:bg-amber-100">
          <span className="min-w-0 text-[12px] font-medium text-amber-900"><b className="tabular-nums">{stats.pending}</b> new order{stats.pending === 1 ? '' : 's'} waiting to be confirmed</span>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-900 px-3 py-1 text-[12px] font-semibold text-white">Review now <ChevronRight size={11} /></span>
        </Link>
      )}
    </div>
  );
}

function RevenueChart({ data }) {
  const [mode, setMode] = useState('revenue');
  const total = data.reduce((n, d) => n + (mode === 'revenue' ? d.revenue : d.orders), 0);
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Last 14 days</p><p className="mt-1 font-sans text-2xl font-semibold tabular-nums text-neutral-900">{mode === 'revenue' ? pkr(total) : total.toLocaleString()}</p></div>
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 p-1">
          {['revenue', 'orders'].map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-wider transition ${mode === m ? 'bg-brand text-white' : 'text-neutral-500 hover:text-neutral-900'}`}>{m}</button>
          ))}
        </div>
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs><linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9C2C4E" stopOpacity={0.18} /><stop offset="100%" stopColor="#9C2C4E" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f1" vertical={false} />
            <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => mode === 'revenue' ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : v} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => mode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']} />
            <Area type="monotone" dataKey={mode} stroke="#9C2C4E" strokeWidth={2.2} fill="url(#rev-fill)" dot={{ r: 3, fill: '#9C2C4E', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive animationDuration={800} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatusDonut({ byStatus }) {
  const { segments, total } = buildStatusDonut(byStatus);
  const animatedTotal = useCountUp(total, { duration: 800 });
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Order status mix</p>
      {total === 0 ? <div className="py-12 text-center text-sm text-neutral-400"><ShoppingBag size={22} className="mx-auto mb-2 text-neutral-300" /><p>No orders yet.</p></div> : (
        <div className="mt-4 flex items-center gap-4">
          <div className="relative h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={segments} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} startAngle={90} endAngle={-270} isAnimationActive animationDuration={800} animationEasing="ease-out">{segments.map((d, i) => <Cell key={i} fill={d.color} />)}</Pie></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="font-sans text-2xl font-semibold tabular-nums leading-none text-neutral-900">{Math.round(animatedTotal)}</p><p className="mt-1 text-[12px] uppercase tracking-wider text-neutral-500">Total</p></div></div>
          </div>
          <ul className="flex-1 space-y-1.5">{segments.map((d) => <li key={d.name} className="flex items-center gap-2 text-[12px]"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} /><span className="flex-1 text-neutral-600">{d.name}</span><span className="font-semibold tabular-nums text-neutral-900">{d.value}</span></li>)}</ul>
        </div>
      )}
    </div>
  );
}

function TodayHourly({ hourly }) {
  const total = hourly.reduce((n, h) => n + h.orders, 0);
  const peak = hourly.reduce((max, h) => h.orders > max.orders ? h : max, { hour: 0, orders: 0 });
  return (
    <div className="rounded-xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between"><div><p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Today's activity</p><p className="mt-1 text-[12px] text-neutral-500">{total} order{total === 1 ? '' : 's'} · peak {peak.hour.toString().padStart(2, '0')}:00</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white"><Activity size={16} /></span></div>
      {total === 0 ? (
        <div className="mt-5 grid h-32 place-items-center rounded-xl bg-neutral-50 text-center">
          <Activity size={20} className="mx-auto mb-2 text-neutral-300" />
          <p className="text-[13px] font-medium text-neutral-500">No orders yet today</p>
        </div>
      ) : (
        <div className="mt-5 h-32 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}><XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#9ca3af" tickLine={false} axisLine={false} interval={2} /><YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} formatter={(v) => [v, 'Orders']} labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`} /><Bar dataKey="orders" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out">{hourly.map((h, i) => <Cell key={i} fill={h.orders === peak.orders && peak.orders > 0 ? '#9C2C4E' : '#d4d4d4'} />)}</Bar></BarChart></ResponsiveContainer></div>
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

  if (err) return <AdminLayout title="Dashboard"><div className="mx-auto grid max-w-md place-items-center rounded-2xl border border-red-200 bg-red-50 p-10 text-center"><AlertTriangle size={22} className="mb-2 text-red-600" /><p className="text-sm text-red-700">{err}</p><button onClick={() => { setErr(''); load(); }} className="mt-4 rounded-full border border-red-300 bg-white px-4 py-1.5 text-[12px] font-semibold text-red-700 hover:bg-red-100">Try again</button></div></AdminLayout>;
  if (!d) return <AdminLayout title="Dashboard"><div className="grid gap-4 md:grid-cols-5">{[1,2,3,4,5].map((i) => <div key={i} className="animate-pulse rounded-xl bg-neutral-100 h-32 rounded-2xl" />)}</div><div className="mt-6 skeleton h-72 rounded-2xl" /></AdminLayout>;

  const sparkRevenue = d.chart.map((x) => ({ v: x.revenue }));
  const sparkOrders = d.chart.map((x) => ({ v: x.orders }));
  const sparkCustomers = d.chart.map((x) => ({ v: x.orders * 0.6 }));
  const sparkAov = d.chart.map((x) => ({ v: x.orders ? x.revenue / x.orders : 0 }));

  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; })();
  const cmpLabel = 'vs previous period';

  return (
    <AdminLayout title="Dashboard">
      {/* ── Row 1: Greeting + tools ────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-sans text-[16px] font-semibold text-neutral-900">{greeting}, {auth?.user?.name?.split(' ')[0] || 'Admin'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-200"><span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" />Live{lastSync ? ` · ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
          <span className="hidden items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-semibold text-neutral-600 sm:inline-flex"><Calendar size={12} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <RangePicker value={range} onChange={applyRange} />
          <button onClick={() => load()} disabled={refreshing} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"><RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh</button>
          <button onClick={() => exportDashboardSummary({ d, goal, alerts, insights: smart, storeName: 'HUSHAE', compareLabel: cmpLabel })} className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"><Download size={12} /> Export</button>
        </div>
      </div>

      <AlertsBar alerts={alerts} />

<Rise delay={staggerOf(0)}>      {/* ── Row 2: KPI Cards + Quick Actions ───────────────────────────── */}
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <KpiCard icon={CircleDollarSign} label="Revenue" value={d.kpis.revenue.value} change={d.kpis.revenue.change} sparkData={sparkRevenue} accent="#059669" format="money" to="/admin/analytics" compareLabel={cmpLabel} />
        <KpiCard icon={ShoppingBag} label="Orders" value={d.kpis.orders.value} change={d.kpis.orders.change} sparkData={sparkOrders} accent="#2563eb" to="/admin/orders" compareLabel={cmpLabel} />
        <KpiCard icon={Users} label="New Customers" value={d.kpis.customers.value} change={d.kpis.customers.change} sparkData={sparkCustomers} accent="#7c3aed" to="/admin/customers" compareLabel="in the selected period" />
        <KpiCard icon={TrendingUp} label="Avg Order Value" value={d.kpis.aov.value} change={d.kpis.aov.change} sparkData={sparkAov} accent="#dc2626" format="money" to="/admin/analytics" compareLabel={cmpLabel} />
        <QuickActions />
      </div>
</Rise>

<Rise delay={staggerOf(1)}>      {/* ── Row 3: Revenue chart + Status donut ────────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ChartBoundary><RevenueChart data={d.chart} /></ChartBoundary></div>
        <ChartBoundary><StatusDonut byStatus={d.byStatus} /></ChartBoundary>
      </div>
</Rise>

<Rise delay={staggerOf(2)}>      {/* ── Row 4: Order pipeline ──────────────────────────────────────── */}
      <div className="mb-6"><PipelineStrip stats={d.stats} /></div>
</Rise>

<Rise delay={staggerOf(3)}>      {/* ── Row 5: Goal + Insights ──────────────────────────────────────── */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <GoalTracker goal={goal} onSaved={() => load(true)} />
        <InsightsCard insights={smart} />
      </div>
</Rise>

      {/* ── Row 6: P&L (conditional) ────────────────────────────────────── */}
      {d.kpis.profit && (d.kpis.profit.value !== 0 || d.kpis.cost.value !== 0) && (
        <div className="mb-6 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Profit & loss</p><p className="mt-1 text-[12px] text-neutral-500">Last 30 days · based on cost prices</p></div><Link to="/admin/products" className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">Manage costs →</Link></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ProfitTile label="Gross profit" value={d.kpis.profit.value} change={d.kpis.profit.change} tone={d.kpis.profit.value >= 0 ? 'green' : 'red'} format="money" icon={TrendingUp} />
            <ProfitTile label="Cost of goods" value={d.kpis.cost.value} tone="neutral" format="money" icon={Package} hint="What you paid for products sold" />
            <ProfitTile label="Profit margin" value={d.kpis.margin.value} tone={d.kpis.margin.value >= 40 ? 'green' : d.kpis.margin.value >= 20 ? 'amber' : 'red'} format="percent" icon={CircleDollarSign} hint="Profit as % of revenue" />
          </div>
          {d.kpis.cost.value === 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">💡 Set <b>Cost / Wholesale price</b> on each product for accurate profit tracking.</div>}
        </div>
      )}

      {/* ── Row 7: Payment health + Peak hours ─────────────────────────── */}
      {insights && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Payment health</p>
            <div className="mt-3 flex flex-wrap gap-1.5">{PAYMENT_STATES.map((p) => { const n = insights.paymentBreakdown?.[p.key] || 0; if (!n) return null; return <span key={p.key} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ${TONE[p.tone]?.pill || 'bg-neutral-50 text-neutral-600 ring-neutral-200'}`}><span className="badge-dot" style={{ background: 'currentColor' }} aria-hidden="true" />{p.label} {n}</span>; })}{!Object.values(insights.paymentBreakdown || {}).some((n) => Number(n) > 0) && <span className="py-1 text-[12px] text-neutral-400">No orders in this period</span>}</div>
            <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-[12px]"><p className="flex justify-between"><span className="text-neutral-500">Verification rate</span><span className="font-semibold">{insights.kpis.paymentVerifiedRate}%</span></p><p className="flex justify-between"><span className="text-neutral-500">Avg time to ship</span><span className="font-semibold">{insights.avgShipHours ? (insights.avgShipHours < 1 ? `${Math.round(insights.avgShipHours * 60)}m` : `${insights.avgShipHours}h`) : '—'}</span></p><p className="flex justify-between"><span className="text-neutral-500">Issue rate</span><span className={`font-semibold ${insights.kpis.issueRate > 5 ? 'text-red-600' : ''}`}>{insights.kpis.issueRate}%</span></p></div>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Peak order hours</p>
            {!insights.hourly?.some((h) => h.orders > 0) ? (
              <div className="grid h-[140px] place-items-center rounded-xl bg-neutral-50 text-center"><p className="text-[13px] font-medium text-neutral-500">No orders in this period</p></div>
            ) : (
              <ResponsiveContainer width="100%" height={140}><BarChart data={insights.hourly} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#EFECE7" vertical={false} /><XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 10, fill: '#9A9A9A' }} axisLine={false} tickLine={false} interval={3} /><YAxis tick={{ fontSize: 10, fill: '#9A9A9A' }} axisLine={false} tickLine={false} allowDecimals={false} /><Tooltip labelFormatter={(h) => `${h}:00 – ${h}:59`} contentStyle={{ borderRadius: 10, border: '1px solid #E4E0DA', fontSize: 12 }} /><Bar dataKey="orders" fill="#7C8B72" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
            )}
          </div>
        </div>
      )}

<Rise delay={staggerOf(4)}>      {/* ── Row 7b: Cancellation reasons + Abandoned carts ─────────────── */}
      <div id="cancellation-reasons" className="mb-6 grid scroll-mt-24 gap-4 lg:grid-cols-2">
        <CancellationReasons reasons={d.cancellationReasons || []} />
        <AbandonedCartsWidget />
      </div>
</Rise>

<Rise delay={staggerOf(5)}>      {/* ── Row 8: Today activity + Best sellers ───────────────────────── */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <ChartBoundary><TodayHourly hourly={d.hourly} /></ChartBoundary>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between"><div><p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Best sellers</p><p className="mt-1 text-[12px] text-neutral-500">Top 5 by units sold</p></div><Sparkles size={16} className="text-amber-500" /></div>
          {d.bestSellers.length === 0 ? <div className="mt-6 text-center text-sm text-neutral-400"><Sparkles size={20} className="mx-auto mb-2 text-neutral-300" /><p>Sales data will appear here.</p></div> : (
            <ol className="mt-5 space-y-3">{d.bestSellers.map((b, i) => (
              <li key={b.name} className="flex items-center gap-3"><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[12px] font-bold ${i === 0 ? 'bg-amber-500 text-white' : i === 1 ? 'bg-neutral-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{i + 1}</span>{b.image && <Img src={b.image} alt="" className="h-10 w-8 rounded-md border border-neutral-200 object-cover" />}<div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-neutral-900">{b.name}</p><p className="text-[12px] text-neutral-500">{b.qty} sold · {pkr(b.revenue)}</p></div></li>
            ))}</ol>
          )}
        </div>
      </div>
</Rise>

<Rise delay={staggerOf(6)}>      {/* ── Row 9: Recent orders + Low stock + Top customers ───────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Recent orders</p><p className="mt-1 text-[12px] text-neutral-500">Last 6 across all stages</p></div><Link to="/admin/orders" className="inline-flex items-center gap-1 text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">View all <ChevronRight size={12} /></Link></div>
          <div className="space-y-2">{d.recentOrders.map((o) => (
            <div key={o._id} className="flex items-center gap-3 rounded-xl border border-neutral-100 p-3 transition hover:border-neutral-300 hover:bg-neutral-50">
              <Link to={`/admin/orders/${o._id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Img src={o.items?.[0]?.image} alt="" className="h-11 w-9 shrink-0 rounded-lg border border-neutral-200 object-cover" />
                <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-mono text-[12px] font-semibold text-neutral-900">{o.orderNumber}</p><span className={`pill inline-flex items-center gap-1 ${statusPill(o.status)}`}><span className="badge-dot" style={{ background: 'currentColor' }} aria-hidden="true" />{o.status}</span></div><p className="mt-0.5 truncate text-[12px] text-neutral-500">{o.customerInfo?.name} · {o.customerInfo?.city} · {fmtDate(o.createdAt)}</p></div>
              </Link>
              <div className="flex shrink-0 items-center gap-2.5">
                {o.status === 'Pending' && waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '') && (
                  <a href={waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '')} target="_blank" rel="noreferrer" aria-label={`Verify ${o.orderNumber} via WhatsApp`} title="Verify via WhatsApp" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100">
                    <MessageCircle size={14} />
                  </a>
                )}
                <div className="text-right"><p className="font-sans text-[14px] font-semibold tabular-nums text-neutral-900">{pkr(o.total)}</p><p className="text-[13px] text-neutral-500">{o.paymentMethod}</p></div>
              </div>
            </div>
          ))}</div>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-neutral-500"><AlertTriangle size={13} className="text-red-500" /> Low stock (≤ 10)</p><Link to="/admin/products" className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">Manage</Link></div>
            {d.lowStock.length === 0 ? <div className="py-6 text-center text-sm text-neutral-400"><PackageCheck size={20} className="mx-auto mb-2 text-neutral-300" /><p>All stocked up.</p></div> : <div className="space-y-1">{d.lowStock.slice(0, 5).map((p) => <StockRow key={p._id} product={p} onSaved={() => load(true)} onReorder={setReorder} />)}</div>}
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-white p-6">
            <div className="mb-3 flex items-center justify-between"><p className="text-[12px] font-bold uppercase tracking-widest text-neutral-500">Top customers</p><Link to="/admin/customers" className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-900">All</Link></div>
            {d.topCustomers.length === 0 ? <div className="py-6 text-center text-sm text-neutral-400"><Users size={20} className="mx-auto mb-2 text-neutral-300" /><p>No customer data yet.</p></div> : <div className="space-y-3">{d.topCustomers.map((c, i) => (
              <div key={c.phone + i} className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-900 text-[12px] font-semibold text-white">{(c.name || '?').slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-[12px] font-semibold text-neutral-900">{c.name}</p><ReliabilityBadge reliability={c.reliability} compact /></div><p className="truncate text-[13px] text-neutral-500">{c.city} · {c.orders} order{c.orders === 1 ? '' : 's'}</p></div><p className="font-sans text-[13px] font-semibold tabular-nums text-neutral-900">{pkr(c.spent)}</p></div>
            ))}</div>}
          </div>
        </div>
      </div>
</Rise>

      {reorder && <ReorderModal product={reorder} onClose={() => setReorder(null)} onSaved={() => load(true)} />}
    </AdminLayout>
  );
}
