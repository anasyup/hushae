import { Component, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, ArrowRight, BadgePercent, Check, Clock, Download, Megaphone,
  MessageCircle, Pencil, RefreshCw, ShoppingBag, Users,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import { buildStatusDonut } from '../lib/statusDonut';
import { PAYMENT_STATES } from './orders/orderConstants';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import AlertsBar from './dashboard/AlertsBar';
import GoalTracker from './dashboard/GoalTracker';
import InsightsCard from './dashboard/InsightsCard';
import RangePicker, { resolvePreset, RANGE_PRESETS } from './dashboard/RangePicker';
import CancellationReasons from './dashboard/CancellationReasons';
import AbandonedCartsWidget from './dashboard/AbandonedCartsWidget';
import ReorderModal from './dashboard/ReorderModal';
import ReliabilityBadge from './ReliabilityBadge';
import OrderQuickView from './OrderQuickView';
import ActivityFeed from './dashboard/ActivityFeed';
import StoreHealth from './dashboard/StoreHealth';
import CustomizeWidgets, { useWidgetVisibility } from './dashboard/CustomizeWidgets';
import { exportDashboardSummary } from './dashboard/exportSummary';
import { useCountUp, Rise, staggerOf } from './ui/Animate';

/* ============================================================================
 * DASHBOARD — production redesign. Light theme, white surfaces, charcoal
 * typography, HUSHAE purple accent. All widgets show REAL data; nothing is
 * fabricated. Business logic and data fetching are UNCHANGED.
 *
 * Structure:
 *   header (greeting + status + range + refresh + export)
 *   attention centre (real alerts, actionable links)
 *   key metrics (Revenue / Orders / New Customers / AOV)
 *   sales overview (hero chart) + order status donut
 *   order pipeline (real stages) · payment health · peak hours
 *   store health · activity feed
 *   cancellation reasons · abandoned carts
 *   lists: best sellers / recent orders (quick view) / low stock / top customers
 * ========================================================================== */

const CARD = 'rounded-[10px] border bg-white p-4';
const CARD_STYLE = { background: 'var(--px-bg-card)', borderColor: 'var(--px-border)', boxShadow: 'var(--px-shadow-card)' };

const STATUS_COLORS = {
  Pending: '#8A6116',
  Confirmed: '#1F5FA8',
  Processing: '#303030',
  'Ready to Ship': '#6D7175',
  Shipped: '#6D7175',
  'Out for Delivery': '#6D7175',
  Delivered: '#1C6A4F',
  Cancelled: '#B91C1C',
  Refunded: '#B91C1C',
};
const statusColor = (s) => STATUS_COLORS[s] || '#6D7175';

class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="py-16 text-center" role="alert">
          <p className="text-[13px]" style={{ color: 'var(--px-muted)' }}>Couldn&apos;t render this chart</p>
          <button type="button" onClick={() => this.setState({ failed: false })} className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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

const Label = ({ children }) => (
  <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: 'var(--px-muted)' }}>{children}</p>
);

const Section = ({ children, delay = 0, className = '' }) => <Rise delay={delay} className={className}>{children}</Rise>;

function KpiValue({ value, format = 'number', duration = 700 }) {
  const n = useCountUp(value, { duration });
  const display = format === 'money' ? pkr(Math.round(n)) : Math.round(n).toLocaleString();
  return <p className="mt-2 text-[24px] font-bold leading-none tracking-tight" style={{ color: 'var(--px-ink)' }}>{display}</p>;
}

function TrendLine({ change }) {
  const has = typeof change === 'number' && Number.isFinite(change);
  if (!has) return <p className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--px-success)' }}>New</p>;
  const pos = change > 0;
  return (
    <p className="mt-2 text-[11px] font-semibold" style={{ color: pos ? 'var(--px-success)' : change < 0 ? 'var(--px-danger)' : 'var(--px-muted)' }}>
      {pos ? '↑' : change < 0 ? '↓' : ''} {Math.abs(change).toFixed(1)}% <span className="font-normal" style={{ color: 'var(--px-muted)' }}>vs prev</span>
    </p>
  );
}

