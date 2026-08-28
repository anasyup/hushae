import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  AlertTriangle, BadgePercent, BarChart3, Bell, Calendar,
  CircleDollarSign, CreditCard, FolderPlus, Mail, Maximize2, Package, PackagePlus,
  Plus, RefreshCw, Search, ShoppingBag, Sparkles, TrendingUp, Users, Wallet,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import RangePicker, { RANGE_PRESETS, resolvePreset } from './dashboard/RangePicker';
import './overview-atelier.css';

const INK = '#111111';
const GRID = '#F2F2F2';
const CHANNEL_COLORS = [INK, '#555555', '#8A8A8A', '#D6D6D6'];
const STATUS_COLORS = { Delivered: INK, Processing: '#6B7280', Pending: '#B5B5B5', Cancelled: '#E5E7EB' };

class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-[120px] place-items-center text-center" role="alert">
          <p className="text-[11px] font-semibold">Couldn&apos;t render this chart</p>
          <button type="button" onClick={() => this.setState({ failed: false })} className="ov-btn mt-2">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const tipStyle = { borderRadius: 10, border: '1px solid #ECECEC', fontSize: 11, padding: '6px 9px' };

function Spark({ data }) {
  if (!data?.length) return <div style={{ width: 78, height: 28 }} />;
  return (
    <div style={{ width: 78, height: 28 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.4} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Delta({ change }) {
  if (typeof change !== 'number' || !Number.isFinite(change) || change === 0) return null;
  const up = change > 0;
  return (
    <span className={up ? 'ov-up' : 'ov-down'}>
      {up ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
    </span>
  );
}

const QUICK = [
  { to: '/admin/orders/new', icon: PackagePlus, label: 'Create Order' },
  { to: '/admin/products/new', icon: Package, label: 'Add Product' },
  { to: '/admin/discounts', icon: BadgePercent, label: 'Add Discount' },
  { to: '/admin/collections', icon: FolderPlus, label: 'Create Collection' },
  { to: '/admin/email-campaigns', icon: Mail, label: 'Send Email' },
  { to: '/admin/reports', icon: BarChart3, label: 'View Reports' },
  { to: '/admin/products?stock=low', icon: Bell, label: 'Inventory Alert' },
  { to: '/admin/questions', icon: Mail, label: 'Support Ticket' },
];

export default function Dashboard() {
  const { auth, logout } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [live, setLive] = useState(null);
  const [smart, setSmart] = useState([]);
  const [abandoned, setAbandoned] = useState(null);
  const [q, setQ] = useState('');
  const rootRef = useRef(null);

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
    const r = resolvePreset('7d');
    return { preset: '7d', from: r.from, to: r.to };
  });

  const applyRange = (r) => {
    setRange(r);
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(r)); } catch { /* ignore */ }
    const sp = new URLSearchParams(window.location.search);
    if (r.preset === 'custom') { sp.set('from', r.from); sp.set('to', r.to); }
    else { sp.delete('from'); sp.delete('to'); }
    const qs = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  };

  const load = async (silent = false) => {
    try {
      const qs = `from=${range.from}&to=${range.to}`;
      const token = auth?.token;
      const [data, liveData, sm, carts] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token }),
        api('/track/admin/live', { token }).catch(() => null),
        api('/dashboard/insights', { token }).catch(() => null),
        api('/abandoned-cart/admin?status=open', { token }).catch(() => null),
      ]);
      setD(data);
      setLive(liveData);
      setSmart(sm?.insights || []);
      setAbandoned(carts);
      setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      if (!silent) setErr('Failed to load dashboard.');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [auth, range.from, range.to]);
  useEffect(() => {
    if (!auth?.token) return undefined;
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [auth, range.from, range.to]);

  const toggleFs = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  useLayoutEffect(() => {
    if (!d || !rootRef.current) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const ctx = gsap.context(() => {
      gsap.from('.ov-stat', { y: 12, opacity: 0, stagger: 0.05, duration: 0.45, ease: 'power3.out' });
      gsap.from('.ov-grid3 .ov-card, .ov-grid4 .ov-card, .ov-grid4b .ov-card, .ov-mt', {
        y: 16, opacity: 0, stagger: 0.055, duration: 0.5, delay: 0.18, ease: 'power3.out',
      });
    }, rootRef);
    return () => ctx.revert();
  }, [d]);

  const shell = (children) => (
    <AdminLayout title="Overview" hideContentTitle>
      <div className="ov-outer"><div className="ov-wrap" ref={rootRef}>{children}</div></div>
    </AdminLayout>
  );

  const k = d?.kpis || {};
  const chart = d?.chart || [];
  const sparkRev = chart.map((x) => ({ v: x.revenue || 0 }));
  const sparkOrd = chart.map((x) => ({ v: x.orders || 0 }));
  const sparkCust = chart.map((x) => ({ v: x.customers || 0 }));
  const sparkAov = chart.map((x) => ({ v: x.orders ? (x.revenue || 0) / x.orders : 0 }));
  const sessions = live?.today?.sessions || 0;
  const conversion = sessions > 0 ? ((live?.today?.orders || 0) / sessions) * 100 : 0;
  const vs = 'vs previous period';
  const rangeLabel = range.preset === 'custom'
    ? `${range.from} – ${range.to}`
    : (RANGE_PRESETS.find((p) => p.key === range.preset)?.label || 'This period');

  const channels = useMemo(() => {
    const total = k.revenue?.value || 0;
    const devices = live?.byDevice || [];
    const sum = devices.reduce((n, x) => n + (x.sessions || 0), 0) || 1;
    const labelOf = (dev) => (dev === 'mobile' ? 'Mobile App' : dev === 'tablet' ? 'Tablet' : 'Online Store');
    if (!devices.length) return [{ name: 'Online Store', pct: 100, amount: total, color: CHANNEL_COLORS[0] }];
    return devices.map((x, i) => ({
      name: labelOf(x.device),
      pct: (x.sessions / sum) * 100,
      amount: total * (x.sessions / sum),
      color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
    })).sort((a, b) => b.pct - a.pct);
  }, [live, k.revenue?.value]);

  const statusMix = useMemo(() => {
    const s = d?.stats || {};
    const processing = (s.confirmed || 0) + (s.processing || 0) + (s.readyToShip || 0) + (s.shipped || 0);
    const rows = [
      { name: 'Delivered', value: s.delivered || 0 },
      { name: 'Processing', value: processing },
      { name: 'Pending', value: s.pending || 0 },
      { name: 'Cancelled', value: s.cancelled || 0 },
    ].filter((x) => x.value > 0).map((x) => ({ ...x, color: STATUS_COLORS[x.name] }));
    const total = rows.reduce((n, x) => n + x.value, 0) || (k.orders?.value || 0);
    return { total, rows: rows.map((x) => ({ ...x, pct: total ? (x.value / total) * 100 : 0 })) };
  }, [d, k.orders?.value]);

  if (err) {
    return shell(
      <div className="ov-card" style={{ textAlign: 'center', padding: 40 }}>
        <AlertTriangle size={20} />
        <p style={{ fontWeight: 700, marginTop: 8 }}>{err}</p>
        <button type="button" className="ov-black" style={{ marginTop: 16 }} onClick={() => { setErr(''); load(); }}>Try again</button>
      </div>,
    );
  }
  if (!d) {
    return shell(<div className="ov-stats">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ov-sk" />)}</div>);
  }

  const hourly = d.hourly || [];
  const liveMax = Math.max(1, ...hourly.map((x) => x.orders || 0));
  const todayOrders = hourly.reduce((n, h) => n + (h.orders || 0), 0);
  const lowStock = d.lowStock || [];
  const topProducts = (d.bestSellers || []).slice(0, 5);
  const recent = (d.recentOrders || []).slice(0, 5);
  const needle = q.trim().toLowerCase();
  const prodRows = needle ? topProducts.filter((p) => String(p.name).toLowerCase().includes(needle)) : topProducts;
  const orderRows = needle ? recent.filter((o) => `${o.orderNumber} ${o.customerInfo?.name}`.toLowerCase().includes(needle)) : recent;
  const catMap = new Map();
  topProducts.forEach((p) => {
    const key = p.category || p.name || 'Other';
    catMap.set(key, (catMap.get(key) || 0) + (p.revenue || 0));
  });
  const catBars = [...catMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const catMax = Math.max(1, ...catBars.map(([, v]) => v));
  const peakDay = chart.reduce((best, row) => ((row.revenue || 0) > (best?.revenue || 0) ? row : best), null);
  const alerts = todayOrders + (d.stats?.pending || 0) + lowStock.length;
  const feed = live?.feed || [];
  const pageMap = new Map();
  feed.forEach((e) => { const p = e.path || '/'; pageMap.set(p, (pageMap.get(p) || 0) + 1); });
  const topPages = [...pageMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const pages = topPages.length ? topPages : [['/', live?.visitorsNow || 0], ['/collections', 0], ['/cart', 0]];

  const kpis = [
    { icon: CircleDollarSign, label: 'Total Sales', val: pkr(k.revenue?.value || 0), change: k.revenue?.change, spark: sparkRev, to: '/admin/analytics' },
    { icon: ShoppingBag, label: 'Orders', val: Number(k.orders?.value || 0).toLocaleString(), change: k.orders?.change, spark: sparkOrd, to: '/admin/orders' },
    { icon: Users, label: 'Customers', val: Number(k.customers?.value || 0).toLocaleString(), change: k.customers?.change, spark: sparkCust, to: '/admin/customers' },
    { icon: CreditCard, label: 'Avg. Order Value', val: pkr(k.aov?.value || 0), change: k.aov?.change, spark: sparkAov, to: '/admin/analytics' },
    { icon: TrendingUp, label: 'Conversion Rate', val: `${conversion.toFixed(2)}%`, change: null, spark: sparkOrd, to: '/admin/live' },
    { icon: Wallet, label: 'Net Profit', val: pkr(k.profit?.value || 0), change: k.profit?.change, spark: sparkRev, to: '/admin/finance' },
  ];

  const insightCards = [
    { title: 'High Demand', body: smart.find((x) => x.id === 'product-momentum')?.text || (topProducts[0] ? `“${topProducts[0].name}” is leading units sold.` : 'Sales momentum appears once orders land.'), to: '/admin/products' },
    { title: 'Low Stock', body: lowStock.length ? `${lowStock.length} product${lowStock.length === 1 ? '' : 's'} running low.` : 'All tracked products are stocked.', to: '/admin/products?stock=low' },
    { title: 'Abandoned Carts', body: abandoned?.stats?.openCount ? `${abandoned.stats.openCount} carts pending recovery.` : 'No open carts waiting.', to: '/admin/abandoned-carts' },
    { title: 'Best Selling Day', body: peakDay && peakDay.revenue ? `${peakDay.label} generated the highest sales.` : 'Best day appears once orders land.', to: '/admin/analytics' },
    { title: 'Conversion Boost', body: sessions ? `Conversion is ${conversion.toFixed(2)}% today from ${sessions} sessions.` : 'Appears once storefront traffic is tracked.', to: '/admin/live' },
  ];

  return shell(
    <>
      <div className="ov-head">
        <div>
          <h1>Overview</h1>
          <p>Here&apos;s what&apos;s happening with your store today.</p>
        </div>
        <div className="ov-head-right">
          <label className="ov-search">
            <Search size={14} color="#9CA3AF" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders, products, customers…" aria-label="Search on this page" />
          </label>
          <RangePicker value={range} onChange={applyRange} />
          <Link to="/admin/products/new" className="ov-black">
            <Plus size={12} /> Add New
          </Link>
          <Link to="/admin/inbox" className="ov-icon" title="Alerts">
            <Bell size={16} />
            {alerts > 0 && <span className="ov-badge">{alerts}</span>}
          </Link>
          <button type="button" className="ov-icon" onClick={toggleFs} title="Fullscreen"><Maximize2 size={14} /></button>
          <button type="button" className="ov-pill" onClick={() => load()}><RefreshCw size={12} /> {rangeLabel}</button>
        </div>
      </div>

      <div className="ov-stats">
        {kpis.map((x) => (
          <Link key={x.label} to={x.to} className="ov-stat">
            <div className="ov-stat-l"><x.icon size={14} strokeWidth={1.6} /> {x.label}</div>
            <div className="ov-stat-v">{x.val}</div>
            <div className="ov-stat-f">
              <div><Delta change={x.change} /><p className="ov-vs">{vs}</p></div>
              <Spark data={x.spark} />
            </div>
          </Link>
        ))}
      </div>

      <div className="ov-grid3">
        <section className="ov-card">
          <h2 className="ov-card-t">Sales Overview</h2>
          <p className="ov-legend"><span><b /> This period</span></p>
          <ChartBoundary>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip contentStyle={tipStyle} formatter={(v) => [pkr(v), 'Sales']} />
                  <Line type="monotone" dataKey="revenue" stroke={INK} strokeWidth={2.2} dot={{ r: 3, fill: INK }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBoundary>
        </section>

        <section className="ov-card">
          <h2 className="ov-card-t">Sales by Channel</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: 138, height: 138, flexShrink: 0 }}>
              <ChartBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channels} dataKey="amount" innerRadius={48} outerRadius={68} paddingAngle={1} stroke="none">
                      {channels.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartBoundary>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                <div>
                  <b style={{ fontSize: 12.5 }}>{pkr(k.revenue?.value || 0)}</b>
                  <div style={{ fontSize: 10, color: '#6B7280' }}>Total Sales</div>
                </div>
              </div>
            </div>
            <ul style={{ flex: 1, margin: 0, padding: 0, listStyle: 'none', fontSize: 11 }}>
              {channels.map((c) => (
                <li key={c.name} style={{ display: 'flex', gap: 8, padding: '4px 0' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: c.color, marginTop: 4 }} />
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: '#6B7280' }}>{c.pct.toFixed(1)}%</span>
                  <b>{pkr(c.amount)}</b>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="ov-card">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h2 className="ov-card-t" style={{ margin: 0 }}>Live Visitors</h2>
            <span style={{ fontSize: 10, color: '#0e9f6e', fontWeight: 600 }}><i className="ov-live-dot" /> Live</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{live?.visitorsNow ?? 0}</div>
          <div style={{ fontSize: 11, color: '#6B7280' }}>Visitors right now</div>
          <div className="ov-bars">
            {(hourly.length ? hourly : Array.from({ length: 24 }, (_, i) => ({ hour: i, orders: 0 }))).map((h) => (
              <i key={h.hour} style={{ height: `${8 + ((h.orders || 0) / liveMax) * 26}px` }} />
            ))}
          </div>
          {pages.map(([path, n]) => (
            <div key={path} className="ov-page"><span>{path}</span><span>{n}</span></div>
          ))}
          <Link to="/admin/live" className="ov-btn" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>View real time</Link>
        </section>
      </div>

      <div className="ov-grid4">
        <section className="ov-card">
          <h2 className="ov-card-t">Today at a Glance</h2>
          <div className="ov-glance">
            {[
              { n: todayOrders, label: 'New Orders', to: '/admin/orders' },
              { n: d.stats?.pending || 0, label: 'Pending Payments', to: '/admin/verification-queue' },
              { n: lowStock.length, label: 'Low Stock Alerts', to: '/admin/products?stock=low' },
              { n: k.customers?.value || 0, label: 'New Customers', to: '/admin/customers' },
            ].map((g) => (
              <Link key={g.label} to={g.to} className="ov-g"><Calendar size={14} /><b>{Number(g.n).toLocaleString()}</b><span>{g.label}</span></Link>
            ))}
          </div>
        </section>
        <section className="ov-card">
          <div className="ov-card-h">
            <h2 className="ov-card-t">Top Selling Products</h2>
            <Link to="/admin/products" className="ov-more">View all</Link>
          </div>
          {prodRows.length === 0 ? <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>Product sales appear once orders land.</p> : (
            <table className="ov-tbl">
              <thead><tr><th>Product</th><th className="r">Sold</th><th className="r">Revenue</th></tr></thead>
              <tbody>
                {prodRows.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td className="r">{p.qty || 0}</td>
                    <td className="r"><b>{pkr(p.revenue || 0)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="ov-card">
          <div className="ov-card-h">
            <h2 className="ov-card-t">Recent Orders</h2>
            <Link to="/admin/orders" className="ov-more">View all</Link>
          </div>
          {orderRows.length === 0 ? <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>No orders in this period.</p> : (
            <table className="ov-tbl">
              <tbody>
                {orderRows.map((o) => (
                  <tr key={o._id}>
                    <td><Link to={`/admin/orders/${o._id}`} style={{ fontWeight: 700, color: '#111' }}>{o.orderNumber}</Link></td>
                    <td>{o.customerInfo?.name}</td>
                    <td className="r"><b>{pkr(o.total)}</b></td>
                    <td className="r"><span className={o.status === 'Delivered' ? 'ov-paid' : 'ov-pend'}>{o.status === 'Delivered' ? 'Paid' : (o.status || 'Open')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="ov-grid4b">
        <section className="ov-card">
          <h2 className="ov-card-t">Revenue &amp; Orders</h2>
          <ChartBoundary>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#F5F5F5" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip contentStyle={tipStyle} formatter={(v) => [pkr(v), 'Revenue']} />
                  <Bar dataKey="revenue" fill={INK} radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartBoundary>
        </section>
        <section className="ov-card">
          <h2 className="ov-card-t">Orders Status</h2>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 118, height: 118 }}>
              <ChartBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusMix.rows.length ? statusMix.rows : [{ name: 'None', value: 1, color: '#E5E7EB' }]} dataKey="value" innerRadius={41} outerRadius={58} paddingAngle={1} stroke="none">
                      {(statusMix.rows.length ? statusMix.rows : [{ color: '#E5E7EB' }]).map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartBoundary>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
                <div><b>{statusMix.total.toLocaleString()}</b><div style={{ fontSize: 10, color: '#6B7280' }}>Total Orders</div></div>
              </div>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 11, flex: 1 }}>
              {statusMix.rows.map((s) => (
                <li key={s.name} style={{ display: 'flex', gap: 6, padding: '3px 0' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: s.color, marginTop: 4 }} />
                  <span style={{ flex: 1 }}>{s.name}</span>
                  <span style={{ color: '#6B7280' }}>{s.pct.toFixed(0)}% ({s.value})</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className="ov-card">
          <h2 className="ov-card-t">Customer Overview</h2>
          <div style={{ fontSize: 10, color: '#6B7280' }}>Total Customers</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{Number(k.customers?.value || 0).toLocaleString()}</div>
          <ChartBoundary>
            <div style={{ height: 62, margin: '8px 0' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkCust} margin={{ top: 6, right: 2, left: 2, bottom: 2 }}>
                  <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.3} dot={{ r: 2.5, fill: '#fff', stroke: INK }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBoundary>
        </section>
        <section className="ov-card">
          <h2 className="ov-card-t">Top Categories</h2>
          {catBars.length === 0 ? <p style={{ fontSize: 11, color: '#9CA3AF' }}>Category sales appear with orders.</p> : catBars.map(([name, rev]) => (
            <div key={name} className="ov-cat">
              <em>{name}</em>
              <div className="ov-track"><div className="ov-bar" style={{ width: `${(rev / catMax) * 100}%` }} /></div>
              <b>{pkr(rev)}</b>
            </div>
          ))}
        </section>
      </div>

      <section className="ov-card ov-mt">
        <h2 className="ov-card-t">Quick Actions</h2>
        <div className="ov-quick">
          {QUICK.map((a) => (
            <Link key={a.label} to={a.to} className="ov-q"><a.icon size={13} /> {a.label}</Link>
          ))}
        </div>
      </section>

      <section className="ov-card" style={{ marginTop: 10 }}>
        <h2 className="ov-card-t">Smart Insights</h2>
        <div className="ov-insights">
          {insightCards.map((c) => (
            <Link key={c.title} to={c.to} className="ov-ins">
              <Sparkles size={14} />
              <span><b>{c.title}</b><p>{c.body}</p></span>
            </Link>
          ))}
        </div>
      </section>

    </>,
  );
}
