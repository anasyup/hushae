import { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, BadgePercent,
  BarChart3, Bell, Calendar, ChevronDown, CircleDollarSign, CreditCard,
  FolderPlus, Info, Mail, MoreHorizontal, Package, PackagePlus,
  ShoppingBag, ShoppingCart, Sparkles, TrendingUp, Users, Wallet,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import RangePicker, { RANGE_PRESETS, resolvePreset } from './dashboard/RangePicker';

/* ===========================================================================
 * OVERVIEW DASHBOARD — pixel-close to the merchant reference.
 * Live HUSHAE data only. Products are HUSHAE catalogue items, never dummy SKUs.
 * ======================================================================== */

class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-[140px] place-items-center text-center" role="alert">
          <div>
            <p className="text-[12px] font-semibold text-neutral-700">Couldn&apos;t render this chart</p>
            <button type="button" onClick={() => this.setState({ failed: false })} className="mt-2 text-[12px] font-semibold text-neutral-900 underline">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const GREEN = '#16A34A';
const INK = '#111111';
const MUTED = '#6B7280';
const GRID = '#F0F1F4';
const CHANNEL_COLORS = ['#111111', '#6B7280', '#A1A1AA', '#D4D4D8'];
const STATUS_COLORS = { Delivered: '#111111', Processing: '#6B7280', Pending: '#A1A1AA', Cancelled: '#D4D4D8' };

const iso = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const prettyDate = (ymd, withYear = false) => {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString('en-US', withYear
    ? { month: 'short', day: 'numeric', year: 'numeric' }
    : { month: 'short', day: 'numeric' });
};

const rangeLabel = (from, to) => `${prettyDate(from)} – ${prettyDate(to, true)}`;

const prevWindow = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const days = Math.max(1, Math.round((b - a) / 86400000) + 1);
  const prevTo = new Date(a); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: iso(prevFrom), to: iso(prevTo), days };
};