function KpiCards({ kpis, sparks }) {
  const items = [
    { label: 'Revenue', value: kpis.revenue.value, change: kpis.revenue.change, spark: sparks.revenue, format: 'money', to: '/admin/analytics' },
    { label: 'Orders', value: kpis.orders.value, change: kpis.orders.change, spark: sparks.orders, to: '/admin/orders' },
    { label: 'New Customers', value: kpis.customers.value, change: kpis.customers.change, spark: sparks.customers, to: '/admin/customers' },
    { label: 'Avg Order Value', value: kpis.aov.value, change: kpis.aov.change, spark: sparks.aov, format: 'money', to: '/admin/analytics' },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((it) => (
        <Link key={it.label} to={it.to} className={`${CARD} transition-colors hover:border-[var(--px-border-strong)]`} style={CARD_STYLE}>
          <Label>{it.label}</Label>
          <KpiValue value={it.value} format={it.format} />
          <TrendLine change={it.change} />
          {it.spark?.length > 0 && (
            <div className="mt-3 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={it.spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <Area type="monotone" dataKey="v" stroke="var(--px-accent)" strokeOpacity={0.6} strokeWidth={1.5} fill="none" isAnimationActive animationDuration={700} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}

function QuickActions() {
  const actions = [
    { to: '/admin/orders', icon: ShoppingBag, label: 'View orders' },
    { to: '/admin/promotions/new', icon: Megaphone, label: 'New promo' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'Discounts' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
      {actions.map((a) => (
        <Link key={a.label} to={a.to} className="group inline-flex items-center gap-2 text-[13px] transition-colors hover:text-[var(--px-ink)]" style={{ color: 'var(--px-secondary)' }}>
          <a.icon size={14} strokeWidth={1.5} style={{ color: 'var(--px-muted)' }} aria-hidden="true" />
          {a.label}
        </Link>
      ))}
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
    <div className="flex items-center gap-3 py-1.5">
      <Img src={p.images?.[0]?.url} alt="" className="h-12 w-9 shrink-0 rounded-[5px] object-cover" />
      <input type="number" min="0" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} className="w-20 rounded-[8px] border px-2 py-1 text-[13px] tabular-nums outline-none" style={{ borderColor: 'var(--px-border-strong)', color: 'var(--px-ink)', background: 'var(--px-bg-card)' }} />
      <button onClick={save} disabled={busy} className="text-[12px] font-semibold disabled:opacity-50" style={{ color: 'var(--px-ink)' }}>Save</button>
      <button onClick={() => setEditing(false)} className="text-[12px] font-medium" style={{ color: 'var(--px-muted)' }}>Cancel</button>
    </div>
  );
  return (
    <div className="group flex items-center gap-3 py-2">
      <Link to={`/admin/products/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Img src={p.images?.[0]?.url} alt="" className="h-12 w-9 shrink-0 rounded-[5px] object-cover" />
        <span className="truncate text-[13px]" style={{ color: 'var(--px-secondary)' }}>{p.name}</span>
      </Link>
      <button onClick={() => { setValue(String(p.stock)); setEditing(true); }} title="Update stock" className="inline-flex items-center gap-1 text-[12px] transition-opacity hover:opacity-60" style={{ color: p.stock === 0 ? 'var(--px-danger)' : 'var(--px-muted)' }}>
        <span className="w-6 text-right tabular-nums">{p.stock}</span><Pencil size={11} />
      </button>
      {p.reorderStatus === 'pending'
        ? <button onClick={() => onReorder?.(p)} className="text-[12px] font-medium" style={{ color: 'var(--px-muted)' }}>Pending</button>
        : <button onClick={() => onReorder?.(p)} className="text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>Reorder</button>}
    </div>
  );
}

function PipelineStrip({ stats }) {
  const items = [
    { label: 'Pending', n: stats.pending, color: '#8A6116', to: '/admin/orders?group=new' },
    { label: 'Confirmed', n: stats.confirmed, color: '#1F5FA8', to: '/admin/orders?group=processing' },
    { label: 'Processing', n: stats.processing, color: '#303030', to: '/admin/orders?group=processing' },
    { label: 'Ready', n: stats.readyToShip, color: '#71717A', to: '/admin/orders?group=to-ship' },
    { label: 'In Transit', n: stats.shipped, color: '#71717A', to: '/admin/orders?group=shipped' },
    { label: 'Delivered', n: stats.delivered, color: '#1C6A4F', to: '/admin/orders?group=delivered' },
  ];
  return (
    <div className={CARD} style={CARD_STYLE}>
      <div className="flex items-center justify-between">
        <Label>Order pipeline</Label>
        <Link to="/admin/orders" className="text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>Manage all →</Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="group rounded-[8px] p-2 transition-colors hover:bg-[var(--px-bg-hover)]">
            <div className="flex items-center gap-2">
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: it.n > 0 ? it.color : 'var(--px-border-strong)' }} aria-hidden="true" />
              <span className="truncate text-[12px]" style={{ color: 'var(--px-secondary)' }}>{it.label}</span>
            </div>
            <p className="mt-1 pl-[15px] text-[16px] font-bold tabular-nums" style={{ color: it.n > 0 ? 'var(--px-ink)' : 'var(--px-faint)' }}>{it.n}</p>
          </Link>
        ))}
      </div>
      {stats.pending > 0 && (
        <Link to="/admin/orders?group=new" className="mt-3 inline-flex items-center gap-2 text-[13px]" style={{ color: 'var(--px-secondary)' }}>
          <span className="tabular-nums">{stats.pending} new order{stats.pending === 1 ? '' : 's'} waiting to be confirmed</span>
          <span className="text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>Review</span>
        </Link>
      )}
    </div>
  );
}

function RevenueChart({ data, rangeLabel }) {
  const [mode, setMode] = useState('revenue');
  const total = data.reduce((n, d) => n + (mode === 'revenue' ? d.revenue : d.orders), 0);
  return (
    <div className={CARD} style={{ ...CARD_STYLE, padding: 20 }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Label>{mode === 'revenue' ? 'Revenue' : 'Orders'}</Label>
          <p className="mt-1.5 text-[18px] font-bold leading-none" style={{ color: 'var(--px-ink)' }}>
            {mode === 'revenue' ? pkr(total) : total.toLocaleString()}
          </p>
          <p className="mt-2 text-[12px]" style={{ color: 'var(--px-muted)' }}>{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-1 rounded-[8px] p-0.5" style={{ background: 'var(--px-bg-hover)' }}>
          {['revenue', 'orders'].map((m) => (
            <button key={m} onClick={() => setMode(m)} className="rounded-[6px] px-2.5 py-1 text-[11px] font-medium capitalize transition-colors" style={mode === m ? { background: 'var(--px-primary)', color: '#FFFFFF' } : { color: 'var(--px-muted)' }}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--px-border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--px-muted)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--px-muted)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => mode === 'revenue' ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : v} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--px-border)', fontSize: 12, background: 'var(--px-bg-card)', color: 'var(--px-ink)' }} formatter={(v) => mode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']} />
            <Area type="monotone" dataKey={mode} stroke="var(--px-accent)" strokeWidth={2} fill="none" dot={false} activeDot={{ r: 4 }} isAnimationActive animationDuration={900} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatusDonut({ byStatus }) {
  const { segments, total } = buildStatusDonut(byStatus);
  const muted = segments.map((s) => ({ ...s, color: statusColor(s.name) }));
  const animatedTotal = useCountUp(total, { duration: 800 });
  return (
    <div className={CARD} style={CARD_STYLE}>
      <Label>Order status</Label>
      {total === 0 ? (
        <p className="py-12 text-[13px]" style={{ color: 'var(--px-muted)' }}>No orders yet.</p>
      ) : (
        <div className="mt-3 flex items-center gap-5">
          <div className="relative h-32 w-32 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={muted} dataKey="value" innerRadius={44} outerRadius={58} paddingAngle={2} startAngle={90} endAngle={-270} isAnimationActive animationDuration={800} animationEasing="ease-out">
                  {muted.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[20px] font-bold leading-none tabular-nums" style={{ color: 'var(--px-ink)' }}>{Math.round(animatedTotal)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--px-muted)' }}>Total</p>
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-2">
            {muted.map((d) => (
              <li key={d.name} className="flex items-baseline gap-2.5 text-[12px]">
                <span className="h-[7px] w-[7px] shrink-0 translate-y-[-1px] rounded-full" style={{ background: d.color }} />
                <span className="flex-1" style={{ color: 'var(--px-secondary)' }}>{d.name}</span>
                <span className="font-semibold tabular-nums" style={{ color: 'var(--px-ink)' }}>{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
  const [quickViewId, setQuickViewId] = useState(null);
  const { visible, toggle } = useWidgetVisibility();

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

  if (err) return (
    <AdminLayout title="Dashboard">
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="text-[20px] font-bold" style={{ color: 'var(--px-ink)' }}>Something went wrong</p>
        <p className="mt-2 text-[13px]" style={{ color: 'var(--px-muted)' }}>{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="mt-6 text-[13px] font-semibold" style={{ color: 'var(--px-ink)' }}>Try again</button>
      </div>
    </AdminLayout>
  );
  if (!d) return (
    <AdminLayout title="Dashboard">
      <div className="space-y-3">
        <div className="skeleton h-16 w-2/5 rounded-[10px]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 w-full rounded-[10px]" />)}</div>
        <div className="skeleton h-72 w-full rounded-[10px]" />
      </div>
    </AdminLayout>
  );

  const sparks = {
    revenue: d.chart.map((x) => ({ v: x.revenue })),
    orders: d.chart.map((x) => ({ v: x.orders })),
    customers: d.chart.map((x) => ({ v: x.orders * 0.6 })),
    aov: d.chart.map((x) => ({ v: x.orders ? x.revenue / x.orders : 0 })),
  };

  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; })();
  const firstName = auth?.user?.name?.split(' ')[0] || 'Hushae';
  const rangeLabel = range.preset === 'custom'
    ? `${range.from} — ${range.to}`
    : (RANGE_PRESETS.find((p) => p.key === range.preset)?.label || range.preset);

  return (
    <AdminLayout title="Dashboard">
      <div className="mx-auto max-w-[1400px]">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Rise>
          <header className="flex flex-wrap items-end justify-between gap-4 pb-5">
            <div>
              <h2 className="text-[20px] font-bold leading-tight tracking-tight" style={{ color: 'var(--px-ink)' }}>
                {greeting}, {firstName}
              </h2>
              <p className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: 'var(--px-muted)' }}>
                <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: 'var(--px-success)' }} aria-hidden="true" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                {lastSync && <span>· synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <RangePicker value={range} onChange={applyRange} />
              <button onClick={() => load()} disabled={refreshing} className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--px-bg-hover)] active:scale-[0.98] disabled:opacity-50" style={{ borderColor: 'var(--px-border)', color: 'var(--px-secondary)' }}>
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={() => exportDashboardSummary({ d, goal, alerts, insights: smart, storeName: 'HUSHAE', compareLabel: 'vs previous period' })} className="inline-flex items-center gap-1.5 rounded-[8px] border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-[var(--px-bg-hover)] active:scale-[0.98]" style={{ borderColor: 'var(--px-border)', color: 'var(--px-secondary)' }}>
                <Download size={13} /> Export
              </button>
              <CustomizeWidgets visible={visible} toggle={toggle} />
            </div>
          </header>
        </Rise>

        {/* ── Quick actions (quiet text links) ───────────────────────────── */}
        <Rise delay={staggerOf(1)}><div className="pb-4"><QuickActions /></div></Rise>

        {/* ── Attention centre (real alerts) ──────────────────────────────── */}
        {visible('attention') && <Rise delay={staggerOf(2)}><div className="pb-4"><AlertsBar alerts={alerts} /></div></Rise>}

        {/* ── Key metrics ─────────────────────────────────────────────────── */}
        {visible('kpis') && <Section delay={staggerOf(3)} className="pb-3"><KpiCards kpis={d.kpis} sparks={sparks} /></Section>}

        {/* ── Sales overview + order status ───────────────────────────────── */}
        {visible('sales') && <Section delay={staggerOf(4)} className="pb-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2"><ChartBoundary><RevenueChart data={d.chart} rangeLabel={rangeLabel} /></ChartBoundary></div>
            <ChartBoundary><StatusDonut byStatus={d.byStatus} /></ChartBoundary>
          </div>
        </Section>}

        {/* ── Pipeline ────────────────────────────────────────────────────── */}
        {visible('pipeline') && <Section delay={staggerOf(5)} className="pb-3"><PipelineStrip stats={d.stats} /></Section>}

        {/* ── Payment health + peak hours ─────────────────────────────────── */}
        {insights && visible('payments') && (
          <Section delay={staggerOf(6)} className="pb-3">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className={CARD} style={CARD_STYLE}>
                <Label>Payment health</Label>
                <div className="mt-3 space-y-2.5">
                  {PAYMENT_STATES.map((p) => {
                    const n = insights.paymentBreakdown?.[p.key] || 0;
                    if (!n) return null;
                    return (
                      <div key={p.key} className="flex items-baseline justify-between text-[13px]">
                        <span style={{ color: 'var(--px-secondary)' }}>{p.label}</span>
                        <span className="font-bold tabular-nums" style={{ color: 'var(--px-ink)' }}>{n}</span>
                      </div>
                    );
                  })}
                  {!Object.values(insights.paymentBreakdown || {}).some((n) => Number(n) > 0) && <p className="text-[13px]" style={{ color: 'var(--px-muted)' }}>No orders in this period</p>}
                </div>
                <div className="mt-3 space-y-2 border-t pt-3 text-[13px]" style={{ borderColor: 'var(--px-border)' }}>
                  <p className="flex justify-between"><span style={{ color: 'var(--px-muted)' }}>Verification rate</span><span style={{ color: 'var(--px-secondary)' }}>{insights.kpis.paymentVerifiedRate}%</span></p>
                  <p className="flex justify-between"><span style={{ color: 'var(--px-muted)' }}>Avg time to ship</span><span style={{ color: 'var(--px-secondary)' }}>{insights.avgShipHours ? (insights.avgShipHours < 1 ? `${Math.round(insights.avgShipHours * 60)}m` : `${insights.avgShipHours}h`) : '—'}</span></p>
                  <p className="flex justify-between"><span style={{ color: 'var(--px-muted)' }}>Issue rate</span><span style={{ color: insights.kpis.issueRate > 5 ? 'var(--px-danger)' : 'var(--px-secondary)' }}>{insights.kpis.issueRate}%</span></p>
                </div>
              </div>
              <div className={CARD} style={CARD_STYLE}>
                <Label>Peak order hours</Label>
                {!insights.hourly?.some((h) => h.orders > 0) ? (
                  <div className="mt-3 py-8 text-center">
                    <Clock size={18} strokeWidth={1.2} className="mx-auto mb-2" style={{ color: 'var(--px-muted)' }} />
                    <p className="text-[13px]" style={{ color: 'var(--px-muted)' }}>No orders in this period</p>
                  </div>
                ) : (
                  <div className="mt-3 h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.hourly} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--px-border)" vertical={false} />
                        <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 10, fill: 'var(--px-muted)' }} axisLine={false} tickLine={false} interval={3} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--px-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip labelFormatter={(h) => `${h}:00 – ${h}:59`} contentStyle={{ borderRadius: 8, border: '1px solid var(--px-border)', fontSize: 12, background: 'var(--px-bg-card)', color: 'var(--px-ink)' }} />
                        <Bar dataKey="orders" fill="var(--px-accent)" fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Store health + activity ─────────────────────────────────────── */}
        {visible('health') && <Section delay={staggerOf(7)} className="pb-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className={CARD} style={CARD_STYLE}><StoreHealth insights={insights} lowStockCount={d.stats.lowStockCount} /></div>
            <div className={CARD} style={CARD_STYLE}><ActivityFeed /></div>
          </div>
        </Section>}

        {/* ── Goal + insight ──────────────────────────────────────────────── */}
        {visible('goal') && <Section delay={staggerOf(8)} className="pb-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className={CARD} style={CARD_STYLE}><GoalTracker goal={goal} onSaved={() => load(true)} /></div>
            <div className={CARD} style={CARD_STYLE}><InsightsCard insights={smart} /></div>
          </div>
        </Section>}

        {/* ── P&L (conditional) ───────────────────────────────────────────── */}
        {d.kpis.profit && (d.kpis.profit.value !== 0 || d.kpis.cost.value !== 0) && visible('pnl') && (
          <Section delay={staggerOf(9)} className="pb-3">
            <div className={CARD} style={CARD_STYLE}>
              <div className="flex items-center justify-between">
                <Label>Profit &amp; loss</Label>
                <span className="text-[12px]" style={{ color: 'var(--px-muted)' }}>{rangeLabel}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[{ l: 'Gross profit', v: d.kpis.profit.value, f: 'money' }, { l: 'Cost of goods', v: d.kpis.cost.value, f: 'money' }, { l: 'Profit margin', v: d.kpis.margin.value, f: 'number' }].map((x) => (
                  <div key={x.l}>
                    <Label>{x.l}</Label>
                    <p className="mt-2 text-[24px] font-bold leading-none tracking-tight" style={{ color: 'var(--px-ink)' }}>{x.f === 'money' ? pkr(x.v) : `${x.v}%`}</p>
                  </div>
                ))}
              </div>
              {d.kpis.cost.value === 0 && <p className="mt-3 text-[12px]" style={{ color: 'var(--px-muted)' }}>Set <span className="font-medium" style={{ color: 'var(--px-secondary)' }}>Cost / Wholesale price</span> on each product for accurate profit tracking.</p>}
            </div>
          </Section>
        )}

        {/* ── Cancellation reasons + abandoned carts ──────────────────────── */}
        {visible('reasons') && <Section delay={staggerOf(10)} className="pb-3">
          <div id="cancellation-reasons" className="grid scroll-mt-24 gap-3 lg:grid-cols-2">
            <div className={CARD} style={CARD_STYLE}><CancellationReasons reasons={d.cancellationReasons || []} /></div>
            <div className={CARD} style={CARD_STYLE}><AbandonedCartsWidget /></div>
          </div>
        </Section>}

        {/* ── Lists ───────────────────────────────────────────────────────── */}
        {visible('lists') && <Section delay={staggerOf(11)} className="pb-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className={CARD} style={CARD_STYLE}>
              <div className="flex items-center justify-between">
                <Label>Best sellers</Label>
                <span className="text-[12px]" style={{ color: 'var(--px-muted)' }}>Top 5 by units sold</span>
              </div>
              {d.bestSellers.length === 0 ? (
                <p className="mt-4 py-6 text-center text-[13px]" style={{ color: 'var(--px-muted)' }}>Sales data will appear here.</p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {d.bestSellers.map((b, i) => (
                    <li key={b.name} className="flex items-center gap-3.5">
                      <span className="w-6 text-[13px] font-medium tabular-nums" style={{ color: i === 0 ? 'var(--px-accent-soft-text)' : 'var(--px-muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                      {b.image && <Img src={b.image} alt="" className="h-14 w-11 shrink-0 rounded-[5px] object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]" style={{ color: 'var(--px-secondary)' }}>{b.name}</p>
                        <p className="mt-0.5 text-[12px]" style={{ color: 'var(--px-muted)' }}>{b.qty} sold · {pkr(b.revenue)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className={CARD} style={CARD_STYLE}>
              <div className="flex items-center justify-between">
                <Label>Recent orders</Label>
                <Link to="/admin/orders" className="text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>View all →</Link>
              </div>
              <div className="mt-2">
                {d.recentOrders.map((o) => (
                  <div key={o._id} className="flex items-center gap-4 border-b py-3 last:border-0" style={{ borderColor: 'var(--px-border)' }}>
                    <button onClick={() => setQuickViewId(o._id)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                      <Img src={o.items?.[0]?.image} alt="" className="h-14 w-11 shrink-0 rounded-[5px] object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-3">
                          <p className="truncate font-mono text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>{o.orderNumber}</p>
                          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: statusColor(o.status) }}>{o.status}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--px-muted)' }}>{o.customerInfo?.name} · {o.customerInfo?.city} · {fmtDate(o.createdAt)}</p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-3.5">
                      {o.status === 'Pending' && waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '') && (
                        <a href={waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '')} target="_blank" rel="noreferrer" aria-label={`Verify ${o.orderNumber} via WhatsApp`} title="Verify via WhatsApp" className="transition-opacity hover:opacity-60" style={{ color: 'var(--px-muted)' }}>
                          <MessageCircle size={15} strokeWidth={1.5} />
                        </a>
                      )}
                      <div className="text-right">
                        <p className="text-[14px] font-bold tabular-nums" style={{ color: 'var(--px-ink)' }}>{pkr(o.total)}</p>
                        <p className="text-[11px]" style={{ color: 'var(--px-muted)' }}>{o.paymentMethod}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>}

        {/* ── Low stock + top customers ───────────────────────────────────── */}
        {visible('lowtop') && <Section delay={staggerOf(12)} className="pb-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className={CARD} style={CARD_STYLE}>
              <div className="flex items-center justify-between">
                <Label>Low stock</Label>
                <Link to="/admin/products" className="text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>Manage</Link>
              </div>
              {d.lowStock.length === 0 ? (
                <div className="mt-3 py-6 text-center">
                  <Check size={18} strokeWidth={1.2} className="mx-auto mb-2" style={{ color: 'var(--px-muted)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--px-muted)' }}>All stocked up.</p>
                </div>
              ) : (
                <div className="mt-2">{d.lowStock.slice(0, 5).map((p) => <StockRow key={p._id} product={p} onSaved={() => load(true)} onReorder={setReorder} />)}</div>
              )}
            </div>

            <div className={CARD} style={CARD_STYLE}>
              <div className="flex items-center justify-between">
                <Label>Top customers</Label>
                <Link to="/admin/customers" className="text-[12px] font-semibold" style={{ color: 'var(--px-ink)' }}>All</Link>
              </div>
              {d.topCustomers.length === 0 ? (
                <div className="mt-3 py-6 text-center">
                  <Users size={18} strokeWidth={1.2} className="mx-auto mb-2" style={{ color: 'var(--px-muted)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--px-muted)' }}>No customer data yet.</p>
                </div>
              ) : (
                <div className="mt-2">
                  {d.topCustomers.map((c, i) => (
                    <div key={c.phone + i} className="flex items-center gap-3.5 border-b py-3 last:border-0" style={{ borderColor: 'var(--px-border)' }}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-semibold" style={{ color: 'var(--px-secondary)', border: '1px solid var(--px-border)' }}>{(c.name || '?').slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px]" style={{ color: 'var(--px-secondary)' }}>{c.name}</p>
                          <ReliabilityBadge reliability={c.reliability} compact />
                        </div>
                        <p className="truncate text-[12px]" style={{ color: 'var(--px-muted)' }}>{c.city} · {c.orders} order{c.orders === 1 ? '' : 's'}</p>
                      </div>
                      <p className="text-[14px] font-bold tabular-nums" style={{ color: 'var(--px-ink)' }}>{pkr(c.spent)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>}

        {reorder && <ReorderModal product={reorder} onClose={() => setReorder(null)} onSaved={() => load(true)} />}
        {quickViewId && <OrderQuickView id={quickViewId} token={auth.token} onClose={() => setQuickViewId(null)} />}
      </div>
    </AdminLayout>
  );
}
