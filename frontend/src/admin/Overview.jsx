import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import { resolvePreset } from './dashboard/RangePicker';
import AdminLayout from './AdminLayout';
import styles from './Overview.module.css';

/* ============================================================================
 * OVERVIEW — HUSHAE admin dashboard (ATELIER design, real data).
 *
 * Markup/classes/IDs follow the polished ATELIER design file exactly
 * (canvas IDs kept: salesOverview, salesChannel, revChart, ordersDonut,
 * custChart, spark1-6). Every figure is wired to real HUSHAE endpoints:
 *
 *   GET /admin/dashboard?from&to   KPIs, daily series, status, sellers,
 *                                  recent orders, top customers
 *   GET /track/admin/live          live visitors, today funnel, page feed
 *   GET /dashboard/alerts          notification bell
 *   GET /dashboard/insights        smart insights
 *   GET /customers/segments        customer overview (new / returning)
 *
 * The design's mock concepts without a real data source are renamed
 * honestly: "Sales by Channel" -> "Revenue by Product" (best sellers +
 * Other), "Top Categories" -> "Top Customers". Range state follows the
 * dashboard pattern (localStorage + ?from&to), comparison fetches a real
 * previous window (same length, or same period last year).
 * ========================================================================== */

const BASE_HEIGHTS = [12, 22, 8, 28, 18, 30, 14, 20, 26, 10, 24, 16, 28, 12, 20, 22, 8, 26, 18, 14, 24, 10, 28, 16, 20, 12, 22, 18, 26, 14, 18, 22, 12, 28, 16, 20, 14, 24, 10, 26];

/* Design palette (light) + dark-admin equivalent for the theme toggle. */
const PALETTES = {
  light: { main: '#111', g2: '#555', g3: '#8a8a8a', g4: '#d6d6d6', mutedLine: '#c8c8c8', grid: '#f2f2f2', grid2: '#f5f5f5', tick: '#9ca3af', cardBg: '#fff', tooltip: '#111' },
  dark: { main: '#f4f4f5', g2: '#a1a1aa', g3: '#71717a', g4: '#3f3f46', mutedLine: '#52525b', grid: '#26262c', grid2: '#1d1d21', tick: '#71717a', cardBg: '#111113', tooltip: '#27272a' },
};

const isDarkAdmin = () => document.documentElement.classList.contains('dark-admin');
const P = () => (isDarkAdmin() ? PALETTES.dark : PALETTES.light);