const rs = (n, digits = 2) =>
  `Rs ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;



const tipStyle = {
  borderRadius: 12,
  border: '1px solid #EEEFF2',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(16,24,40,0.08)',
};

function Card({ children, className = '' }) {
  return <div className={`ov-card ${className}`}>{children}</div>;
}

function Delta({ change, suffix = '' }) {
  const has = typeof change === 'number' && Number.isFinite(change) && change !== 0;
  if (!has) return null;
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[12px] font-semibold ${up ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
      {up ? <ArrowUpRight size={12} strokeWidth={2.4} /> : <ArrowDownRight size={12} strokeWidth={2.4} />}
      {Math.abs(change).toFixed(1)}%{suffix}
    </span>
  );
}

function Spark({ data }) {
  if (!data?.length) return <div className="h-9 w-[88px]" />;
  return (
    <div className="h-9 w-[88px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.7} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, change, vs, spark, to }) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[13px] text-[#6B7280]">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#F4F5F7] text-[#111]">
          <Icon size={14} strokeWidth={1.8} />
        </span>
        {label}
      </div>
      <p className="mt-3 text-[22px] font-semibold leading-none tracking-tight text-[#111] tabular-nums">{value}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <Delta change={change} />
          <p className="mt-0.5 truncate text-[11px] text-[#9CA3AF]">{vs}</p>
        </div>
        <Spark data={spark} />
      </div>
    </>
  );
  const cls = 'block p-4 sm:p-5';
  return to
    ? <Card className="transition hover:border-[#E2E4EA]"><Link to={to} className={cls}>{inner}</Link></Card>
    : <Card className={cls}>{inner}</Card>;
}

function WeekMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const options = [
    { key: '7d', label: 'This Week' },
    { key: '30d', label: 'Last 30 days' },
    { key: 'this-month', label: 'This month' },
  ];
  const label = options.find((o) => o.key === value)?.label || 'This Week';
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1 rounded-full border border-[#E7E8EC] bg-white px-2.5 py-1 text-[12px] font-medium text-[#374151]">
        {label} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[#EEEFF2] bg-white py-1 shadow-lg">
          {options.map((o) => (
            <button key={o.key} type="button" onClick={() => { onChange(o.key); setOpen(false); }}
              className={`block w-full px-3 py-1.5 text-left text-[12px] ${value === o.key ? 'font-semibold text-[#111]' : 'text-[#4B5563] hover:bg-[#F7F8FA]'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const options = [
    { key: 'prev', label: 'Previous 7 days' },
    { key: 'period', label: 'Previous period' },
    { key: 'month', label: 'Previous month' },
  ];
  const label = options.find((o) => o.key === value)?.label || 'Previous 7 days';
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[#E7E8EC] bg-white px-3.5 text-[13px] font-medium text-[#374151]">
        Compare: {label} <ChevronDown size={14} className="text-[#9CA3AF]" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-[#EEEFF2] bg-white py-1 shadow-lg">
          {options.map((o) => (
            <button key={o.key} type="button" onClick={() => { onChange(o.key); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-[13px] ${value === o.key ? 'font-semibold text-[#111]' : 'text-[#4B5563] hover:bg-[#F7F8FA]'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateChip({ range, onChange }) {
  return (
    <div className="[&>div>button]:min-h-[38px] [&>div>button]:rounded-full [&>div>button]:border-[#E7E8EC] [&>div>button]:px-3.5 [&>div>button]:text-[13px] [&>div>button]:font-medium">
      <RangePicker value={range} onChange={onChange} />
    </div>
  );
}

function initials(name) {
  return String(name || 'C').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function payTone(o) {
  const pay = String(o.paymentStatus || o.paymentState || '');
  const st = String(o.status || '');
  if (['Paid', 'Verified', 'Confirmed'].includes(pay) || st === 'Delivered') {
    return { label: 'Paid', cls: 'bg-[#E8F8EE] text-[#15803D]' };
  }
  if (pay === 'Pending' || st === 'Pending' || st === 'Confirmed') {
    return { label: 'Pending', cls: 'bg-[#FEF3C7] text-[#B45309]' };
  }
  if (st === 'Cancelled' || st === 'Refunded') {
    return { label: st, cls: 'bg-[#FEE2E2] text-[#B91C1C]' };
  }
  return { label: st || 'Open', cls: 'bg-[#F3F4F6] text-[#4B5563]' };
}

const QUICK = [
  { to: '/admin/orders/new', icon: Calendar, label: 'Create Order' },
  { to: '/admin/products/new', icon: PackagePlus, label: 'Add Product' },
  { to: '/admin/discounts', icon: BadgePercent, label: 'Add Discount' },
  { to: '/admin/collections', icon: FolderPlus, label: 'Create Collection' },
  { to: '/admin/email-campaigns', icon: Mail, label: 'Send Email' },
  { to: '/admin/analytics', icon: BarChart3, label: 'View Reports' },
  { to: '/admin/products?stock=low', icon: Bell, label: 'Inventory Alert' },
  { to: '/admin/questions', icon: Mail, label: 'Support Ticket' },
];

export default function Dashboard() {
  const { auth, logout } = useApp();
  const [d, setD] = useState(null);
  const [prev, setPrev] = useState(null);
  const [live, setLive] = useState(null);
  const [trending, setTrending] = useState([]);
  const [cats, setCats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [insights, setInsights] = useState(null);
  const [smart, setSmart] = useState([]);
  const [abandoned, setAbandoned] = useState(null);
  const [err, setErr] = useState('');
  const [compare, setCompare] = useState('prev');
  const [chartPreset, setChartPreset] = useState('7d');

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
    if (r.preset && r.preset !== 'custom') setChartPreset(r.preset === '30d' || r.preset === 'this-month' ? r.preset : '7d');
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(r)); } catch { /* ignore */ }
    const sp = new URLSearchParams(window.location.search);
    if (r.preset === 'custom') { sp.set('from', r.from); sp.set('to', r.to); }
    else { sp.delete('from'); sp.delete('to'); }
    const q = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
  };

  const onWeek = (key) => {
    const r = resolvePreset(key);
    if (r) applyRange({ preset: key, from: r.from, to: r.to });
  };

  const load = async (silent = false) => {
    try {
      const qs = `from=${range.from}&to=${range.to}`;
      const pw = prevWindow(range.from, range.to);
      const [data, prevData, liveData, trend, catData, cust, ins, sm, carts] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token: auth.token }),
        api(`/admin/dashboard?from=${pw.from}&to=${pw.to}`, { token: auth.token }).catch(() => null),
        api('/track/admin/live', { token: auth.token }).catch(() => null),
        api('/products/trending?limit=5&days=30', { token: auth.token }).catch(() => null),
        api('/categories?all=1').catch(() => null),
        api('/admin/customers', { token: auth.token }).catch(() => null),
        api(`/orders/insights/dashboard?${qs}`, { token: auth.token }).catch(() => null),
        api('/dashboard/insights', { token: auth.token }).catch(() => null),
        api('/abandoned-cart/admin?status=open', { token: auth.token }).catch(() => null),
      ]);
      setD(data);
      setPrev(prevData);
      setLive(liveData);
      setTrending(trend?.products || []);
      setCats(catData?.categories || []);
      setCustomers(cust?.customers || []);
      setInsights(ins);
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
  }, [auth, range.from, range.to]); // eslint-disable-line

  const pw = useMemo(() => prevWindow(range.from, range.to), [range.from, range.to]);
  const vsLabel = `vs ${prettyDate(pw.from)} – ${prettyDate(pw.to)}`;

  const chart = useMemo(() => {
    const cur = d?.chart || [];
    const prv = prev?.chart || [];
    return cur.map((row, i) => ({
      ...row,
      prevRevenue: prv[i]?.revenue ?? 0,
      prevOrders: prv[i]?.orders ?? 0,
    }));
  }, [d, prev]);

  const sparkRev = chart.map((x) => ({ v: x.revenue }));
  const sparkOrd = chart.map((x) => ({ v: x.orders }));
  const sparkCust = chart.map((x) => ({ v: x.customers }));
  const sparkAov = chart.map((x) => ({ v: x.orders ? x.revenue / x.orders : 0 }));
  const sparkProfit = chart.map((x) => ({ v: x.revenue }));
  const sparkConv = chart.map((x) => ({ v: x.orders }));

  const sessions = live?.today?.sessions || 0;
  const ordersTodayLive = live?.today?.orders || 0;
  const conversion = sessions > 0 ? (ordersTodayLive / sessions) * 100 : 0;
  const convChange = null;

  const topProducts = (trending.length ? trending : (d?.bestSellers || [])).slice(0, 5).map((p) => ({
    name: p.name,
    qty: p.unitsSold ?? p.qty ?? 0,
    revenue: p.revenue || 0,
    image: p.images?.[0]?.url || p.image || '',
    slug: p.categorySlug || '',
  }));

  const catName = (slug) => cats.find((c) => c.slug === slug)?.name || slug || 'Collection';
  const catBars = useMemo(() => {
    const map = new Map();
    topProducts.forEach((p) => {
      const key = p.slug || 'other';
      const cur = map.get(key) || { slug: key, name: catName(key), revenue: 0 };
      cur.revenue += Number(p.revenue) || 0;
      map.set(key, cur);
    });
    const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const max = Math.max(1, ...rows.map((r) => r.revenue));
    return rows.map((r) => ({ ...r, pct: (r.revenue / max) * 100 }));
  }, [topProducts, cats]); // eslint-disable-line

  const channels = useMemo(() => {
    const total = d?.kpis?.revenue?.value || 0;
    const devices = live?.byDevice || [];
    const sum = devices.reduce((n, x) => n + (x.sessions || 0), 0) || 1;
    const labelOf = (dev) => (dev === 'mobile' ? 'Mobile' : dev === 'tablet' ? 'Tablet' : 'Online Store');
    if (!devices.length || total <= 0) {
      return [{ name: 'Online Store', pct: 100, amount: total, color: CHANNEL_COLORS[0] }];
    }
    return devices
      .map((x, i) => ({
        name: labelOf(x.device),
        pct: (x.sessions / sum) * 100,
        amount: total * (x.sessions / sum),
        color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
        value: x.sessions,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [live, d]);

  const statusMix = useMemo(() => {
    const s = d?.stats || {};
    const processing = (s.confirmed || 0) + (s.processing || 0) + (s.readyToShip || 0) + (s.shipped || 0);
    const rows = [
      { name: 'Delivered', value: s.delivered || 0 },
      { name: 'Processing', value: processing },
      { name: 'Pending', value: s.pending || 0 },
      { name: 'Cancelled', value: s.cancelled || 0 },
    ].filter((x) => x.value > 0);
    const total = rows.reduce((n, x) => n + x.value, 0) || (d?.kpis?.orders?.value || 0);
    return {
      total,
      rows: rows.map((x) => ({ ...x, color: STATUS_COLORS[x.name], pct: total ? (x.value / total) * 100 : 0 })),
    };
  }, [d]);

  const topPages = useMemo(() => {
    const feed = live?.feed || [];
    const map = new Map();
    feed.forEach((e) => {
      const p = e.path || '/';
      map.set(p, (map.get(p) || 0) + 1);
    });
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (rows.length) return rows.map(([path, n]) => ({ path, n }));
    return [
      { path: '/', n: live?.visitorsNow || 0 },
      { path: '/collections', n: 0 },
      { path: '/cart', n: 0 },
      { path: '/checkout', n: 0 },
    ];
  }, [live]);

  const hourlyBars = (d?.hourly || []).map((h) => ({ ...h, v: h.orders }));
  const todayOrders = (d?.hourly || []).reduce((n, h) => n + (h.orders || 0), 0);
  const pendingPay = insights?.paymentBreakdown?.Pending || 0;
  const lowStockN = (d?.lowStock || []).length;
  const newCustToday = d?.kpis?.customers?.value || 0;

  const totalCustomers = customers.length || d?.kpis?.customers?.value || 0;
  const returning = customers.filter((c) => (c.orders || 0) > 1).length;
  const peakDay = chart.reduce((best, row) => (row.revenue > (best?.revenue || 0) ? row : best), null);

  const insightCards = [
    {
      icon: Sparkles,
      title: 'High Demand',
      body: smart.find((x) => x.id === 'product-momentum')?.text
        || (topProducts[0] ? `“${topProducts[0].name}” is leading units sold this period.` : 'Sales momentum will appear once orders land.'),
      to: '/admin/products',
    },
    {
      icon: Package,
      title: 'Low Stock',
      body: lowStockN > 0
        ? `${lowStockN} product${lowStockN === 1 ? '' : 's'} ${lowStockN === 1 ? 'is' : 'are'} running low on stock.`
        : 'All tracked products are stocked.',
      cta: lowStockN ? 'View products →' : '',
      to: '/admin/products?stock=low',
    },
    {
      icon: ShoppingCart,
      title: 'Abandoned Carts',
      body: abandoned?.stats?.openCount
        ? `${abandoned.stats.openCount} cart${abandoned.stats.openCount === 1 ? '' : 's'} ${abandoned.stats.openCount === 1 ? 'is' : 'are'} pending recovery.`
        : 'No open carts waiting for recovery.',
      cta: abandoned?.stats?.openCount ? 'Recover now →' : '',
      to: '/admin/abandoned-carts',
    },
    {
      icon: Calendar,
      title: 'Best Selling Day',
      body: peakDay
        ? `${peakDay.label} generated the highest sales.`
        : 'Best day will appear once the week has orders.',
      spark: true,
    },
    {
      icon: TrendingUp,
      title: 'Conversion Boost',
      body: sessions
        ? `Your conversion rate is ${conversion.toFixed(2)}% today from ${sessions} session${sessions === 1 ? '' : 's'}.`
        : 'Conversion rate appears once storefront traffic is tracked.',
      to: '/admin/live',
    },
  ];

  if (err) {
    return (
      <AdminLayout title="Overview" subtitle="Here's what's happening with your store today." hideContentTitle>
        <div className="mx-auto grid max-w-md place-items-center rounded-2xl border border-[#E0C6BE] bg-[#F5EDEB] p-10 text-center">
          <AlertTriangle size={22} className="mb-2 text-[#9A5548]" />
          <p className="text-sm text-[#8A4B3F]">{err}</p>
          <button onClick={() => { setErr(''); load(); }} className="mt-4 rounded-full border border-[#D0ABA0] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#8A4B3F]">Try again</button>
        </div>
      </AdminLayout>
    );
  }

  if (!d) {
    return (
      <AdminLayout title="Overview" subtitle="Here's what's happening with your store today." hideContentTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-32 animate-pulse rounded-[18px] bg-white" />)}
        </div>
        <div className="mt-4 h-72 animate-pulse rounded-[18px] bg-white" />
      </AdminLayout>
    );
  }

  const k = d.kpis;
  const headerExtra = (
    <>
      <DateChip range={range} onChange={applyRange} />
      <CompareMenu value={compare} onChange={setCompare} />
    </>
  );

  const weekday = (label, i) => {
    if (chart.length === 7) return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] || label;
    return label;
  };

  return (
    <AdminLayout
      title="Overview"
      subtitle="Here's what's happening with your store today."
      hideContentTitle
      headerExtra={headerExtra}
    >
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Kpi icon={CircleDollarSign} label="Total Sales" value={rs(k.revenue.value)} change={k.revenue.change} vs={vsLabel} spark={sparkRev} to="/admin/analytics" />
        <Kpi icon={ShoppingBag} label="Orders" value={Number(k.orders.value || 0).toLocaleString()} change={k.orders.change} vs={vsLabel} spark={sparkOrd} to="/admin/orders" />
        <Kpi icon={Users} label="Customers" value={Number(k.customers.value || 0).toLocaleString()} change={k.customers.change} vs={vsLabel} spark={sparkCust} to="/admin/customers" />
        <Kpi icon={CreditCard} label="Avg. Order Value" value={rs(k.aov.value)} change={k.aov.change} vs={vsLabel} spark={sparkAov} to="/admin/analytics" />
        <Kpi icon={TrendingUp} label="Conversion Rate" value={`${conversion.toFixed(2)}%`} change={convChange} vs={sessions ? `${sessions} sessions today` : 'vs storefront traffic'} spark={sparkConv} to="/admin/live" />
        <Kpi icon={Wallet} label="Net Profit" value={rs(k.profit?.value || 0)} change={k.profit?.change} vs={vsLabel} spark={sparkProfit} to="/admin/finance" />
      </div>

      {/* Sales / Channel / Live */}
      <div className="mt-4 grid gap-3 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-semibold text-[#111]">Sales Overview</p>
              <Info size={13} className="text-[#9CA3AF]" />
            </div>
            <div className="flex items-center gap-2">
              <WeekMenu value={chartPreset} onChange={onWeek} />
              <button type="button" className="grid h-7 w-7 place-items-center rounded-md text-[#9CA3AF] hover:bg-[#F4F5F7]" aria-label="More"><MoreHorizontal size={16} /></button>
            </div>
          </div>
          <div className="mb-3 flex items-center gap-4 text-[12px] text-[#6B7280]">
            <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-5 bg-[#111]" /> This Period</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-5 bg-[#C4C4C8]" /> Previous Period</span>
          </div>
          <ChartBoundary>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip contentStyle={tipStyle} formatter={(v, n) => [rs(v, 0), n === 'revenue' ? 'This period' : 'Previous']} />
                  <Line type="monotone" dataKey="prevRevenue" stroke="#C4C4C8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="revenue" stroke={INK} strokeWidth={2.2} dot={{ r: 3.5, fill: INK, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBoundary>
        </Card>

        <Card className="flex flex-col p-5 xl:col-span-3">
          <p className="text-[15px] font-semibold text-[#111]">Sales by Channel</p>
          <div className="mt-2 flex flex-1 flex-col items-center justify-center sm:flex-row sm:items-center sm:gap-4 xl:flex-col 2xl:flex-row">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ChartBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channels} dataKey="amount" innerRadius={52} outerRadius={72} paddingAngle={2} stroke="none">
                      {channels.map((c, i) => <Cell key={c.name} fill={c.color || CHANNEL_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartBoundary>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-[15px] font-semibold tabular-nums leading-none text-[#111]">{rs(k.revenue.value, 2)}</p>
                  <p className="mt-1 text-[11px] text-[#9CA3AF]">Total Sales</p>
                </div>
              </div>
            </div>
            <ul className="w-full space-y-2 text-[12px]">
              {channels.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color || CHANNEL_COLORS[i] }} />
                  <span className="flex-1 text-[#4B5563]">{c.name}</span>
                  <span className="tabular-nums text-[#6B7280]">{c.pct.toFixed(1)}%</span>
                  <span className="w-[88px] text-right font-medium tabular-nums text-[#111]">{rs(c.amount, 2)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 flex justify-end">
            <Link to="/admin/analytics" className="rounded-full border border-[#E7E8EC] px-3 py-1 text-[12px] font-medium text-[#374151] hover:bg-[#F7F8FA]">View full report</Link>
          </div>
        </Card>

        <Card className="flex flex-col p-5 xl:col-span-3">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-[#111]">Live Visitors</p>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#16A34A]">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-[#16A34A]" /> Live
            </span>
          </div>
          <p className="mt-3 text-[28px] font-semibold leading-none tabular-nums text-[#111]">{live?.visitorsNow ?? 0}</p>
          <p className="mt-1 text-[12px] text-[#9CA3AF]">Visitors right now</p>
          <div className="mt-3 flex h-10 items-end gap-[3px]">
            {(hourlyBars.length ? hourlyBars : Array.from({ length: 24 }, (_, i) => ({ v: 0, hour: i }))).map((h) => {
              const max = Math.max(1, ...hourlyBars.map((x) => x.v || 0));
              const hgt = 8 + ((h.v || 0) / max) * 32;
              return <span key={h.hour} className="flex-1 rounded-[2px] bg-[#111]" style={{ height: hgt }} />;
            })}
          </div>
          <p className="mt-4 text-[12px] font-semibold text-[#111]">Top Pages</p>
          <ul className="mt-2 flex-1 space-y-1.5 text-[12px]">
            {topPages.map((p) => (
              <li key={p.path} className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[#6B7280]">{p.path}</span>
                <span className="tabular-nums text-[#111]">{p.n}</span>
              </li>
            ))}
          </ul>
          <Link to="/admin/live" className="mt-3 block rounded-full border border-[#E7E8EC] py-1.5 text-center text-[12px] font-medium text-[#374151] hover:bg-[#F7F8FA]">View real time</Link>
        </Card>
      </div>

      {/* Glance / products / orders */}
      <div className="mt-4 grid gap-3 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-3">
          <p className="text-[15px] font-semibold text-[#111]">Today at a Glance</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { icon: Calendar, n: todayOrders, label: 'New Orders', to: '/admin/orders' },
              { icon: Wallet, n: pendingPay, label: 'Pending Payments', to: '/admin/verification-queue' },
              { icon: AlertTriangle, n: lowStockN, label: 'Low Stock Alerts', to: '/admin/products?stock=low' },
              { icon: Users, n: newCustToday, label: 'New Customers', to: '/admin/customers' },
            ].map((t) => (
              <Link key={t.label} to={t.to} className="rounded-2xl border border-[#EEEFF2] px-3 py-4 text-center transition hover:border-[#E2E4EA]">
                <t.icon size={16} className="mx-auto text-[#9CA3AF]" />
                <p className="mt-2 text-[20px] font-semibold tabular-nums text-[#111]">{t.n}</p>
                <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{t.label}</p>
              </Link>
            ))}
          </div>
          <Link to="/admin/orders" className="mt-4 flex items-center justify-center gap-1 text-[12px] font-medium text-[#6B7280] hover:text-[#111]">
            View all notifications <ArrowRight size={12} />
          </Link>
        </Card>

        <Card className="p-5 xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-[#111]">Top Selling Products</p>
            <Link to="/admin/products" className="text-[12px] font-medium text-[#6B7280] hover:text-[#111]">View all</Link>
          </div>
          {topProducts.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#9CA3AF]">HUSHAE sales will land here.</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-[11px] font-medium text-[#9CA3AF]">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 text-right font-medium">Sold</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name} className="border-t border-[#F3F4F6]">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        {p.image
                          ? <Img src={p.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                          : <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F3F4F6] text-[10px] font-semibold">{p.name.slice(0, 1)}</span>}
                        <span className="truncate font-medium text-[#111]">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-[#4B5563]">{p.qty}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums text-[#111]">{rs(p.revenue, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5 xl:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-[#111]">Recent Orders</p>
            <Link to="/admin/orders" className="text-[12px] font-medium text-[#6B7280] hover:text-[#111]">View all</Link>
          </div>
          {(d.recentOrders || []).length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[#9CA3AF]">No orders in this period.</p>
          ) : (
            <ul className="space-y-1">
              {d.recentOrders.slice(0, 5).map((o) => {
                const tone = payTone(o);
                return (
                  <li key={o._id}>
                    <Link to={`/admin/orders/${o._id}`} className="flex items-center gap-2.5 rounded-xl px-1 py-1.5 hover:bg-[#F7F8FA]">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F3F4F6] text-[10px] font-semibold text-[#111]">
                        {initials(o.customerInfo?.name)}
                      </span>
                      <span className="w-[92px] shrink-0 truncate text-[12px] font-semibold text-[#111]">{o.orderNumber}</span>
                      <span className="min-w-0 flex-1 truncate text-[12px] text-[#6B7280]">{o.customerInfo?.name || 'Customer'}</span>
                      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[#111]">{rs(o.total, 2)}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}>{tone.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Revenue / status / customers / categories */}
      <div className="mt-4 grid gap-3 xl:grid-cols-12">
        <Card className="p-5 xl:col-span-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-[#111]">Revenue & Orders</p>
            <WeekMenu value={chartPreset} onChange={onWeek} />
          </div>
          <div className="mb-3 flex items-center gap-3 text-[12px]">
            <span className="inline-flex items-center gap-1.5 text-[#111]"><span className="h-2 w-2 rounded-sm bg-[#111]" /> Revenue</span>
            <span className="inline-flex items-center gap-1.5 text-[#6B7280]"><span className="h-2 w-2 rounded-sm bg-[#D1D5DB]" /> Orders</span>
            <Delta change={k.revenue.change} />
          </div>
          <ChartBoundary>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart.map((row, i) => ({ ...row, day: weekday(row.label, i) }))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tipStyle} formatter={(v, n) => [n === 'revenue' ? rs(v, 0) : v, n === 'revenue' ? 'Revenue' : 'Orders']} />
                  <Bar yAxisId="l" dataKey="revenue" fill={INK} radius={[6, 6, 0, 0]} barSize={18} />
                  <Line yAxisId="r" type="monotone" dataKey="orders" stroke="#D1D5DB" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartBoundary>
        </Card>

        <Card className="p-5 xl:col-span-3">
          <p className="text-[15px] font-semibold text-[#111]">Orders Status</p>
          <div className="mt-2 flex flex-col items-center">
            <div className="relative h-[150px] w-[150px]">
              <ChartBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusMix.rows.length ? statusMix.rows : [{ name: 'None', value: 1, color: '#E5E7EB' }]} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                      {(statusMix.rows.length ? statusMix.rows : [{ color: '#E5E7EB' }]).map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartBoundary>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-[20px] font-semibold tabular-nums leading-none text-[#111]">{statusMix.total.toLocaleString()}</p>
                  <p className="mt-1 text-[11px] text-[#9CA3AF]">Total Orders</p>
                </div>
              </div>
            </div>
            <ul className="mt-2 w-full space-y-1.5 text-[12px]">
              {statusMix.rows.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1 text-[#4B5563]">{s.name}</span>
                  <span className="tabular-nums text-[#6B7280]">{s.pct.toFixed(0)}%</span>
                  <span className="tabular-nums text-[#111]">({s.value})</span>
                </li>
              ))}
            </ul>
            <Link to="/admin/orders" className="mt-3 inline-flex items-center gap-1 rounded-full border border-[#E7E8EC] px-3 py-1 text-[12px] font-medium text-[#374151]">
              View all orders <ChevronDown size={12} />
            </Link>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-3">
          <p className="text-[15px] font-semibold text-[#111]">Customer Overview</p>
          <div className="mt-3 flex items-start justify-between">
            <div>
              <p className="text-[12px] text-[#9CA3AF]">Total Customers</p>
              <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums text-[#111]">{totalCustomers.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <Delta change={k.customers.change} />
              <p className="mt-0.5 text-[11px] text-[#9CA3AF]">{vsLabel}</p>
            </div>
          </div>
          <div className="mt-3 h-16">
            <ChartBoundary>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkCust} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                  <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.8} dot={{ r: 2.5, fill: INK }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBoundary>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[#F3F4F6] pt-3">
            <div>
              <p className="text-[11px] text-[#9CA3AF]">New Customers</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#111]">{Number(k.customers.value || 0).toLocaleString()}</p>
              <Delta change={k.customers.change} />
            </div>
            <div>
              <p className="text-[11px] text-[#9CA3AF]">Returning Customers</p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-[#111]">{returning.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[15px] font-semibold text-[#111]">Top Categories</p>
            <Link to="/admin/categories" className="text-[12px] font-medium text-[#6B7280] hover:text-[#111]">View all</Link>
          </div>
          {catBars.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-[#9CA3AF]">Category sales appear with orders.</p>
          ) : (
            <ul className="space-y-3">
              {catBars.map((c) => (
                <li key={c.slug}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="truncate text-[#374151]">{c.name}</span>
                    <span className="ml-2 shrink-0 font-medium tabular-nums text-[#111]">{rs(c.revenue, 2)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F3F4F6]">
                    <div className="h-full rounded-full bg-[#111]" style={{ width: `${c.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick actions */}
      <div className="mt-5">
        <p className="text-[15px] font-semibold text-[#111]">Quick Actions</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK.map((a) => (
            <Link key={a.label} to={a.to}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-[#E7E8EC] bg-white px-4 text-[13px] font-medium text-[#374151] transition hover:border-[#D1D5DB] hover:bg-[#FAFAFB]">
              <a.icon size={14} strokeWidth={1.8} className="text-[#6B7280]" /> {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Smart insights */}
      <div className="mt-5">
        <p className="text-[15px] font-semibold text-[#111]">Smart Insights</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {insightCards.map((c) => {
            const Inner = (
              <div className="flex h-full items-start gap-3 p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F4F5F7] text-[#111]">
                  <c.icon size={15} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#111]">{c.title}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#6B7280]">{c.body}</p>
                  {c.cta && <p className="mt-2 text-[12px] font-medium text-[#111]">{c.cta}</p>}
                </div>
                {c.spark && (
                  <div className="flex h-8 items-end gap-0.5 self-center">
                    {[8, 14, 10, 18, 12].map((h, i) => <span key={i} className="w-1.5 rounded-sm bg-[#111]" style={{ height: h }} />)}
                  </div>
                )}
                {c.to && !c.cta && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center self-center rounded-full bg-[#111] text-white">
                    <ArrowRight size={13} />
                  </span>
                )}
              </div>
            );
            return c.to
              ? <Card key={c.title} className="transition hover:border-[#E2E4EA]"><Link to={c.to}>{Inner}</Link></Card>
              : <Card key={c.title}>{Inner}</Card>;
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
