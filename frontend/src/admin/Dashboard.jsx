import { Component, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, BadgePercent, BarChart3, Bell, Calendar,
  Check, ChevronDown, ChevronRight, CircleDollarSign, CreditCard, FolderPlus,
  Mail, Maximize2, Minimize2, Package, PackagePlus, Plus, Search, ShoppingBag, ShoppingCart,
  Sparkles, Star, TrendingUp, Users, Wallet,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import RangePicker, { resolvePreset } from './dashboard/RangePicker';

/* ============================================================================
 * OVERVIEW — rebuilt from the approved reference layout (overview_perfect_final).
 * Layout, density and micro-interactions follow the reference 1:1:
 *   1580px wrap · 10px gaps · 12px radii · 13px body · sticky page topbar
 *   (search / date / compare / add / notifications / fullscreen) · 6 KPI cards
 *   with count-up + sparklines · 3-up chart row · 3-up desk row · 4-up row ·
 *   8-up quick actions · 5-up smart insights.
 * Data is 100% live HUSHAE data (PKR), never demo numbers.
 * The reference's sidebar hamburger is intentionally not rendered here — the
 * app sidebar toggle lives in AdminLayout's top bar.
 * ======================================================================== */

const INK = '#111111';
const MUTED = '#6B7280';
const FAINT = '#9CA3AF';
const GRID = '#F2F2F2';
const CHANNEL_COLORS = [INK, '#555555', '#8A8A8A', '#D6D6D6'];
const STATUS_COLORS = { Delivered: INK, Processing: '#6B7280', Pending: '#B5B5B5', Cancelled: '#E5E7EB' };

/* ── scoped styles: animations and effects that have no Tailwind equivalent ─ */
const OVP_CSS = `
.ovp-fade{animation:ovp-fade .5s ease both}
@keyframes ovp-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.ovp-card-in{animation:ovp-card-in .5s cubic-bezier(.22,.8,.36,1) backwards}
@keyframes ovp-card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.ovp-drop{animation:ovp-drop .18s ease both}
@keyframes ovp-drop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.ovp-live-dot{animation:ovp-pulse 2s infinite}
@keyframes ovp-pulse{0%{box-shadow:0 0 0 0 #D1FAE5}70%{box-shadow:0 0 0 6px rgba(209,250,229,0)}100%{box-shadow:0 0 0 0 rgba(209,250,229,0)}}
.ovp-live-num{transition:transform .2s ease}
.ovp-bar{transition:height .6s cubic-bezier(.34,1.56,.64,1)}
.ovp-catbar{transition:width 1.2s cubic-bezier(.34,1.56,.64,1)}
.ovp-hit{animation:ovp-hit 1.5s ease}
@keyframes ovp-hit{0%{background:#FEF3C7}100%{background:transparent}}
.ovp-qa{position:relative;overflow:hidden}
.ovp-qa::before{content:'';position:absolute;inset:0;background:#111;transform:translateY(100%);transition:transform .22s ease;z-index:0}
.ovp-qa:hover::before{transform:translateY(0)}
.ovp-qa:hover{border-color:#111;color:#fff;transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,.08)}
.ovp-qa:hover .ovp-qa-fg{stroke:#fff}
.ovp-qa>span,.ovp-qa>svg{position:relative;z-index:1}
.ovp-ins{position:relative;overflow:hidden}
.ovp-ins::after{content:'';position:absolute;left:0;top:0;bottom:0;width:2px;background:#111;transform:scaleY(0);transition:transform .22s ease}
.ovp-ins:hover::after{transform:scaleY(1)}
.ovp-ins:hover .ovp-ins-ico{background:#111;border-color:#111}
.ovp-ins:hover .ovp-ins-ico svg{stroke:#fff}
.ovp-toast{transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .4s ease}
.ovp-pill-btn{min-height:36px!important;height:36px;border-radius:10px!important;border-color:#ECECEC!important;padding:0 12px!important;font-size:12px!important;font-weight:500!important;box-shadow:0 1px 2px rgba(0,0,0,.03)}
@media (prefers-reduced-motion: reduce){
  .ovp-fade,.ovp-card-in,.ovp-drop,.ovp-live-dot,.ovp-hit{animation:none!important}
  .ovp-bar,.ovp-catbar{transition:none}
}
`;

const tipStyle = {
  borderRadius: 10,
  border: '1px solid #ECECEC',
  fontSize: 11,
  padding: '6px 9px',
  boxShadow: '0 8px 24px rgba(16,24,40,0.10)',
};

/* ── date helpers ─────────────────────────────────────────────────────────── */
const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
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

/* comparison baselines — "previous 7 days" / "previous 30 days" are fixed
   windows, "same period last year" shifts a year, "none" disables the ghost
   line and hides deltas. */
const baselineWindow = (from, to, mode) => {
  if (mode === 'none') return null;
  if (mode === 'prev7') {
    const t = new Date(`${from}T00:00:00`); t.setDate(t.getDate() - 1);
    const f = new Date(t); f.setDate(f.getDate() - 6);
    return { from: iso(f), to: iso(t) };
  }
  if (mode === 'prev30') {
    const t = new Date(`${from}T00:00:00`); t.setDate(t.getDate() - 1);
    const f = new Date(t); f.setDate(f.getDate() - 29);
    return { from: iso(f), to: iso(t) };
  }
  if (mode === 'year') {
    const f = new Date(`${from}T00:00:00`); f.setFullYear(f.getFullYear() - 1);
    const t = new Date(`${to}T00:00:00`); t.setFullYear(t.getFullYear() - 1);
    return { from: iso(f), to: iso(t) };
  }
  return prevWindow(from, to);
};

const rs = (n, digits = 2) =>
  `Rs ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const initials = (name) =>
  String(name || 'C').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

function payTone(o) {
  const pay = String(o.paymentStatus || o.paymentState || '');
  const st = String(o.status || '');
  if (['Paid', 'Verified', 'Confirmed'].includes(pay) || st === 'Delivered') {
    return { label: 'Paid', cls: 'bg-[#ECFDF5] text-[#065F46] border border-[#D1FAE5]' };
  }
  if (pay === 'Pending' || st === 'Pending' || st === 'Confirmed') {
    return { label: 'Pending', cls: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]' };
  }
  if (st === 'Cancelled' || st === 'Refunded') {
    return { label: st, cls: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]' };
  }
  return { label: st || 'Open', cls: 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]' };
}

/* ── primitives ───────────────────────────────────────────────────────────── */
class ChartBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e) { console.error('Chart render error:', e); }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid min-h-[120px] place-items-center text-center" role="alert">
          <div>
            <p className="text-[11px] font-semibold text-neutral-700">Couldn&apos;t render this chart</p>
            <button type="button" onClick={() => this.setState({ failed: false })} className="mt-2 text-[11px] font-semibold text-neutral-900 underline">Retry</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Card({ children, className = '', delay = 0, style }) {
  return (
    <section
      className={`ovp-card-in rounded-xl border border-[#F1F1F1] bg-white p-[14px_16px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-shadow duration-200 hover:shadow-[0_6px_18px_rgba(0,0,0,0.05)] ${className}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
    >
      {children}
    </section>
  );
}

