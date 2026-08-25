import { Component, useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight, ArrowUpRight, Calendar, ChevronRight, CircleDollarSign,
  Clock, Download, Eye, Loader2, Package, PackagePlus, Plus, RefreshCw,
  Search, ShoppingBag, TrendingUp, Truck, Users, AlertTriangle, BarChart3,
  Activity, Zap, BadgePercent, FileText, ArrowRight, X, ExternalLink,
  Bell, Globe, Settings, Command, Moon, Sun, PanelLeftClose, PanelRightOpen,
  Menu, MessageCircle, Printer, MoreHorizontal,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, fmtDateTime, pkr } from '../lib/format';
import { buildStatusDonut } from '../lib/statusDonut';
import Img from '../components/Img';

/* ============================================================================
 * HUSHAE DASHBOARD V4 — Master Replacement
 * Premium white + jet-black executive commerce dashboard
 * 10 sections: Topbar → Intro → KPIs → Performance → Live+Mix → Attention →
 *              Operations → Intelligence → Quick Actions → Insights
 * ========================================================================== */

/* ── Error Boundary ─────────────────────────────────────────────────────── */
class ChartErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: false }; }
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (this.state.err) return (
      <div className="flex items-center justify-center h-40 text-[12px] text-[#8A8F98]">
        Chart unavailable — <button onClick={() => this.setState({ err: false })} className="ml-1 underline">retry</button>
      </div>
    );
    return this.props.children;
  }
}

/* ── Date Range Presets ─────────────────────────────────────────────────── */
const RANGE_PRESETS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: 'this_month', label: 'This month' },
  { key: 'this_year', label: 'This year' },
  { key: 'all', label: 'All time', days: 0 },
];