const cx = (...names) => names.map((n) => styles[n]).join(' ');

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtD = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const compactRs = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `₨${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `₨${Math.round(n / 1e3)}K`;
  return `₨${Math.round(n)}`;
};
const money = (v) => pkr(v);
const int = (v) => Number(v || 0).toLocaleString('en-US');
const changeLabel = (c) => (c === null || c === undefined ? 'New' : `${c >= 0 ? '+' : ''}${c.toFixed(1)}%`);

/* Equal-length window immediately before the range (backend convention). */
function prevWindow(r) {
  const from = new Date(r.from + 'T00:00:00');
  const to = new Date(r.to + 'T00:00:00');
  const len = Math.round((to - from) / 86400000) + 1;
  const prevTo = new Date(from); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(from); prevFrom.setDate(prevFrom.getDate() - len);
  return { from: iso(prevFrom), to: iso(prevTo) };
}
/* Same window one year earlier. */
function lastYearWindow(r) {
  const f = new Date(r.from + 'T00:00:00'); f.setFullYear(f.getFullYear() - 1);
  const t = new Date(r.to + 'T00:00:00'); t.setFullYear(t.getFullYear() - 1);
  return { from: iso(f), to: iso(t) };
}

/* Count-up animation (design behaviour) written directly to the DOM. */
function animateCountTo(el, target, { prefix = '', suffix = '', decimals = 0 } = {}) {
  if (!el) return;
  const duration = 1200;
  const start = performance.now();
  const fmt = (n) => prefix + (decimals ? n.toFixed(decimals) : Math.floor(n).toLocaleString('en-US')) + suffix;
  function update(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * ease);
    if (p < 1) requestAnimationFrame(update);
    else el.textContent = prefix + (decimals ? target.toFixed(decimals) : target.toLocaleString('en-US')) + suffix;
  }
  requestAnimationFrame(update);
}

function useAdminDark() {
  const [dark, setDark] = useState(isDarkAdmin);
  useEffect(() => {
    const io = new MutationObserver(() => setDark(isDarkAdmin()));
    io.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => io.disconnect();
  }, []);
  return dark;
}

/* ---- toast (design behaviour, single instance) ---- */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toastText').textContent = msg;
  t.classList.add(styles.show);
  clearTimeout(window._ovwToastTimer);
  window._ovwToastTimer = setTimeout(() => t.classList.remove(styles.show), 2800);
}

let revChartInstance = null;

function switchRev(el, setData) {
  document.querySelectorAll('.' + styles['rev-tab']).forEach((x) => {
    x.classList.remove(styles.active);
    x.classList.add(styles.idle);
  });
  el.classList.remove(styles.idle);
  el.classList.add(styles.active);
  const pal = P();
  const type = el.dataset.type;
  const rows = el.dataset.rows ? JSON.parse(el.dataset.rows) : [];
  if (revChartInstance) {
    revChartInstance.data.datasets[0].data = type === 'revenue' ? rows.map((d) => d.revenue) : rows.map((d) => d.orders);
    revChartInstance.data.datasets[0].backgroundColor = type === 'revenue' ? pal.main : pal.g2;
    revChartInstance.update();
  }
  if (setData) setData(type);
  showToast('Switched to ' + el.textContent);
}

/* Smart-insight titles (backend insight id -> card title) */
const INSIGHT_TITLES = {
  geo: 'Top Location',
  'product-momentum': 'Product Momentum',
  fulfilment: 'Fulfilment Speed',
  repeat: 'Repeat Purchases',
};

/* Smart-insight icons (backend icon names -> design-style SVGs) */
function InsightIcon({ name }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: '#111', strokeWidth: 1.6 };
  if (name === 'MapPin') return <svg {...common}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>;
  if (name === 'TrendingUp') return <svg {...common}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
  if (name === 'Zap') return <svg {...common}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
  if (name === 'Clock') return <svg {...common}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
  if (name === 'Users') return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  return <svg {...common}><path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.3L12 16.5 5.8 21l2.4-7.3L2 9.2h7.6z" /></svg>;
}

/* Product thumbnail with graceful fallback (image may be missing) */
function ProductThumb({ src }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <span className={styles['prod-ico']}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.5"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></svg>
      </span>
    );
  }
  return <img className={styles['prod-img']} src={src} alt="" loading="lazy" onError={() => setErr(true)} />;
}

const RANGE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-month', label: 'Last Month' },
];
const COMPARE_OPTIONS = [
  { key: 'prev', label: 'Previous period' },
  { key: '365', label: 'Same period last year' },
  { key: 'off', label: 'No comparison' },
];

const QUICK_ACTIONS = [
  { label: 'Create Order', to: '/admin/orders/new', icon: <><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 14h6M12 11v6" /></> },
  { label: 'Add Product', to: '/admin/products/new', icon: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></> },
  { label: 'Add Discount', to: '/admin/discounts', icon: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z" /><line x1="7" y1="7" x2="7.01" y2="7" /></> },
  { label: 'Create Collection', to: '/admin/collections', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></> },
  { label: 'Send Email', to: '/admin/email-campaigns', icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></> },
  { label: 'View Reports', to: '/admin/reports', icon: <><path d="M3 3v18h18" /><path d="M7 16l4-4 4 4 6-6" /></> },
  { label: 'Inventory Alert', to: '/admin/products?stock=low', icon: <><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /><path d="M10 20a2 2 0 0 0 4 0" /></> },
  { label: 'Support Ticket', to: '/admin/questions', icon: <><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></> },
];

export default function Overview() {
  const dark = useAdminDark();
  const { auth } = useApp();
  const nav = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = auth?.token;

  /* ----------------------------- range + compare ----------------------------- */
  const [range, setRange] = useState(() => {
    const f = searchParams.get('from');
    const t = searchParams.get('to');
    if (f && t) return { preset: 'custom', from: f, to: t };
    try {
      const saved = JSON.parse(localStorage.getItem('hushae.dashRange') || 'null');
      if (saved && saved.from && saved.to) return saved;
    } catch { /* ignore */ }
    const r = resolvePreset('7d');
    return { preset: '7d', from: r.from, to: r.to };
  });
  const [compare, setCompare] = useState('prev');

  useEffect(() => {
    try { localStorage.setItem('hushae.dashRange', JSON.stringify(range)); } catch { /* ignore */ }
    const next = new URLSearchParams(searchParams);
    next.set('from', range.from);
    next.set('to', range.to);
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const closeDrops = () => {
    document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
    document.querySelectorAll('.' + styles.pill).forEach((p) => p.classList.remove(styles.active));
  };
  const pickRange = (key) => {
    const r = resolvePreset(key);
    if (r) setRange({ preset: key, from: r.from, to: r.to });
    closeDrops();
  };

  /* -------------------------------- data -------------------------------- */
  const [data, setData] = useState(null);
  const [cmp, setCmp] = useState(null);
  const [live, setLive] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [insights, setInsights] = useState([]);
  const [segments, setSegments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifRead, setNotifRead] = useState(false);
  const [q, setQ] = useState('');
  const [revType, setRevType] = useState('revenue');
  const countedRef = useRef(false);

  const load = useCallback(async (silent) => {
    if (!token) return;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const [d, a, ins, seg] = await Promise.all([
        api(`/admin/dashboard?from=${range.from}&to=${range.to}`, { token }),
        api('/dashboard/alerts', { token }),
        api('/dashboard/insights', { token }),
        api('/customers/segments', { token }),
      ]);
      setData(d);
      setAlerts(a.alerts || []);
      setInsights(ins.insights || []);
      setSegments(seg.segments || null);
      if (compare === 'off') {
        setCmp(null);
      } else {
        const w = compare === '365' ? lastYearWindow(range) : prevWindow(range);
        api(`/admin/dashboard?from=${w.from}&to=${w.to}`, { token }).then(setCmp).catch(() => setCmp(null));
      }
    } catch (e) {
      if (!silent) setError(e?.message || 'Data nahi aa saka — reload karein');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [token, range, compare]);

  useEffect(() => { load(false); }, [load]);

  /* Silent refresh cadence (same as LiveView / old dashboard). */
  useEffect(() => {
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, [load]);

  /* Live visitors poll (15s, same as LiveView). */
  useEffect(() => {
    if (!token) return undefined;
    let stop = false;
    const poll = () => api('/track/admin/live', { token }).then((d) => { if (!stop) setLive(d); }).catch(() => {});
    poll();
    const t = setInterval(poll, 15000);
    return () => { stop = true; clearInterval(t); };
  }, [token]);

  /* Inject the design's Inter font once (idempotent). */
  useEffect(() => {
    if (document.querySelector('link[data-ovw-inter]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    l.setAttribute('data-ovw-inter', '1');
    document.head.appendChild(l);
  }, []);

  /* ------------------------------- derived data ------------------------------- */
  const chartCur = useMemo(() => data?.chart || [], [data]);
  const cmpWindow = compare === '365' ? lastYearWindow(range) : prevWindow(range);
  const k = data?.kpis;
  const stats = data?.stats;
  const sessions = live?.today?.sessions || 0;
  const checkouts = live?.today?.checkouts || 0;
  const convPct = sessions > 0 ? Math.round((checkouts / sessions) * 10000) / 100 : null;

  const sparkSeries = useMemo(() => ({
    s1: chartCur.map((d) => d.revenue),
    s2: chartCur.map((d) => d.orders),
    s3: chartCur.map((d) => d.customers),
    s4: chartCur.map((d) => (d.orders ? d.revenue / d.orders : 0)),
  }), [chartCur]);

  const prodSlices = useMemo(() => {
    const bs = data?.bestSellers || [];
    const total = stats?.revenue || 0;
    const sumOf = (arr) => arr.reduce((n, b) => n + (b.revenue || 0), 0);
    // Keep the donut honest: at most 4 sellers + "Other products" = total.
    const shown = total - sumOf(bs) > 0 && bs.length >= 5 ? bs.slice(0, 4) : bs;
    const rows = shown.map((b) => ({ label: b.name, value: b.revenue || 0 }));
    const other = Math.max(0, total - sumOf(shown));
    if (other > 0) rows.push({ label: 'Other products', value: other });
    return { rows, total };
  }, [data, stats]);

  const statusRows = useMemo(() => {
    const entries = Object.entries(data?.byStatus || {}).sort((a, b) => b[1] - a[1]);
    const rows = entries.slice(0, 4).map(([label, value]) => ({ label, value }));
    const rest = entries.slice(4).reduce((n, [, c]) => n + c, 0);
    if (rest > 0) rows.push({ label: 'Other', value: rest });
    return rows;
  }, [data]);

  const topPages = useMemo(() => {
    const m = new Map();
    (live?.feed || []).forEach((f) => {
      const p = f.path || '/';
      m.set(p, (m.get(p) || 0) + 1);
    });
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [live]);

  const topCustMax = useMemo(() => Math.max(1, ...(data?.topCustomers || []).map((c) => c.spent || 0)), [data]);

  const bestRows = useMemo(() => {
    const bs = data?.bestSellers || [];
    if (!q) return bs;
    const s = q.toLowerCase();
    return bs.filter((b) => (b.name || '').toLowerCase().includes(s));
  }, [data, q]);

  const recentRows = useMemo(() => {
    const ro = data?.recentOrders || [];
    if (!q) return ro;
    const s = q.toLowerCase();
    return ro.filter((o) =>
      (o.orderNumber || '').toLowerCase().includes(s)
      || (o.customerInfo?.name || '').toLowerCase().includes(s)
      || (o.customerInfo?.city || '').toLowerCase().includes(s));
  }, [data, q]);

  const vsLabel = compare === 'off' || !cmpWindow ? 'No comparison'
    : `vs ${fmtD(cmpWindow.from)} – ${fmtD(cmpWindow.to)}`;

  const kpiCards = [
    { key: 'revenue', label: 'Total Sales', text: k ? money(k.revenue.value) : '—', anim: { num: k?.revenue.value || 0, prefix: 'PKR ' }, change: k?.revenue.change, spark: sparkSeries.s1, icon: <><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></> },
    { key: 'orders', label: 'Orders', text: k ? int(k.orders.value) : '—', anim: { num: k?.orders.value || 0 }, change: k?.orders.change, spark: sparkSeries.s2, icon: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></> },
    { key: 'customers', label: 'Customers', text: k ? int(k.customers.value) : '—', anim: { num: k?.customers.value || 0 }, change: k?.customers.change, spark: sparkSeries.s3, icon: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
    { key: 'aov', label: 'Avg. Order Value', text: k ? money(k.aov.value) : '—', anim: { num: k?.aov.value || 0, prefix: 'PKR ' }, change: k?.aov.change, spark: sparkSeries.s4, icon: <><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></> },
    { key: 'conv', label: 'Conversion Rate', text: convPct === null ? '—' : `${convPct.toFixed(2)}%`, anim: { num: convPct || 0, suffix: '%', decimals: 2 }, change: null, spark: sparkSeries.s2, icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></> },
    { key: 'profit', label: 'Net Profit', text: k ? money(k.profit.value) : '—', anim: { num: k?.profit.value || 0, prefix: 'PKR ' }, change: k?.profit.change, spark: sparkSeries.s1, icon: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></> },
  ];

  /* ------------------------------ count-up on first load ------------------------------ */
  useEffect(() => {
    if (!data || countedRef.current) return;
    countedRef.current = true;
    const els = document.querySelectorAll('.' + styles['count-up']);
    kpiCards.forEach((card, i) => {
      if (card.key === 'conv' && convPct === null) return; // live funnel not loaded yet
      setTimeout(() => animateCountTo(els[i], card.anim.num, card.anim), 150 + i * 80);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  /* ------------------------------ charts (real data) ------------------------------ */
  useEffect(() => {
    const pal = P();
    const charts = [];
    const chart = (id, cfg) => {
      const el = document.getElementById(id);
      if (el) charts.push(new Chart(el, cfg));
    };
    const lineOpts = { responsive: true, maintainAspectRatio: false, animation: { duration: 1200, easing: 'easeOutQuart' } };

    const rows = chartCur;

    /* Sparklines */
    const spark = (id, series) =>
      chart(id, {
        type: 'line',
        data: { labels: series.map((_, i) => i), datasets: [{ data: series, borderColor: pal.main, borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
      });
    kpiCards.forEach((card, i) => spark(`spark${i + 1}`, card.spark.length ? card.spark : [0]));

    /* Sales Overview (revenue: this period vs comparison) */
    const hasCmp = compare !== 'off' && cmp && cmp.chart?.length;
    chart('salesOverview', {
      type: 'line',
      data: {
        labels: rows.map((d) => d.label),
        datasets: [
          { label: 'This Period', data: rows.map((d) => d.revenue), borderColor: pal.main, backgroundColor: pal.main, borderWidth: 2.2, tension: 0.35, pointRadius: rows.length > 14 ? 0 : 4, pointBackgroundColor: pal.main, pointBorderWidth: 2, pointHoverRadius: 6 },
          ...(hasCmp ? [{ label: 'Previous Period', data: cmp.chart.map((d) => d.revenue), borderColor: pal.mutedLine, backgroundColor: pal.mutedLine, borderWidth: 1.5, borderDash: [4, 4], tension: 0.35, pointRadius: 0 }] : []),
        ],
      },
      options: {
        ...lineOpts,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 8, cornerRadius: 8, displayColors: false, callbacks: { label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } } },
        scales: {
          y: { min: 0, grid: { color: pal.grid, borderDash: [3, 3] }, ticks: { callback: (v) => compactRs(v), font: { size: 10 }, color: pal.tick, maxTicksLimit: 5 }, border: { display: false } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: pal.tick, maxTicksLimit: 8 }, border: { display: false } },
        },
      },
    });

    /* Revenue by Product (doughnut) */
    chart('salesChannel', {
      type: 'doughnut',
      data: { labels: prodSlices.rows.map((r) => r.label), datasets: [{ data: prodSlices.rows.map((r) => r.value), backgroundColor: [pal.main, pal.g2, pal.g3, pal.g4, '#b5b5b5'], borderWidth: 0, hoverOffset: 5 }] },
      options: { cutout: '70%', animation: { animateRotate: true, duration: 1300, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, padding: 8, cornerRadius: 8, displayColors: false, callbacks: { label: (c) => ` ${c.label}: ${money(c.parsed)}` } } }, responsive: true, maintainAspectRatio: false },
    });

    /* Revenue & Orders (bar) */
    const revEl = document.getElementById('revChart');
    if (revEl) {
      revChartInstance = new Chart(revEl, {
        type: 'bar',
        data: {
          labels: rows.map((d) => d.label),
          datasets: [{ data: revType === 'revenue' ? rows.map((d) => d.revenue) : rows.map((d) => d.orders), backgroundColor: revType === 'revenue' ? pal.main : pal.g2, borderRadius: { topLeft: 4, topRight: 4 }, barThickness: rows.length > 10 ? 8 : 18, hoverBackgroundColor: isDarkAdmin() ? '#a1a1aa' : '#222' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 1000, delay: (ctx) => ctx.dataIndex * 40, easing: 'easeOutQuart' },
          plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, cornerRadius: 8, padding: 8, displayColors: false, callbacks: { label: (c) => ` ${revType === 'revenue' ? money(c.parsed.y) : int(c.parsed.y) + ' orders'}` } } },
          scales: {
            y: { min: 0, grid: { color: pal.grid2 }, ticks: { callback: (v) => (revType === 'revenue' ? compactRs(v) : v), font: { size: 10 }, color: pal.tick, maxTicksLimit: 5 }, border: { display: false } },
            x: { grid: { display: false }, ticks: { font: { size: 10 }, color: pal.tick, maxTicksLimit: 8 }, border: { display: false } },
          },
        },
      });
      charts.push(revChartInstance);
    }

    /* Orders Status (doughnut) */
    chart('ordersDonut', {
      type: 'doughnut',
      data: { labels: statusRows.map((r) => r.label), datasets: [{ data: statusRows.map((r) => r.value), backgroundColor: [pal.main, pal.g2, pal.g3, pal.g4, '#9ca3af'], borderWidth: 0, hoverOffset: 4 }] },
      options: { cutout: '70%', animation: { duration: 1200, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, callbacks: { label: (c) => ` ${c.label}: ${int(c.parsed)} orders` } } }, responsive: true, maintainAspectRatio: false },
    });

    /* Customer Overview (line) */
    chart('custChart', {
      type: 'line',
      data: {
        labels: rows.map((d) => d.label),
        datasets: [{ data: rows.map((d) => d.customers), borderColor: pal.main, borderWidth: 1.3, tension: 0.4, pointRadius: rows.length > 14 ? 0 : 3, pointBackgroundColor: pal.cardBg, pointBorderColor: pal.main, pointBorderWidth: 1.5, fill: false, pointHoverRadius: 5 }],
      },
      options: { ...lineOpts, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, callbacks: { label: (c) => ` ${int(c.parsed.y)} new customers` } }, scales: { x: { display: false }, y: { display: false } } } },
    });

    return () => {
      charts.forEach((c) => c.destroy());
      revChartInstance = null;
    };
  }, [chartCur, cmp, compare, prodSlices, statusRows, revType, dark, sparkSeries]);

  /* ------------------------------ live bars + shortcuts ------------------------------ */
  useEffect(() => {
    const liveInterval = setInterval(() => {
      document.querySelectorAll('#liveBars div').forEach((div) => {
        div.style.height = Math.floor(8 + Math.random() * 26) + 'px';
      });
    }, 1800);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
      }
    };
    const onDocClick = (e) => {
      if (!e.target.closest('.' + styles.pill) && !e.target.closest('.' + styles['btn-sm'])) {
        document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
        document.querySelectorAll('.' + styles.pill).forEach((p) => p.classList.remove(styles.active));
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onDocClick);
    return () => {
      clearInterval(liveInterval);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onDocClick);
    };
  }, []);

  /* --------------------------------- handlers --------------------------------- */
  const toggleDropdown = (id) => {
    const dd = document.getElementById(id);
    if (!dd) return;
    const isShow = dd.classList.contains(styles.show);
    document.querySelectorAll('.' + styles.dropdown).forEach((d) => d.classList.remove(styles.show));
    document.querySelectorAll('.' + styles.pill).forEach((p) => p.classList.remove(styles.active));
    if (!isShow) {
      dd.classList.add(styles.show);
      dd.parentElement.classList.add(styles.active);
    }
  };
  const onSearchKey = (e) => {
    setQ(e.target.value);
    if (e.key === 'Enter' && e.target.value) showToast(`Searching: ${e.target.value}`);
  };
  const openAlert = (link) => {
    setNotifOpen(false);
    if (link) nav(link);
  };

  const rangeLabel = `${fmtD(range.from)} – ${fmtD(range.to)}`;
  const compareLabel = COMPARE_OPTIONS.find((c) => c.key === compare)?.label || 'Previous period';
  const revChange = k?.revenue?.change;
  const revRowsJson = JSON.stringify(chartCur);

  /* ---------------------------------- render ---------------------------------- */
  return (
    <AdminLayout title="Overview">
      <div className={styles.ovw}>
        <div className={styles.wrap}>
          {/* --------------------- range / filter bar (admin header owns title, search, create, theme) --------------------- */}
          <div className={styles.topbar}>
            <div className={styles['top-left']}>
              <div className={styles.pill} id="datePill" onClick={() => toggleDropdown('dateDrop')}>
                <span>{rangeLabel}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                <div className={styles.dropdown} id="dateDrop" onClick={(e) => e.stopPropagation()}>
                  {RANGE_OPTIONS.map((o) => <div key={o.key} onClick={() => pickRange(o.key)}>{o.label}</div>)}
                </div>
              </div>
              <div className={styles.pill} id="comparePill" onClick={() => toggleDropdown('compareDrop')}>
                <span id="compareText">Compare: {compareLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                <div className={styles.dropdown} id="compareDrop" onClick={(e) => e.stopPropagation()}>
                  {COMPARE_OPTIONS.map((o) => <div key={o.key} onClick={() => { setCompare(o.key); closeDrops(); }}>{o.label}</div>)}
                </div>
              </div>
            </div>
            <div className={styles['top-right']}>
              <div className={styles.search}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>
                <input id="searchInput" value={q} placeholder="Filter products & orders..." onChange={onSearchKey} onFocus={() => showToast('Type to filter products & orders')} />
              </div>
              <div className={styles['icon-btn']} onClick={() => setNotifOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
                {alerts.length > 0 && !notifRead && <div className={styles.badge} id="notifBadge">{alerts.length}</div>}
              </div>
            </div>
          </div>

          {error && !data && (
            <div className={cx(styles.card, styles['ovw-error'])}>
              <p>{error}</p>
              <button className={styles['btn-black']} onClick={() => load(false)}>Retry</button>
            </div>
          )}

          {/* ------------------------------ KPI stats ---------------------------- */}
          <div className={styles.stats}>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.stat}><div className={cx(styles.skeleton, styles['sk-block'])} /></div>)
              : kpiCards.map((card) => (
                <div className={styles.stat} key={card.key}>
                  <div className={styles['stat-head']}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{card.icon}</svg>
                    {card.label}
                  </div>
                  <div className={cx('stat-val', 'count-up')}>{card.text}</div>
                  <div className={styles['stat-foot']}>
                    <div>
                      <div className={cx('stat-change', (card.change ?? 0) < 0 && styles.neg)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                        {changeLabel(card.change)}
                      </div>
                      <div className={styles['stat-vs']}>{vsLabel}</div>
                    </div>
                    <canvas className={styles.spark} id={`spark${kpiCards.indexOf(card) + 1}`} />
                  </div>
                </div>
              ))}
          </div>

          {/* --------------------------- charts row 1 --------------------------- */}
          <div className={styles.grid3}>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <div className={styles['card-t']}>Sales Overview <span className={styles.info} onClick={() => showToast('Sales comparison: this period vs previous')}>i</span></div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={styles['btn-sm']} onClick={() => toggleDropdown('weekDrop')} style={{ position: 'relative' }}>{(RANGE_OPTIONS.find((o) => o.key === range.preset)?.label) || rangeLabel} ▾
                    <div className={styles.dropdown} id="weekDrop" style={{ right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
                      {RANGE_OPTIONS.map((o) => <div key={o.key} onClick={() => pickRange(o.key)}>{o.label}</div>)}
                    </div>
                  </button>
                  <button className={styles['btn-sm']} onClick={() => showToast('Chart options')}>⋮</button>
                </div>
              </div>
              <div className={styles.legend}>
                <span><b style={{ background: '#111' }} /> This Period</span>
                {compare !== 'off' && <span><b style={{ background: '#c8c8c8' }} /> Previous Period</span>}
              </div>
              <div className={styles['chart-main']}><canvas id="salesOverview" /></div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Revenue by Product</span></div>
              <div className={styles['donut-row']}>
                <div className={styles.donut}>
                  <canvas id="salesChannel" />
                  <div className={styles['donut-center']}><b>{prodSlices.total ? money(prodSlices.total) : '—'}</b><span>Total Sales</span></div>
                </div>
                <div className={styles['ch-list']}>
                  {prodSlices.rows.length === 0 && <div className={styles['ovw-empty']}>No sales in this period</div>}
                  {prodSlices.rows.map((r) => (
                    <div className={styles['ch-item']} key={r.label}>
                      <div className={styles.dot} style={{ background: '#111' }} />
                      <span className={styles['ch-name']}>{r.label}</span>
                      <span className={styles.pct}>{prodSlices.total ? Math.round((r.value / prodSlices.total) * 100) : 0}%</span>
                      <span className={styles.val}>{money(r.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: 14 }}>
                <button className={styles['btn-sm']} onClick={() => nav('/admin/reports')}>View full report</button>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['live-top']}><span className={styles['card-t']}>Live Visitors</span><span style={{ fontSize: 10, color: '#0e9f6e', display: 'flex', alignItems: 'center', gap: 5 }}><span className={styles['live-dot']} /> Live</span></div>
              <div className={styles['live-num']} id="liveNum">{live ? int(live.visitorsNow) : '…'}</div>
              <div className={styles['live-sub']}>Visitors right now</div>
              <div className={styles['live-bars']} id="liveBars">
                {BASE_HEIGHTS.map((h, i) => <div key={i} style={{ height: h + 'px' }} />)}
              </div>
              <div className={styles.pages}>
                <div className={cx('page-row', 'head')}><span>Top Pages</span><span></span></div>
                {topPages.length === 0 && <div className={styles['page-row']}><span>No page views yet today</span><span></span></div>}
                {topPages.map(([path, n]) => <div className={styles['page-row']} key={path}><span>{path}</span><span>{n}</span></div>)}
              </div>
              <div style={{ marginTop: 10 }}>
                <button className={styles['btn-sm']} style={{ width: '100%' }} onClick={() => nav('/admin/live')}>View real time</button>
              </div>
            </div>
          </div>

          {/* --------------------------- tables row ----------------------------- */}
          <div className={styles.grid4}>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Today at a Glance</span></div>
              <div className={styles.glance}>
                <div className={styles['g-item']} onClick={() => nav('/admin/orders?status=All')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg></div>
                  <b>{live ? int(live.today.orders) : '—'}</b><span>Orders Today</span>
                </div>
                <div className={styles['g-item']} onClick={() => nav('/admin/verification-queue')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M12 8v4l3 3" /></svg></div>
                  <b>{stats ? int(stats.pending) : '—'}</b><span>Pending Payments</span>
                </div>
                <div className={styles['g-item']} onClick={() => nav('/admin/products?stock=low')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></svg></div>
                  <b>{stats ? int(stats.lowStockCount) : '—'}</b><span>Low Stock Alerts</span>
                </div>
                <div className={styles['g-item']} onClick={() => nav('/admin/customers')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.6"><circle cx="12" cy="7" r="3" /><path d="M5 21v-2a5 5 0 0 1 10 0v2" /><circle cx="18" cy="10" r="2" /><path d="M20 21v-1a3 3 0 0 0-3-3" /></svg></div>
                  <b>{k ? int(k.customers.value) : '—'}</b><span>New Customers</span>
                </div>
              </div>
              <div className={styles['view-all']} onClick={() => setNotifOpen(true)}>View all notifications
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Top Selling Products</span>
                <span style={{ fontSize: 10.5, color: '#6b7280', cursor: 'pointer' }} onClick={() => nav('/admin/reports')}>View all</span>
              </div>
              <table className={styles.tbl} id="productTable">
                <thead><tr><th>Product</th><th>Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {bestRows.length === 0 && <tr><td colSpan="3" className={styles['ovw-empty']}>{q ? 'No products match your search' : 'No product sales in this period'}</td></tr>}
                  {bestRows.map((b) => (
                    <tr key={b.name} onClick={() => showToast(`${b.name} — ${int(b.qty)} sold, ${money(b.revenue)}`)}>
                      <td><div className={styles.prod}><ProductThumb src={b.image} /> {b.name}</div></td>
                      <td>{int(b.qty)}</td>
                      <td>{money(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Recent Orders</span>
                <span style={{ fontSize: 10.5, color: '#6b7280', cursor: 'pointer' }} onClick={() => nav('/admin/orders')}>View all</span>
              </div>
              <table className={styles.tbl} id="ordersTable">
                <tbody>
                  {recentRows.length === 0 && <tr><td colSpan="4" className={styles['ovw-empty']}>{q ? 'No orders match your search' : 'No orders in this period'}</td></tr>}
                  {recentRows.map((o) => (
                    <tr key={o._id || o.orderNumber} onClick={() => nav(`/admin/orders/${o._id || o.id || o.orderNumber}`)}>
                      <td><div className={styles.prod}><span className={styles['prod-ico']}>{(o.customerInfo?.name || '?').slice(0, 1).toUpperCase()}</span> #{o.orderNumber}</div></td>
                      <td>{o.customerInfo?.name || '—'}</td>
                      <td>{money(o.total)}</td>
                      <td><span className={o.paymentStatus === 'Paid' || o.paymentStatus === 'paid' ? styles['badge-paid'] : styles['badge-pending']}>{o.paymentStatus === 'Paid' || o.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ------------------------- charts row 2 + customers ------------------ */}
          <div className={styles.grid4b}>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Revenue &amp; Orders</span>
                <button className={styles['btn-sm']} onClick={() => toggleDropdown('revDrop')} style={{ position: 'relative' }}>{(RANGE_OPTIONS.find((o) => o.key === range.preset)?.label) || rangeLabel} ▾
                  <div className={styles.dropdown} id="revDrop" style={{ right: 0, left: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    {RANGE_OPTIONS.map((o) => <div key={o.key} onClick={() => pickRange(o.key)}>{o.label}</div>)}
                  </div>
                </button>
              </div>
              <div className={styles['rev-tabs']}>
                <span className={cx('rev-tab', revType === 'revenue' ? 'active' : 'idle')} data-type="revenue" data-rows={revRowsJson} onClick={(e) => switchRev(e.currentTarget, setRevType)}>Revenue</span>
                <span className={cx('rev-tab', revType === 'orders' ? 'active' : 'idle')} data-type="orders" data-rows={revRowsJson} onClick={(e) => switchRev(e.currentTarget, setRevType)}>Orders</span>
                <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {changeLabel(revChange)}
                </span>
              </div>
              <div className={styles['rev-chart']}><canvas id="revChart" /></div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Orders Status</span></div>
              <div className={styles['orders-flex']}>
                <div className={styles['orders-donut']}>
                  <canvas id="ordersDonut" />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <b style={{ fontSize: 13 }}>{stats ? int(stats.totalOrders) : '—'}</b>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>Total Orders</span>
                  </div>
                </div>
                <div className={styles['orders-legend']}>
                  {statusRows.length === 0 && <span className={styles['ovw-empty']}>No orders in this period</span>}
                  {statusRows.map((r) => (
                    <div className={styles['ol-item']} key={r.label}>
                      <div className={styles['ol-dot']} style={{ background: '#111' }} /> {r.label}
                      <span style={{ marginLeft: 6 }}>{stats?.totalOrders ? Math.round((r.value / stats.totalOrders) * 100) : 0}% ({int(r.value)})</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <button className={styles['btn-sm']} onClick={() => nav('/admin/orders')}>View all orders ▾</button>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Customer Overview</span></div>
              <div className={styles['cust-head']}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>Customers (period)</div>
                  <div className={styles['cust-big']}>{k ? int(k.customers.value) : '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className={styles['cust-growth']}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg> {changeLabel(k?.customers.change)}</div>
                  <div className={styles['cust-sub']}>{vsLabel}</div>
                </div>
              </div>
              <div className={styles['cust-line']}><canvas id="custChart" /></div>
              <div className={styles['cust-bottom']}>
                <div className={styles['cust-b']}>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>New Customers (all time)</div>
                  <b>{segments ? int(segments.new) : '—'}</b>
                </div>
                <div className={styles['cust-b']}>
                  <div style={{ fontSize: 9, color: 'var(--muted)' }}>Returning (2+ orders)</div>
                  <b>{segments ? int(segments.repeat) : '—'}</b>
                </div>
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <span className={styles['card-t']}>Top Customers</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', cursor: 'pointer' }} onClick={() => nav('/admin/customers')}>View all</span>
              </div>
              <div>
                {(data?.topCustomers || []).length === 0 && <div className={styles['ovw-empty']}>No customer spend in this period</div>}
                {(data?.topCustomers || []).map((c, i) => (
                  <div className={styles['cat-row']} key={c.phone || c.name || i} onClick={() => nav(`/admin/customers`)}>
                    <span className={styles['cat-name']}>{c.name}</span>
                    <div className={styles['cat-bar']}><div style={{ width: `${Math.max(4, Math.round(((c.spent || 0) / topCustMax) * 100))}%` }} /></div>
                    <span className={styles['cat-val']}>{money(c.spent)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ---------------------------- quick actions ------------------------- */}
          <div className={styles.card} style={{ marginBottom: 10 }}>
            <div className={styles['card-h']}><span className={styles['card-t']}>Quick Actions</span></div>
            <div className={styles.quick}>
              {QUICK_ACTIONS.map((qa) => (
                <button className={styles['q-btn']} key={qa.label} onClick={() => nav(qa.to)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">{qa.icon}</svg>
                  <span>{qa.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* --------------------------- smart insights ------------------------- */}
          <div className={styles.card}>
            <div className={styles['card-h']}><span className={styles['card-t']}>• Smart Insights</span></div>
            {insights.length === 0 ? (
              <div className={styles['ovw-empty']}>Not enough data yet for insights — they appear as your store gets orders.</div>
            ) : (
              <div className={styles.insights}>
                {insights.map((ins) => (
                  <div className={styles['ins-card']} key={ins.id} onClick={() => showToast(ins.text)}>
                    <div className={styles['ins-left']}>
                      <div className={styles['ins-ico']}><InsightIcon name={ins.icon} /></div>
                      <div>
                        <b>{INSIGHT_TITLES[ins.id] || 'Insight'}</b>
                        <p>{ins.text}</p>
                        {ins.hint && <p className={styles['ins-hint']}>{ins.hint}</p>}
                      </div>
                    </div>
                    <div className={styles['ins-arrow']}>→</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast: portaled to <body> so fixed positioning is safe */}
      {createPortal(
        <div className={styles.toast} id="toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          <span id="toastText">Done</span>
        </div>,
        document.body,
      )}
      {createPortal(
        <>
          {/* Notifications — real alerts */}
          <div className={cx(styles.modal, notifOpen && styles.show)} onClick={(e) => { if (e.target === e.currentTarget) setNotifOpen(false); }}>
            <div className={styles['modal-box']} style={{ maxWidth: 460 }}>
              <h3>Notifications</h3>
              {alerts.length === 0 ? (
                <p>All clear — no alerts right now.</p>
              ) : (
                <div className={styles['alert-list']}>
                  {alerts.map((a) => (
                    <div className={styles['alert-item']} key={a.id} onClick={() => openAlert(a.link)}>
                      <span className={cx('alert-dot', a.severity)} />
                      <div className={styles['alert-body']}>
                        <b>{a.title}</b>
                        <p>{a.detail}</p>
                      </div>
                      {a.link && <span className={styles['alert-cta']}>{a.cta || 'Open'}</span>}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles['modal-actions']}>
                <button onClick={() => setNotifOpen(false)}>Close</button>
                {alerts.length > 0 && <button className={styles.primary} onClick={() => { setNotifRead(true); showToast('Notifications marked as read'); setNotifOpen(false); }}>Mark all as read</button>}
              </div>
            </div>
          </div>
        </>,
        document.body,
      )}
    </AdminLayout>
  );
}
