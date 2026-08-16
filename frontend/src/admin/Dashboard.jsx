import { Component, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowRight, BadgePercent, Calendar, Check,
  CircleDollarSign, Clock, Download, Megaphone, MessageCircle, Package,
  PackagePlus, Pencil, RefreshCw, ShoppingBag, Sparkles, TrendingUp, Truck, Users,
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
import { exportDashboardSummary } from './dashboard/exportSummary';
import { useCountUp, Rise, staggerOf } from './ui/Animate';

/* ============================================================================
 * DASHBOARD — Editorial redesign (visual-only). Aesop / The Row register.
 *
 *   · warm bone page, warm near-black ink, warm muted grays
 *   · sections separated by whitespace + hairline dividers — no card boxes,
 *     no shadows, no borders-as-chrome
 *   · Fraunces serif for the greeting + big numbers (light weight), neutral
 *     sans for body
 *   · one accent colour (#9C2C4E) used only for the single primary action and
 *     a single highlighted number
 *
 * Layout hierarchy (primary → secondary → tertiary):
 *   1. Greeting (serif) + quiet tools + Quick Actions as text links
 *   2. Alerts — a single quiet line-item list (no coloured banners)
 *   3. KPI strip — four numbers in one row, divided by hairlines
 *   4. Revenue — the hero chart, large and dominant
 *   5. Status donut + Order pipeline — secondary row
 *   6. Payment health + Peak hours — quieter tertiary row
 *   7. Goal + Insight
 *   8. Cancellation reasons + Abandoned carts
 *   9. Lists — Best sellers, Recent orders, Low stock, Top customers
 *
 * All business logic, data fetching and behaviour are unchanged.
 * ========================================================================== */

/* CSS-variable driven so the palette flips correctly in the opt-in dark mode. */
const INK = 'var(--admin-ink)';
const MUTED = 'var(--admin-muted)';
const FAINT = 'var(--admin-faint)';
const HAIRLINE = 'var(--admin-hairline)';
const ACCENT = 'var(--admin-accent)';

/* Desaturated status palette — muted terracotta / sage / clay, never saturated
   "alert-app" colours. HEX for fills (donut segments, pipeline line); the
   var() siblings are for text so they lighten in dark mode. */
const STATUS = {
  Pending: '#9C5A3C',
  Confirmed: '#5F6B45',
  Processing: '#5C6C8A',
  'Ready to Ship': '#6A6E8C',
  Shipped: '#6C6183',
  'Out for Delivery': '#6C6183',
  Delivered: '#5F6B45',
  Cancelled: '#9C5A52',
  Refunded: '#8F6040',
};
const STATUS_TXT = {
  Pending: 'var(--admin-s-pending)',
  Confirmed: 'var(--admin-s-confirmed)',
  Processing: 'var(--admin-s-processing)',
  'Ready to Ship': 'var(--admin-s-ready)',
  Shipped: 'var(--admin-s-shipped)',
  'Out for Delivery': 'var(--admin-s-shipped)',
  Delivered: 'var(--admin-s-delivered)',
  Cancelled: 'var(--admin-s-cancelled)',
  Refunded: 'var(--admin-s-refunded)',
};
const statusFill = (s) => STATUS[s] || '#6F6A5E';
const statusText = (s) => STATUS_TXT[s] || MUTED;

/* Per-widget error boundary — a chart that throws degrades to a quiet retry
   line instead of blanking the whole dashboard. */
class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="py-16 text-center" role="alert">
          <p className="text-[13px]" style={{ color: MUTED }}>Couldn&apos;t render this chart</p>
          <button type="button" onClick={() => this.setState({ failed: false })} className="mt-3 text-[12px] font-medium underline underline-offset-4" style={{ color: INK }}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* WhatsApp deep link for verifying a pending order — wa.me needs no API key. */
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

/* ── Shared editorial atoms ──────────────────────────────────────────────── */

const Eyebrow = ({ children, className = '' }) => (
  <p className={`text-[11px] font-medium uppercase tracking-[0.22em] ${className}`} style={{ color: MUTED }}>{children}</p>
);

const Hairline = ({ className = '' }) => (
  <div aria-hidden="true" className={className} style={{ borderTop: `1px solid ${HAIRLINE}` }} />
);

const SerifNumber = ({ value, format = 'number', className = '', duration = 800 }) => {
  const n = useCountUp(value, { duration });
  const display = format === 'money' ? pkr(Math.round(n)) : Math.round(n).toLocaleString();
  return <span className={`font-display-serif font-light tabular-nums ${className}`}>{display}</span>;
};

/* Section wrapper — generous whitespace + optional hairline top divider. */
const Section = ({ children, delay = 0, divider = false, className = '' }) => (
  <Rise delay={delay} className={className}>
    {divider && <Hairline className="mb-10" />}
    {children}
  </Rise>
);

/* ── KPI strip — four numbers in one quiet row, divided by hairlines ─────── */
function KpiStrip({ kpis, sparks, cmpLabel }) {
  const items = [
    { label: 'Revenue', value: kpis.revenue.value, change: kpis.revenue.change, spark: sparks.revenue, format: 'money' },
    { label: 'Orders', value: kpis.orders.value, change: kpis.orders.change, spark: sparks.orders },
    { label: 'New Customers', value: kpis.customers.value, change: kpis.customers.change, spark: sparks.customers },
    { label: 'Avg Order Value', value: kpis.aov.value, change: kpis.aov.change, spark: sparks.aov, format: 'money' },
  ];
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
      {items.map((it, i) => {
        const change = it.change;
        const changeLabel = change === null && it.value > 0
          ? 'New'
          : typeof change === 'number' && Number.isFinite(change)
            ? `${change > 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%`
            : '—';
        return (
          <div key={it.label} className={i > 0 ? 'lg:border-l lg:pl-8' : ''} style={i > 0 ? { borderColor: HAIRLINE } : undefined}>
            <Eyebrow>{it.label}</Eyebrow>
            <SerifNumber value={it.value} format={it.format} className="mt-4 block text-[38px] leading-none" />
            <p className="mt-3 text-[12px]" style={{ color: MUTED }}>
              {changeLabel}
              {cmpLabel && <span className="ml-2" style={{ color: FAINT }}>· {cmpLabel}</span>}
            </p>
            {it.spark?.length > 0 && (
              <div className="mt-4 h-9">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={it.spark} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`spk-${it.label}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.4} fill={`url(#spk-${it.label})`} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Quick Actions — quiet text-with-icon links near the header, no chrome ── */
function QuickActions() {
  const actions = [
    { to: '/admin/orders', icon: ShoppingBag, label: 'View orders' },
    { to: '/admin/products/new', icon: PackagePlus, label: 'Add product', accent: true },
    { to: '/admin/promotions/new', icon: Megaphone, label: 'New promo' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'Discounts' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-9 gap-y-3">
      {actions.map((a) => (
        <Link
          key={a.label}
          to={a.to}
          className="group inline-flex items-center gap-2 text-[13px] transition-colors duration-150"
          style={{ color: a.accent ? ACCENT : INK }}
        >
          <a.icon size={14} strokeWidth={1.5} aria-hidden="true" />
          <span className="border-b border-transparent pb-0.5 transition-colors duration-150 group-hover:border-current">
            {a.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

/* ── Quiet stat — eyebrow + serif number + caption, no box ───────────────── */
function QuietStat({ label, value, format = 'money', caption, valueColor }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <SerifNumber value={value} format={format} className="mt-3 block text-[30px] leading-none" />
      {caption && <p className="mt-2 text-[12px]" style={{ color: MUTED }}>{caption}</p>}
    </div>
  );
}

/* ── Low-stock row — text-first, larger imagery, no pill chrome ──────────── */
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
    <div className="flex items-center gap-3 py-1">
      <Img src={p.images?.[0]?.url} alt="" className="h-12 w-9 shrink-0 rounded-[4px] object-cover" />
      <input type="number" min="0" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} className="w-20 rounded border px-2 py-1 text-[13px] tabular-nums outline-none focus:border-neutral-900" style={{ borderColor: HAIRLINE }} />
      <button onClick={save} disabled={busy} className="text-[12px] font-medium underline underline-offset-4 disabled:opacity-50" style={{ color: INK }}>Save</button>
      <button onClick={() => setEditing(false)} className="text-[12px] font-medium" style={{ color: MUTED }}>Cancel</button>
    </div>
  );
  return (
    <div className="group flex items-center gap-3 py-2">
      <Link to={`/admin/products/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Img src={p.images?.[0]?.url} alt="" className="h-12 w-9 shrink-0 rounded-[4px] object-cover" />
        <span className="truncate text-[13px]" style={{ color: INK }}>{p.name}</span>
      </Link>
      <button onClick={() => { setValue(String(p.stock)); setEditing(true); }} title="Update stock" className="inline-flex items-center gap-1 text-[12px] transition-opacity hover:opacity-60" style={{ color: p.stock === 0 ? '#9C5A52' : MUTED }}>
        <span className="w-6 text-right tabular-nums">{p.stock}</span>
        <Pencil size={11} />
      </button>
      {p.reorderStatus === 'pending'
        ? <button onClick={() => onReorder?.(p)} title="Reorder pending — tap to mark received" className="text-[12px] font-medium transition-opacity hover:opacity-60" style={{ color: MUTED }}>Pending</button>
        : <button onClick={() => onReorder?.(p)} title="Reorder" className="text-[12px] font-medium underline-offset-4 hover:underline" style={{ color: INK }}>Reorder</button>}
    </div>
  );
}

/* ── Order pipeline — thin line, equal segments, desaturated colours ─────── */
function PipelineStrip({ stats }) {
  const items = [
    { label: 'Pending', n: stats.pending, color: STATUS.Pending, to: '/admin/orders?group=new' },
    { label: 'Confirmed', n: stats.confirmed, color: STATUS.Confirmed, to: '/admin/orders?group=processing' },
    { label: 'Processing', n: stats.processing, color: STATUS.Processing, to: '/admin/orders?group=processing' },
    { label: 'Ready', n: stats.readyToShip, color: STATUS['Ready to Ship'], to: '/admin/orders?group=to-ship' },
    { label: 'In Transit', n: stats.shipped, color: STATUS.Shipped, to: '/admin/orders?group=shipped' },
    { label: 'Delivered', n: stats.delivered, color: STATUS.Delivered, to: '/admin/orders?group=delivered' },
  ];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Eyebrow>Order pipeline</Eyebrow>
        <Link to="/admin/orders" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: MUTED }}>Manage all →</Link>
      </div>
      {/* thin 3px line, six equal segments — empty stages stay a quiet neutral */}
      <div className="mt-5 grid h-[3px] grid-cols-6 gap-px">
        {items.map((it) => (
          <div key={it.label} className="group relative">
            <div role="img" aria-label={`${it.label}: ${it.n} order${it.n === 1 ? '' : 's'}`} style={{ background: it.n > 0 ? it.color : 'rgba(26,24,21,0.06)' }} className="h-full w-full" />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-[#1A1815] px-2 py-1 text-[11px] font-medium text-[#FAF8F5] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {it.label}: {it.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-3 gap-x-4 gap-y-3 lg:grid-cols-6">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="group">
            <p className="truncate text-[12px]" style={{ color: MUTED }}>{it.label}</p>
            <p className="mt-0.5 font-display-serif text-[22px] font-light tabular-nums" style={{ color: it.n > 0 ? it.color : FAINT }}>{it.n}</p>
          </Link>
        ))}
      </div>
      {stats.pending > 0 && (
        <Link to="/admin/orders?group=new" className="mt-6 inline-flex items-center gap-2 text-[13px]" style={{ color: INK }}>
          <span className="tabular-nums">{stats.pending} new order{stats.pending === 1 ? '' : 's'} waiting to be confirmed</span>
          <span className="text-[12px] underline underline-offset-4" style={{ color: INK }}>Review</span>
        </Link>
      )}
    </div>
  );
}

/* ── Revenue — the hero chart, large and dominant ────────────────────────── */
function RevenueChart({ data, rangeLabel }) {
  const [mode, setMode] = useState('revenue');
  const total = data.reduce((n, d) => n + (mode === 'revenue' ? d.revenue : d.orders), 0);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{mode === 'revenue' ? 'Revenue' : 'Orders'}</Eyebrow>
          <p className="mt-4 font-display-serif text-[46px] font-light leading-none" style={{ color: mode === 'revenue' ? ACCENT : INK }}>
            {mode === 'revenue' ? pkr(total) : total.toLocaleString()}
          </p>
          <p className="mt-3 text-[12px]" style={{ color: MUTED }}>{rangeLabel}</p>
        </div>
        <div className="flex items-center gap-6 text-[12px]">
          {['revenue', 'orders'].map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`pb-1 font-medium uppercase tracking-[0.12em] transition-colors ${mode === m ? '' : 'opacity-50 hover:opacity-100'}`} style={{ color: INK, borderBottom: mode === m ? '1px solid currentColor' : '1px solid transparent' }}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity={0.14} />
                <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,24,21,0.08)" vertical={false} />
            <XAxis dataKey="label" stroke="#8A8578" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis stroke="#8A8578" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => mode === 'revenue' ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : v} />
            <Tooltip contentStyle={{ borderRadius: 6, border: `1px solid ${HAIRLINE}`, fontSize: 12, background: '#FFFFFF' }} formatter={(v) => mode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']} />
            <Area type="monotone" dataKey={mode} stroke="currentColor" strokeWidth={1.8} fill="url(#rev-fill)" dot={false} activeDot={{ r: 4, fill: "currentColor", stroke: "currentColor" }} isAnimationActive animationDuration={900} animationEasing="ease-out" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Status donut — desaturated segments, serif total ────────────────────── */
function StatusDonut({ byStatus }) {
  const { segments, total } = buildStatusDonut(byStatus);
  const muted = segments.map((s) => ({ ...s, color: statusFill(s.name) }));
  const animatedTotal = useCountUp(total, { duration: 800 });
  return (
    <div>
      <Eyebrow>Order status mix</Eyebrow>
      {total === 0 ? (
        <p className="py-12 text-[13px]" style={{ color: MUTED }}>No orders yet.</p>
      ) : (
        <div className="mt-6 flex items-center gap-8">
          <div className="relative h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={muted} dataKey="value" innerRadius={46} outerRadius={64} paddingAngle={2} startAngle={90} endAngle={-270} isAnimationActive animationDuration={800} animationEasing="ease-out">
                  {muted.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="font-display-serif text-[30px] font-light leading-none tabular-nums" style={{ color: INK }}>{Math.round(animatedTotal)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>Total</p>
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-2.5">
            {muted.map((d) => (
              <li key={d.name} className="flex items-baseline gap-3 text-[12px]">
                <span className="h-[3px] w-4 shrink-0 translate-y-[-3px]" style={{ background: d.color }} />
                <span className="flex-1" style={{ color: MUTED }}>{d.name}</span>
                <span className="font-medium tabular-nums" style={{ color: INK }}>{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Today's activity — quiet bar, muted palette ─────────────────────────── */
function TodayHourly({ hourly }) {
  const total = hourly.reduce((n, h) => n + h.orders, 0);
  const peak = hourly.reduce((max, h) => h.orders > max.orders ? h : max, { hour: 0, orders: 0 });
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <Eyebrow>Today&apos;s activity</Eyebrow>
          <p className="mt-2 text-[12px]" style={{ color: MUTED }}>{total} order{total === 1 ? '' : 's'} · peak {peak.hour.toString().padStart(2, '0')}:00</p>
        </div>
        <Activity size={15} strokeWidth={1.5} style={{ color: MUTED }} aria-hidden="true" />
      </div>
      {total === 0 ? (
        <div className="mt-6 py-10 text-center">
          <Activity size={20} strokeWidth={1.2} className="mx-auto mb-3" style={{ color: FAINT }} />
          <p className="text-[13px]" style={{ color: MUTED }}>No orders yet today</p>
        </div>
      ) : (
        <div className="mt-5 h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#8A8578" }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "#8A8578" }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 6, border: `1px solid ${HAIRLINE}`, fontSize: 12, background: '#FFFFFF' }} formatter={(v) => [v, 'Orders']} labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`} />
              <Bar dataKey="orders" radius={[2, 2, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out">
                {hourly.map((h, i) => <Cell key={i} fill="currentColor" fillOpacity={h.orders === peak.orders && peak.orders > 0 ? 0.9 : 0.12} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
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

  if (err) return (
    <AdminLayout title="Dashboard">
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="font-display-serif text-[24px] font-light" style={{ color: INK }}>Something went wrong</p>
        <p className="mt-2 text-[13px]" style={{ color: MUTED }}>{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="mt-6 text-[13px] font-medium underline underline-offset-4" style={{ color: INK }}>Try again</button>
      </div>
    </AdminLayout>
  );
  if (!d) return (
    <AdminLayout title="Dashboard">
      <div className="space-y-6">
        <div className="skeleton h-16 w-2/5" />
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-28 w-full" />)}</div>
        <div className="skeleton h-72 w-full" />
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
      <div className="mx-auto max-w-[1240px]" style={{ color: INK }}>

        {/* ── Page header — serif greeting, quiet meta, minimal tools ──────── */}
        <Rise>
          <header className="flex flex-wrap items-end justify-between gap-6 pb-10" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
            <div>
              <Eyebrow>Dashboard</Eyebrow>
              <p className="mt-3 font-display-serif text-[38px] font-light leading-tight" style={{ color: INK }}>
                {greeting}, {firstName}
              </p>
              <p className="mt-2 flex items-center gap-2 text-[12px]" style={{ color: MUTED }}>
                <span className="live-dot h-1.5 w-1.5 rounded-full" style={{ background: '#5F6B45' }} aria-hidden="true" />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                {lastSync && <span style={{ color: FAINT }}>· synced {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px]">
              <RangePicker value={range} onChange={applyRange} />
              <button onClick={() => load()} disabled={refreshing} className="inline-flex items-center gap-2 transition-opacity hover:opacity-60 disabled:opacity-40" style={{ color: INK }}>
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={() => exportDashboardSummary({ d, goal, alerts, insights: smart, storeName: 'HUSHAE', compareLabel: 'vs previous period' })} className="inline-flex items-center gap-2 transition-opacity hover:opacity-60" style={{ color: INK }}>
                <Download size={13} /> Export
              </button>
            </div>
          </header>
        </Rise>

        {/* ── Quick actions — quiet text links ─────────────────────────────── */}
        <Rise delay={staggerOf(1)}>
          <div className="pt-7">
            <QuickActions />
          </div>
        </Rise>

        {/* ── Alerts — quiet line-item list ────────────────────────────────── */}
        <Rise delay={staggerOf(2)}>
          <div className="pt-10">
            <AlertsBar alerts={alerts} />
          </div>
        </Rise>

        {/* ── KPI strip ────────────────────────────────────────────────────── */}
        <Section delay={staggerOf(3)} divider className="pt-0">
          <KpiStrip kpis={d.kpis} sparks={sparks} cmpLabel={rangeLabel} />
        </Section>

        {/* ── Hero: Revenue ────────────────────────────────────────────────── */}
        <Section delay={staggerOf(4)} divider>
          <ChartBoundary>
            <RevenueChart data={d.chart} rangeLabel={rangeLabel} />
          </ChartBoundary>
        </Section>

        {/* ── Secondary: donut + pipeline ──────────────────────────────────── */}
        <Section delay={staggerOf(5)} divider>
          <div className="grid gap-12 lg:grid-cols-5">
            <div className="lg:col-span-2"><ChartBoundary><StatusDonut byStatus={d.byStatus} /></ChartBoundary></div>
            <div className="lg:col-span-3"><PipelineStrip stats={d.stats} /></div>
          </div>
        </Section>

        {/* ── Tertiary: payment health + peak hours ────────────────────────── */}
        {insights && (
          <Section delay={staggerOf(6)} divider>
            <div className="grid gap-12 lg:grid-cols-2">
              <div>
                <Eyebrow>Payment health</Eyebrow>
                <div className="mt-5 space-y-3">
                  {PAYMENT_STATES.map((p) => {
                    const n = insights.paymentBreakdown?.[p.key] || 0;
                    if (!n) return null;
                    return (
                      <div key={p.key} className="flex items-baseline justify-between border-b pb-2.5 text-[13px]" style={{ borderColor: HAIRLINE }}>
                        <span style={{ color: MUTED }}>{p.label}</span>
                        <span className="font-display-serif text-[18px] font-light tabular-nums" style={{ color: INK }}>{n}</span>
                      </div>
                    );
                  })}
                  {!Object.values(insights.paymentBreakdown || {}).some((n) => Number(n) > 0) && <p className="text-[13px]" style={{ color: MUTED }}>No orders in this period</p>}
                </div>
                <div className="mt-5 space-y-2 text-[13px]">
                  <p className="flex justify-between"><span style={{ color: MUTED }}>Verification rate</span><span style={{ color: INK }}>{insights.kpis.paymentVerifiedRate}%</span></p>
                  <p className="flex justify-between"><span style={{ color: MUTED }}>Avg time to ship</span><span style={{ color: INK }}>{insights.avgShipHours ? (insights.avgShipHours < 1 ? `${Math.round(insights.avgShipHours * 60)}m` : `${insights.avgShipHours}h`) : '—'}</span></p>
                  <p className="flex justify-between"><span style={{ color: MUTED }}>Issue rate</span><span style={{ color: insights.kpis.issueRate > 5 ? '#9C5A52' : INK }}>{insights.kpis.issueRate}%</span></p>
                </div>
              </div>
              <div>
                <Eyebrow>Peak order hours</Eyebrow>
                {!insights.hourly?.some((h) => h.orders > 0) ? (
                  <div className="mt-6 py-10 text-center">
                    <Clock size={20} strokeWidth={1.2} className="mx-auto mb-3" style={{ color: FAINT }} />
                    <p className="text-[13px]" style={{ color: MUTED }}>No orders in this period</p>
                  </div>
                ) : (
                  <div className="mt-5 h-32 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.hourly} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,24,21,0.08)" vertical={false} />
                        <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 10, fill: "#8A8578" }} axisLine={false} tickLine={false} interval={3} />
                        <YAxis tick={{ fontSize: 10, fill: "#8A8578" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip labelFormatter={(h) => `${h}:00 – ${h}:59`} contentStyle={{ borderRadius: 6, border: `1px solid ${HAIRLINE}`, fontSize: 12, background: '#FFFFFF' }} />
                        <Bar dataKey="orders" fill="currentColor" fillOpacity={0.16} radius={[2, 2, 0, 0]} isAnimationActive animationDuration={700} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Goal + Insight ───────────────────────────────────────────────── */}
        <Section delay={staggerOf(7)} divider>
          <div className="grid gap-12 lg:grid-cols-2">
            <GoalTracker goal={goal} onSaved={() => load(true)} />
            <InsightsCard insights={smart} />
          </div>
        </Section>

        {/* ── P&L (conditional) — quiet stat row ───────────────────────────── */}
        {d.kpis.profit && (d.kpis.profit.value !== 0 || d.kpis.cost.value !== 0) && (
          <Section delay={staggerOf(8)} divider>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <Eyebrow>Profit &amp; loss</Eyebrow>
              <span className="text-[12px]" style={{ color: MUTED }}>{rangeLabel}</span>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <QuietStat label="Gross profit" value={d.kpis.profit.value} format="money" caption={typeof d.kpis.profit.change === 'number' ? `${d.kpis.profit.change > 0 ? '▲' : '▼'} ${Math.abs(d.kpis.profit.change).toFixed(1)}%` : 'vs previous period'} />
              <QuietStat label="Cost of goods" value={d.kpis.cost.value} format="money" caption="What you paid for products sold" />
              <QuietStat label="Profit margin" value={d.kpis.margin.value} format="number" caption="Profit as % of revenue" />
            </div>
            {d.kpis.cost.value === 0 && <p className="mt-5 text-[12px]" style={{ color: MUTED }}>Set <span className="font-medium" style={{ color: INK }}>Cost / Wholesale price</span> on each product for accurate profit tracking.</p>}
          </Section>
        )}

        {/* ── Cancellation reasons + Abandoned carts ───────────────────────── */}
        <Section delay={staggerOf(9)} divider>
          <div id="cancellation-reasons" className="grid scroll-mt-24 gap-12 lg:grid-cols-2">
            <CancellationReasons reasons={d.cancellationReasons || []} />
            <AbandonedCartsWidget />
          </div>
        </Section>

        {/* ── Lists: best sellers + recent orders ──────────────────────────── */}
        <Section delay={staggerOf(10)} divider>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Best sellers</Eyebrow>
                <span className="text-[12px]" style={{ color: MUTED }}>Top 5 by units sold</span>
              </div>
              {d.bestSellers.length === 0 ? (
                <p className="mt-6 py-8 text-center text-[13px]" style={{ color: MUTED }}>Sales data will appear here.</p>
              ) : (
                <ol className="mt-6 space-y-4">
                  {d.bestSellers.map((b, i) => (
                    <li key={b.name} className="flex items-center gap-4">
                      <span className="font-display-serif w-6 text-[14px] font-light" style={{ color: FAINT }}>{String(i + 1).padStart(2, '0')}</span>
                      {b.image && <Img src={b.image} alt="" className="h-14 w-11 shrink-0 rounded-[4px] object-cover" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px]" style={{ color: INK }}>{b.name}</p>
                        <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>{b.qty} sold · {pkr(b.revenue)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Recent orders</Eyebrow>
                <Link to="/admin/orders" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: MUTED }}>View all →</Link>
              </div>
              <div className="mt-4 space-y-0">
                {d.recentOrders.map((o) => (
                  <div key={o._id} className="flex items-center gap-4 border-b py-3.5" style={{ borderColor: HAIRLINE }}>
                    <Link to={`/admin/orders/${o._id}`} className="flex min-w-0 flex-1 items-center gap-4">
                      <Img src={o.items?.[0]?.image} alt="" className="h-14 w-11 shrink-0 rounded-[4px] object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-3">
                          <p className="truncate font-mono text-[12px]" style={{ color: INK }}>{o.orderNumber}</p>
                          <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: statusText(o.status) }}>{o.status}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px]" style={{ color: MUTED }}>{o.customerInfo?.name} · {o.customerInfo?.city} · {fmtDate(o.createdAt)}</p>
                      </div>
                    </Link>
                    <div className="flex shrink-0 items-center gap-4">
                      {o.status === 'Pending' && waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '') && (
                        <a href={waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '')} target="_blank" rel="noreferrer" aria-label={`Verify ${o.orderNumber} via WhatsApp`} title="Verify via WhatsApp" className="transition-opacity hover:opacity-60" style={{ color: MUTED }}>
                          <MessageCircle size={15} strokeWidth={1.5} />
                        </a>
                      )}
                      <div className="text-right">
                        <p className="font-display-serif text-[15px] font-light tabular-nums" style={{ color: INK }}>{pkr(o.total)}</p>
                        <p className="text-[11px]" style={{ color: MUTED }}>{o.paymentMethod}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Low stock + top customers ────────────────────────────────────── */}
        <Section delay={staggerOf(11)} divider>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Low stock</Eyebrow>
                <Link to="/admin/products" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: MUTED }}>Manage</Link>
              </div>
              {d.lowStock.length === 0 ? (
                <div className="mt-6 py-8 text-center">
                  <Check size={20} strokeWidth={1.2} className="mx-auto mb-3" style={{ color: FAINT }} />
                  <p className="text-[13px]" style={{ color: MUTED }}>All stocked up.</p>
                </div>
              ) : (
                <div className="mt-3">
                  {d.lowStock.slice(0, 5).map((p) => <StockRow key={p._id} product={p} onSaved={() => load(true)} onReorder={setReorder} />)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <Eyebrow>Top customers</Eyebrow>
                <Link to="/admin/customers" className="text-[12px] transition-opacity hover:opacity-60" style={{ color: MUTED }}>All</Link>
              </div>
              {d.topCustomers.length === 0 ? (
                <div className="mt-6 py-8 text-center">
                  <Users size={20} strokeWidth={1.2} className="mx-auto mb-3" style={{ color: FAINT }} />
                  <p className="text-[13px]" style={{ color: MUTED }}>No customer data yet.</p>
                </div>
              ) : (
                <div className="mt-3">
                  {d.topCustomers.map((c, i) => (
                    <div key={c.phone + i} className="flex items-center gap-4 border-b py-3" style={{ borderColor: HAIRLINE }}>
                      <span className="font-display-serif grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-light" style={{ color: INK, border: `1px solid ${HAIRLINE}` }}>{(c.name || '?').slice(0, 1).toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px]" style={{ color: INK }}>{c.name}</p>
                          <ReliabilityBadge reliability={c.reliability} compact />
                        </div>
                        <p className="truncate text-[12px]" style={{ color: MUTED }}>{c.city} · {c.orders} order{c.orders === 1 ? '' : 's'}</p>
                      </div>
                      <p className="font-display-serif text-[15px] font-light tabular-nums" style={{ color: INK }}>{pkr(c.spent)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        {reorder && <ReorderModal product={reorder} onClose={() => setReorder(null)} onSaved={() => load(true)} />}
      </div>
    </AdminLayout>
  );
}
