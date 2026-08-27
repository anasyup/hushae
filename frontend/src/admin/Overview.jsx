import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, Bell, Calendar, ChevronDown,
  ClipboardList, CreditCard, DollarSign, Eye, Headphones, LayoutGrid,
  Lightbulb, Mail, MapPin, Maximize, Package, PackagePlus, Plus, RefreshCw,
  Search, ShoppingCart, Tag, TrendingUp, Users, X, Zap, Clock,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import { RANGE_PRESETS, resolvePreset } from './dashboard/RangePicker';
import Img from '../components/Img';
import './overview.css';

/* ============================================================================
 * OVERVIEW — HUSHAE admin dashboard.
 *
 * Faithful port of the ATELIER design (01 index.html / 02 style.css /
 * 03 javascript.js) into the HUSHAE React admin, with every figure wired
 * to real endpoints:
 *   GET /admin/dashboard?from&to  — KPIs, series, status, sellers, orders
 *   GET /track/admin/live         — live visitors, today counters, page feed
 *   GET /dashboard/alerts         — notification bell
 *   GET /dashboard/insights       — smart insights
 *   GET /customers/segments       — new / repeat customers
 * ========================================================================== */

const DAY = 86400000;
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseLocal = (s) => { const [y, m, dd] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, dd || 1); };
const fmtDay = (s) => parseLocal(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/* Order status → donut colour (design monochrome scale, lifecycle order). */
const STATUS_ORDER = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const initials = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

/* Chart palettes follow the admin light/dark toggle. */
const PALETTES = {
  light: {
    line: '#111', prev: '#c8c8c8', bar: '#111', barAlt: '#555', dotFill: '#fff',
    donut: ['#111', '#555', '#8a8a8a', '#d6d6d6', '#b5b5b5', '#e5e7eb'],
    status: { Delivered: '#111', Shipped: '#6b7280', 'Out for Delivery': '#6b7280', 'Ready to Ship': '#b5b5b5', Processing: '#b5b5b5', Confirmed: '#d6d6d6', Pending: '#e5e7eb', Cancelled: '#e5e7eb', Refunded: '#f3f4f6' },
  },
  dark: {
    line: '#F4F4F5', prev: '#3F3F46', bar: '#F4F4F5', barAlt: '#A1A1AA', dotFill: '#111113',
    donut: ['#F4F4F5', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A'],
    status: { Delivered: '#F4F4F5', Shipped: '#A1A1AA', 'Out for Delivery': '#A1A1AA', 'Ready to Ship': '#52525B', Processing: '#52525B', Confirmed: '#3F3F46', Pending: '#27272A', Cancelled: '#27272A', Refunded: '#3F3F46' },
  },
};
const statusColor = (s, dark) => (dark ? PALETTES.dark : PALETTES.light).status[s] || (dark ? '#3F3F46' : '#e5e7eb');

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

/* ---- count-up (design: animateCount, 1200ms ease-out cubic) -------------- */
function useCountUp(target, duration = 1200) {
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

/* ---- sparkline (design: spark() — bare line, 78×28) ----------------------- */
function Spark({ data, dark = false }) {
  const rows = useMemo(() => data.map((n, i) => ({ i, n: Number(n) || 0 })), [data]);
  return (
    <div className="spark">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Line type="monotone" dataKey="n" stroke={dark ? '#F4F4F5' : '#111'} strokeWidth={1.4} dot={false} activeDot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---- KPI stat card (design: .stat) ---------------------------------------- */
function StatCard({ icon: Icon, label, value, change, format = 'number', spark, vsLabel, dark = false }) {
  const v = useCountUp(value || 0);
  const display = format === 'money' ? pkr(Math.round(v)) : format === 'pct' ? `${v.toFixed(2)}%` : Math.round(v).toLocaleString();
  const showChange = typeof change === 'number' && Number.isFinite(change) && change !== 0;
  const isNew = change === null && (value || 0) > 0;
  return (
    <div className="stat">
      <div className="stat-head"><Icon size={14} strokeWidth={1.6} aria-hidden /> {label}</div>
      <div className="stat-val count-up">{display}</div>
      <div className="stat-foot">
        <div>
          {showChange ? (
            <div className={`stat-change ${change > 0 ? '' : 'down'}`}>
              {change > 0 ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
              {' '}{Math.abs(change).toFixed(1)}%
            </div>
          ) : isNew ? (
            <div className="stat-new">New</div>
          ) : null}
          {vsLabel ? <div className="stat-vs">{vsLabel}</div> : null}
        </div>
        {spark && spark.length > 1 ? <Spark data={spark} dark={dark} /> : <div className="spark" aria-hidden />}
      </div>
    </div>
  );
}

/* ---- dropdown pill (design: .pill + .dropdown) ---------------------------- */
function Pill({ icon: Icon, label, options, selected, onSelect }) {
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
    <div className={`pill ${open ? 'active' : ''}`} ref={ref} role="button" tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); } }}
      aria-haspopup="listbox" aria-expanded={open}>
      <span>{label}</span>
      {Icon ? <Icon size={13} strokeWidth={1.8} aria-hidden /> : null}
      <div className={`dropdown ${open ? 'show' : ''}`} role="listbox">
        {options.map((o) => (
          <div key={o.key} role="option" aria-selected={o.key === selected}
            style={o.key === selected ? { background: '#f5f5f5', fontWeight: 600 } : undefined}
            onClick={() => { setOpen(false); onSelect(o.key); }}>
            {o.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Sales Overview (design: .chart-main, two lines) ----------------------- */
function SalesOverviewCard({ d, prev, compare, dark, onRange }) {
  const series = useMemo(() => {
    if (!d?.chart) return [];
    const p = prev?.chart || [];
    return d.chart.map((c, i) => ({ label: c.label, cur: c.revenue || 0, prev: p[i]?.revenue || 0 }));
  }, [d, prev]);
  return (
    <div className="card">
      <div className="card-h">
        <div className="card-t">
          Sales Overview
          <span className="info" title="Sales comparison: this period vs previous period">i</span>
        </div>
        <Pill
          label="This Period"
          options={[
            { key: '7d', label: 'This Week' },
            { key: 'this-month', label: 'This Month' },
            { key: '30d', label: 'Last 30 Days' },
          ]}
          selected="x"
          onSelect={(k) => onRange(k)}
        />
      </div>
      <div className="legend">
        <span><b style={{ background: dark ? '#F4F4F5' : '#111' }} /> This Period</span>
        {compare ? <span><b style={{ background: dark ? '#3F3F46' : '#c8c8c8' }} /> Previous Period</span> : null}
      </div>
      <div className="chart-main">
        {series.length === 0 ? <div className="ovw-empty">No sales in this period.</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={dark ? '#1d1d21' : '#f2f2f2'} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={36}
                tickFormatter={(v) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`)} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', background: dark ? '#111113' : '#111', fontSize: 11, color: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
                labelStyle={{ color: 'rgba(255,255,255,.7)', marginBottom: 4 }}
                formatter={(v, name) => [pkr(v), name === 'cur' ? 'This Period' : 'Previous Period']}
              />
              <Line type="monotone" dataKey="cur" stroke={dark ? '#F4F4F5' : '#111'} strokeWidth={2.2}
                dot={series.length <= 14 ? { r: 4, fill: dark ? '#F4F4F5' : '#111', strokeWidth: 2 } : false} activeDot={{ r: 6 }} />
              {compare && <Line type="monotone" dataKey="prev" stroke={dark ? '#3F3F46' : '#c8c8c8'} strokeWidth={1.5} strokeDasharray="4 4" dot={false} activeDot={false} />}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ---- Revenue by Product (design: .donut-row / .ch-list) -------------------- */
function ProductsShareCard({ d, dark }) {
  const nav = useNavigate();
  const { rows, total } = useMemo(() => {
    const best = d?.bestSellers || [];
    const rev = d?.stats?.revenue || 0;
    const sum = best.reduce((n, b) => n + (b.revenue || 0), 0);
    const rs = best.map((b) => ({ name: b.name, value: b.revenue || 0 }));
    if (rev > sum) rs.push({ name: 'Other products', value: rev - sum });
    return { rows: rs, total: rev };
  }, [d]);
  const donut = dark ? PALETTES.dark.donut : PALETTES.light.donut;
  return (
    <div className="card">
      <div className="card-h"><span className="card-t">Revenue by Product</span></div>
      {rows.length === 0 ? <div className="ovw-empty">No sales in this period.</div> : (
        <>
          <div className="donut-row">
            <div className="donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rows} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" stroke="none">
                    {rows.map((r, i) => <Cell key={r.name} fill={donut[i % donut.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', background: dark ? '#111113' : '#111', fontSize: 11, color: '#fff' }} formatter={(v, n) => [pkr(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center"><b>{pkr(total)}</b><span>Total Sales</span></div>
            </div>
            <div className="ch-list">
              {rows.map((r, i) => (
                <div key={r.name} className="ch-item">
                  <div className="dot" style={{ background: donut[i % donut.length] }} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.name}>{r.name}</span>
                  <span className="pct">{total ? Math.round((r.value / total) * 100) : 0}%</span>
                  <span className="val">{pkr(r.value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: 'right', marginTop: 14 }}>
            <button type="button" className="btn-sm" onClick={() => nav('/admin/reports')}>View full report</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Live Visitors (design: .live-*) --------------------------------------- */
function LiveCard({ live }) {
  const nav = useNavigate();
  const topPages = useMemo(() => {
    const feed = live?.feed || [];
    const counts = new Map();
    feed.forEach((f) => { const p = f.path || '/'; counts.set(p, (counts.get(p) || 0) + 1); });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [live]);
  const t = live?.today;
  return (
    <div className="card">
      <div className="live-top">
        <span className="card-t">Live Visitors</span>
        <span className="live-tag"><span className="live-dot" /> Live</span>
      </div>
      <div className="live-num">{live ? live.visitorsNow : '—'}</div>
      <div className="live-sub">Visitors right now</div>
      <div className="today-row">
        <div className="today-cell"><b>{t ? t.sessions : '—'}</b><span>Sessions today</span></div>
        <div className="today-cell"><b>{t ? t.carts : '—'}</b><span>Carts today</span></div>
        <div className="today-cell"><b>{t ? t.checkouts : '—'}</b><span>Checkouts</span></div>
      </div>
      <div className="pages">
        <div className="page-row head"><span>Top Pages</span><span>events</span></div>
        {topPages.length === 0 ? <div className="ovw-empty" style={{ padding: '10px 4px' }}>No traffic recorded yet today.</div>
          : topPages.map(([path, n]) => (
            <div key={path} className="page-row"><span title={path}>{path}</span><span>{n}</span></div>
          ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <button type="button" className="btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => nav('/admin/live')}>View real time</button>
      </div>
    </div>
  );
}

/* ---- Today at a Glance (design: .glance) ------------------------------------ */
function GlanceCard({ d, live, onNotif }) {
  const nav = useNavigate();
  const todayCustomers = useMemo(() => {
    if (!d?.chart?.length || d.scope?.weekly) return null;
    const last = d.chart[d.chart.length - 1];
    return last?.date === d.scope.to ? (last.customers || 0) : null;
  }, [d]);
  const items = [
    { to: '/admin/orders', icon: Calendar, n: live?.today?.orders ?? '—', label: 'New Orders' },
    { to: '/admin/orders', icon: CreditCard, n: d?.stats?.pending ?? '—', label: 'Pending Orders' },
    { to: '/admin/ops/inventory', icon: Package, n: d?.stats?.lowStockCount ?? '—', label: 'Low Stock Alerts' },
    { to: '/admin/customers', icon: Users, n: todayCustomers ?? '—', label: 'New Customers' },
  ];
  return (
    <div className="card">
      <div className="card-h"><span className="card-t">Today at a Glance</span></div>
      <div className="glance">
        {items.map((it) => (
          <Link key={it.label} to={it.to} className="g-item">
            <div className="g-ico"><it.icon size={14} strokeWidth={1.6} /></div>
            <b>{it.n}</b><span>{it.label}</span>
          </Link>
        ))}
      </div>
      <button type="button" className="view-all" onClick={onNotif}>View all notifications →</button>
    </div>
  );
}

/* ---- Top Selling Products (design: .tbl + .prod) ----------------------------- */
function TopProductsTable({ d, q }) {
  const nav = useNavigate();
  const best = useMemo(() => {
    const list = d?.bestSellers || [];
    if (!q) return list;
    return list.filter((b) => b.name.toLowerCase().includes(q));
  }, [d, q]);
  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">Top Selling Products</span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)', cursor: 'pointer' }} onClick={() => nav('/admin/products')}>View all</span>
      </div>
      {best.length === 0 ? <div className="ovw-empty">{q ? 'No products match your search.' : 'No products sold in this period.'}</div> : (
        <table className="tbl">
          <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
          <tbody>
            {best.map((b) => (
              <tr key={b.name} onClick={() => nav('/admin/products')}>
                <td>
                  <div className="prod">
                    {b.image ? <Img src={b.image} alt="" style={{ width: 22, height: 22, borderRadius: 6, objectFit: 'cover', border: '1px solid #efefef', background: '#f5f5f4' }} /> : <span className="prod-ico" aria-hidden>·</span>}
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={b.name}>{b.name}</span>
                  </div>
                </td>
                <td>{b.qty}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{pkr(b.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---- Recent Orders (design: .tbl + badges) ------------------------------------ */
const badgeClass = (s) => (['Delivered', 'Shipped', 'Out for Delivery', 'Ready to Ship'].includes(s)
  ? 'badge-paid'
  : ['Pending', 'Confirmed', 'Processing'].includes(s)
    ? 'badge-pending'
    : 'badge-cancelled');
function RecentOrdersTable({ d, q }) {
  const nav = useNavigate();
  const rows = useMemo(() => {
    const list = d?.recentOrders || [];
    if (!q) return list;
    return list.filter((o) => `${o.orderNumber} ${o.customerInfo?.name || ''}`.toLowerCase().includes(q));
  }, [d, q]);
  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">Recent Orders</span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)', cursor: 'pointer' }} onClick={() => nav('/admin/orders')}>View all</span>
      </div>
      {rows.length === 0 ? <div className="ovw-empty">{q ? 'No orders match your search.' : 'No orders in this period.'}</div> : (
        <table className="tbl">
          <tbody>
            {rows.map((o) => (
              <tr key={o._id} onClick={() => nav(`/admin/orders/${o._id}`)}>
                <td>
                  <div className="prod">
                    <span className="prod-ico">{initials(o.customerInfo?.name)}</span>
                    <span>#{o.orderNumber}</span>
                  </div>
                </td>
                <td style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={o.customerInfo?.name}>{o.customerInfo?.name || 'Customer'}</td>
                <td>{pkr(o.total)}</td>
                <td style={{ textAlign: 'right' }}><span className={`badge ${badgeClass(o.status)}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---- Revenue & Orders (design: .rev-tabs + .rev-chart) -------------------------- */
function RevOrdersCard({ d, compare, dark }) {
  const [mode, setMode] = useState('revenue');
  const kpi = d?.kpis?.[mode];
  const change = typeof kpi?.change === 'number' ? kpi.change : null;
  const p = dark ? PALETTES.dark : PALETTES.light;
  return (
    <div className="card">
      <div className="card-h"><span className="card-t">Revenue &amp; Orders</span></div>
      <div className="rev-tabs">
        <span className={`rev-tab ${mode === 'revenue' ? 'active' : 'idle'}`} role="button" tabIndex={0}
          onClick={() => setMode('revenue')}
          onKeyDown={(e) => { if (e.key === 'Enter') setMode('revenue'); }}>Revenue</span>
        <span className={`rev-tab ${mode === 'orders' ? 'active' : 'idle'}`} role="button" tabIndex={0}
          onClick={() => setMode('orders')}
          onKeyDown={(e) => { if (e.key === 'Enter') setMode('orders'); }}>Orders</span>
        {compare && change !== null && change !== 0 && (
          <span style={{ fontSize: 10, fontWeight: 600, color: change > 0 ? 'var(--green)' : '#dc2626', display: 'flex', alignItems: 'center', gap: 2 }}>
            {change > 0 ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="rev-chart">
        {(!d?.chart?.length) ? <div className="ovw-empty">No data in this period.</div> : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={d.chart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={dark ? '#1d1d21' : '#f5f5f5'} vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={24} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={36}
                tickFormatter={(v) => (mode === 'revenue' ? (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${v}`) : v)} />
              <Tooltip
                cursor={{ fill: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                contentStyle={{ borderRadius: 8, border: 'none', background: dark ? '#111113' : '#111', fontSize: 11, color: '#fff' }}
                labelStyle={{ color: 'rgba(255,255,255,.7)', marginBottom: 4 }}
                formatter={(v) => [mode === 'revenue' ? pkr(v) : Number(v).toLocaleString(), mode === 'revenue' ? 'Revenue' : 'Orders']}
              />
              <Bar dataKey={mode} fill={mode === 'revenue' ? p.bar : p.barAlt} radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ---- Orders Status (design: .orders-flex donut) --------------------------------- */
function StatusDonutCard({ d, dark }) {
  const nav = useNavigate();
  const { segments, total } = useMemo(() => {
    const by = d?.byStatus || {};
    const segs = STATUS_ORDER.filter((s) => by[s]).map((s) => ({ name: s, value: by[s] }));
    return { segments: segs, total: segs.reduce((n, x) => n + x.value, 0) };
  }, [d]);
  return (
    <div className="card">
      <div className="card-h"><span className="card-t">Orders Status</span></div>
      {total === 0 ? <div className="ovw-empty">No orders in this period.</div> : (
        <>
          <div className="orders-flex">
            <div className="orders-donut">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={segments} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="100%" stroke="none">
                    {segments.map((s) => <Cell key={s.name} fill={statusColor(s.name, dark)} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: 'none', background: dark ? '#111113' : '#111', fontSize: 11, color: '#fff' }} formatter={(v, n) => [`${v} orders`, n]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <b style={{ fontSize: 13 }}>{total.toLocaleString()}</b>
                <span style={{ fontSize: 10, color: 'var(--muted)' }}>Total Orders</span>
              </div>
            </div>
            <div className="orders-legend">
              {segments.map((s) => (
                <div key={s.name} className="ol-item">
                  <div className="ol-dot" style={{ background: statusColor(s.name, dark) }} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{Math.round((s.value / total) * 100)}% ({s.value})</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="button" className="btn-sm" onClick={() => nav('/admin/orders')}>View all orders</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---- Customer Overview (design: .cust-*) ------------------------------------------ */
function CustomersCard({ d, segments, dark }) {
  const total = d?.stats?.totalCustomers ?? 0;
  const series = useMemo(() => (d?.chart || []).map((c) => ({ c: c.customers || 0 })), [d]);
  const change = d?.kpis?.customers?.change;
  return (
    <div className="card">
      <div className="card-h"><span className="card-t">Customer Overview</span></div>
      <div className="cust-head">
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)' }}>Total Customers</div>
          <div className="cust-big">{total.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {typeof change === 'number' && change !== 0 ? (
            <div className="cust-growth">
              {change > 0 ? <ArrowUpRight size={10} strokeWidth={2.5} /> : <ArrowDownRight size={10} strokeWidth={2.5} />}
              {' '}{Math.abs(change).toFixed(1)}%
            </div>
          ) : null}
          <div className="cust-sub">in selected period</div>
        </div>
      </div>
      {series.length > 1 ? (
        <div className="cust-line">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line type="monotone" dataKey="c" stroke={dark ? '#F4F4F5' : '#111'} strokeWidth={1.3}
                dot={series.length <= 14 ? { r: 3, fill: dark ? '#111113' : '#fff', stroke: dark ? '#F4F4F5' : '#111', strokeWidth: 1.5 } : false}
                activeDot={{ r: 5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : <div style={{ height: 16 }} />}
      <div className="cust-bottom">
        <div className="cust-b">
          <div style={{ fontSize: 9, color: 'var(--muted)' }}>New Customers</div>
          <b>{(d?.kpis?.customers?.value ?? 0).toLocaleString()}</b>
        </div>
        <div className="cust-b">
          <div style={{ fontSize: 9, color: 'var(--muted)' }}>Returning Customers</div>
          <b>{(segments?.repeat ?? 0).toLocaleString()}</b>
        </div>
      </div>
    </div>
  );
}

/* ---- Top Customers (design: .cat-row bars) ------------------------------------------ */
function TopCustomersCard({ d }) {
  const nav = useNavigate();
  const rows = d?.topCustomers || [];
  const max = rows.reduce((n, c) => Math.max(n, c.spent || 0), 1);
  const [inView, setInView] = useState(false);
  useEffect(() => { const t = setTimeout(() => setInView(true), 150); return () => clearTimeout(t); }, []);
  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">Top Customers</span>
        <span style={{ fontSize: 10.5, color: 'var(--muted)', cursor: 'pointer' }} onClick={() => nav('/admin/customers')}>View all</span>
      </div>
      {rows.length === 0 ? <div className="ovw-empty">No repeat spend yet in this period.</div> : rows.map((c) => (
        <div key={c.phone} className="cat-row">
          <span className="cat-name" title={c.name}>{c.name}{c.city ? ` · ${c.city}` : ''}</span>
          <div className="cat-bar"><div style={{ width: inView ? `${Math.max(4, Math.round((c.spent / max) * 100))}%` : '0%' }} /></div>
          <span className="cat-val">{pkr(c.spent)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---- Quick Actions (design: .quick, exact labels) ------------------------------------- */
function QuickActionsRow() {
  const actions = [
    { to: '/admin/orders/new', icon: ClipboardList, label: 'Create Order' },
    { to: '/admin/products/new', icon: PackagePlus, label: 'Add Product' },
    { to: '/admin/discounts', icon: Tag, label: 'Add Discount' },
    { to: '/admin/collections', icon: LayoutGrid, label: 'Create Collection' },
    { to: '/admin/email-campaigns', icon: Mail, label: 'Send Email' },
    { to: '/admin/reports', icon: BarChart3, label: 'View Reports' },
    { to: '/admin/ops/inventory', icon: Package, label: 'Inventory Alert' },
    { to: '/admin/questions', icon: Headphones, label: 'Support Ticket' },
  ];
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <div className="card-h"><span className="card-t">Quick Actions</span></div>
      <div className="quick">
        {actions.map((a) => (
          <Link key={a.label} to={a.to} className="q-btn">
            <a.icon size={13} strokeWidth={1.6} /><span>{a.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ---- Smart Insights (design: .insights, data from /dashboard/insights) ----------------- */
const INS_ICONS = { MapPin, TrendingUp, Zap, Clock, Users };
const INS_TITLES = { MapPin: 'Top location', TrendingUp: 'Trend', Zap: 'Performance', Clock: 'Timing', Users: 'Customers' };
function InsightsRow({ insights }) {
  const list = (insights || []).slice(0, 5);
  if (list.length === 0) return null;
  return (
    <div className="card">
      <div className="card-h"><span className="card-t">• Smart Insights</span></div>
      <div className="insights">
        {list.map((ins) => {
          const Icon = INS_ICONS[ins.icon] || Lightbulb;
          return (
            <div key={ins.id} className="ins-card">
              <div className="ins-left">
                <div className="ins-ico"><Icon size={13} strokeWidth={1.6} /></div>
                <div style={{ minWidth: 0 }}>
                  <b>{INS_TITLES[ins.icon] || 'Insight'}</b>
                  <p>{ins.text}</p>
                  {ins.hint ? <p style={{ color: 'var(--muted2)' }}>{ins.hint}</p> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Notifications modal (design: .modal, real alerts) ---------------------------------- */
function NotifModal({ open, alerts, onClose }) {
  if (!open) return null;
  const list = alerts || [];
  return (
    <div className="modal show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={{ maxWidth: 460 }}>
        <h3>Notifications {list.length ? `(${list.length} new)` : ''}</h3>
        {list.length === 0 ? (
          <p>You&apos;re all caught up — nothing needs your attention right now.</p>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
            {list.map((a) => (
              <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.title}</div>
                  {a.detail ? <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{a.detail}</div> : null}
                </div>
                <Link to={a.link || '#'} onClick={onClose} className="btn-sm" style={{ flexShrink: 0 }}>{a.cta || 'Open'}</Link>
              </div>
            ))}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * MAIN
 * ======================================================================== */
export default function Overview() {
  const { auth, logout, toast } = useApp();
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
  const [q, setQ] = useState('');
  const [compare, setCompare] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const addRef = useRef(null);

  /* Add New dropdown — close on outside click / Esc */
  useEffect(() => {
    if (!addOpen) return undefined;
    const onDoc = (e) => { if (addRef.current && !addRef.current.contains(e.target)) setAddOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setAddOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); };
  }, [addOpen]);

  /* Date range — persisted to localStorage + URL (same pattern as before). */
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
    const qs = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  };

  /* Equal-length window before the selected range — the API's own comparison basis. */
  const prevWindow = useMemo(() => {
    const from = parseLocal(range.from);
    const to = parseLocal(range.to);
    const spanDays = Math.max(1, Math.round((to - from) / DAY) + 1);
    const pTo = new Date(from.getTime() - DAY);
    const pFrom = new Date(pTo.getTime() - (spanDays - 1) * DAY);
    return { from: iso(pFrom), to: iso(pTo), days: spanDays };
  }, [range]);

  const rangeLabel = `${fmtDay(range.from)} – ${fmtDay(range.to)}`;
  const compareLabel = !compare
    ? 'Compare: Off'
    : prevWindow.days === 7 ? 'Compare: Previous 7 days'
      : prevWindow.days === 30 ? 'Compare: Previous 30 days'
        : range.preset === 'this-year' ? 'Compare: Same period last year'
          : 'Compare: Previous period';
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
  useEffect(() => {
    if (!auth?.token) return undefined;
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [auth, range]);

  /* Live polling — same cadence as Live View. */
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

  /* Escape closes modals (design shortcut). */
  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') { setNotifOpen(false); setAddOpen(false); } };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().then(() => toast('Fullscreen ON')).catch(() => toast('Fullscreen not supported'));
    } else {
      document.exitFullscreen?.();
      toast('Fullscreen OFF');
    }
  };

  const onSearchKey = (e) => {
    if (e.key === 'Enter' && q.trim()) toast(`Searching: ${q.trim()}`);
  };

  /* Real conversion: today's checkouts / today's sessions (live endpoint). */
  const conversion = (() => {
    const t = live?.today;
    if (!t || !t.sessions) return 0;
    return Math.round((t.checkouts / t.sessions) * 1000) / 10;
  })();

  if (err) {
    return (
      <AdminLayout title="Overview">
        <div className="ovw">
          <div className="card" style={{ display: 'grid', placeItems: 'center', padding: '56px 24px', textAlign: 'center' }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>{err}</p>
              <button type="button" className="btn-sm" onClick={() => { setErr(''); load(); }}>
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Overview">
      <div className="ovw">
        {/* ── topbar ─────────────────────────────────────────────────────── */}
        <div className="topbar">
          <div className="top-left">
            <div className="top-title">
              <h1>Overview</h1>
              <p>Here&apos;s what&apos;s happening with your store today.</p>
            </div>
          </div>
          <div className="top-right">
            <div className="search" onClick={() => toast('Type to filter products & orders')} role="button" tabIndex={0}>
              <Search size={14} style={{ color: '#9ca3af' }} aria-hidden />
              <input value={q} placeholder="Search orders, products, customers..."
                onChange={(e) => setQ(e.target.value)} onKeyUp={onSearchKey} onFocus={(e) => e.target.select()} />
              <span className="kbd">⌘ K</span>
            </div>
            <Pill
              icon={Calendar}
              label={rangeLabel}
              options={presetOptions}
              selected={range.preset}
              onSelect={(key) => { const r = resolvePreset(key); if (r) applyRange({ preset: key, ...r }); }}
            />
            <Pill
              icon={TrendingUp}
              label={compareLabel}
              options={[
                { key: 'on', label: 'Previous period' },
                { key: 'off', label: 'No comparison' },
              ]}
              selected={compare ? 'on' : 'off'}
              onSelect={(key) => setCompare(key === 'on')}
            />
            <div style={{ position: 'relative' }} ref={addRef}>
              <button type="button" className="btn-black" onClick={() => setAddOpen((o) => !o)}>
                <Plus size={12} strokeWidth={2.5} /> Add New
              </button>
              <div className={`dropdown ${addOpen ? 'show' : ''}`} style={{ top: 42 }}>
                <div onClick={() => { setAddOpen(false); window.location.href = '/admin/orders/new'; }}>Create Order</div>
                <div onClick={() => { setAddOpen(false); window.location.href = '/admin/products/new'; }}>Add Product</div>
                <div onClick={() => { setAddOpen(false); window.location.href = '/admin/promotions/new'; }}>New Promo</div>
              </div>
            </div>
            <button type="button" className="icon-btn" onClick={() => setNotifOpen(true)} aria-label="Notifications">
              <Bell size={16} strokeWidth={1.8} />
              {alerts && alerts.length > 0 ? <div className="badge">{alerts.length}</div> : null}
            </button>
            <button type="button" className="icon-btn" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
              <Maximize size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── KPI stats ──────────────────────────────────────────────────── */}
        {d ? (
          <>
            <div className="stats">
              <StatCard icon={DollarSign} label="Total Sales" value={d.kpis?.revenue?.value || 0} change={d.kpis?.revenue?.change} format="money" spark={(d.chart || []).map((c) => c.revenue)} vsLabel={`vs ${fmtDay(prevWindow.from)} – ${fmtDay(prevWindow.to)}`} dark={dark} />
              <StatCard icon={ShoppingCart} label="Orders" value={d.kpis?.orders?.value || 0} change={d.kpis?.orders?.change} spark={(d.chart || []).map((c) => c.orders)} vsLabel={`vs ${fmtDay(prevWindow.from)} – ${fmtDay(prevWindow.to)}`} dark={dark} />
              <StatCard icon={Users} label="Customers" value={d.kpis?.customers?.value || 0} change={d.kpis?.customers?.change} spark={(d.chart || []).map((c) => c.customers)} vsLabel="in selected period" dark={dark} />
              <StatCard icon={CreditCard} label="Avg. Order Value" value={d.kpis?.aov?.value || 0} change={d.kpis?.aov?.change} format="money" spark={(d.chart || []).map((c) => (c.orders ? c.revenue / c.orders : 0))} vsLabel={`vs ${fmtDay(prevWindow.from)} – ${fmtDay(prevWindow.to)}`} dark={dark} />
              <StatCard icon={TrendingUp} label="Conversion Rate" value={conversion} change={null} format="pct" vsLabel="checkouts / sessions today" dark={dark} />
              <StatCard icon={Eye} label="Net Profit" value={d.kpis?.profit?.value || 0} change={d.kpis?.profit?.change} format="money" vsLabel={`vs ${fmtDay(prevWindow.from)} – ${fmtDay(prevWindow.to)}`} dark={dark} />
            </div>

            <div className="grid3">
              <SalesOverviewCard d={d} prev={prev} compare={compare} dark={dark}
                onRange={(key) => { const r = resolvePreset(key); if (r) applyRange({ preset: key, ...r }); }} />
              <ProductsShareCard d={d} dark={dark} />
              <LiveCard live={live} />
            </div>

            <div className="grid4">
              <GlanceCard d={d} live={live} onNotif={() => setNotifOpen(true)} />
              <TopProductsTable d={d} q={q.trim().toLowerCase()} />
              <RecentOrdersTable d={d} q={q.trim().toLowerCase()} />
            </div>

            <div className="grid4b">
              <RevOrdersCard d={d} compare={compare} dark={dark} />
              <StatusDonutCard d={d} dark={dark} />
              <CustomersCard d={d} segments={segments} dark={dark} />
              <TopCustomersCard d={d} />
            </div>

            <QuickActionsRow />
            <InsightsRow insights={smart} />
          </>
        ) : (
          /* skeleton (design: .skeleton shimmer) */
          <>
            <div className="stats">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 108 }} />)}
            </div>
            <div className="grid3">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 280 }} />)}
            </div>
            <div className="grid4">
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 240 }} />)}
            </div>
            <div className="skeleton" style={{ height: 64, marginBottom: 10 }} />
          </>
        )}

        <NotifModal open={notifOpen} alerts={alerts} onClose={() => setNotifOpen(false)} />
      </div>
    </AdminLayout>
  );
}
