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
 * DASHBOARD — Phase 5 Premium Rebuild
 * WHITE + JET BLACK luxury commerce operating system.
 * ========================================================================== */

/* Per-widget error boundary */
class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-[180px] place-items-center rounded-lg border border-[#EAEAEA] bg-[#FAFAFA] p-6 text-center" role="alert">
          <div>
            <p className="text-[13px] font-medium text-[#555555]">Couldn't render this chart</p>
            <button type="button" onClick={() => this.setState({ failed: false })} className="mt-3 rounded-md border border-[#DCDCDC] bg-white px-4 py-1.5 text-[12px] font-medium text-black transition hover:bg-[#F5F5F5]">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* WhatsApp deep link */
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

/* ── STATUS PILL ─────────────────────────────────────────────────────────── */
const statusPill = (s) => {
  const base = 'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider';
  if (s === 'Delivered') return `${base} bg-[#F5F5F5] text-black`;
  if (s === 'Cancelled' || s === 'Refunded') return `${base} bg-[#FAFAFA] text-[#777777]`;
  if (s === 'Shipped' || s === 'Out for Delivery') return `${base} bg-[#F5F5F5] text-[#555555]`;
  if (s === 'Ready to Ship') return `${base} bg-[#F5F5F5] text-[#555555]`;
  if (s === 'Processing' || s === 'Confirmed') return `${base} bg-[#FAFAFA] text-[#777777]`;
  return `${base} bg-[#FAFAFA] text-[#999999]`;
};

/* ── METRIC ROW ──────────────────────────────────────────────────────────── */
function MetricRow({ icon: Icon, label, value, change, format = 'number', to, compareLabel = 'vs. previous period' }) {
  const hasRate = typeof change === 'number' && Number.isFinite(change);
  const positive = hasRate && change > 0;
  const negative = hasRate && change < 0;
  const isNew = change === null && value > 0;
  const changeText = hasRate ? Math.abs(change).toFixed(1) + '%' : '';
  const display = format === 'money' ? pkr(value) : value.toLocaleString();
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="group block border-b border-[#EAEAEA] p-6 transition-colors duration-150 hover:bg-[#FAFAFA] last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</p>
        <Icon size={14} strokeWidth={1.5} className="text-[#DCDCDC]" aria-hidden />
      </div>
      <p className="mt-4 text-[32px] font-semibold leading-none tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</p>
      <div className="mt-3 flex items-center gap-2">
        {isNew ? (
          <span className="text-[10px] font-medium uppercase tracking-wider text-[#999999]">New</span>
        ) : hasRate && change !== 0 ? (
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${positive ? 'text-black' : negative ? 'text-[#777777]' : 'text-[#999999]'}`}>
            {positive ? <ArrowUpRight size={12} /> : negative ? <ArrowDownRight size={12} /> : null}
            {changeText}
          </span>
        ) : null}
        <span className="text-[10px] uppercase tracking-wider text-[#AAAAAA]">{compareLabel}</span>
      </div>
    </Wrapper>
  );
}

/* ── QUICK ACTIONS ───────────────────────────────────────────────────────── */
function QuickActions() {
  const actions = [
    { to: '/admin/orders', icon: ShoppingBag, label: 'View orders' },
    { to: '/admin/products/new', icon: PackagePlus, label: 'Add product', primary: true },
    { to: '/admin/promotions/new', icon: Megaphone, label: 'New promo' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'Discounts' },
  ];
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Quick Actions</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className={`flex flex-col items-center gap-2 rounded-md border p-4 text-center transition-all duration-150 ${
              a.primary
                ? 'border-black bg-black text-white hover:bg-[#1a1a1a]'
                : 'border-[#EAEAEA] bg-white text-black hover:border-[#DCDCDC] hover:bg-[#FAFAFA]'
            }`}
          >
            <a.icon size={18} strokeWidth={1.5} />
            <span className="text-[12px] font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── PROFIT TILE ─────────────────────────────────────────────────────────── */
function ProfitTile({ icon: Icon, label, value, change, format = 'money', hint }) {
  const display = format === 'money' ? pkr(value) : format === 'percent' ? `${value}%` : value.toLocaleString();
  return (
    <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#F5F5F5] text-black"><Icon size={15} /></span>
        {typeof change === 'number' && change !== 0 && (
          <span className={`text-[12px] font-medium ${change > 0 ? 'text-black' : 'text-[#777777]'}`}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</p>
      <p className="mt-1 text-[18px] font-semibold leading-none tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</p>
      {hint && <p className="mt-2 text-[12px] text-[#999999]">{hint}</p>}
    </div>
  );
}

/* ── STOCK ROW ───────────────────────────────────────────────────────────── */
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
    <div className="flex items-center gap-2 rounded-md bg-[#F5F5F5] p-2">
      <Img src={p.images?.[0]?.url} alt="" className="h-10 w-8 shrink-0 rounded-md border border-[#EAEAEA] object-cover" />
      <input type="number" min="0" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} className="w-full min-w-0 rounded-md border border-[#DCDCDC] bg-white px-2.5 py-1.5 text-[13px] text-black outline-none focus:border-black" style={{ fontVariantNumeric: 'tabular-nums' }} />
      <button onClick={save} disabled={busy} className="shrink-0 rounded-md bg-black px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-50">Save</button>
      <button onClick={() => setEditing(false)} className="shrink-0 rounded-md px-2 py-1.5 text-[12px] font-medium text-[#777777] hover:text-black">Cancel</button>
    </div>
  );
  return (
    <div className="group flex items-center gap-3 rounded-md p-2 transition hover:bg-[#FAFAFA]">
      <Link to={`/admin/products/${p._id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Img src={p.images?.[0]?.url} alt="" className="h-10 w-8 shrink-0 rounded-md border border-[#EAEAEA] object-cover" />
        <span className="line-clamp-2 flex-1 text-[13px] font-medium text-black">{p.name}</span>
      </Link>
      <button onClick={() => { setValue(String(p.stock)); setEditing(true); }} title="Update stock" className={`shrink-0 rounded-sm px-2.5 py-1 text-[11px] font-medium transition hover:ring-1 hover:ring-black ${p.stock === 0 ? 'bg-black text-white' : 'bg-[#F5F5F5] text-[#555555]'}`}>{p.stock} ✎</button>
      {p.reorderStatus === 'pending' ? (
        <button onClick={() => onReorder?.(p)} title="Reorder pending — tap to mark received" className="shrink-0 rounded-sm bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-medium text-[#555555] transition hover:ring-1 hover:ring-black">Reorder pending</button>
      ) : (
        <button onClick={() => onReorder?.(p)} title="Reorder" className="shrink-0 rounded-sm bg-black px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-[#1a1a1a]">Reorder</button>
      )}
    </div>
  );
}

/* ── PIPELINE STRIP ──────────────────────────────────────────────────────── */
function PipelineStrip({ stats }) {
  const items = [
    { label: 'Pending', n: stats.pending, fill: '#000000', to: '/admin/orders?group=new' },
    { label: 'Confirmed', n: stats.confirmed, fill: '#333333', to: '/admin/orders?status=Confirmed&group=all' },
    { label: 'Processing', n: stats.processing, fill: '#555555', to: '/admin/orders?group=processing' },
    { label: 'Ready', n: stats.readyToShip, fill: '#777777', to: '/admin/orders?group=to-ship' },
    { label: 'In Transit', n: stats.shipped, fill: '#999999', to: '/admin/orders?group=shipped' },
    { label: 'Delivered', n: stats.delivered, fill: '#BBBBBB', to: '/admin/orders?group=delivered' },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Order Pipeline</p>
          <p className="mt-1 text-[12px] text-[#AAAAAA]">Where every order is right now</p>
        </div>
        <Link to="/admin/orders" className="text-[12px] font-medium text-[#777777] transition hover:text-black">Manage all →</Link>
      </div>
      <div className="mt-5 grid h-2 grid-cols-6 gap-1">
        {items.map((it) => (
          <div key={it.label} className="group relative">
            <div
              className="h-full w-full rounded-sm transition-colors"
              style={{ backgroundColor: it.n > 0 ? it.fill : '#F0F0F0' }}
              role="img"
              aria-label={`${it.label}: ${it.n} order${it.n === 1 ? '' : 's'}`}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[#EAEAEA] bg-white px-2.5 py-1 text-[11px] font-medium text-black opacity-0 transition-opacity duration-150 group-hover:opacity-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              {it.label}: {it.n}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="group flex items-center gap-2.5 rounded-md p-2.5 transition hover:bg-[#FAFAFA]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.n > 0 ? it.fill : '#E5E5E5' }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] text-[#999999]">{it.label}</p>
              <p className={`text-[14px] font-semibold ${it.n > 0 ? 'text-black' : 'text-[#AAAAAA]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{it.n}</p>
            </div>
          </Link>
        ))}
      </div>
      {stats.pending > 0 && (
        <Link to="/admin/orders?group=new" className="mt-4 flex items-center justify-between gap-3 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3 transition hover:border-[#DCDCDC] hover:bg-white">
          <span className="min-w-0 text-[13px] font-medium text-[#555555]">
            <b className="text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.pending}</b> new order{stats.pending === 1 ? '' : 's'} waiting to be confirmed
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-black px-3 py-1.5 text-[12px] font-medium text-white">Review now <ChevronRight size={12} /></span>
        </Link>
      )}
    </div>
  );
}

/* ── REVENUE CHART ───────────────────────────────────────────────────────── */
function RevenueChart({ data, rangeLabel }) {
  const [mode, setMode] = useState('revenue');
  const total = data.reduce((n, d) => n + (mode === 'revenue' ? d.revenue : d.orders), 0);
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{rangeLabel || 'Selected period'}</p>
          <p className="mt-2 text-[28px] font-semibold tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{mode === 'revenue' ? pkr(total) : total.toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] p-0.5">
          {['revenue', 'orders'].map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-sm px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider transition ${mode === m ? 'bg-black text-white' : 'text-[#777777] hover:text-black'}`}>{m}</button>
          ))}
        </div>
      </div>
      <div className="h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rev-fill-v2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#000000" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#000000" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
            <XAxis dataKey="label" stroke="#AAAAAA" tick={{ fontSize: 11, fill: '#AAAAAA' }} tickLine={false} axisLine={false} />
            <YAxis stroke="#AAAAAA" tick={{ fontSize: 11, fill: '#AAAAAA' }} tickLine={false} axisLine={false} tickFormatter={(v) => mode === 'revenue' ? (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v) : v} />
            <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #EAEAEA', background: '#FFFFFF', fontSize: 12, color: '#000' }} labelStyle={{ color: '#777777' }} formatter={(v) => mode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']} />
            <Area type="monotone" dataKey={mode} stroke="#000000" strokeWidth={2} fill="url(#rev-fill-v2)" dot={{ r: 2.5, fill: '#000000', stroke: '#FFFFFF', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#000000', stroke: '#FFFFFF', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── STATUS DONUT ────────────────────────────────────────────────────────── */
const DONUT_MONO = ['#000000', '#333333', '#555555', '#777777', '#999999', '#BBBBBB', '#CCCCCC', '#DDDDDD', '#E5E5E5'];

function StatusDonut({ byStatus }) {
  const { segments, total } = buildStatusDonut(byStatus);
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Order Status Mix</p>
      {total === 0 ? <p className="py-16 text-center text-[13px] text-[#AAAAAA]">No orders yet.</p> : (
        <div className="mt-5 flex items-center gap-5">
          <div className="relative h-40 w-40 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={segments} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2} startAngle={90} endAngle={-270}>
                  {segments.map((d, i) => <Cell key={i} fill={DONUT_MONO[i % DONUT_MONO.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[24px] font-semibold leading-none text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{total}</p>
                <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[#999999]">Total</p>
              </div>
            </div>
          </div>
          <ul className="flex-1 space-y-2">
            {segments.map((d, i) => (
              <li key={d.name} className="flex items-center gap-2.5 text-[12px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: DONUT_MONO[i % DONUT_MONO.length] }} />
                <span className="flex-1 text-[#777777]">{d.name}</span>
                <span className="font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── TODAY HOURLY ────────────────────────────────────────────────────────── */
function TodayHourly({ hourly }) {
  const total = hourly.reduce((n, h) => n + h.orders, 0);
  const peak = hourly.reduce((max, h) => h.orders > max.orders ? h : max, { hour: 0, orders: 0 });
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Today's Activity</p>
          <p className="mt-1 text-[12px] text-[#AAAAAA]">{total} order{total === 1 ? '' : 's'} · peak {peak.hour.toString().padStart(2, '0')}:00</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[#F5F5F5] text-black"><Activity size={16} /></span>
      </div>
      {total === 0 ? (
        <div className="mt-5 grid h-36 place-items-center rounded-md border border-[#EAEAEA] bg-[#FAFAFA] text-center">
          <p className="text-[13px] font-medium text-[#AAAAAA]">No orders yet today</p>
        </div>
      ) : (
        <div className="mt-5 h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#AAAAAA' }} stroke="#E5E5E5" tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: '#AAAAAA' }} stroke="#E5E5E5" tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #EAEAEA', background: '#FFFFFF', fontSize: 12, color: '#000' }} labelStyle={{ color: '#777777' }} formatter={(v) => [v, 'Orders']} labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`} />
              <Bar dataKey="orders" radius={[3, 3, 0, 0]}>
                {hourly.map((h, i) => <Cell key={i} fill={h.orders === peak.orders && peak.orders > 0 ? '#000000' : '#DCDCDC'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── CUSTOMER AUDIENCE ───────────────────────────────────────────────────── */
function CustomerAudienceStrip({ segments }) {
  const items = [['new', 'New'], ['repeat', 'Repeat'], ['vip', 'VIP'], ['inactive', 'Inactive']];
  return (
    <section className="mb-10">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Customer Audience</p>
      <div className="grid grid-cols-2 divide-x divide-[#EAEAEA] rounded-md border border-[#EAEAEA] lg:grid-cols-4">
        {items.map(([key, label]) => (
          <Link key={key} to={`/admin/customers?segment=${key}`} className="p-5 transition-colors duration-150 hover:bg-[#FAFAFA]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{label}</p>
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{segments ? Number(segments[key] || 0).toLocaleString() : '—'}</p>
            <p className="mt-2 text-[11px] font-medium text-[#AAAAAA] transition-colors group-hover:text-[#777777]">Open segment →</p>
          </Link>
        ))}
      </div>
    </section>
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
  const [customerSegments, setCustomerSegments] = useState(null);
  const [reorder, setReorder] = useState(null);

  /* Date range */
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
      const [data, ins, al, sm, gl, audience] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token: auth.token }),
        api(`/orders/insights/dashboard?${qs}`, { token: auth.token }).catch(() => null),
        api('/dashboard/alerts', { token: auth.token }).catch(() => null),
        api('/dashboard/insights', { token: auth.token }).catch(() => null),
        api('/dashboard/goal', { token: auth.token }).catch(() => null),
        api('/customers/segments', { token: auth.token }).catch(() => null),
      ]);
      setD(data); if (ins) setInsights(ins); setAlerts(al?.alerts || []); setSmart(sm?.insights || []);
      if (gl) setGoal(gl); setCustomerSegments(audience?.segments || null); setLastSync(new Date()); setErr('');
    } catch (e) { if (e?.status === 401) { logout(); return; } setErr('Failed to load dashboard.'); }
    setRefreshing(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [auth, range]);
  useEffect(() => { if (!auth?.token) return; const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [auth, range]);

  if (err) return (
    <AdminLayout title="Dashboard">
      <div className="mx-auto grid max-w-md place-items-center rounded-lg border border-[#EAEAEA] bg-white p-10 text-center">
        <AlertTriangle size={24} className="mb-3 text-[#555555]" />
        <p className="text-[14px] font-medium text-black">{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="mt-4 rounded-md border border-[#DCDCDC] bg-white px-5 py-2 text-[13px] font-medium text-black transition hover:bg-[#F5F5F5]">Try again</button>
      </div>
    </AdminLayout>
  );

  if (!d) return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-4">
        {[1,2,3,4].map((i) => <div key={i} className="h-36 v2-skeleton" />)}
      </div>
      <div className="mt-6 h-80 v2-skeleton" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {[1,2].map((i) => <div key={i} className="h-72 v2-skeleton" />)}
      </div>
    </AdminLayout>
  );

  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; })();
  const cmpLabel = 'vs previous period';
  const rangeLabel = range.preset === 'custom'
    ? `${range.from} – ${range.to}`
    : (RANGE_PRESETS.find((p) => p.key === range.preset)?.label || 'Selected period');

  const todayTiles = [
    { label: 'Confirm now', hint: 'New / pending', n: d.stats?.pending || 0, to: '/admin/orders?group=new' },
    { label: 'Pack & ship', hint: 'Ready to leave', n: d.stats?.readyToShip || 0, to: '/admin/orders?group=to-ship' },
    { label: 'On the road', hint: 'In transit', n: d.stats?.shipped || 0, to: '/admin/orders?group=shipped' },
    { label: 'Restock', hint: '≤ 10 units', n: (d.lowStock || []).length, to: '/admin/products' },
  ];

  return (
    <AdminLayout title="Dashboard">
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#AAAAAA]">Hushae · Performance</p>
            <h1 className="mt-3 text-[28px] font-semibold tracking-tight text-black">
              {greeting}, {auth?.user?.name?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="mt-1.5 text-[13px] text-[#999999]">A concise overview of your store performance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#999999]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-black" />
              Live{lastSync ? ` · ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
            <span className="hidden items-center gap-1.5 text-[11px] text-[#AAAAAA] sm:inline-flex">
              <Calendar size={12} /> {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <RangePicker value={range} onChange={applyRange} />
            <button onClick={() => load()} disabled={refreshing} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#EAEAEA] bg-white px-3.5 text-[12px] font-medium text-[#555555] transition-all hover:border-[#DCDCDC] hover:bg-[#FAFAFA] hover:text-black disabled:opacity-40">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => exportDashboardSummary({ d, goal, alerts, insights: smart, storeName: 'HUSHAE', compareLabel: cmpLabel })} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#EAEAEA] bg-white px-3.5 text-[12px] font-medium text-[#555555] transition-all hover:border-[#DCDCDC] hover:bg-[#FAFAFA] hover:text-black">
              <Download size={13} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* ── 01 · PRIMARY METRICS ──────────────────────────────────────── */}
      <section className="mb-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">01 — Primary Signal</p>
        <div className="grid grid-cols-2 rounded-md border border-[#EAEAEA] lg:grid-cols-4">
          <MetricRow icon={CircleDollarSign} label="Revenue" value={d.kpis.revenue.value} change={d.kpis.revenue.change} format="money" to="/admin/analytics" compareLabel={cmpLabel} />
          <MetricRow icon={ShoppingBag} label="Orders" value={d.kpis.orders.value} change={d.kpis.orders.change} to="/admin/orders" compareLabel={cmpLabel} />
          <MetricRow icon={Users} label="New Customers" value={d.kpis.customers.value} change={d.kpis.customers.change} to="/admin/customers" compareLabel="in the selected period" />
          <MetricRow icon={TrendingUp} label="Avg Order Value" value={d.kpis.aov.value} change={d.kpis.aov.change} format="money" to="/admin/analytics" compareLabel={cmpLabel} />
        </div>
      </section>

      <CustomerAudienceStrip segments={customerSegments} />

      {/* ── 02 · PERFORMANCE ──────────────────────────────────────────── */}
      <section className="mb-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">02 — Performance</p>
        <div className="grid overflow-hidden rounded-md border border-[#EAEAEA] lg:grid-cols-3">
          <div className="p-6 lg:col-span-2 lg:border-r lg:border-[#EAEAEA]">
            <ChartBoundary><RevenueChart data={d.chart} rangeLabel={rangeLabel} /></ChartBoundary>
          </div>
          <div className="border-t border-[#EAEAEA] p-6 lg:border-t-0">
            <ChartBoundary><StatusDonut byStatus={d.byStatus} /></ChartBoundary>
          </div>
        </div>
      </section>

      {/* ── 03 · COMMERCE ACTIVITY ────────────────────────────────────── */}
      <section className="mb-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">03 — Commerce Activity</p>
        <div className="grid overflow-hidden rounded-md border border-[#EAEAEA] lg:grid-cols-3">
          {/* Recent Orders */}
          <div className="lg:col-span-2 lg:border-r lg:border-[#EAEAEA]">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Recent Orders</p>
              <Link to="/admin/orders" className="text-[11px] font-medium text-[#777777] transition-colors hover:text-black">View all →</Link>
            </div>
            <div className="divide-y divide-[#F0F0F0]">
              {d.recentOrders.map((o) => (
                <div key={o._id} className="flex items-center gap-4 px-6 py-4 transition-colors duration-150 hover:bg-[#FAFAFA]">
                  <Link to={`/admin/orders/${o._id}`} className="flex min-w-0 flex-1 items-center gap-4">
                    <Img src={o.items?.[0]?.image} alt="" className="h-12 w-10 shrink-0 rounded-md border border-[#EAEAEA] object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <p className="text-[13px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.orderNumber}</p>
                        <span className={statusPill(o.status)}>{o.status}</span>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-[#999999]">{o.customerInfo?.name} · {o.customerInfo?.city} · {fmtDate(o.createdAt)}</p>
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-3">
                    {o.status === 'Pending' && waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '') && (
                      <a href={waVerifyLink(o, settings?.contactPhone || settings?.integrations?.whatsapp?.number || '')} target="_blank" rel="noreferrer" aria-label={`Verify ${o.orderNumber} via WhatsApp`} title="Verify via WhatsApp" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-[#999999] transition-colors hover:bg-[#F5F5F5] hover:text-black">
                        <MessageCircle size={14} />
                      </a>
                    )}
                    <div className="text-right">
                      <p className="text-[15px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(o.total)}</p>
                      <p className="text-[11px] text-[#AAAAAA]">{o.paymentMethod}</p>
                    </div>
                  </div>
                </div>
              ))}
              {d.recentOrders.length === 0 && (
                <p className="px-6 py-12 text-center text-[13px] text-[#AAAAAA]">No orders in this period.</p>
              )}
            </div>
          </div>

          {/* Best Sellers */}
          <div className="border-t border-[#EAEAEA] lg:border-t-0">
            <div className="border-b border-[#EAEAEA] px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Best Sellers</p>
            </div>
            <div className="p-6">
              {d.bestSellers.length === 0 ? (
                <p className="py-8 text-center text-[13px] text-[#AAAAAA]">Sales data will appear here.</p>
              ) : (
                <ol className="space-y-4">
                  {d.bestSellers.map((b, i) => (
                    <li key={b.name} className="flex items-baseline gap-4">
                      <span className="w-6 text-[18px] font-semibold text-[#DCDCDC]" style={{ fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-black">{b.name}</p>
                        <p className="mt-0.5 text-[12px] text-[#999999]">{b.qty} sold · {pkr(b.revenue)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 04 · PRODUCT & INVENTORY ──────────────────────────────────── */}
      <section className="mb-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">04 — Product & Inventory</p>
        <div className="grid overflow-hidden rounded-md border border-[#EAEAEA] lg:grid-cols-2">
          {/* Low Stock */}
          <div className="lg:border-r lg:border-[#EAEAEA]">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Low Stock · ≤ 10</p>
              <Link to="/admin/products" className="text-[11px] font-medium text-[#777777] transition-colors hover:text-black">Manage</Link>
            </div>
            <div className="p-6">
              {d.lowStock.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-[#AAAAAA]">All stocked up.</p>
              ) : (
                <div className="space-y-2">{d.lowStock.slice(0, 5).map((p) => <StockRow key={p._id} product={p} onSaved={() => load(true)} onReorder={setReorder} />)}</div>
              )}
            </div>
          </div>

          {/* Top Customers */}
          <div className="border-t border-[#EAEAEA] lg:border-t-0">
            <div className="flex items-center justify-between border-b border-[#EAEAEA] px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Top Customers</p>
              <Link to="/admin/customers" className="text-[11px] font-medium text-[#777777] transition-colors hover:text-black">All</Link>
            </div>
            <div className="p-6">
              {d.topCustomers.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-[#AAAAAA]">No customer data yet.</p>
              ) : (
                <ol className="space-y-4">
                  {d.topCustomers.map((c, i) => (
                    <li key={c.phone + i} className="flex items-center gap-3">
                      <span className="w-6 text-[16px] font-semibold text-[#DCDCDC]" style={{ fontVariantNumeric: 'tabular-nums' }}>{String(i + 1).padStart(2, '0')}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-medium text-black">{c.name}</p>
                          <ReliabilityBadge reliability={c.reliability} compact />
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[#999999]">{c.city} · {c.orders} order{c.orders === 1 ? '' : 's'}</p>
                      </div>
                      <p className="text-[14px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(c.spent)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 05 · OPERATIONS ───────────────────────────────────────────── */}
      <section className="mb-6">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">05 — Operations</p>
        <AlertsBar alerts={alerts} />

        {/* Attention counts */}
        <div className="mt-4 grid grid-cols-2 divide-x divide-[#EAEAEA] overflow-hidden rounded-md border border-[#EAEAEA] lg:grid-cols-4">
          {todayTiles.map((t) => (
            <Link key={t.label} to={t.to} className="group p-5 transition-colors duration-150 hover:bg-[#FAFAFA]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#AAAAAA]">{t.label}</p>
              <p className="mt-3 text-[26px] font-semibold leading-none tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{t.n}</p>
              <p className="mt-1.5 text-[11px] uppercase tracking-wider text-[#DCDCDC] transition-colors group-hover:text-[#AAAAAA]">{t.hint}</p>
            </Link>
          ))}
        </div>

        {/* Quick Actions + Pipeline + Goals */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-md border border-[#EAEAEA] bg-white p-6">
            <QuickActions />
          </div>
          <div className="rounded-md border border-[#EAEAEA] bg-white p-6 lg:col-span-2">
            <PipelineStrip stats={d.stats} />
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-[#EAEAEA] bg-white p-6">
            <GoalTracker goal={goal} onSaved={() => load(true)} />
          </div>
          <div className="rounded-md border border-[#EAEAEA] bg-white p-6">
            <InsightsCard insights={smart} />
          </div>
        </div>

        {/* P&L */}
        {d.kpis.profit && (d.kpis.profit.value !== 0 || d.kpis.cost.value !== 0) && (
          <div className="mt-6 rounded-md border border-[#EAEAEA] bg-white p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Profit & Loss</p>
                <p className="mt-1 text-[12px] text-[#AAAAAA]">{rangeLabel} · based on cost prices</p>
              </div>
              <Link to="/admin/products" className="text-[11px] font-medium text-[#777777] transition-colors hover:text-black">Manage costs →</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ProfitTile label="Gross Profit" value={d.kpis.profit.value} change={d.kpis.profit.change} format="money" icon={TrendingUp} />
              <ProfitTile label="Cost of Goods" value={d.kpis.cost.value} format="money" icon={Package} hint="What you paid for products sold" />
              <ProfitTile label="Profit Margin" value={d.kpis.margin.value} format="percent" icon={CircleDollarSign} hint="Profit as % of revenue" />
            </div>
            {d.kpis.cost.value === 0 && (
              <div className="mt-5 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] p-4 text-[13px] text-[#555555]">
                💡 Set <b className="text-black">Cost / Wholesale price</b> on each product for accurate profit tracking.
              </div>
            )}
          </div>
        )}

        {/* Insights */}
        {insights && (
          <div className="mt-6 grid overflow-hidden rounded-md border border-[#EAEAEA] lg:grid-cols-2">
            <div className="p-6 lg:border-r lg:border-[#EAEAEA]">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Payment Health</p>
              <div className="flex flex-wrap gap-2">
                {PAYMENT_STATES.map((p) => { const n = insights.paymentBreakdown?.[p.key] || 0; if (!n) return null; return <span key={p.key} className="rounded-sm bg-[#F5F5F5] px-2.5 py-1 text-[11px] font-medium text-[#555555]">{p.label} · <span className="font-semibold text-black">{n}</span></span>; })}
                {!Object.values(insights.paymentBreakdown || {}).some((n) => Number(n) > 0) && <span className="text-[13px] text-[#AAAAAA]">No orders in this period</span>}
              </div>
              <div className="mt-5 space-y-2.5 border-t border-[#EAEAEA] pt-4 text-[13px]">
                <p className="flex justify-between"><span className="text-[#999999]">Verification rate</span><span className="font-semibold text-black">{insights.kpis.paymentVerifiedRate}%</span></p>
                <p className="flex justify-between"><span className="text-[#999999]">Avg time to ship</span><span className="font-semibold text-black">{insights.avgShipHours ? (insights.avgShipHours < 1 ? `${Math.round(insights.avgShipHours * 60)}m` : `${insights.avgShipHours}h`) : '—'}</span></p>
                <p className="flex justify-between"><span className="text-[#999999]">Issue rate</span><span className={`font-semibold ${insights.kpis.issueRate > 5 ? 'text-black' : 'text-[#555555]'}`}>{insights.kpis.issueRate}%</span></p>
              </div>
            </div>
            <div className="border-t border-[#EAEAEA] p-6 lg:border-t-0">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Peak Order Hours</p>
              {!insights.hourly?.some((h) => h.orders > 0) ? (
                <div className="grid h-[160px] place-items-center rounded-md border border-[#EAEAEA] bg-[#FAFAFA] text-center">
                  <p className="text-[13px] text-[#AAAAAA]">No orders in this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={insights.hourly} margin={{ top: 12, right: 4, left: -22, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                    <XAxis dataKey="hour" tickFormatter={(h) => `${h}h`} tick={{ fontSize: 10, fill: '#AAAAAA' }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fontSize: 10, fill: '#AAAAAA' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip labelFormatter={(h) => `${h}:00 – ${h}:59`} contentStyle={{ borderRadius: 6, border: '1px solid #EAEAEA', background: '#FFFFFF', fontSize: 12, color: '#000' }} labelStyle={{ color: '#777777' }} />
                    <Bar dataKey="orders" fill="#DCDCDC" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Cancellation + Abandoned */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-[#EAEAEA] bg-white p-6">
            <CancellationReasons reasons={d.cancellationReasons || []} />
          </div>
          <div className="rounded-md border border-[#EAEAEA] bg-white p-6">
            <AbandonedCartsWidget />
          </div>
        </div>

        {/* Today hourly */}
        <div className="mt-6 rounded-md border border-[#EAEAEA] bg-white p-6">
          <ChartBoundary><TodayHourly hourly={d.hourly} /></ChartBoundary>
        </div>
      </section>

      {reorder && <ReorderModal product={reorder} onClose={() => setReorder(null)} onSaved={() => load(true)} />}
    </AdminLayout>
  );
}