function CardHead({ title, right, info, onInfo }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <h2 className="truncate text-[12.5px] font-bold tracking-[-0.15px] text-[#111]">{title}</h2>
        {info && (
          <button
            type="button"
            onClick={onInfo}
            title={info}
            className="grid h-[14px] w-[14px] shrink-0 place-items-center rounded-full border border-[#DDD] text-[8px] leading-none text-[#888] transition hover:border-[#111] hover:bg-[#111] hover:text-white"
          >
            i
          </button>
        )}
      </div>
      {right}
    </div>
  );
}

function BtnSm({ children, onClick, className = '', title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex h-[26px] items-center gap-1 rounded-lg border border-[#ECECEC] bg-white px-[10px] text-[11px] font-medium text-[#374151] transition hover:-translate-y-px hover:border-[#BBB] hover:bg-[#F9F9F9] active:translate-y-0 ${className}`}
    >
      {children}
    </button>
  );
}

function ViewAll({ to, children }) {
  return (
    <Link
      to={to}
      className="mt-[10px] flex items-center justify-center gap-1 text-[11px] font-semibold text-[#111] transition-all hover:gap-2"
    >
      {children} <ArrowRight size={12} strokeWidth={2.2} />
    </Link>
  );
}

function Delta({ change, className = 'text-[11px]' }) {
  const has = typeof change === 'number' && Number.isFinite(change) && change !== 0;
  if (!has) return null;
  const up = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? 'text-[#0E9F6E]' : 'text-[#DC2626]'} ${className}`}>
      {up ? <ArrowUpRight size={10} strokeWidth={2.6} /> : <ArrowUpRight size={10} strokeWidth={2.6} className="rotate-90" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

/* count-up, matching the reference easing (cubic-out over 1.2s) */
function CountUp({ value, prefix = '', suffix = '', decimals = 0 }) {
  const [shown, setShown] = useState(prefix + (0).toLocaleString() + suffix);
  const raf = useRef(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const dur = 1200;
    const t0 = performance.now();
    const fmt = (n) => prefix + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(fmt(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(step);
      else setShown(fmt(target));
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, prefix, suffix, decimals]);
  return <span className="tabular-nums">{shown}</span>;
}

function Spark({ data }) {
  if (!data?.length) return <div className="h-7 w-[78px]" />;
  return (
    <div className="h-7 w-[78px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
          <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.4} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, decimals, change, vs, spark, to, delay, onClick }) {
  const inner = (
    <>
      <div className="mb-[10px] flex items-center gap-1.5 text-[11px] font-medium text-[#6B7280]">
        <Icon size={14} strokeWidth={1.6} className="shrink-0 text-[#6B7280]" /> {label}
      </div>
      <div className="text-[18px] font-bold leading-none tracking-[-0.3px] text-[#111]">
        <CountUp value={value} prefix={decimals === 0 ? '' : 'Rs '} suffix={decimals === 0 ? '' : ''} decimals={decimals} />
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <Delta change={change} />
          <p className="mt-0.5 truncate text-[10px] text-[#9CA3AF]">{vs}</p>
        </div>
        <Spark data={spark} />
      </div>
    </>
  );
  const cls = 'ovp-card-in block cursor-pointer rounded-xl border border-[#F1F1F1] bg-white p-[12px_14px_10px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition duration-200 hover:-translate-y-[3px] hover:border-[#E0E0E0] hover:shadow-[0_8px_20px_rgba(0,0,0,0.07)]';
  const style = { animationDelay: `${delay}ms` };
  return to
    ? <Link to={to} className={cls} style={style} onClick={onClick}>{inner}</Link>
    : <div className={cls} style={style} onClick={onClick}>{inner}</div>;
}

/* ── quick actions (real admin routes) ────────────────────────────────────── */
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

const ADD_NEW = [
  { to: '/admin/products/new', icon: Package, label: 'New product' },
  { to: '/admin/orders/new', icon: ShoppingBag, label: 'New order' },
  { to: '/admin/promotions/new', icon: Sparkles, label: 'New promotion' },
  { to: '/admin/cms/new', icon: Mail, label: 'New page' },
  { to: '/admin/blog/new', icon: Star, label: 'New blog article' },
];

const COMPARE_OPTIONS = [
  { key: 'prev', label: 'Previous period' },
  { key: 'prev7', label: 'Previous 7 days' },
  { key: 'prev30', label: 'Previous 30 days' },
  { key: 'year', label: 'Same period last year' },
  { key: 'none', label: 'No comparison' },
];

const WEEK_OPTIONS = [
  { key: '7d', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: '30d', label: 'Last 30 Days' },
];

/* ── the page ─────────────────────────────────────────────────────────────── */
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
  const [revTab, setRevTab] = useState('revenue');
  const [q, setQ] = useState('');
  const [hit, setHit] = useState(0);
  const [toast, setToast] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [fs, setFs] = useState(false);

  const toastTimer = useRef(0);
  const addRef = useRef(null);
  const cmpRef = useRef(null);

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

  const say = useCallback((msg) => {
    if (!msg) return;
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const applyRange = useCallback((r) => {
    if (!r?.from || !r?.to) return;
    setRange(r);
    if (r.preset && r.preset !== 'custom') {
      setChartPreset(r.preset === '30d' || r.preset === 'this-month' ? r.preset : '7d');
    }
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(r)); } catch { /* ignore */ }
    const sp = new URLSearchParams(window.location.search);
    if (r.preset === 'custom') { sp.set('from', r.from); sp.set('to', r.to); }
    else { sp.delete('from'); sp.delete('to'); }
    const qs = sp.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, []);

  const onWeek = (key) => {
    const r = resolvePreset(key);
    if (r) applyRange({ preset: key, from: r.from, to: r.to });
  };

  const pw = useMemo(() => baselineWindow(range.from, range.to, compare), [range.from, range.to, compare]);

  const load = useCallback(async (silent = false) => {
    try {
      const qs = `from=${range.from}&to=${range.to}`;
      const prevQs = pw ? `from=${pw.from}&to=${pw.to}` : null;
      const token = auth?.token;
      const [data, prevData, liveData, trend, catData, cust, ins, sm, carts] = await Promise.all([
        api(`/admin/dashboard?${qs}`, { token }),
        prevQs ? api(`/admin/dashboard?${prevQs}`, { token }).catch(() => null) : Promise.resolve(null),
        api('/track/admin/live', { token }).catch(() => null),
        // both are public GETs, which the api client memory-caches for 2 min —
        // the cache key must move with the range or stale rows survive a change
        api(`/products/trending?limit=5&days=30&_t=${range.from}_${range.to}`, { token }).catch(() => null),
        api(`/categories?all=1&_t=${range.from}_${range.to}`).catch(() => null),
        api('/admin/customers', { token }).catch(() => null),
        api(`/orders/insights/dashboard?${qs}`, { token }).catch(() => null),
        api('/dashboard/insights', { token }).catch(() => null),
        api('/abandoned-cart/admin?status=open', { token }).catch(() => null),
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
  }, [auth, range.from, range.to, pw, logout]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!auth?.token) return undefined;
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [auth, load]);

  /* outside-click + Escape + fullscreen state */
  useEffect(() => {
    const onDoc = (e) => {
      if (addRef.current && !addRef.current.contains(e.target)) setAddOpen(false);
      if (cmpRef.current && !cmpRef.current.contains(e.target)) setCmpOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') { setAddOpen(false); setCmpOpen(false); } };
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => say('Fullscreen on'))
        .catch(() => say('Fullscreen not supported in this browser'));
    } else {
      document.exitFullscreen().catch(() => {});
      say('Fullscreen off');
    }
  };

  /* ── derived ────────────────────────────────────────────────────────────── */
  const vsLabel = pw ? `vs ${prettyDate(pw.from)} – ${prettyDate(pw.to)}` : 'no comparison';

  const chart = useMemo(() => {
    const cur = d?.chart || [];
    const prv = prev?.chart || [];
    return cur.map((row, i) => ({
      ...row,
      prevRevenue: prv[i]?.revenue ?? null,
      prevOrders: prv[i]?.orders ?? null,
    }));
  }, [d, prev]);

  const sparkRev = chart.map((x) => ({ v: x.revenue || 0 }));
  const sparkOrd = chart.map((x) => ({ v: x.orders || 0 }));
  const sparkCust = chart.map((x) => ({ v: x.customers || 0 }));
  const sparkAov = chart.map((x) => ({ v: x.orders ? (x.revenue || 0) / x.orders : 0 }));

  const sessions = live?.today?.sessions || 0;
  const conversion = sessions > 0 ? ((live?.today?.orders || 0) / sessions) * 100 : 0;

  const topProducts = (trending.length ? trending : (d?.bestSellers || [])).slice(0, 5).map((p) => ({
    id: p._id || p.slug || p.name,
    name: p.name,
    qty: p.unitsSold ?? p.qty ?? 0,
    revenue: p.revenue || 0,
    image: p.images?.[0]?.url || p.image || '',
    slug: p.categorySlug || '',
  }));

  const catName = useCallback((slug) => cats.find((c) => c.slug === slug)?.name || slug || 'Collection', [cats]);

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
  }, [topProducts, catName]);

  const channels = useMemo(() => {
    const total = d?.kpis?.revenue?.value || 0;
    const devices = live?.byDevice || [];
    const sum = devices.reduce((n, x) => n + (x.sessions || 0), 0) || 1;
    const labelOf = (dev) => (dev === 'mobile' ? 'Mobile' : dev === 'tablet' ? 'Tablet' : 'Online Store');
    if (!devices.length || total <= 0) {
      return [{ name: 'Online Store', pct: 100, amount: total, color: CHANNEL_COLORS[0], value: 0 }];
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
    feed.forEach((e) => { const p = e.path || '/'; map.set(p, (map.get(p) || 0) + 1); });
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (rows.length) return rows.map(([path, n]) => ({ path, n }));
    return [{ path: '/', n: live?.visitorsNow || 0 }, { path: '/collections', n: 0 }, { path: '/cart', n: 0 }, { path: '/checkout', n: 0 }];
  }, [live]);

  const hourlyBars = (d?.hourly || []).map((h) => ({ ...h, v: h.orders || 0 }));
  const liveBars = hourlyBars.length ? hourlyBars : Array.from({ length: 24 }, (_, i) => ({ hour: i, v: 0 }));
  const liveMax = Math.max(1, ...hourlyBars.map((x) => x.v || 0));
  const todayOrders = hourlyBars.reduce((n, h) => n + (h.v || 0), 0);
  const pendingPay = insights?.paymentBreakdown?.Pending || 0;
  const lowStock = d?.lowStock || [];
  const lowStockN = lowStock.length;
  const alerts = todayOrders + pendingPay + lowStockN;

  const totalCustomers = customers.length || d?.kpis?.customers?.value || 0;
  const returning = customers.filter((c) => (c.orders || 0) > 1).length;
  const peakDay = chart.reduce((best, row) => ((row.revenue || 0) > (best?.revenue || 0) ? row : best), null);

  const recentOrders = (d?.recentOrders || []).slice(0, 5).map((o) => ({
    id: o._id,
    num: o.orderNumber,
    name: o.customerInfo?.name || 'Customer',
    total: o.total,
    tone: payTone(o),
  }));

  /* search filters the two desk tables, like the reference */
  const needle = q.trim().toLowerCase();
  const prodRows = needle ? topProducts.filter((p) => p.name.toLowerCase().includes(needle)) : topProducts;
  const orderRows = needle
    ? recentOrders.filter((o) => `${o.num} ${o.name}`.toLowerCase().includes(needle))
    : recentOrders;
  const onSearch = (e) => {
    setQ(e.target.value);
    if (e.key === 'Enter' && e.target.value.trim()) {
      say(prodRows.length + orderRows.length
        ? `${prodRows.length + orderRows.length} match${prodRows.length + orderRows.length === 1 ? '' : 'es'} on this page`
        : 'No match on this page');
      setHit((n) => n + 1);
    }
  };

  const weekday = (label, i) => {
    if (chart.length === 7) return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] || label;
    return label;
  };

  const insightCards = [
    {
      icon: Sparkles,
      title: 'High Demand',
      body: smart.find((x) => x.id === 'product-momentum')?.text
        || (topProducts[0] ? `“${topProducts[0].name}” is leading units sold this period.` : 'Sales momentum appears once orders land.'),
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
        ? `${abandoned.stats.openCount} cart${abandoned.stats.openCount === 1 ? '' : 's'} pending recovery.`
        : 'No open carts waiting for recovery.',
      cta: abandoned?.stats?.openCount ? 'Recover now →' : '',
      to: '/admin/abandoned-carts',
    },
    {
      icon: Calendar,
      title: 'Best Selling Day',
      body: peakDay && (peakDay.revenue || 0) > 0
        ? `${peakDay.label} generated the highest sales.`
        : 'Best day appears once the period has orders.',
      bars: true,
      to: '/admin/analytics',
    },
    {
      icon: TrendingUp,
      title: 'Conversion Boost',
      body: sessions
        ? `Conversion is ${conversion.toFixed(2)}% today from ${sessions} session${sessions === 1 ? '' : 's'}.`
        : 'Conversion appears once storefront traffic is tracked.',
      to: '/admin/live',
    },
  ];

  /* ── error / loading shells ─────────────────────────────────────────────── */
  const shell = (children) => (
    <AdminLayout title="Overview" subtitle="Here's what's happening with your store today." hideContentTitle>
      <style>{OVP_CSS}</style>
      {children}
    </AdminLayout>
  );

  if (err) {
    return shell(
      <div className="mx-auto grid max-w-md place-items-center rounded-xl border border-[#F1F1F1] bg-white p-10 text-center">
        <AlertTriangle size={20} className="mb-2 text-[#B45309]" />
        <p className="text-[12.5px] font-semibold text-[#111]">{err}</p>
        <button type="button" onClick={() => { setErr(''); load(); }} className="mt-4 rounded-[10px] border border-[#ECECEC] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#111] hover:border-[#BBB]">Try again</button>
      </div>,
    );
  }

  if (!d) {
    return shell(
      <div className="ovp-fade">
        <div className="mb-3 h-[52px] animate-pulse rounded-[10px] bg-white" />
        <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-3 3xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-xl bg-white" />)}
        </div>
        <div className="mt-[10px] h-[268px] animate-pulse rounded-xl bg-white" />
        <div className="mt-[10px] h-[180px] animate-pulse rounded-xl bg-white" />
      </div>,
    );
  }

  const k = d.kpis;
  const revData = chart.map((row, i) => ({ ...row, day: weekday(row.label, i) }));

  return shell(
    <div className="ovp-fade">
      {/* ── page topbar ─────────────────────────────────────────────────── */}
      <div className="sticky top-[56px] z-10 -mx-2 mb-4 flex flex-wrap items-center justify-between gap-3 bg-admin-bg/95 px-2 py-2 backdrop-blur">
        <div className="min-w-0">
          <h1 className="text-[16.5px] font-bold leading-tight tracking-[-0.3px] text-[#111]">Overview</h1>
          <p className="mt-px text-[12px] text-[#6B7280]">Here&apos;s what&apos;s happening with your store today.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-[240px] items-center gap-2 rounded-[10px] border border-[#ECECEC] bg-white px-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition focus-within:border-[#111] focus-within:shadow-[0_0_0_3px_rgba(17,17,17,0.08)] sm:min-w-[300px]">
            <Search size={14} strokeWidth={2} className="shrink-0 text-[#9CA3AF]" />
            <input
              value={q}
              onChange={onSearch}
              onKeyUp={onSearch}
              aria-label="Search products and orders on this page"
              placeholder="Search products & orders…"
              className="w-full border-0 bg-transparent text-[12.5px] text-[#111] outline-none placeholder:text-[#9CA3AF]"
            />
            <kbd className="hidden shrink-0 rounded-[5px] border border-[#ECECEC] bg-[#FAFAFA] px-[5px] py-[2px] text-[10px] text-[#9CA3AF] sm:inline">⌘ K</kbd>
          </label>

          <div className="ovp-pill-btn">
            <RangePicker value={range} onChange={applyRange} />
          </div>

          <div className="relative" ref={cmpRef}>
            <button
              type="button"
              onClick={() => setCmpOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={cmpOpen}
              className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] border bg-white px-3 text-[12px] font-medium text-[#374151] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-[#BBB] ${cmpOpen ? 'border-[#111]' : 'border-[#ECECEC]'}`}
            >
              Compare: {COMPARE_OPTIONS.find((o) => o.key === compare)?.label || 'Previous period'}
              <ChevronDown size={12} className="text-[#9CA3AF]" />
            </button>
            {cmpOpen && (
              <div role="menu" className="ovp-drop absolute right-0 top-[42px] z-30 w-[210px] rounded-[10px] border border-[#ECECEC] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                {COMPARE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    role="menuitem"
                    onClick={() => { setCompare(o.key); setCmpOpen(false); say(`Comparison: ${o.label}`); }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[11.5px] transition hover:bg-[#F5F5F5] ${compare === o.key ? 'font-semibold text-[#111]' : 'text-[#374151]'}`}
                  >
                    {o.label}
                    {compare === o.key && <Check size={12} strokeWidth={2.4} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={addRef}>
            <button
              type="button"
              onClick={() => setAddOpen((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[#111] px-[14px] text-[12.5px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition hover:-translate-y-px hover:bg-[#222] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:translate-y-0"
            >
              <Plus size={12} strokeWidth={2.5} /> Add New
            </button>
            {addOpen && (
              <div className="ovp-drop absolute right-0 top-[42px] z-30 w-52 rounded-[10px] border border-[#ECECEC] bg-white p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                {ADD_NEW.map((it) => (
                  <Link
                    key={it.to}
                    to={it.to}
                    onClick={() => setAddOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11.5px] text-[#374151] transition hover:bg-[#F5F5F5] hover:text-[#111]"
                  >
                    <it.icon size={13} strokeWidth={1.7} className="text-[#777]" /> {it.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            to="/admin/verification-queue"
            title="Alerts & verification queue"
            className="relative grid h-9 w-9 place-items-center rounded-[10px] border border-[#ECECEC] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:-translate-y-px hover:border-[#BBB]"
          >
            <Bell size={16} strokeWidth={1.8} className="text-[#111]" />
            {alerts > 0 && (
              <span className="absolute -right-[5px] -top-[5px] grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-admin-bg bg-[#111] px-1 text-[9px] font-bold text-white">
                {alerts}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={fs ? 'Exit fullscreen' : 'Fullscreen'}
            className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#ECECEC] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:-translate-y-px hover:border-[#BBB]"
          >
            {fs ? <Minimize2 size={14} strokeWidth={1.8} className="text-[#111]" /> : <Maximize2 size={14} strokeWidth={1.8} className="text-[#111]" />}
          </button>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-[10px] sm:grid-cols-3 3xl:grid-cols-6">
        <Kpi icon={CircleDollarSign} label="Total Sales" value={k.revenue?.value || 0} decimals={2} change={pw ? k.revenue?.change : null} vs={vsLabel} spark={sparkRev} to="/admin/analytics" delay={50} />
        <Kpi icon={ShoppingBag} label="Orders" value={k.orders?.value || 0} decimals={0} change={pw ? k.orders?.change : null} vs={vsLabel} spark={sparkOrd} to="/admin/orders" delay={100} />
        <Kpi icon={Users} label="Customers" value={k.customers?.value || 0} decimals={0} change={pw ? k.customers?.change : null} vs={vsLabel} spark={sparkCust} to="/admin/customers" delay={150} />
        <Kpi icon={CreditCard} label="Avg. Order Value" value={k.aov?.value || 0} decimals={2} change={pw ? k.aov?.change : null} vs={vsLabel} spark={sparkAov} to="/admin/analytics" delay={200} />
        <Kpi icon={TrendingUp} label="Conversion Rate" value={conversion} decimals={2} change={null} vs={sessions ? `${sessions} sessions today` : 'storefront traffic'} spark={sparkOrd} to="/admin/live" delay={250} />
        <Kpi icon={Wallet} label="Net Profit" value={k.profit?.value || 0} decimals={2} change={pw ? k.profit?.change : null} vs={vsLabel} spark={sparkRev} to="/admin/finance" delay={300} />
      </div>

      {/* ── sales / channel / live ──────────────────────────────────────── */}
      <div className="mt-[10px] grid gap-[10px] xl:grid-cols-12">
        <Card className="xl:col-span-6" delay={120}>
          <CardHead
            title="Sales Overview"
            info="This period vs the selected comparison window"
            onInfo={() => say(`Sales comparison: ${vsLabel}`)}
            right={
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  {WEEK_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => onWeek(o.key)}
                      className={`rounded-[8px] px-[9px] py-[5px] text-[11px] font-medium transition ${chartPreset === o.key ? 'bg-[#111] text-white' : 'border border-[#ECECEC] bg-white text-[#374151] hover:border-[#BBB] hover:bg-[#F9F9F9]'}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            }
          />
          <div className="mb-2 flex items-center gap-4 text-[10.5px] text-[#6B7280]">
            <span className="flex items-center gap-[5px]"><b className="inline-block h-[2px] w-[14px] rounded-sm bg-[#111]" /> This Period</span>
            {pw && <span className="flex items-center gap-[5px]"><b className="inline-block h-[2px] w-[14px] rounded-sm bg-[#C8C8C8]" /> Previous Period</span>}
          </div>
          <ChartBoundary>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: FAINT }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: FAINT }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip contentStyle={tipStyle} formatter={(v, n) => [rs(v, 0), n === 'revenue' ? 'This period' : 'Previous']} />
                  {pw && <Line type="monotone" dataKey="prevRevenue" stroke="#C8C8C8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />}
                  <Line type="monotone" dataKey="revenue" stroke={INK} strokeWidth={2.2} dot={{ r: 3, fill: INK, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartBoundary>
        </Card>

        <Card className="flex flex-col xl:col-span-3" delay={180}>
          <CardHead title="Sales by Channel" />
          <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row xl:flex-col 2xl:flex-row">
            <div className="relative h-[138px] w-[138px] shrink-0">
              <ChartBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channels} dataKey="amount" innerRadius={48} outerRadius={68} paddingAngle={1} stroke="none">
                      {channels.map((c, i) => <Cell key={c.name} fill={c.color || CHANNEL_COLORS[i]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartBoundary>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="text-[12.5px] font-bold leading-none tabular-nums text-[#111]">{rs(k.revenue?.value || 0, 0)}</p>
                  <p className="mt-1 text-[10px] text-[#6B7280]">Total Sales</p>
                </div>
              </div>
            </div>
            <ul className="w-full flex-1 text-[11px]">
              {channels.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2 rounded-md px-1 py-[4.5px] transition hover:bg-[#F9F9F9]">
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: c.color || CHANNEL_COLORS[i] }} />
                  <span className="min-w-0 flex-1 truncate text-[#374151]">{c.name}</span>
                  <span className="w-8 text-right tabular-nums text-[#6B7280]">{c.pct.toFixed(1)}%</span>
                  <span className="w-[74px] text-right font-semibold tabular-nums text-[#111]">{rs(c.amount, 0)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3.5 flex justify-end">
            <Link to="/admin/analytics" className="inline-flex h-[26px] items-center rounded-lg border border-[#ECECEC] bg-white px-[10px] text-[11px] font-medium text-[#374151] transition hover:-translate-y-px hover:border-[#BBB] hover:bg-[#F9F9F9]">
              View full report
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col xl:col-span-3" delay={240}>
          <div className="flex items-center justify-between">
            <h2 className="text-[12.5px] font-bold tracking-[-0.15px] text-[#111]">Live Visitors</h2>
            <span className="flex items-center gap-[5px] text-[10px] font-medium text-[#0E9F6E]">
              <span className="ovp-live-dot inline-block h-[6px] w-[6px] rounded-full bg-[#10B981]" /> Live
            </span>
          </div>
          <p className="ovp-live-num mt-1 text-[18px] font-bold leading-none tabular-nums text-[#111]">{live?.visitorsNow ?? 0}</p>
          <p className="text-[11px] text-[#6B7280]">Visitors right now</p>
          <div className="my-[10px] flex h-[34px] items-end gap-[2.5px]">
            {liveBars.map((h) => (
              <span
                key={h.hour}
                className="ovp-bar flex-1 rounded-[2px] bg-[#111]"
                style={{ height: `${8 + ((h.v || 0) / liveMax) * 26}px` }}
              />
            ))}
          </div>
          <div className="text-[11px]">
            <div className="mb-0.5 flex justify-between text-[10.5px] font-semibold text-[#6B7280]">
              <span>Top Pages</span><span />
            </div>
            {topPages.map((p) => (
              <div key={p.path} className="flex justify-between rounded px-1 py-[2.5px] text-[#222] transition hover:bg-[#F9F9F9]">
                <span className="truncate font-mono text-[10.5px] text-[#6B7280]">{p.path}</span>
                <span className="tabular-nums text-[#6B7280]">{p.n}</span>
              </div>
            ))}
          </div>
          <Link to="/admin/live" className="mt-[10px] inline-flex h-[26px] w-full items-center justify-center rounded-lg border border-[#ECECEC] bg-white text-[11px] font-medium text-[#374151] transition hover:-translate-y-px hover:border-[#BBB] hover:bg-[#F9F9F9]">
            View real time
          </Link>
        </Card>
      </div>

      {/* ── glance / products / orders ──────────────────────────────────── */}
      <div className="mt-[10px] grid gap-[10px] xl:grid-cols-12">
        <Card className="xl:col-span-3" delay={120}>
          <CardHead title="Today at a Glance" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
            {[
              { icon: Calendar, n: todayOrders, label: 'New Orders', to: '/admin/orders' },
              { icon: Wallet, n: pendingPay, label: 'Pending Payments', to: '/admin/verification-queue' },
              { icon: AlertTriangle, n: lowStockN, label: 'Low Stock Alerts', to: '/admin/products?stock=low' },
              { icon: Users, n: k.customers?.value || 0, label: 'New Customers', to: '/admin/customers' },
            ].map((g) => (
              <Link
                key={g.label}
                to={g.to}
                className="rounded-[10px] border border-[#F1F1F1] bg-white p-[10px] text-center transition duration-200 hover:-translate-y-0.5 hover:border-[#111] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] group"
              >
                <span className="mx-auto grid h-7 w-7 place-items-center rounded-[7px] border border-[#F0F0F0] bg-[#F8F8F7] transition group-hover:border-[#111] group-hover:bg-[#111]">
                  <g.icon size={14} strokeWidth={1.6} className="text-[#111] transition group-hover:text-white" />
                </span>
                <b className="mt-1.5 block text-[14px] font-bold tabular-nums text-[#111]">{Number(g.n || 0).toLocaleString()}</b>
                <span className="block text-[10px] text-[#6B7280]">{g.label}</span>
              </Link>
            ))}
          </div>
          <ViewAll to="/admin/verification-queue">View all notifications</ViewAll>
        </Card>

        <Card className="xl:col-span-4" delay={180}>
          <CardHead
            title="Top Selling Products"
            right={<Link to="/admin/products" className="text-[10.5px] text-[#6B7280] transition hover:text-[#111]">View all</Link>}
          />
          {prodRows.length === 0 ? (
            <p className="py-8 text-center text-[11px] text-[#9CA3AF]">
              {needle ? 'No product matches this search.' : 'Product sales appear once orders land.'}
            </p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['Product', 'Sold', 'Revenue'].map((h, i) => (
                    <th key={h} className={`border-b border-[#F2F2F2] py-[7px] text-[10px] font-medium uppercase tracking-[0.3px] text-[#9CA3AF] ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prodRows.map((p) => (
                  <tr key={p.id} className={hit ? 'ovp-hit' : ''}>
                    <td className="border-b border-[#FAFAFA] py-2">
                      <Link to="/admin/products" className="flex items-center gap-2">
                        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center overflow-hidden rounded-[6px] border border-[#EFEFEF] bg-[#F5F5F4]">
                          {p.image
                            ? <Img src={p.image} alt="" className="h-full w-full object-cover" width={44} height={44} />
                            : <Package size={12} strokeWidth={1.5} className="text-[#111]" />}
                        </span>
                        <span className="truncate text-[11px] text-[#222]">{p.name}</span>
                      </Link>
                    </td>
                    <td className="border-b border-[#FAFAFA] py-2 text-right text-[11px] tabular-nums text-[#222]">{Number(p.qty || 0).toLocaleString()}</td>
                    <td className="border-b border-[#FAFAFA] py-2 text-right text-[11px] font-semibold tabular-nums text-[#111]">{rs(p.revenue, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="xl:col-span-5" delay={240}>
          <CardHead
            title="Recent Orders"
            right={<Link to="/admin/orders" className="text-[10.5px] text-[#6B7280] transition hover:text-[#111]">View all</Link>}
          />
          {orderRows.length === 0 ? (
            <p className="py-8 text-center text-[11px] text-[#9CA3AF]">
              {needle ? 'No order matches this search.' : 'No orders in this period.'}
            </p>
          ) : (
            <table className="w-full border-collapse">
              <tbody>
                {orderRows.map((o) => (
                  <tr key={o.id} className="transition hover:bg-[#FAFAFA]">
                    <td className="border-b border-[#FAFAFA] py-2">
                      <Link to={`/admin/orders/${o.id}`} className="flex items-center gap-2">
                        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[6px] bg-[#F0F0F0] text-[9px] font-bold text-[#111]">
                          {initials(o.name)}
                        </span>
                        <span className="text-[11px] font-semibold text-[#111]">{o.num}</span>
                      </Link>
                    </td>
                    <td className="border-b border-[#FAFAFA] py-2 text-[11px] text-[#6B7280]">
                      <Link to={`/admin/orders/${o.id}`} className="truncate">{o.name}</Link>
                    </td>
                    <td className="border-b border-[#FAFAFA] py-2 text-right text-[11px] font-semibold tabular-nums text-[#111]">{rs(o.total, 2)}</td>
                    <td className="border-b border-[#FAFAFA] py-2 pl-2 text-right">
                      <span className={`inline-block rounded-full px-[9px] py-[3px] text-[10px] font-bold ${o.tone.cls}`}>{o.tone.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* ── revenue / status / customers / categories ───────────────────── */}
      <div className="mt-[10px] grid gap-[10px] xl:grid-cols-12">
        <Card className="xl:col-span-4" delay={120}>
          <CardHead
            title="Revenue & Orders"
            right={
              <div className="flex items-center gap-1">
                {WEEK_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onWeek(o.key)}
                    className={`rounded-[8px] px-[9px] py-[5px] text-[11px] font-medium transition ${chartPreset === o.key ? 'bg-[#111] text-white' : 'border border-[#ECECEC] bg-white text-[#374151] hover:border-[#BBB] hover:bg-[#F9F9F9]'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="mb-[10px] flex items-center gap-1.5">
            {[
              { key: 'revenue', label: 'Revenue' },
              { key: 'orders', label: 'Orders' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => { setRevTab(t.key); say(`Switched to ${t.label.toLowerCase()}`); }}
                className={`rounded-full px-[10px] py-1 text-[10px] font-semibold transition ${revTab === t.key ? 'scale-[1.02] bg-[#111] text-white' : 'bg-[#F3F3F2] text-[#6B7280] hover:bg-[#E9E9E8]'}`}
              >
                {t.label}
              </button>
            ))}
            <span className="ml-1"><Delta change={pw ? (revTab === 'revenue' ? k.revenue?.change : k.orders?.change) : null} className="text-[10px]" /></span>
          </div>
          <ChartBoundary>
            <div className="h-[160px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revData} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="#F5F5F5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: FAINT }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: FAINT }} tickLine={false} axisLine={false} allowDecimals={revTab === 'orders'} tickFormatter={(v) => (revTab === 'revenue' ? (v >= 1000 ? `${Math.round(v / 1000)}k` : v) : v)} />
                  <Tooltip
                    cursor={{ fill: '#FAFAFA' }}
                    contentStyle={tipStyle}
                    formatter={(v) => [revTab === 'revenue' ? rs(v, 0) : v, revTab === 'revenue' ? 'Revenue' : 'Orders']}
                  />
                  <Bar dataKey={revTab} fill={revTab === 'revenue' ? INK : '#555555'} radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartBoundary>
        </Card>

        <Card className="xl:col-span-3" delay={180}>
          <CardHead title="Orders Status" />
          <div className="flex items-center gap-4">
            <div className="relative h-[118px] w-[118px] shrink-0">
              <ChartBoundary>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusMix.rows.length ? statusMix.rows : [{ name: 'None', value: 1, color: '#E5E7EB' }]}
                      dataKey="value"
                      innerRadius={41}
                      outerRadius={58}
                      paddingAngle={1}
                      stroke="none"
                    >
                      {(statusMix.rows.length ? statusMix.rows : [{ color: '#E5E7EB' }]).map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartBoundary>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <b className="text-[13px] font-bold tabular-nums text-[#111]">{statusMix.total.toLocaleString()}</b>
                <span className="text-[10px] text-[#6B7280]">Total Orders</span>
              </div>
            </div>
            <ul className="flex-1 text-[11px]">
              {statusMix.rows.map((s) => (
                <li key={s.name} className="flex items-center gap-[7px] rounded px-1 py-[3px] transition hover:bg-[#F9F9F9]">
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="flex-1 text-[#374151]">{s.name}</span>
                  <span className="tabular-nums text-[#6B7280]">{s.pct.toFixed(0)}% ({s.value})</span>
                </li>
              ))}
              {!statusMix.rows.length && <li className="px-1 text-[11px] text-[#9CA3AF]">No orders in this period.</li>}
            </ul>
          </div>
          <Link to="/admin/orders" className="mt-3.5 inline-flex h-[26px] items-center gap-1 rounded-lg border border-[#ECECEC] bg-white px-[10px] text-[11px] font-medium text-[#374151] transition hover:-translate-y-px hover:border-[#BBB] hover:bg-[#F9F9F9]">
            View all orders <ChevronDown size={11} />
          </Link>
        </Card>

        <Card className="xl:col-span-3" delay={240}>
          <CardHead title="Customer Overview" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] text-[#6B7280]">Total Customers</p>
              <p className="mt-0.5 text-[18px] font-bold leading-none tabular-nums text-[#111]">{totalCustomers.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <Delta change={pw ? k.customers?.change : null} />
              <p className="mt-0.5 text-[10px] text-[#9CA3AF]">{vsLabel}</p>
            </div>
          </div>
          <div className="my-2 h-[62px]">
            <ChartBoundary>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparkCust} margin={{ top: 6, right: 2, left: 2, bottom: 2 }}>
                  <Line type="monotone" dataKey="v" stroke={INK} strokeWidth={1.3} dot={{ r: 2.5, fill: '#fff', stroke: INK, strokeWidth: 1.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartBoundary>
          </div>
          <div className="mt-1 flex gap-4 border-t border-[#F3F4F6] pt-2.5">
            <div>
              <p className="text-[9px] text-[#6B7280]">New Customers</p>
              <p className="text-[13px] font-bold tabular-nums text-[#111]">
                {Number(k.customers?.value || 0).toLocaleString()}
                {pw && <span className="ml-1 inline-flex align-baseline"><Delta change={k.customers?.change} className="text-[10px]" /></span>}
              </p>
            </div>
            <div>
              <p className="text-[9px] text-[#6B7280]">Returning Customers</p>
              <p className="text-[13px] font-bold tabular-nums text-[#111]">{returning.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2" delay={300}>
          <CardHead
            title="Top Categories"
            right={<Link to="/admin/categories" className="text-[10.5px] text-[#6B7280] transition hover:text-[#111]">View all</Link>}
          />
          {catBars.length === 0 ? (
            <p className="py-8 text-center text-[11px] text-[#9CA3AF]">Category sales appear with orders.</p>
          ) : (
            <ul>
              {catBars.map((c) => (
                <li key={c.slug} className="mb-[11px] flex items-center gap-2.5 rounded-md px-1 text-[11px] transition hover:bg-[#F9F9F9]">
                  <span className="w-[74px] shrink-0 truncate text-[#222]">{c.name}</span>
                  <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#F0F0F0]">
                    <span className="ovp-catbar block h-full rounded-full bg-[#111]" style={{ width: `${c.pct}%` }} />
                  </span>
                  <span className="w-[68px] shrink-0 text-right font-semibold tabular-nums text-[#111]">{rs(c.revenue, 0)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ── quick actions ───────────────────────────────────────────────── */}
      <Card className="mt-[10px]" delay={120}>
        <CardHead title="Quick Actions" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 2xl:grid-cols-8">
          {QUICK.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="ovp-qa flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-[#ECECEC] bg-white text-[11px] font-medium text-[#374151] shadow-[0_1px_1px_rgba(0,0,0,0.02)]"
            >
              <a.icon size={13} strokeWidth={1.6} className="ovp-qa-fg text-[#374151]" />
              <span>{a.label}</span>
            </Link>
          ))}
        </div>
      </Card>

      {/* ── smart insights ──────────────────────────────────────────────── */}
      <Card className="mt-[10px]" delay={180}>
        <CardHead title="Smart Insights" />
        <div className="grid gap-[10px] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {insightCards.map((c) => (
            <Link
              key={c.title}
              to={c.to}
              className="ovp-ins flex items-start justify-between gap-2.5 rounded-[11px] border border-[#F1F1F1] bg-white p-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition duration-200 hover:-translate-y-0.5 hover:border-[#DDD] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]"
            >
              <span className="flex min-w-0 flex-1 gap-[9px]">
                <span className="ovp-ins-ico grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] border border-[#F0F0F0] bg-[#F8F8F7] transition">
                  <c.icon size={13} strokeWidth={1.6} className="text-[#111] transition" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[11px] font-bold leading-tight text-[#111]">{c.title}</b>
                  <p className="mt-[3px] text-[10.5px] leading-[1.35] text-[#6B7280]">{c.body}</p>
                  {c.cta && <span className="mt-0.5 flex items-center gap-0.5 text-[10px] font-semibold text-[#111]">{c.cta}</span>}
                </span>
              </span>
              {c.bars ? (
                <span className="flex h-6 shrink-0 items-end gap-0.5 self-center">
                  {[12, 18, 24].map((h, i) => <span key={i} className="w-1 rounded-[2px]" style={{ height: h, background: i === 2 ? INK : '#555' }} />)}
                </span>
              ) : (
                <span className="grid h-5 w-5 shrink-0 place-items-center self-center rounded-full bg-[#111] text-white">
                  <ChevronRight size={11} strokeWidth={2.4} />
                </span>
              )}
            </Link>
          ))}
        </div>
      </Card>

      {/* ── toast ───────────────────────────────────────────────────────── */}
      <div
        className={`ovp-toast fixed bottom-5 right-5 z-[9999] flex max-w-[320px] items-center gap-2 rounded-[11px] bg-[#111] px-[14px] py-[11px] text-[12px] font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] ${toast ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-[100px] scale-90 opacity-0'}`}
        role="status"
        aria-live="polite"
      >
        <Check size={14} strokeWidth={2.2} /> <span>{toast || 'Done'}</span>
      </div>
    </div>,
  );
}

