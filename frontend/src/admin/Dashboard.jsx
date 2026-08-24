import { Component, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BadgePercent, Box,
  Calendar, ChevronRight, CircleDollarSign, Clock, Download, Megaphone,
  MessageCircle, Package, PackagePlus, RefreshCw, ShoppingBag, Sparkles,
  TrendingUp, Truck, Users, Zap, Eye, ArrowRight,
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
 * DASHBOARD V3 — Phase 11 Executive Operating Screen
 *
 * Every block answers: "What happened?" or "What needs my attention?"
 * ========================================================================== */

/* Error boundary preserved */
class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="v3-empty" style={{ minHeight: 160 }}>
          <p className="v3-empty-title">Chart unavailable</p>
          <button onClick={() => this.setState({ failed: false })} className="v3-btn v3-btn-secondary v3-btn-sm mt-2">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* WhatsApp helpers preserved */
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
  const msg = `Hi ${name || 'there'}, this is Hushae. Confirming your order ${o.orderNumber} for PKR ${total}. Please reply YES to confirm.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
};

/* ── METRIC COMPONENT ───────────────────────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, change, format = 'number', to, compareLabel = 'vs previous' }) {
  const hasRate = typeof change === 'number' && Number.isFinite(change);
  const positive = hasRate && change > 0;
  const negative = hasRate && change < 0;
  const display = format === 'money' ? pkr(value) : typeof value === 'number' ? value.toLocaleString() : value;
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="v3-metric" style={{ textDecoration: 'none' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="v3-metric-label">{label}</span>
        {Icon && <Icon size={14} strokeWidth={1.5} className="text-[#C4C7CC]" />}
      </div>
      <div className="v3-metric-value">{display}</div>
      {hasRate && change !== 0 && (
        <div className={`v3-metric-change ${positive ? 'up' : negative ? 'down' : 'neutral'}`}>
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {Math.abs(change).toFixed(1)}%
          <span className="text-[#C4C7CC] ml-1">{compareLabel}</span>
        </div>
      )}
    </Wrapper>
  );
}

/* ── NEEDS ATTENTION BLOCK ──────────────────────────────────────────────── */
function NeedsAttention({ stats, lowStockCount }) {
  const items = [
    { label: 'Pending Payment', count: stats?.pending || 0, to: '/admin/verification-queue', icon: Clock },
    { label: 'Ready to Ship', count: stats?.readyToShip || 0, to: '/admin/orders?group=to-ship', icon: Truck },
    { label: 'In Production', count: stats?.processing || 0, to: '/admin/orders?group=processing', icon: Package },
    { label: 'Low Stock', count: lowStockCount || 0, to: '/admin/products', icon: AlertTriangle },
  ].filter(i => i.count > 0);

  if (items.length === 0) return null;

  return (
    <div className="v3-card">
      <div className="v3-card-header">
        <span className="v3-h-section">Needs Attention</span>
        <span className="v3-status v3-status-pending">
          <span className="v3-status-dot" />
          {items.reduce((s, i) => s + i.count, 0)} items
        </span>
      </div>
      <div className="divide-y divide-[#F0F1F3]">
        {items.map(item => (
          <Link key={item.label} to={item.to} className="flex items-center justify-between px-5 py-3 hover:bg-[#F5F6F8] transition-colors" style={{ textDecoration: 'none' }}>
            <div className="flex items-center gap-3">
              <item.icon size={16} className="text-[#6B7280]" />
              <span className="text-[13px] text-[#111]">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="v3-h-card v3-tabular">{item.count}</span>
              <ChevronRight size={14} className="text-[#C4C7CC]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── RECENT ORDERS ──────────────────────────────────────────────────────── */
function RecentOrders({ orders, settings }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="v3-card">
        <div className="v3-card-header">
          <span className="v3-h-section">Recent Orders</span>
        </div>
        <div className="v3-empty">
          <ShoppingBag size={24} className="v3-empty-icon" />
          <p className="v3-empty-title">No orders yet</p>
          <p className="v3-empty-desc">Orders will appear here when customers purchase from your store.</p>
        </div>
      </div>
    );
  }

  const statusStyle = (s) => {
    if (s === 'Delivered') return 'v3-status v3-status-active';
    if (s === 'Cancelled' || s === 'Refunded') return 'v3-status v3-status-inactive';
    if (s === 'Shipped' || s === 'Out for Delivery') return 'v3-status v3-status-active';
    return 'v3-status v3-status-pending';
  };

  return (
    <div className="v3-card">
      <div className="v3-card-header">
        <span className="v3-h-section">Recent Orders</span>
        <Link to="/admin/orders" className="v3-btn v3-btn-ghost v3-btn-sm">View all <ArrowRight size={12} /></Link>
      </div>
      <div className="v3-table-wrap">
        <table className="v3-table dense">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Payment</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.slice(0, 8).map(o => (
              <tr key={o._id}>
                <td>
                  <Link to={`/admin/orders/${o._id}`} className="text-[#111] font-medium hover:underline" style={{ textDecoration: 'none' }}>
                    {o.orderNumber}
                  </Link>
                  <div className="text-[11px] text-[#9CA3AF] mt-0.5">{fmtDate(o.createdAt)}</div>
                </td>
                <td>
                  <div className="text-[13px]">{o.customerInfo?.name || 'Guest'}</div>
                  <div className="text-[11px] text-[#9CA3AF]">{o.customerInfo?.city || ''}</div>
                </td>
                <td><span className={statusStyle(o.status)}><span className="v3-status-dot" />{o.status}</span></td>
                <td><span className="text-[12px] text-[#6B7280]">{o.paymentMethod}</span></td>
                <td className="right tabular font-medium">{pkr(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── QUICK ACTIONS ──────────────────────────────────────────────────────── */
function QuickActions() {
  const actions = [
    { to: '/admin/products/new', icon: PackagePlus, label: 'Add Product', primary: true },
    { to: '/admin/orders/new', icon: ShoppingBag, label: 'Create Order' },
    { to: '/admin/promotions/new', icon: Zap, label: 'New Promotion' },
    { to: '/admin/discounts', icon: BadgePercent, label: 'New Discount' },
  ];
  return (
    <div className="v3-card">
      <div className="v3-card-header">
        <span className="v3-h-section">Quick Actions</span>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {actions.map(a => (
          <Link key={a.label} to={a.to}
            className={`flex items-center gap-2.5 rounded-[5px] px-3 py-2.5 text-[12px] font-medium transition-colors ${a.primary ? 'bg-[#111] text-white hover:bg-[#222]' : 'border border-[#E5E7EB] text-[#4A4A4A] hover:bg-[#F5F6F8] hover:text-[#111]'}`}
            style={{ textDecoration: 'none' }}>
            <a.icon size={15} />
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── STOCK ROW ──────────────────────────────────────────────────────────── */
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
    <div className="flex items-center gap-2 p-2 rounded-[5px] bg-[#F5F6F8]">
      <input type="number" min="0" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} className="v3-input" style={{ width: 80 }} />
      <button onClick={save} disabled={busy} className="v3-btn v3-btn-primary v3-btn-sm">Save</button>
      <button onClick={() => setEditing(false)} className="v3-btn v3-btn-ghost v3-btn-sm">Cancel</button>
    </div>
  );
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-[5px] hover:bg-[#F5F6F8] transition-colors">
      <Link to={`/admin/products/${p._id}`} className="flex items-center gap-2.5 min-w-0 flex-1" style={{ textDecoration: 'none' }}>
        <Img src={p.images?.[0]?.url} alt="" className="h-8 w-6 rounded-[3px] border border-[#E5E7EB] object-cover" />
        <span className="text-[12px] text-[#111] truncate">{p.name}</span>
      </Link>
      <button onClick={() => { setValue(String(p.stock)); setEditing(true); }} className={`v3-btn v3-btn-sm ${p.stock === 0 ? 'v3-btn-primary' : 'v3-btn-secondary'}`}>{p.stock} ✎</button>
    </div>
  );
}

/* ── REVENUE CHART ──────────────────────────────────────────────────────── */
function RevenueChart({ data, rangeLabel }) {
  const [mode, setMode] = useState('revenue');
  const total = data.reduce((n, d) => n + (mode === 'revenue' ? d.revenue : d.orders), 0);
  return (
    <div className="v3-card">
      <div className="v3-card-header">
        <div>
          <span className="v3-h-section">{mode === 'revenue' ? 'Revenue' : 'Orders'}</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="v3-h-display v3-tabular">{mode === 'revenue' ? pkr(total) : total.toLocaleString()}</span>
            <span className="text-[11px] text-[#9CA3AF]">{rangeLabel}</span>
          </div>
        </div>
        <div className="flex gap-1">
          {['revenue', 'orders'].map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-[3px] transition-colors ${mode === m ? 'bg-[#111] text-white' : 'text-[#6B7280] hover:bg-[#F0F1F3]'}`}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="v3-rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#111" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#111" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" vertical={false} />
              <XAxis dataKey="label" stroke="#C4C7CC" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
              <YAxis stroke="#C4C7CC" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => mode === 'revenue' ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : v} />
              <Tooltip contentStyle={{ borderRadius: 5, border: '1px solid #E5E7EB', background: '#FFF', fontSize: 12, color: '#111', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} labelStyle={{ color: '#6B7280' }} formatter={(v) => mode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']} />
              <Area type="monotone" dataKey={mode} stroke="#111" strokeWidth={2} fill="url(#v3-rev-grad)" dot={{ r: 2, fill: '#111', stroke: '#FFF', strokeWidth: 2 }} activeDot={{ r: 4, fill: '#111', stroke: '#FFF', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ── PROFIT TILE ────────────────────────────────────────────────────────── */
function ProfitTile({ icon: Icon, label, value, change, format = 'money', hint }) {
  const display = format === 'money' ? pkr(value) : format === 'percent' ? `${value}%` : value.toLocaleString();
  return (
    <div className="v3-card-flat">
      <div className="flex items-center justify-between">
        <Icon size={14} className="text-[#C4C7CC]" />
        {typeof change === 'number' && change !== 0 && (
          <span className={`text-[11px] font-medium ${change > 0 ? 'text-[#111]' : 'text-[#9CA3AF]'}`}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-2 v3-metric-label">{label}</div>
      <div className="text-[16px] font-semibold text-[#111] v3-tabular">{display}</div>
      {hint && <div className="text-[11px] text-[#9CA3AF] mt-1">{hint}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * MAIN DASHBOARD
 * ══════════════════════════════════════════════════════════════════════════ */

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

  const [range, setRange] = useState(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const fromQ = sp.get('from'); const toQ = sp.get('to');
      if (fromQ && toQ) return { preset: 'custom', from: fromQ, to: toQ };
      const saved = JSON.parse(localStorage.getItem('hushae.dashRange') || 'null');
      if (saved?.preset && saved.preset !== 'custom') { const r = resolvePreset(saved.preset); if (r) return { preset: saved.preset, from: r.from, to: r.to }; }
      if (saved?.preset === 'custom' && saved.from && saved.to) return saved;
    } catch {}
    const r = resolvePreset('30d');
    return { preset: '30d', from: r.from, to: r.to };
  });

  const applyRange = (r) => {
    setRange(r);
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(r)); } catch {}
    const sp = new URLSearchParams(window.location.search);
    if (r.preset === 'custom') { sp.set('from', r.from); sp.set('to', r.to); } else { sp.delete('from'); sp.delete('to'); }
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

  useEffect(() => { load(); }, [auth, range]); // eslint-disable-line
  useEffect(() => { if (!auth?.token) return; const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [auth, range]);

  if (err) return (
    <AdminLayout title="Dashboard">
      <div className="v3-empty" style={{ minHeight: 300 }}>
        <AlertTriangle size={28} className="v3-empty-icon" />
        <p className="v3-empty-title">{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="v3-btn v3-btn-secondary mt-3">Try again</button>
      </div>
    </AdminLayout>
  );

  if (!d) return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-4 gap-4 mb-6">{[1,2,3,4].map(i => <div key={i} className="h-24 v3-skeleton" />)}</div>
      <div className="h-64 v3-skeleton mb-6" />
      <div className="grid grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-48 v3-skeleton" />)}</div>
    </AdminLayout>
  );

  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; })();
  const cmpLabel = 'vs previous';
  const rangeLabel = range.preset === 'custom' ? `${range.from} – ${range.to}` : (RANGE_PRESETS.find(p => p.key === range.preset)?.label || 'Selected period');

  return (
    <AdminLayout title="Dashboard">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link>
            <span>/</span>
            <span>Dashboard</span>
          </div>
          <h1 className="v3-h-page">{greeting}, {auth?.user?.name?.split(' ')[0] || 'Admin'}</h1>
          <p className="v3-h-small mt-1">Here's what's happening with your store.</p>
        </div>
        <div className="v3-page-header-right">
          <span className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider uppercase text-[#9CA3AF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#111] animate-pulse" />
            Live
          </span>
          <RangePicker value={range} onChange={applyRange} />
          <button onClick={() => load()} disabled={refreshing} className="v3-btn v3-btn-secondary v3-btn-sm">
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={() => exportDashboardSummary({ d, goal, alerts, insights: smart, storeName: 'HUSHAE', compareLabel: cmpLabel })} className="v3-btn v3-btn-secondary v3-btn-sm">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* ── BUSINESS SNAPSHOT ───────────────────────────────────────────── */}
      <div className="v3-card mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#F0F1F3]">
          <MetricCard icon={CircleDollarSign} label="Revenue" value={d.kpis.revenue.value} change={d.kpis.revenue.change} format="money" to="/admin/finance" compareLabel={cmpLabel} />
          <MetricCard icon={ShoppingBag} label="Orders" value={d.kpis.orders.value} change={d.kpis.orders.change} to="/admin/orders" compareLabel={cmpLabel} />
          <MetricCard icon={Users} label="New Customers" value={d.kpis.customers.value} change={d.kpis.customers.change} to="/admin/customers" />
          <MetricCard icon={TrendingUp} label="Avg Order Value" value={d.kpis.aov.value} change={d.kpis.aov.change} format="money" to="/admin/analytics" compareLabel={cmpLabel} />
        </div>
      </div>

      {/* ── NEEDS ATTENTION + QUICK ACTIONS ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3 mb-6">
        <div className="lg:col-span-2">
          <NeedsAttention stats={d.stats} lowStockCount={(d.lowStock || []).length} />
        </div>
        <QuickActions />
      </div>

      {/* ── ALERTS ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <AlertsBar alerts={alerts} />
      </div>

      {/* ── SALES CHART ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <ChartBoundary><RevenueChart data={d.chart} rangeLabel={rangeLabel} /></ChartBoundary>
      </div>

      {/* ── RECENT ORDERS ───────────────────────────────────────────────── */}
      <div className="mb-6">
        <RecentOrders orders={d.recentOrders} settings={settings} />
      </div>

      {/* ── INVENTORY + BEST SELLERS ────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="v3-card">
          <div className="v3-card-header">
            <span className="v3-h-section">Low Stock</span>
            <Link to="/admin/products" className="v3-btn v3-btn-ghost v3-btn-sm">Manage <ArrowRight size={12} /></Link>
          </div>
          <div className="p-4">
            {(d.lowStock || []).length === 0 ? (
              <div className="v3-empty" style={{ padding: '24px 0' }}>
                <p className="text-[12px] text-[#9CA3AF]">All products are well stocked.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {(d.lowStock || []).slice(0, 5).map(p => <StockRow key={p._id} product={p} onSaved={() => load(true)} onReorder={setReorder} />)}
              </div>
            )}
          </div>
        </div>

        <div className="v3-card">
          <div className="v3-card-header">
            <span className="v3-h-section">Best Sellers</span>
          </div>
          <div className="p-4">
            {(d.bestSellers || []).length === 0 ? (
              <div className="v3-empty" style={{ padding: '24px 0' }}>
                <p className="text-[12px] text-[#9CA3AF]">Sales data will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(d.bestSellers || []).slice(0, 5).map((b, i) => (
                  <div key={b.name} className="flex items-center gap-3">
                    <span className="text-[14px] font-bold text-[#C4C7CC] w-5 v3-tabular">{String(i + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-[#111] truncate">{b.name}</div>
                      <div className="text-[11px] text-[#9CA3AF]">{b.qty} sold · {pkr(b.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── INSIGHTS + GOALS ────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <div className="v3-card">
          <div className="p-5">
            <InsightsCard insights={smart} />
          </div>
        </div>
        <div className="v3-card">
          <div className="p-5">
            <GoalTracker goal={goal} onSaved={() => load(true)} />
          </div>
        </div>
      </div>

      {/* ── PROFIT & LOSS ───────────────────────────────────────────────── */}
      {d.kpis.profit && (d.kpis.profit.value !== 0 || d.kpis.cost.value !== 0) && (
        <div className="v3-card mb-6">
          <div className="v3-card-header">
            <div>
              <span className="v3-h-section">Profit & Loss</span>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">{rangeLabel} · Estimated from cost data</p>
            </div>
            <Link to="/admin/finance" className="v3-btn v3-btn-ghost v3-btn-sm">Full P&L <ArrowRight size={12} /></Link>
          </div>
          <div className="p-5 grid gap-3 sm:grid-cols-3">
            <ProfitTile label="Gross Profit" value={d.kpis.profit.value} change={d.kpis.profit.change} format="money" icon={TrendingUp} />
            <ProfitTile label="Cost of Goods" value={d.kpis.cost.value} format="money" icon={Package} hint="Product costs for sold items" />
            <ProfitTile label="Profit Margin" value={d.kpis.margin.value} format="percent" icon={CircleDollarSign} hint="Profit as % of revenue" />
          </div>
        </div>
      )}

      {reorder && <ReorderModal product={reorder} onClose={() => setReorder(null)} onSaved={() => load(true)} />}
    </AdminLayout>
  );
}