function resolvePreset(key) {
  const now = new Date();
  const p = RANGE_PRESETS.find(r => r.key === key);
  if (!p) return resolvePreset('30d');
  if (key === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
  if (key === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
  if (key === 'this_year') {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
  }
  if (key === 'all') return { from: '2020-01-01', to: now.toISOString().slice(0, 10) };
  const from = new Date(now.getTime() - p.days * 86400000);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

/* ── WhatsApp helper ────────────────────────────────────────────────────── */
const waDigits = (p) => { const d = String(p || '').replace(/\D/g, ''); if (!d) return ''; if (d.startsWith('0')) return `92${d.slice(1)}`; if (d.startsWith('92')) return d; return `92${d}`; };

/* ── Metric Card ────────────────────────────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, change, format = 'number', to, hint }) {
  const hasRate = typeof change === 'number' && Number.isFinite(change);
  const positive = hasRate && change > 0;
  const negative = hasRate && change < 0;
  const display = format === 'money' ? pkr(value) : format === 'percent' ? `${value}%` : typeof value === 'number' ? value.toLocaleString() : value;
  const Wrapper = to ? Link : 'div';
  return (
    <Wrapper to={to} className="block p-4 border border-[#E5E7EB] rounded-[6px] hover:border-[#D1D5DB] transition-colors group" style={{ textDecoration: 'none' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A8F98]">{label}</span>
        {Icon && <Icon size={14} strokeWidth={1.5} className="text-[#C4C7CC] group-hover:text-[#8A8F98] transition-colors" />}
      </div>
      <div className="text-[22px] font-bold text-[#111] tabular leading-none">{display}</div>
      {hasRate && change !== 0 && (
        <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${positive ? 'text-[#15803D]' : negative ? 'text-[#B91C1C]' : 'text-[#8A8F98]'}`}>
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {Math.abs(change).toFixed(1)}%
          <span className="text-[#8A8F98] font-normal ml-0.5">vs prev</span>
        </div>
      )}
      {hint && !hasRate && <div className="text-[11px] text-[#8A8F98] mt-1.5">{hint}</div>}
    </Wrapper>
  );
}

/* ── Attention Item ─────────────────────────────────────────────────────── */
function AttentionItem({ icon: Icon, label, count, to, variant = 'default' }) {
  const colors = {
    warning: 'text-[#A16207] bg-[#FEF9C3]',
    danger: 'text-[#B91C1C] bg-[#FEE2E2]',
    default: 'text-[#111] bg-[#F5F5F5]',
  };
  return (
    <Link to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-[5px] hover:bg-[#FAFAFA] transition-colors group" style={{ textDecoration: 'none' }}>
      <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center ${colors[variant]}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[#111] truncate">{label}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[13px] font-bold tabular text-[#111]">{count}</span>
        <ChevronRight size={12} className="text-[#C4C7CC] group-hover:text-[#8A8F98] transition-colors" />
      </div>
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * MAIN DASHBOARD COMPONENT
 * ══════════════════════════════════════════════════════════════════════════ */

export default function Dashboard() {
  const { auth, logout, settings } = useApp();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [smart, setSmart] = useState(null);
  const [goal, setGoal] = useState(null);
  const [segments, setSegments] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [chartMode, setChartMode] = useState('revenue');

  const [range, setRange] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('hushae.dashRange') || 'null');
      if (saved?.preset) { const r = resolvePreset(saved.preset); return { ...r, preset: saved.preset }; }
    } catch {}
    const r = resolvePreset('30d');
    return { ...r, preset: '30d' };
  });

  const applyRange = (preset) => {
    const r = resolvePreset(preset);
    setRange({ ...r, preset });
    try { localStorage.setItem('hushae.dashRange', JSON.stringify({ preset })); } catch {}
  };

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const qs = `from=${range.from}&to=${range.to}`;
      const [data, ins, al, sm, gl, seg] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token: auth.token }),
        api(`/orders/insights/dashboard?${qs}`, { token: auth.token }).catch(() => null),
        api('/dashboard/alerts', { token: auth.token }).catch(() => null),
        api('/dashboard/insights', { token: auth.token }).catch(() => null),
        api('/dashboard/goal', { token: auth.token }).catch(() => null),
        api('/customers/segments', { token: auth.token }).catch(() => null),
      ]);
      setD(data); if (ins) setInsights(ins); setAlerts(al?.alerts || []); setSmart(sm?.insights || []);
      if (gl) setGoal(gl); setSegments(seg?.segments || null); setLastSync(new Date()); setErr('');
    } catch (e) { if (e?.status === 401) { logout(); return; } setErr('Failed to load dashboard.'); }
    setRefreshing(false);
  }, [auth, range, logout]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!auth?.token) return; const t = setInterval(() => load(true), 30000); return () => clearInterval(t); }, [auth, range]);

  /* ── Error State ────────────────────────────────────────────────────── */
  if (err) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center max-w-sm">
        <AlertTriangle size={28} className="mx-auto text-[#B91C1C] mb-3" />
        <p className="text-[14px] font-semibold text-[#111]">{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="mt-4 px-4 py-2 bg-[#111] text-white text-[12px] font-semibold rounded-[5px] hover:bg-[#222] transition-colors">Retry</button>
      </div>
    </div>
  );

  /* ── Loading State ──────────────────────────────────────────────────── */
  if (!d) return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="h-8 w-48 v3-skeleton rounded-[5px] mb-6" />
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">{[1,2,3,4,5,6].map(i => <div key={i} className="h-20 v3-skeleton rounded-[6px]" />)}</div>
        <div className="h-64 v3-skeleton rounded-[6px] mb-6" />
        <div className="grid grid-cols-2 gap-4">{[1,2].map(i => <div key={i} className="h-48 v3-skeleton rounded-[6px]" />)}</div>
      </div>
    </div>
  );

  const k = d.kpis || {};
  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; })();
  const rangeLabel = RANGE_PRESETS.find(p => p.key === range.preset)?.label || 'Custom';

  /* ── Attention items (only non-zero) ────────────────────────────────── */
  const attentionItems = [
    { icon: Clock, label: 'Pending Payments', count: d.stats?.pending || 0, to: '/admin/verification-queue', variant: 'warning' },
    { icon: Truck, label: 'Ready to Ship', count: d.stats?.readyToShip || 0, to: '/admin/orders?group=to-ship', variant: 'default' },
    { icon: Package, label: 'In Production', count: d.stats?.processing || 0, to: '/admin/orders?group=processing', variant: 'default' },
    { icon: AlertTriangle, label: 'Low Stock', count: (d.lowStock || []).length, to: '/admin/products?stock=low', variant: 'danger' },
  ].filter(i => i.count > 0);

  /* ── Chart data ─────────────────────────────────────────────────────── */
  const chartData = d.chart || [];

  return (
    <div className="min-h-screen bg-white">
      {/* ════════════════════════════════════════════════════════════════════
       * SECTION 1: TOPBAR
       * ════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-[1400px] mx-auto px-6 h-[52px] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
              <div className="w-7 h-7 rounded-[4px] bg-[#111] flex items-center justify-center">
                <span className="text-[10px] font-bold text-white tracking-wider">H</span>
              </div>
              <span className="text-[13px] font-bold tracking-[0.2em] text-[#111] uppercase hidden sm:inline">Hushae</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-[#8A8F98]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] animate-pulse" />
              Live
            </span>
            <span className="hidden lg:inline text-[11px] text-[#8A8F98]">
              {lastSync ? `Updated ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </span>
            <button onClick={() => load()} disabled={refreshing} className="w-8 h-8 rounded-[5px] flex items-center justify-center text-[#8A8F98] hover:bg-[#F5F5F5] hover:text-[#111] transition-colors">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => nav('/admin/orders/new')} className="h-8 px-3 bg-[#111] text-white text-[11px] font-semibold rounded-[5px] hover:bg-[#222] transition-colors flex items-center gap-1.5">
              <Plus size={12} /> <span className="hidden sm:inline">Create</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6">

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 2: PAGE INTRO
         * ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-[#111] tracking-tight">{greeting}, {auth?.user?.name?.split(' ')[0] || 'Admin'}</h1>
            <p className="text-[12px] text-[#8A8F98] mt-1">Here's what's happening with your store.</p>
          </div>
          <div className="flex items-center gap-1.5">
            {RANGE_PRESETS.slice(0, 5).map(p => (
              <button key={p.key} onClick={() => applyRange(p.key)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-[4px] transition-colors ${range.preset === p.key ? 'bg-[#111] text-white' : 'text-[#5F6368] hover:bg-[#F5F5F5]'}`}>
                {p.label}
              </button>
            ))}
            <select value={range.preset} onChange={e => applyRange(e.target.value)}
              className="h-7 px-2 text-[11px] font-medium rounded-[4px] border border-[#E5E7EB] bg-white text-[#5F6368] outline-none sm:hidden">
              {RANGE_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 3: EXECUTIVE METRICS (6 KPIs)
         * ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <MetricCard icon={CircleDollarSign} label="Revenue" value={k.revenue?.value || 0} change={k.revenue?.change} format="money" to="/admin/finance" />
          <MetricCard icon={ShoppingBag} label="Orders" value={k.orders?.value || 0} change={k.orders?.change} to="/admin/orders" />
          <MetricCard icon={Users} label="New Customers" value={k.customers?.value || 0} change={k.customers?.change} to="/admin/customers" />
          <MetricCard icon={TrendingUp} label="Avg Order Value" value={k.aov?.value || 0} change={k.aov?.change} format="money" to="/admin/analytics" />
          <MetricCard icon={Package} label="Products Sold" value={d.itemsSold || 0} to="/admin/products" hint={rangeLabel} />
          <MetricCard icon={CircleDollarSign} label="Net Profit" value={k.profit?.value || 0} change={k.profit?.change} format="money" to="/admin/finance" hint="Estimated" />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 4: PRIMARY PERFORMANCE CHART
         * ══════════════════════════════════════════════════════════════════ */}
        <div className="border border-[#E5E7EB] rounded-[6px] mb-6">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
            <div>
              <h2 className="text-[13px] font-semibold text-[#111]">Sales Performance</h2>
              <p className="text-[11px] text-[#8A8F98] mt-0.5">{rangeLabel}</p>
            </div>
            <div className="flex gap-1">
              {['revenue', 'orders'].map(m => (
                <button key={m} onClick={() => setChartMode(m)}
                  className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] rounded-[3px] transition-colors ${chartMode === m ? 'bg-[#111] text-white' : 'text-[#8A8F98] hover:bg-[#F5F5F5]'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4">
            <ChartErrorBoundary>
              <div className="h-56 w-full">
                {chartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dash-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#111" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#111" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F3" vertical={false} />
                      <XAxis dataKey="label" stroke="#C4C7CC" tick={{ fontSize: 10, fill: '#8A8F98' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                      <YAxis stroke="#C4C7CC" tick={{ fontSize: 10, fill: '#8A8F98' }} tickLine={false} axisLine={false} tickFormatter={v => chartMode === 'revenue' ? (v >= 1000 ? `${(v/1000).toFixed(0)}k` : v) : v} />
                      <Tooltip contentStyle={{ borderRadius: 6, border: '1px solid #E5E7EB', background: '#FFF', fontSize: 11, color: '#111', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} labelStyle={{ color: '#8A8F98' }} formatter={(v) => chartMode === 'revenue' ? [pkr(v), 'Revenue'] : [v, 'Orders']} />
                      <Area type="monotone" dataKey={chartMode} stroke="#111" strokeWidth={2} fill="url(#dash-grad)" dot={false} activeDot={{ r: 4, fill: '#111', stroke: '#FFF', strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-[12px] text-[#8A8F98]">
                    Not enough data for this period.
                  </div>
                )}
              </div>
            </ChartErrorBoundary>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 5: ATTENTION STRIP + QUICK ACTIONS
         * ══════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          {/* Attention */}
          <div className="lg:col-span-2 border border-[#E5E7EB] rounded-[6px]">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#111]">Needs Attention</h2>
              {attentionItems.length > 0 && <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#A16207]">{attentionItems.length} items</span>}
            </div>
            <div className="p-2">
              {attentionItems.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-[12px] text-[#8A8F98]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D] mr-2" /> All clear — nothing needs your attention right now.
                </div>
              ) : (
                <div className="grid gap-1 sm:grid-cols-2">
                  {attentionItems.map(item => <AttentionItem key={item.label} {...item} />)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border border-[#E5E7EB] rounded-[6px]">
            <div className="px-5 py-3 border-b border-[#E5E7EB]">
              <h2 className="text-[13px] font-semibold text-[#111]">Quick Actions</h2>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {[
                { to: '/admin/orders/new', icon: ShoppingBag, label: 'Create Order' },
                { to: '/admin/products/new', icon: PackagePlus, label: 'Add Product' },
                { to: '/admin/promotions/new', icon: Zap, label: 'New Promotion' },
                { to: '/admin/discounts', icon: BadgePercent, label: 'Discount' },
                { to: '/admin/reports', icon: FileText, label: 'Reports' },
                { to: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
              ].map(a => (
                <Link key={a.label} to={a.to} className="flex items-center gap-2 px-3 py-2.5 rounded-[5px] border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFAFA] transition-colors text-[#111]" style={{ textDecoration: 'none' }}>
                  <a.icon size={14} className="text-[#8A8F98]" />
                  <span className="text-[11px] font-medium">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 6: OPERATIONS — Recent Orders + Top Products
         * ══════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-4 lg:grid-cols-5 mb-6">
          {/* Recent Orders (3 cols) */}
          <div className="lg:col-span-3 border border-[#E5E7EB] rounded-[6px]">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#111]">Recent Orders</h2>
              <Link to="/admin/orders" className="text-[11px] font-medium text-[#5F6368] hover:text-[#111] transition-colors flex items-center gap-1" style={{ textDecoration: 'none' }}>
                View all <ArrowRight size={11} />
              </Link>
            </div>
            {(d.recentOrders || []).length === 0 ? (
              <div className="flex items-center justify-center py-10 text-[12px] text-[#8A8F98]">No orders yet.</div>
            ) : (
              <div className="divide-y divide-[#F0F1F3]">
                {(d.recentOrders || []).slice(0, 6).map(o => (
                  <Link key={o._id} to={`/admin/orders/${o._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors" style={{ textDecoration: 'none' }}>
                    <div className="flex -space-x-1 flex-shrink-0">
                      {(o.items || []).slice(0, 2).map((it, i) => (
                        <Img key={i} src={it.image} alt="" className="w-7 h-7 rounded-[3px] border border-white object-cover" />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#111]">{o.orderNumber}</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-[3px] ${
                          o.status === 'Delivered' ? 'bg-[#F0FDF4] text-[#15803D]' :
                          o.status === 'Cancelled' ? 'bg-[#FEF2F2] text-[#B91C1C]' :
                          'bg-[#F5F5F5] text-[#5F6368]'
                        }`}>{o.status}</span>
                      </div>
                      <p className="text-[11px] text-[#8A8F98] mt-0.5 truncate">{o.customerInfo?.name} · {fmtDate(o.createdAt)}</p>
                    </div>
                    <span className="text-[12px] font-semibold tabular text-[#111] flex-shrink-0">{pkr(o.total)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Top Products (2 cols) */}
          <div className="lg:col-span-2 border border-[#E5E7EB] rounded-[6px]">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#111]">Top Products</h2>
              <Link to="/admin/products" className="text-[11px] font-medium text-[#5F6368] hover:text-[#111] transition-colors flex items-center gap-1" style={{ textDecoration: 'none' }}>
                View all <ArrowRight size={11} />
              </Link>
            </div>
            {(d.bestSellers || []).length === 0 ? (
              <div className="flex items-center justify-center py-10 text-[12px] text-[#8A8F98]">No sales data yet.</div>
            ) : (
              <div className="divide-y divide-[#F0F1F3]">
                {(d.bestSellers || []).slice(0, 5).map((p, i) => (
                  <Link key={p.name} to="/admin/products" className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] transition-colors" style={{ textDecoration: 'none' }}>
                    <span className="text-[11px] font-bold text-[#C4C7CC] w-4 tabular">{String(i + 1).padStart(2, '0')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#111] truncate">{p.name}</p>
                      <p className="text-[11px] text-[#8A8F98]">{p.qty} sold</p>
                    </div>
                    <span className="text-[12px] font-semibold tabular text-[#111]">{pkr(p.revenue)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 7: INTELLIGENCE — Low Stock + Customer Segments
         * ══════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          {/* Low Stock */}
          <div className="border border-[#E5E7EB] rounded-[6px]">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#111]">Low Stock</h2>
              <Link to="/admin/products?stock=low" className="text-[11px] font-medium text-[#5F6368] hover:text-[#111] transition-colors flex items-center gap-1" style={{ textDecoration: 'none' }}>
                Manage <ArrowRight size={11} />
              </Link>
            </div>
            {(d.lowStock || []).length === 0 ? (
              <div className="flex items-center justify-center py-8 text-[12px] text-[#8A8F98]">All products well stocked.</div>
            ) : (
              <div className="divide-y divide-[#F0F1F3]">
                {(d.lowStock || []).slice(0, 4).map(p => (
                  <Link key={p._id} to={`/admin/products/${p._id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#FAFAFA] transition-colors" style={{ textDecoration: 'none' }}>
                    <Img src={p.images?.[0]?.url} alt="" className="w-8 h-8 rounded-[3px] border border-[#E5E7EB] object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#111] truncate">{p.name}</p>
                    </div>
                    <span className={`text-[11px] font-bold tabular px-2 py-0.5 rounded-[3px] ${p.stock === 0 ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF9C3] text-[#A16207]'}`}>
                      {p.stock} left
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Customer Segments */}
          <div className="border border-[#E5E7EB] rounded-[6px]">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#111]">Customer Segments</h2>
              <Link to="/admin/customers" className="text-[11px] font-medium text-[#5F6368] hover:text-[#111] transition-colors flex items-center gap-1" style={{ textDecoration: 'none' }}>
                View all <ArrowRight size={11} />
              </Link>
            </div>
            <div className="p-3 grid grid-cols-2 gap-2">
              {[
                { key: 'vip', label: 'VIP', count: segments?.vip || 0 },
                { key: 'repeat', label: 'Repeat', count: segments?.repeat || 0 },
                { key: 'new', label: 'New', count: segments?.new || 0 },
                { key: 'inactive', label: 'Inactive', count: segments?.inactive || 0 },
              ].map(s => (
                <Link key={s.key} to={`/admin/customers?segment=${s.key}`} className="flex items-center justify-between px-3 py-2.5 rounded-[5px] border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFAFA] transition-colors" style={{ textDecoration: 'none' }}>
                  <span className="text-[11px] font-medium text-[#5F6368]">{s.label}</span>
                  <span className="text-[13px] font-bold tabular text-[#111]">{s.count.toLocaleString()}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 8: SMART INSIGHTS (real data only)
         * ══════════════════════════════════════════════════════════════════ */}
        {(smart || []).length > 0 && (
          <div className="border border-[#E5E7EB] rounded-[6px] mb-6">
            <div className="px-5 py-3 border-b border-[#E5E7EB]">
              <h2 className="text-[13px] font-semibold text-[#111]">Insights</h2>
            </div>
            <div className="divide-y divide-[#F0F1F3]">
              {(smart || []).slice(0, 4).map((insight, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-6 h-6 rounded-[4px] bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <TrendingUp size={12} className="text-[#8A8F98]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-[#111] leading-relaxed">{insight.text || insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
         * SECTION 9: REVENUE GOAL (if configured)
         * ══════════════════════════════════════════════════════════════════ */}
        {goal?.target > 0 && (
          <div className="border border-[#E5E7EB] rounded-[6px] mb-6">
            <div className="px-5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[#111]">Revenue Goal</h2>
              <span className="text-[11px] text-[#8A8F98]">{rangeLabel}</span>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-end justify-between mb-2">
                <span className="text-[18px] font-bold tabular text-[#111]">{pkr(k.revenue?.value || 0)}</span>
                <span className="text-[12px] text-[#8A8F98]">of {pkr(goal.target)}</span>
              </div>
              <div className="h-2 bg-[#F0F1F3] rounded-full overflow-hidden">
                <div className="h-full bg-[#111] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((k.revenue?.value || 0) / goal.target) * 100)}%` }} />
              </div>
              <p className="text-[11px] text-[#8A8F98] mt-2">
                {Math.round(((k.revenue?.value || 0) / goal.target) * 100)}% of target · {pkr(Math.max(0, goal.target - (k.revenue?.value || 0)))} remaining
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
