import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, Calendar, ChevronDown,
  ClipboardList, CreditCard, DollarSign, Eye, Headphones, LayoutGrid, Lightbulb,
  Mail, MapPin, Package, PackagePlus, RefreshCw, ShoppingCart, Sparkles, Tag,
  TrendingUp, Users, Zap, Clock,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import AlertsBar from './dashboard/AlertsBar';
import { RANGE_PRESETS, resolvePreset } from './dashboard/RangePicker';
import Img from '../components/Img';
import './overview.css';

/* ============================================================================
 * OVERVIEW — HUSHAE admin dashboard (rebuild).
 *
 * Design: light, editorial-minimal (white cards, hairline borders, black
 * accents). All figures come from real endpoints:
 *   GET /admin/dashboard?from&to   — KPIs, series, status, sellers, orders
 *   GET /track/admin/live          — live visitors, today counters, page feed
 *   GET /dashboard/alerts          — "what needs attention"
 *   GET /dashboard/insights        — rotating smart insights
 *   GET /customers/segments        — new / repeat / vip / inactive
 * ========================================================================== */

const DAY = 86400000;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseLocal = (s) => { const [y, m, dd] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, dd || 1); };
const fmtDay = (s) => parseLocal(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* Admin follows the shared light/dark theme system (html.admin-light /
   html.dark-admin). Cards/borders adapt via CSS variables; SVG charts need
   explicit palettes, chosen here. */
const PALETTES = {
  light: {
    line: '#111', prev: '#c8c8c8', bar: '#111', barAlt: '#555', dotFill: '#fff',
    donut: ['#111', '#555', '#8a8a8a', '#b5b5b5', '#d6d6d6', '#e5e7eb'],
    status: { Delivered: '#111', Shipped: '#555', 'Out for Delivery': '#555', 'Ready to Ship': '#8a8a8a', Processing: '#b5b5b5', Confirmed: '#d6d6d6', Pending: '#e5e7eb', Cancelled: '#f3f4f6', Refunded: '#f3f4f6' },
  },
  dark: {
    line: '#F4F4F5', prev: '#3F3F46', bar: '#F4F4F5', barAlt: '#A1A1AA', dotFill: '#111113',
    donut: ['#F4F4F5', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A'],
    status: { Delivered: '#F4F4F5', Shipped: '#A1A1AA', 'Out for Delivery': '#A1A1AA', 'Ready to Ship': '#71717A', Processing: '#52525B', Confirmed: '#3F3F46', Pending: '#27272A', Cancelled: '#3F3F46', Refunded: '#27272A' },
  },
};
const statusColor = (s, dark) => (dark ? PALETTES.dark : PALETTES.light).status[s] || (dark ? '#3F3F46' : '#e5e7eb');

/* Reactive to the TopBar sun/moon toggle (class swap on <html>). */
function useAdminDark() {
  const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark-admin'));
  useEffect(() => {
    const el = document.documentElement;
    const obs = new MutationObserver(() => setDark(el.classList.contains('dark-admin')));
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* Order status → colour / badge. HUSHAE lifecycle order. */
const STATUS_ORDER = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const badgeClass = (s) => (['Delivered', 'Shipped', 'Out for Delivery', 'Ready to Ship'].includes(s)
  ? 'ovw-badge-paid'
  : ['Pending', 'Confirmed', 'Processing'].includes(s)
    ? 'ovw-badge-pending'
    : 'ovw-badge-cancelled');

const initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

/* ---- Count-up number (rAF, eased) ---------------------------------------- */
function useCountUp(target, duration = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!Number.isFinite(target) || target <= 0) { setVal(0); return undefined; }
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ---- Tiny sparkline (Recharts, no axes) ----------------------------------- */
function Spark({ data, height = 28, width = 78, dark = false }) {
  const gid = useId().replace(/[:]/g, '');
  const rows = data.map((n, i) => ({ i, n: Number(n) || 0 }));
  return (
    <div style={{ width, height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={dark ? '#F4F4F5' : '#111'} stopOpacity={0.16} />
              <stop offset="100%" stopColor={dark ? '#F4F4F5' : '#111'} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="n" stroke={dark ? '#F4F4F5' : '#111'} strokeWidth={1.4} fill={`url(#sp-${gid})`} isAnimationActive={false} dot={false} activeDot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---- KPI stat card ---------------------------------------------------------- */
function KpiCard({ icon: Icon, label, value, change, format = 'number', spark, vsLabel, dark = false }) {
  const v = useCountUp(value || 0);
  const display = format === 'money' ? pkr(Math.round(v)) : format === 'pct' ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString();
  const showChange = typeof change === 'number' && Number.isFinite(change) && change !== 0;
  const isNew = change === null && (value || 0) > 0;
  return (
    <div className="ovw-stat">
      <div className="ovw-stat-head"><Icon size={14} strokeWidth={1.6} aria-hidden /> {label}</div>
      <div className="ovw-stat-val">{display}</div>
      <div className="ovw-stat-foot">
        <div>
          {showChange ? (
            <span className={`ovw-stat-change ${change > 0 ? 'up' : 'down'}`}>
              {change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(change).toFixed(1)}%
            </span>
          ) : isNew ? (
            <span className="ovw-stat-new">New</span>
          ) : null}
          {vsLabel ? <div className="ovw-stat-vs">{vsLabel}</div> : null}
        </div>
        {spark && spark.length > 1 ? <Spark data={spark} dark={dark} /> : <span style={{ width: 78, height: 28 }} aria-hidden />}
      </div>
    </div>
  );
}

/* ---- Dropdown pill (date range / compare) ----------------------------------- */
function Pill({ label, icon: Icon, options, selected, onSelect, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [open]);
  return (
    <div className="ovw-pill" ref={ref} role="button" tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
      aria-haspopup="listbox" aria-expanded={open}>
      {Icon ? <Icon size={13} strokeWidth={1.8} aria-hidden /> : null}
      <span>{label}</span>
      <ChevronDown size={12} strokeWidth={2} aria-hidden />
      <div className={`ovw-dropdown ${align === 'right' ? 'right' : ''} ${open ? 'show' : ''}`} role="listbox">
        {options.map((o) => (
          <div key={o.key} role="option" aria-selected={o.key === selected}
            className={`opt ${o.key === selected ? 'sel' : ''}`}
            onClick={() => { setOpen(false); onSelect(o.key); }}>
            {o.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Sales Overview (this period vs previous period) ------------------------- */
function SalesOverviewCard({ d, prev, compare, dark = false }) {
  const series = useMemo(() => {
    if (!d?.chart) return [];
    const p = prev?.chart || [];
    return d.chart.map((c, i) => ({ label: c.label, cur: c.revenue || 0, prev: p[i]?.revenue || 0 }));
  }, [d, prev]);
  return (
    <div className="ovw-card">
      <div className="ovw-card-h">
        <span className="ovw-card-t">Sales Overview</span>
        <span className="ovw-card-link">{d ? `${fmtDay(d.scope.from)} – ${fmtDay(d.scope.to)}` : ''}</span>
      </div>
      <div className="ovw-legend">
        <span><b style={{ background: dark ? '#F4F4F5' : '#111' }} /> This Period</span>
        {compare ? <span><b style={{ background: dark ? '#3F3F46' : '#c8c8c8' }} /> Previous Period</span> : null}
      </div>
      <div className="ovw-chart-main">
        {series.length === 0 ? <div className="ovw-empty">No sales in this period.</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f2f2f2" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} width={34} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #ececec', background: '#fff', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#6b7280', marginBottom: 4 }}
                formatter={(v, name) => [pkr(v), name === 'cur' ? 'This Period' : 'Previous Period']}
              />
              <Line type="monotone" dataKey="cur" stroke={dark ? '#F4F4F5' : '#111'} strokeWidth={2.2} dot={series.length <= 14 ? { r: 3, fill: dark ? '#F4F4F5' : '#111', strokeWidth: 0 } : false} activeDot={{ r: 4.5 }} />
              {compare && <Line type="monotone" dataKey="prev" stroke={dark ? '#3F3F46' : '#c8c8c8'} strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} />}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ---- Revenue by product (top sellers donut) ----------------------------------- */
function ProductsShareCard({ d, dark = false }) {
  const donut = dark ? PALETTES.dark.donut : PALETTES.light.donut;
  const { rows, total } = useMemo(() => {
    const best = d?.bestSellers || [];
    const rev = d?.stats?.revenue || 0;
    const sum = best.reduce((n, b) => n + (b.revenue || 0), 0);
    const rs = best.map((b) => ({ name: b.name, value: b.revenue || 0 }));
    if (rev > sum) rs.push({ name: 'Other products', value: rev - sum });
    return { rows: rs, total: rev };
  }, [d]);
  return (
    <div className="ovw-card">
      <div className="ovw-card-h"><span className="ovw-card-t">Revenue by Product</span></div>
      {rows.length === 0 ? <div className="ovw-empty">No sales in this period.</div> : (
        <>
          <div className="ovw-donut-row">
            <div className="ovw-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="value" nameKey="name" innerRadius={44} outerRadius={62} paddingAngle={0} stroke="none">
                    {rows.map((r, i) => <Cell key={r.name} fill={donut[i % donut.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #ececec', background: '#fff', fontSize: 11 }} formatter={(v, n) => [pkr(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="ovw-donut-center"><b>{pkr(total)}</b><span>Total sales</span></div>
            </div>
            <div className="ovw-ch-list">
              {rows.map((r, i) => (
                <div key={r.name} className="ovw-ch-item">
                  <div className="ovw-dot" style={{ background: donut[i % donut.length] }} />
                  <span className="name" title={r.name}>{r.name}</span>
                  <span className="pct">{total ? Math.round((r.value / total) * 100) : 0}%</span>
                  <span className="val">{pkr(r.value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: 14 }}>
            <Link to="/admin/analytics" className="ovw-btn-sm">View full report</Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Live store (real-time) ------------------------------------------------------ */
function LiveCard({ live }) {
  const topPages = useMemo(() => {
    const feed = live?.feed || [];
    const counts = new Map();
    feed.forEach((f) => { const p = f.path || '/'; counts.set(p, (counts.get(p) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [live]);
  const t = live?.today;
  return (
    <div className="ovw-card">
      <div className="ovw-live-top">
        <span className="ovw-card-t">Live Store</span>
        <span className="ovw-live-tag"><span className="ovw-live-dot" /> Live</span>
      </div>
      <div className="ovw-live-num">{live ? live.visitorsNow : '—'}</div>
      <div className="ovw-live-sub">Visitors right now</div>
      <div className="ovw-today-row">
        <div className="ovw-today-cell"><b>{t ? t.sessions : '—'}</b><span>Sessions</span></div>
        <div className="ovw-today-cell"><b>{t ? t.carts : '—'}</b><span>Carts</span></div>
        <div className="ovw-today-cell"><b>{t ? t.orders : '—'}</b><span>Orders</span></div>
      </div>
      <div className="ovw-pages">
        <div className="ovw-page-row head"><span>Recent pages</span><span>events</span></div>
        {topPages.length === 0 ? <div className="ovw-empty" style={{ padding: '10px 4px' }}>No traffic recorded yet today.</div> : topPages.map(([path, n]) => (
          <div key={path} className="ovw-page-row"><span title={path}>{path}</span><span>{n}</span></div>
        ))}
      </div>
      <Link to="/admin/live" className="ovw-btn-sm ovw-btn-block">View real time</Link>
    </div>
  );
}

/* ---- Today at a glance ------------------------------------------------------------- */
function GlanceCard({ d, live }) {
  const todayCustomers = useMemo(() => {
    if (!d?.chart?.length || d.scope?.weekly) return null;
    const last = d.chart[d.chart.length - 1];
    return last?.date === d.scope.to ? (last.customers || 0) : null;
  }, [d]);
  const items = [
    { to: '/admin/orders', icon: Calendar, n: live?.today?.orders ?? '—', label: 'New Orders' },
    { to: '/admin/orders', icon: CreditCard, n: d?.stats?.pending ?? '—', label: 'Pending' },
    { to: '/admin/ops/inventory', icon: AlertTriangle, n: d?.stats?.lowStockCount ?? '—', label: 'Low Stock' },
    { to: '/admin/customers', icon: Users, n: todayCustomers ?? '—', label: 'New Customers' },
  ];
  return (
    <div className="ovw-card">
      <div className="ovw-card-h"><span className="ovw-card-t">Today at a Glance</span></div>
      <div className="ovw-glance">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="ovw-g-item">
            <div className="ovw-g-ico"><it.icon size={14} strokeWidth={1.6} /></div>
            <b>{it.n}</b><span>{it.label}</span>
          </Link>
        ))}
      </div>
      <Link to="/admin/orders" className="ovw-view-all">View all orders →</Link>
    </div>
  );
}

/* ---- Top selling products table ------------------------------------------------------ */
function TopProductsTable({ d }) {
  const nav = useNavigate();
  const best = d?.bestSellers || [];
  return (
    <div className="ovw-card">
      <div className="ovw-card-h">
        <span className="ovw-card-t">Top Selling Products</span>
        <Link to="/admin/products" className="ovw-card-link">View all</Link>
      </div>
      {best.length === 0 ? <div className="ovw-empty">No products sold in this period.</div> : (
        <table className="ovw-tbl">
          <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
          <tbody>
            {best.map((b) => (
              <tr key={b.name} onClick={() => nav(`/admin/products`)}>
                <td>
                  <div className="ovw-prod">
                    {b.image ? <Img src={b.image} alt="" className="" /> : <span className="prod-ico" aria-hidden>·</span>}
                    <span className="prod-name" title={b.name}>{b.name}</span>
                  </div>
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{b.qty}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pkr(b.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---- Recent orders table ----------------------------------------------------------------- */
function RecentOrdersTable({ d }) {
  const nav = useNavigate();
  const rows = d?.recentOrders || [];
  return (
    <div className="ovw-card">
      <div className="ovw-card-h">
        <span className="ovw-card-t">Recent Orders</span>
        <Link to="/admin/orders" className="ovw-card-link">View all</Link>
      </div>
      {rows.length === 0 ? <div className="ovw-empty">No orders in this period.</div> : (
        <table className="ovw-tbl">
          <tbody>
            {rows.map((o) => (
              <tr key={o._id} onClick={() => nav(`/admin/orders`)}>
                <td>
                  <div className="ovw-prod">
                    <span className="prod-ico">{initials(o.customerInfo?.name)}</span>
                    <span className="prod-name">#{o.orderNumber}</span>
                  </div>
                </td>
                <td className="prod-name" title={o.customerInfo?.name}>{o.customerInfo?.name || 'Customer'}</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(o.total)}</td>
                <td style={{ textAlign: 'right' }}><span className={`ovw-badge ${badgeClass(o.status)}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---- Revenue & Orders (tabbed bar chart) --------------------------------------------------- */
function RevOrdersCard({ d, compare, dark = false }) {
  const [mode, setMode] = useState('revenue');
  const kpi = d?.kpis?.[mode];
  const change = typeof kpi?.change === 'number' ? kpi.change : null;
  return (
    <div className="ovw-card">
      <div className="ovw-card-h"><span className="ovw-card-t">Revenue &amp; Orders</span></div>
      <div className="ovw-rev-tabs">
        <span className={`ovw-rev-tab ${mode === 'revenue' ? 'active' : 'idle'}`} role="button" tabIndex={0}
          onClick={() => setMode('revenue')}
          onKeyDown={(e) => { if (e.key === 'Enter') setMode('revenue'); }}>Revenue</span>
        <span className={`ovw-rev-tab ${mode === 'orders' ? 'active' : 'idle'}`} role="button" tabIndex={0}
          onClick={() => setMode('orders')}
          onKeyDown={(e) => { if (e.key === 'Enter') setMode('orders'); }}>Orders</span>
        {compare && change !== null && change !== 0 && (
          <span className={`ovw-chip ${change > 0 ? 'up' : 'down'}`}>
            {change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="ovw-rev-chart">
        {(!d?.chart?.length) ? <div className="ovw-empty">No data in this period.</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={34}
                tickFormatter={(v) => (mode === 'revenue' ? (v >= 1000 ? `${Math.round(v / 1000)}k` : v) : v)} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #ececec', background: '#fff', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#6b7280', marginBottom: 4 }} cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                formatter={(v) => [mode === 'revenue' ? pkr(v) : Number(v).toLocaleString(), mode === 'revenue' ? 'Revenue' : 'Orders']}
              />
              <Bar dataKey={mode} fill={dark ? (mode === 'revenue' ? '#F4F4F5' : '#A1A1AA') : (mode === 'revenue' ? '#111' : '#555')} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ---- Orders status donut -------------------------------------------------------------------- */
function StatusDonutCard({ d, dark = false }) {
  const { segments, total } = useMemo(() => {
    const by = d?.byStatus || {};
    const segs = STATUS_ORDER
      .filter((s) => by[s])
      .map((s) => ({ name: s, value: by[s] }));
    return { segments: segs, total: segs.reduce((n, x) => n + x.value, 0) };
  }, [d]);
  return (
    <div className="ovw-card">
      <div className="ovw-card-h"><span className="ovw-card-t">Orders Status</span></div>
      {total === 0 ? <div className="ovw-empty">No orders in this period.</div> : (
        <>
          <div className="ovw-orders-flex">
            <div className="ovw-orders-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segments} dataKey="value" nameKey="name" innerRadius={38} outerRadius={54} paddingAngle={1.5} stroke="none">
                    {segments.map((s) => <Cell key={s.name} fill={statusColor(s.name, dark)} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #ececec', background: '#fff', fontSize: 11 }} formatter={(v, n) => [`${v} orders`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="ovw-orders-center"><b>{total.toLocaleString()}</b><span>Total Orders</span></div>
            </div>
            <div className="ovw-orders-legend">
              {segments.map((s) => (
                <div key={s.name} className="ovw-ol-item">
                  <div className="ovw-dot" style={{ background: statusColor(s.name, dark) }} />
                  <span className="lbl">{s.name}</span>
                  <span className="num">{Math.round((s.value / total) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <Link to="/admin/orders" className="ovw-btn-sm">View all orders</Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Customer overview ------------------------------------------------------------------------ */
function CustomersCard({ d, segments, dark = false }) {
  const total = d?.stats?.totalCustomers ?? 0;
  const series = useMemo(() => (d?.chart || []).map((c) => ({ c: c.customers || 0 })), [d]);
  const change = d?.kpis?.customers?.change;
  return (
    <div className="ovw-card">
      <div className="ovw-card-h"><span className="ovw-card-t">Customer Overview</span></div>
      <div className="ovw-cust-head">
        <div>
          <div style={{ fontSize: 10, color: 'var(--ovw-muted)' }}>Customers in period</div>
          <div className="ovw-cust-big">{total.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {typeof change === 'number' && change !== 0 ? (
            <div className="ovw-cust-growth">
              {change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {Math.abs(change).toFixed(1)}%
            </div>
          ) : null}
          <div className="ovw-cust-sub">new customers</div>
        </div>
      </div>
      {series.length > 1 ? (
        <div className="ovw-cust-line">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line type="monotone" dataKey="c" stroke={dark ? '#F4F4F5' : '#111'} strokeWidth={1.3} dot={series.length <= 14 ? { r: 2.5, fill: dark ? '#111113' : '#fff', stroke: dark ? '#F4F4F5' : '#111', strokeWidth: 1.5 } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <div style={{ height: 16 }} />}
      <div className="ovw-cust-bottom">
        <div className="ovw-cust-b">
          <div style={{ fontSize: 9, color: 'var(--ovw-muted)' }}>New (all time)</div>
          <b>{(segments?.new ?? 0).toLocaleString()}</b>
        </div>
        <div className="ovw-cust-b">
          <div style={{ fontSize: 9, color: 'var(--ovw-muted)' }}>Returning (all time)</div>
          <b>{(segments?.repeat ?? 0).toLocaleString()}</b>
        </div>
      </div>
    </div>
  );
}

/* ---- Top customers (spend bars) ------------------------------------------------------------------ */
function TopCustomersCard({ d }) {
  const rows = d?.topCustomers || [];
  const max = rows.reduce((n, c) => Math.max(n, c.spent || 0), 1);
  const [inView, setInView] = useState(false);
  useEffect(() => { const t = setTimeout(() => setInView(true), 150); return () => clearTimeout(t); }, []);
  return (
    <div className="ovw-card">
      <div className="ovw-card-h">
        <span className="ovw-card-t">Top Customers</span>
        <Link to="/admin/customers" className="ovw-card-link">View all</Link>
      </div>
      {rows.length === 0 ? <div className="ovw-empty">No repeat spend yet in this period.</div> : rows.map((c) => (
        <div key={c.phone} className="ovw-cat-row">
          <span className="ovw-cat-name" title={c.name}>{c.name}{c.city ? ` · ${c.city}` : ''}</span>
          <div className="ovw-cat-bar"><div style={{ width: inView ? `${Math.max(4, Math.round((c.spent / max) * 100))}%` : '0%' }} /></div>
          <span className="ovw-cat-val">{pkr(c.spent)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- Quick actions --------------------------------------------------------------------------------- */
function QuickActionsRow() {
  const actions = [
    { to: '/admin/orders/new', icon: ClipboardList, label: 'Create Order' },
    { to: '/admin/products/new', icon: PackagePlus, label: 'Add Product' },
    { to: '/admin/discounts', icon: Tag, label: 'Add Discount' },
    { to: '/admin/collections', icon: LayoutGrid, label: 'New Collection' },
    { to: '/admin/email-campaigns', icon: Mail, label: 'Send Email' },
    { to: '/admin/reports', icon: BarChart3, label: 'View Reports' },
    { to: '/admin/ops/inventory', icon: Package, label: 'Inventory' },
    { to: '/admin/questions', icon: Headphones, label: 'Support' },
  ];
  return (
    <div className="ovw-card" style={{ marginBottom: 10 }}>
      <div className="ovw-card-h"><span className="ovw-card-t">Quick Actions</span></div>
      <div className="ovw-quick">
        {actions.map((a) => (
          <Link key={a.label} to={a.to} className="ovw-q-btn">
            <a.icon size={13} strokeWidth={1.6} /><span>{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---- Smart insights (from /dashboard/insights) --------------------------------------------------------- */
const INS_ICONS = { MapPin, TrendingUp, Zap, Clock, Users };
const INS_TITLES = { MapPin: 'Top location', TrendingUp: 'Trend', Zap: 'Performance', Clock: 'Timing', Users: 'Customers' };
function InsightsRow({ insights }) {
  const list = (insights || []).slice(0, 5);
  if (list.length === 0) return null;
  return (
    <div className="ovw-card">
      <div className="ovw-card-h"><span className="ovw-card-t">• Smart Insights</span></div>
      <div className="ovw-insights">
        {list.map((ins) => {
          const Icon = INS_ICONS[ins.icon] || Lightbulb;
          return (
            <div key={ins.id} className="ovw-ins-card">
              <div className="ovw-ins-left">
                <div className="ovw-ins-ico"><Icon size={13} strokeWidth={1.6} /></div>
                <div style={{ minWidth: 0 }}>
                  <b>{INS_TITLES[ins.icon] || 'Insight'}</b>
                  <p>{ins.text}</p>
                  {ins.hint ? <p style={{ color: 'var(--ovw-muted2)' }}>{ins.hint}</p> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * MAIN
 * ======================================================================== */
export default function Overview() {
  const { auth, logout } = useApp();
  const dark = useAdminDark();
  const [d, setD] = useState(null);
  const [prev, setPrev] = useState(null);
  const [live, setLive] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [smart, setSmart] = useState(null);
  const [segments, setSegments] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [compare, setCompare] = useState(true);

  /* Date range — same persistence as the previous dashboard (localStorage + URL). */
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
    } catch { /* ignore */ }
    const r = resolvePreset('30d');
    return { preset: '30d', from: r.from, to: r.to };
  });

  const applyRange = (r) => {
    setRange(r);
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(r)); } catch { /* ignore */ }
    const sp = new URLSearchParams(window.location.search);
    if (r.preset === 'custom') { sp.set('from', r.from); sp.set('to', r.to); } else { sp.delete('from'); sp.delete('to'); }
    const q = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
  };

  /* Equal-length window immediately before the selected range (for the
     "Previous Period" line) — mirrors the backend's own comparison logic. */
  const prevWindow = useMemo(() => {
    const from = parseLocal(range.from);
    const to = parseLocal(range.to);
    const spanDays = Math.max(1, Math.round((to - from) / DAY) + 1);
    const pTo = new Date(from.getTime() - DAY);
    const pFrom = new Date(pTo.getTime() - (spanDays - 1) * DAY);
    return { from: iso(pFrom), to: iso(pTo), days: spanDays };
  }, [range]);

  const rangeLabel = `${fmtDay(range.from)} – ${fmtDay(range.to)}`;
  const presetOptions = RANGE_PRESETS.filter((p) => p.key !== 'custom').map((p) => ({ key: p.key, label: p.label }));

  const load = async (silent = false) => {
    if (!auth?.token) return;
    if (!silent) setRefreshing(true);
    try {
      const qs = `from=${range.from}&to=${range.to}`;
      const prevQs = `from=${prevWindow.from}&to=${prevWindow.to}`;
      const [data, prevData, al, sm, audience] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token: auth.token }),
        api(`/admin/dashboard?${prevQs}`, { token: auth.token }).catch(() => null),
        api('/dashboard/alerts', { token: auth.token }).catch(() => null),
        api('/dashboard/insights', { token: auth.token }).catch(() => null),
        api('/customers/segments', { token: auth.token }).catch(() => null),
      ]);
      setD(data); setPrev(prevData);
      setAlerts(al?.alerts || []); setSmart(sm?.insights || []);
      setSegments(audience?.segments || null);
      setLastSync(new Date()); setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      setErr('Failed to load overview. Check your connection and try again.');
    }
    setRefreshing(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [auth, range]);

  /* 30s data refresh (matches previous dashboard behaviour). */
  useEffect(() => {
    if (!auth?.token) return undefined;
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [auth, range]);

  /* 15s live polling (same cadence as Live View). */
  useEffect(() => {
    if (!auth?.token) return undefined;
    let stop = false;
    const poll = () => api('/track/admin/live', { token: auth.token })
      .then((x) => { if (!stop) setLive(x); })
      .catch(() => { /* keep last value; endpoint is best-effort */ });
    poll();
    const t = setInterval(poll, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [auth]);

  if (err) {
    return (
      <AdminLayout title="Overview">
        <div className="ovw">
          <div className="ovw-card" style={{ display: 'grid', placeItems: 'center', padding: '56px 24px', textAlign: 'center' }}>
            <AlertTriangle size={22} color="#dc2626" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13, fontWeight: 500 }}>{err}</p>
            <button type="button" className="ovw-btn-sm" style={{ marginTop: 14 }}
              onClick={() => { setErr(''); load(); }}>
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Overview">
      <div className="ovw">
        {/* Controls row */}
        <div className="ovw-controls">
          <div className="left">
            <Pill
              icon={Calendar}
              label={rangeLabel}
              options={presetOptions}
              selected={range.preset}
              onSelect={(key) => { const r = resolvePreset(key); if (r) applyRange({ preset: key, ...r }); }}
            />
            <Pill
              icon={TrendingUp}
              label={compare ? 'Compare: Previous period' : 'Compare: Off'}
              options={[
                { key: 'on', label: 'Previous period' },
                { key: 'off', label: 'No comparison' },
              ]}
              selected={compare ? 'on' : 'off'}
              onSelect={(key) => setCompare(key === 'on')}
            />
            {alerts && alerts.length > 0 ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--ovw-yellow-text)', background: 'var(--ovw-yellow-bg)', border: '1px solid #fde68a', borderRadius: 20, padding: '3px 10px', fontWeight: 600 }}>
                <AlertTriangle size={11} /> {alerts.length} alert{alerts.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
          <div className="left" style={{ gap: 10 }}>
            {lastSync ? (
              <span className="ovw-live">
                <span className="ovw-live-dot" />
                {lastSync.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            ) : null}
            <button type="button" className={`ovw-refresh ${refreshing ? 'busy' : ''}`} onClick={() => load()} aria-label="Refresh overview" title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Alerts (reuses existing AlertsBar — same dismiss/links behaviour) */}
        <div style={{ marginBottom: 12 }}>
          <AlertsBar alerts={alerts} />
        </div>

        {d ? (
          <>
            {/* KPI row */}
            <div className="ovw-stats">
              <KpiCard icon={DollarSign} label="Total Sales" value={d.kpis?.revenue?.value || 0} change={d.kpis?.revenue?.change} format="money" spark={(d.chart || []).map((c) => c.revenue)} vsLabel={`vs prev ${prevWindow.days}d`} dark={dark} />
              <KpiCard icon={ShoppingCart} label="Orders" value={d.kpis?.orders?.value || 0} change={d.kpis?.orders?.change} spark={(d.chart || []).map((c) => c.orders)} vsLabel={`vs prev ${prevWindow.days}d`} dark={dark} />
              <KpiCard icon={Users} label="New Customers" value={d.kpis?.customers?.value || 0} change={d.kpis?.customers?.change} spark={(d.chart || []).map((c) => c.customers)} vsLabel="in selected period" dark={dark} />
              <KpiCard icon={CreditCard} label="Avg. Order Value" value={d.kpis?.aov?.value || 0} change={d.kpis?.aov?.change} format="money" spark={(d.chart || []).map((c) => (c.orders ? c.revenue / c.orders : 0))} vsLabel={`vs prev ${prevWindow.days}d`} dark={dark} />
              <KpiCard icon={TrendingUp} label="Net Profit" value={d.kpis?.profit?.value || 0} change={d.kpis?.profit?.change} format="money" vsLabel={`vs prev ${prevWindow.days}d`} dark={dark} />
              <KpiCard icon={Eye} label="Margin" value={d.kpis?.margin?.value || 0} change={d.kpis?.margin?.change} format="pct" vsLabel="profit / revenue" dark={dark} />
            </div>

            {/* Row: sales overview / product share / live */}
            <div className="ovw-grid3">
              <SalesOverviewCard d={d} prev={prev} compare={compare} dark={dark} />
              <ProductsShareCard d={d} dark={dark} />
              <LiveCard live={live} />
            </div>

            {/* Row: glance / top products / recent orders */}
            <div className="ovw-grid4">
              <GlanceCard d={d} live={live} />
              <TopProductsTable d={d} />
              <RecentOrdersTable d={d} />
            </div>

            {/* Row: rev&orders / status / customers / top customers */}
            <div className="ovw-grid4b">
              <RevOrdersCard d={d} compare={compare} dark={dark} />
              <StatusDonutCard d={d} dark={dark} />
              <CustomersCard d={d} segments={segments} dark={dark} />
              <TopCustomersCard d={d} />
            </div>

            <QuickActionsRow />

            <InsightsRow insights={smart} />
          </>
        ) : (
          /* Skeleton while loading */
          <>
            <div className="ovw-stats">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="ovw-skeleton" style={{ height: 108 }} />)}
            </div>
            <div className="ovw-grid3">
              <div className="ovw-skeleton" style={{ height: 280 }} />
              <div className="ovw-skeleton" style={{ height: 280 }} />
              <div className="ovw-skeleton" style={{ height: 280 }} />
            </div>
            <div className="ovw-grid4">
              <div className="ovw-skeleton" style={{ height: 240 }} />
              <div className="ovw-skeleton" style={{ height: 240 }} />
              <div className="ovw-skeleton" style={{ height: 240 }} />
            </div>
            <div className="ovw-skeleton" style={{ height: 120 }} />
          </>
        )}
      </div>
    </AdminLayout>
  );
}
