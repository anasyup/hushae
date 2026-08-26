import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import AdminLayout from '../AdminLayout';
import { resolvePreset } from '../dashboard/RangePicker';
import { writePrintWindow } from './printDocument';
import AtelierSidebar from '../components/AtelierSidebar';

/* ============================================================================
 * ORDERS — premium ATELIER table view (orders_overview_theme.html applied
 * verbatim: same CSS family as the Overview, same markup, Chart.js sparks).
 * Data is 100% live from GET /api/orders/admin; every action maps to an
 * existing backend route. The old workflow desk stays at /admin/orders/desk.
 * ======================================================================== */

const ORD_CSS = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');


.ovp-root{--gray-text:#6b7280;--purple-bg:#f5f3ff;--purple-text:#6d28d9;--bg:#f8f8f7;--card:#ffffff;--border:#ececec;--border-light:#f1f1f1;--text:#111111;--muted:#6b7280;--muted2:#9ca3af;--green:#0e9f6e;--green-bg:#ecfdf5;--green-text:#065f46;--yellow-bg:#fef3c7;--yellow-text:#92400e;--blue-bg:#eff6ff;--blue-text:#1e40af;--red-bg:#fef2f2;--red-text:#991b1b;--black:#111111;--sidebar:#0f0f0f}
.ovp-root *{margin:0;padding:0;box-sizing:border-box}
.ovp-root{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);font-size:13px;line-height:1.45;-webkit-font-smoothing:antialiased;display:flex;min-height:100vh}
.ovp-root .sidebar{width:220px;background:var(--sidebar);color:#fff;display:flex;flex-direction:column;position:fixed;left:0;top:0;bottom:0;z-index:100;overflow-y:auto}
.ovp-root .sidebar-top{padding:16px 14px 14px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #1e1e1e}
.ovp-root .logo{width:32px;height:32px;background:#fff;border-radius:8px;display:grid;place-items:center;color:#000;font-weight:800;font-size:16px}
.ovp-root .brand b{font-size:13px;letter-spacing:0.5px;display:block;line-height:1}
.ovp-root .brand span{font-size:9px;color:#9ca3af;letter-spacing:0.8px}
.ovp-root .nav{padding:10px 8px;flex:1}
.ovp-root .nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:500;color:#9ca3af;cursor:pointer;transition:.15s;margin-bottom:2px}
.ovp-root .nav-item:hover{background:#1a1a1a;color:#fff}
.ovp-root .nav-item.active{background:#fff;color:#111;font-weight:600}
.ovp-root .nav-item svg{width:16px;height:16px}
.ovp-root .nav-item .count{margin-left:auto;background:#222;color:#fff;font-size:10px;padding:2px 6px;border-radius:20px;font-weight:600}
.ovp-root .nav-item.active .count{background:#111;color:#fff}
.ovp-root .store-health{margin:12px 8px;background:#1a1a1a;border:1px solid #222;border-radius:12px;padding:12px}
.ovp-root .health-top{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.ovp-root .health-circle{width:44px;height:44px;border-radius:50%;background:conic-gradient(#fff 92%,#333 92%);display:grid;place-items:center;position:relative}
.ovp-root .health-circle::after{content:'';position:absolute;inset:3px;background:#1a1a1a;border-radius:50%}
.ovp-root .health-circle span{position:relative;z-index:1;font-size:11px;font-weight:700}
.ovp-root .health-text b{font-size:11px;display:block}
.ovp-root .health-text p{font-size:10px;color:#9ca3af;line-height:1.3;margin-top:1px}
.ovp-root .btn-health{width:100%;margin-top:10px;background:#fff;color:#111;border:0;border-radius:8px;padding:8px;font-size:11px;font-weight:600;cursor:pointer}
.ovp-root .user-box{padding:12px 10px;border-top:1px solid #1e1e1e;display:flex;align-items:center;gap:10px}
.ovp-root .avatar{width:32px;height:32px;border-radius:50%;background:#333;display:grid;place-items:center;font-size:12px;font-weight:700}
.ovp-root .user-info{flex:1}
.ovp-root .user-info b{font-size:11.5px;display:block}
.ovp-root .user-info span{font-size:10px;color:#9ca3af}
.ovp-root .user-actions{display:flex;gap:6px;margin-top:10px;padding:0 10px 12px}
.ovp-root .ua-btn{width:28px;height:28px;background:#1a1a1a;border:1px solid #222;border-radius:8px;display:grid;place-items:center;cursor:pointer;color:#9ca3af}
.ovp-root .ua-btn:hover{background:#222;color:#fff}
.ovp-root .main{margin-left:220px;flex:1;min-width:0;max-width:calc(100% - 220px)}
.ovp-root .wrap{max-width:1580px;margin:0 auto;padding:14px 18px 32px}
.ovp-root .topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px;flex-wrap:wrap;position:sticky;top:0;z-index:50;background:var(--bg);padding:8px 0}
.ovp-root .top-left h1{font-size:16.5px;font-weight:700;letter-spacing:-0.3px}
.ovp-root .top-left p{font-size:12px;color:var(--muted);margin-top:1px}
.ovp-root .top-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ovp-root .search{position:relative;background:var(--card);border:1px solid var(--border);border-radius:10px;height:36px;min-width:320px;display:flex;align-items:center;padding:0 12px;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:.15s}
.ovp-root .search:focus-within{border-color:#111;box-shadow:0 0 0 3px rgba(17,17,17,0.08)}
.ovp-root .search input{border:0;outline:0;background:transparent;width:100%;font-size:12.5px;color:var(--text)}
.ovp-root .search input::placeholder{color:var(--muted2)}
.ovp-root .kbd{font-size:10px;color:var(--muted2);border:1px solid var(--border);background:#fafafa;border-radius:5px;padding:2px 5px}
.ovp-root .pill{height:36px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:0 12px;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:500;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:.15s}
.ovp-root .pill:hover{border-color:#d1d1d1}
.ovp-root .btn-black{height:36px;background:var(--black);color:#fff;border:0;border-radius:10px;padding:0 14px;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;transition:.15s}
.ovp-root .btn-black:hover{background:#222;transform:translateY(-1px)}
.ovp-root .icon-btn{width:36px;height:36px;background:var(--card);border:1px solid var(--border);border-radius:10px;display:grid;place-items:center;cursor:pointer;position:relative;box-shadow:0 1px 2px rgba(0,0,0,0.03);transition:.15s}
.ovp-root .icon-btn:hover{border-color:#d1d1d1}
.ovp-root .badge{position:absolute;top:-4px;right:-4px;background:var(--black);color:#fff;font-size:9px;font-weight:700;min-width:16px;height:16px;border-radius:20px;display:grid;place-items:center;padding:0 4px;border:2px solid var(--bg)}

.ovp-root .stats{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:12px}
@media(max-width:1380px){.ovp-root .stats{grid-template-columns:repeat(3,1fr)}}
@media(max-width:680px){.ovp-root .stats{grid-template-columns:repeat(2,1fr)}}
.ovp-root .stat{background:var(--card);border:1px solid var(--border-light);border-radius:12px;padding:12px 14px 10px;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:.2s;position:relative;overflow:hidden;cursor:pointer}
.ovp-root .stat:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(0,0,0,0.06);border-color:var(--border)}
.ovp-root .stat-head{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:11px;font-weight:500;margin-bottom:10px}
.ovp-root .stat-head svg{width:14px;height:14px}
.ovp-root .stat-val{font-size:18px;font-weight:700;letter-spacing:-0.3px}
.ovp-root .stat-foot{display:flex;align-items:flex-end;justify-content:space-between;margin-top:8px}
.ovp-root .stat-change{font-size:11px;font-weight:600;color:var(--green);display:flex;align-items:center;gap:2px}
.ovp-root .stat-change.down{color:#ef4444}
.ovp-root .stat-vs{font-size:10px;color:var(--muted2);margin-top:2px}
.ovp-root .spark{width:78px;height:28px}

.ovp-root .card{background:var(--card);border:1px solid var(--border-light);border-radius:12px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,0.02);transition:.2s;margin-bottom:10px}
.ovp-root .card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.04)}
.ovp-root .card-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px}
.ovp-root .card-t{font-size:12.5px;font-weight:700;letter-spacing:-0.15px;display:flex;align-items:center;gap:6px}
.ovp-root .btn-sm{border:1px solid var(--border);background:var(--card);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:500;cursor:pointer;transition:.15s}
.ovp-root .btn-sm:hover{background:#f9f9f9;border-color:#ccc}
.ovp-root .btn-sm.primary{background:#111;color:#fff;border-color:#111}
.ovp-root .btn-sm.primary:hover{background:#222}

.ovp-root .rev-tabs{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.ovp-root .rev-tab{font-size:11px;padding:5px 12px;border-radius:20px;font-weight:600;cursor:pointer;transition:.15s;border:1px solid transparent;user-select:none}
.ovp-root .rev-tab.active{background:var(--black);color:#fff}
.ovp-root .rev-tab.idle{background:#f3f3f2;color:var(--muted);border-color:#f3f3f2}
.ovp-root .rev-tab.idle:hover{background:#ececec}
.ovp-root .filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center}
.ovp-root .filter{height:32px;border:1px solid var(--border);background:#fff;border-radius:8px;padding:0 10px;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:500;cursor:pointer;transition:.15s}
.ovp-root .filter:hover{border-color:#111}
.ovp-root .filter svg{width:12px;height:12px}
.ovp-root .tbl{width:100%;border-collapse:collapse}
.ovp-root .tbl th{font-size:10px;color:var(--muted2);font-weight:500;text-align:left;padding:10px 12px;border-bottom:1px solid #f2f2f2;letter-spacing:0.3px;text-transform:uppercase;white-space:nowrap}
.ovp-root .tbl td{font-size:11.5px;padding:12px 12px;border-bottom:1px solid #fafafa;vertical-align:middle;transition:.12s}
.ovp-root .tbl tr{transition:.12s}
.ovp-root .tbl tbody tr:hover{background:#fafafa}
.ovp-root .prod{display:flex;align-items:center;gap:8px}
.ovp-root .prod-ico{width:28px;height:28px;background:#f5f5f4;border:1px solid #efefef;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:10px;font-weight:700;color:#6b7280}
.ovp-root .badge-paid{background:var(--green-bg);color:var(--green-text);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #d1fae5}
.ovp-root .badge-pending{background:var(--yellow-bg);color:var(--yellow-text);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #fde68a}
.ovp-root .badge-blue{background:var(--blue-bg);color:var(--blue-text);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #bfdbfe}
.ovp-root .badge-red{background:var(--red-bg);color:var(--red-text);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #fecaca}
.ovp-root .badge-gray{background:#f9fafb;color:var(--gray-text);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #e5e7eb}
.ovp-root .badge-purple{background:var(--purple-bg);color:var(--purple-text);border-radius:20px;padding:4px 10px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #ddd6fe}
.ovp-root .dot{width:5px;height:5px;border-radius:50%;background:currentColor}
.ovp-root .action-btn{width:26px;height:26px;border:1px solid var(--border);background:#fff;border-radius:7px;display:grid;place-items:center;cursor:pointer;transition:.15s}
.ovp-root .action-btn:hover{border-color:#111;background:#111;color:#fff}
.ovp-root .action-btn svg{width:12px;height:12px}
.ovp-root .pagination{display:flex;justify-content:space-between;align-items:center;padding:12px 4px;font-size:11px;color:var(--muted);flex-wrap:wrap;gap:10px}
.ovp-root .pag-btns{display:flex;gap:6px}
.ovp-root .pag-btn{width:30px;height:30px;border:1px solid var(--border);background:#fff;border-radius:8px;display:grid;place-items:center;cursor:pointer;transition:.15s;font-size:11px;font-weight:500}
.ovp-root .pag-btn:hover{border-color:#111}
.ovp-root .pag-btn.active{background:#111;color:#fff;border-color:#111}
.ovp-root .toast{position:fixed;bottom:20px;right:20px;background:#111;color:#fff;padding:10px 14px;border-radius:10px;font-size:12px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.2);transform:translateY(80px);opacity:0;transition:all .35s;z-index:9999;display:flex;align-items:center;gap:8px}
.ovp-root .toast.show{transform:translateY(0);opacity:1}
@media(max-width:900px){.ovp-root .main{margin-left:0;max-width:100%}.ovp-root .sidebar{transform:translateX(-100%);transition:.3s}.ovp-root .sidebar.open{transform:translateX(0)}}

.ovp-root{min-height:100vh}
.ovp-root a{text-decoration:none;color:inherit}
.ovp-root button{font-family:inherit}
.ovp-root input{font-family:inherit}
.ovp-root .tbl th.sortable{cursor:pointer}
.ovp-root .tbl th.sortable:hover{color:#111}
`;

const iso = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const prettyDate = (ymd, withYear = false) => {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString('en-US', withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
};
const rangeLabel = (from, to) => `${prettyDate(from)} – ${prettyDate(to, true)}`;
const prevWindow = (from, to) => {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const days = Math.max(1, Math.round((b - a) / 86400000) + 1);
  const prevTo = new Date(a); prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return { from: iso(prevFrom), to: iso(prevTo) };
};
const rs = (n, digits = 2) =>
  `Rs ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

/* ── badge families (reference colours, live statuses) ────────────────────── */
const familyOf = (o) => {
  if (['Cancelled', 'Refunded'].includes(o.status)) return 'cancelled';
  if (o.status === 'Delivered') return 'completed';
  if (o.status === 'Pending') return 'pending';
  return 'processing';
};
const STATUS_BADGE = {
  completed: { cls: 'badge-paid', label: 'Completed' },
  processing: { cls: 'badge-pending', label: 'Processing' },
  pending: { cls: 'badge-blue', label: 'Pending' },
  cancelled: { cls: 'badge-red', label: 'Cancelled' },
};
const payBadge = (o) => {
  const p = o.paymentStatus;
  if (p === 'Paid') return { cls: 'badge-paid', label: 'Paid' };
  if (p === 'Refunded') return { cls: 'badge-purple', label: 'Refunded' };
  if (p === 'Failed') return { cls: 'badge-red', label: 'Failed' };
  return { cls: 'badge-blue', label: p || 'Pending' };
};
const fulBadge = (o) => {
  if (o.status === 'Delivered') return { cls: 'badge-paid', label: 'Fulfilled' };
  if (['Cancelled', 'Refunded'].includes(o.status)) return { cls: 'badge-red', label: 'Cancelled' };
  if (o.status === 'Pending') return { cls: 'badge-gray', label: 'Unfulfilled' };
  return { cls: 'badge-pending', label: 'Processing' };
};

const TABS = [
  { key: 'all', label: 'All Orders' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const RANGE_OPTIONS = [
  { key: '7d', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: '30d', label: 'Last 30 Days' },
];

function ChartBox({ build, deps, className }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = new Chart(ref.current, build());
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} className={className} />;
}

const sparkOpts = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: { x: { display: false }, y: { display: false } },
  elements: { point: { radius: 0 } },
  animation: { duration: 1000, easing: 'easeOutQuart' },
};
const sparkBuild = (data, down) => () => ({
  type: 'line',
  data: { labels: data.map((_, i) => i), datasets: [{ data, borderColor: down ? '#ef4444' : '#111', borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
  options: sparkOpts,
});

const COPY_ICON = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3" /></svg>;
const DOTS_ICON = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>;

export default function OrdersAtelier() {
  const { auth, logout } = useApp();
  const nav = useNavigate();

  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [fStatus, setFStatus] = useState('All');
  const [fPay, setFPay] = useState('All');
  const [fFul, setFFul] = useState('All');
  const [fMethod, setFMethod] = useState('All');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [ppOpen, setPpOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [openMenu, setOpenMenu] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [fs, setFs] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [cols, setCols] = useState({ pay: true, ful: true });

  const toastTimer = useRef(0);
  const say = useCallback((msg) => {
    if (!msg) return;
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const [range, setRange] = useState(() => {
    const r = resolvePreset('7d');
    return { preset: '7d', from: r.from, to: r.to };
  });

  const load = useCallback(async () => {
    try {
      const d = await api('/orders/admin', { token: auth?.token });
      setOrders(d.orders || []);
      setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      setErr('Failed to load orders.');
    }
  }, [auth, logout]);
  useEffect(() => { load(); }, [load]);

  /* outside click closes menus/dropdowns */
  useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest?.('.ovp-dd')) { setOpenMenu(''); setPpOpen(false); setDateOpen(false); }
    };
    const onEsc = (e) => { if (e.key === 'Escape') { setOpenMenu(''); setPpOpen(false); setDateOpen(false); } };
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

  /* ── derived: stats over the selected range, vs previous window ──────── */
  const stats = useMemo(() => {
    const list = orders || [];
    const inRange = (o, a, b) => { const d = iso(o.createdAt); return d >= a && d <= b; };
    const billable = (o) => !['Cancelled', 'Refunded'].includes(o.status);
    const count = (l, fam) => l.filter((o) => familyOf(o) === fam).length;
    const cur = list.filter((o) => inRange(o, range.from, range.to));
    const pw = prevWindow(range.from, range.to);
    const prv = list.filter((o) => inRange(o, pw.from, pw.to));
    const rev = (l) => l.filter(billable).reduce((s, o) => s + (o.total || 0), 0);
    const chg = (c, p) => (p > 0 ? ((c - p) / p) * 100 : null);
    const days = [];
    const a = new Date(`${range.from}T00:00:00`); const b = new Date(`${range.to}T00:00:00`);
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) days.push(iso(d));
    const perDay = (fam) => days.map((day) => list.filter((o) => iso(o.createdAt) === day && (fam === 'total' ? true : fam === 'revenue' ? billable(o) : familyOf(o) === fam)).length);
    return {
      total: cur.length, pending: count(cur, 'pending'), processing: count(cur, 'processing'),
      completed: count(cur, 'completed'), cancelled: count(cur, 'cancelled'), revenue: rev(cur),
      dTotal: chg(cur.length, prv.length), dPending: chg(count(cur, 'pending'), count(prv, 'pending')),
      dProcessing: chg(count(cur, 'processing'), count(prv, 'processing')),
      dCompleted: chg(count(cur, 'completed'), count(prv, 'completed')),
      dCancelled: chg(count(cur, 'cancelled'), count(prv, 'cancelled')),
      dRevenue: chg(rev(cur), rev(prv)),
      sparkTotal: perDay('total'), sparkPending: perDay('pending'), sparkProcessing: perDay('processing'),
      sparkCompleted: perDay('completed'), sparkCancelled: perDay('cancelled'), sparkRevenue: days.map((day) => list.filter((o) => iso(o.createdAt) === day && billable(o)).reduce((s, o) => s + (o.total || 0), 0)),
    };
  }, [orders, range.from, range.to]);

  const vsLabel = (() => { const pw = prevWindow(range.from, range.to); return `vs ${prettyDate(pw.from)} – ${prettyDate(pw.to)}`; })();

  /* ── derived: table (all orders; tabs + filters + search + sort) ─────── */
  const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
  const METHODS = ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Visa'];

  const filtered = useMemo(() => {
    let list = orders || [];
    if (tab !== 'all') list = list.filter((o) => familyOf(o) === tab);
    if (fStatus !== 'All') list = list.filter((o) => o.status === fStatus);
    if (fPay !== 'All') list = list.filter((o) => (o.paymentStatus || 'Pending') === fPay);
    if (fFul !== 'All') list = list.filter((o) => fulBadge(o).label === fFul);
    if (fMethod !== 'All') list = list.filter((o) => o.paymentMethod === fMethod);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((o) =>
        `${o.orderNumber} ${o.customerInfo?.name || ''} ${o.customerInfo?.email || ''} ${o.customerInfo?.phone || ''}`.toLowerCase().includes(needle));
    }
    const dir = sortDir;
    list = [...list].sort((x, y) => {
      if (sortKey === 'total') return ((x.total || 0) - (y.total || 0)) * dir;
      return (new Date(x.createdAt) - new Date(y.createdAt)) * dir;
    });
    return list;
  }, [orders, tab, fStatus, fPay, fFul, fMethod, q, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);
  const fromN = filtered.length ? (safePage - 1) * perPage + 1 : 0;
  const toN = Math.min(filtered.length, safePage * perPage);

  useEffect(() => { setPage(1); }, [tab, q, fStatus, fPay, fFul, fMethod, perPage]);

  const tabCount = (k) => (orders || []).filter((o) => (k === 'all' ? true : familyOf(o) === k)).length;

  const allOnPage = paged.length > 0 && paged.every((o) => selected.has(o._id));
  const toggleAll = () => {
    setSelected((s) => {
      const n = new Set(s);
      if (allOnPage) paged.forEach((o) => n.delete(o._id));
      else paged.forEach((o) => n.add(o._id));
      return n;
    });
  };
  const toggleOne = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const clearFilters = () => {
    setQ(''); setFStatus('All'); setFPay('All'); setFFul('All'); setFMethod('All'); setTab('all');
    say('Filters cleared');
  };

  const copyNum = (num) => {
    navigator.clipboard?.writeText(num).then(() => say(`Copied ${num}`)).catch(() => say('Copy failed'));
  };

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['Order', 'Customer', 'Email', 'Phone', 'Date', 'Status', 'Payment', 'Fulfillment', 'Total'];
    const lines = filtered.map((o) => [
      o.orderNumber, o.customerInfo?.name || '', o.customerInfo?.email || '', o.customerInfo?.phone || '',
      iso(o.createdAt), o.status, o.paymentStatus || 'Pending', fulBadge(o).label, (o.total || 0).toFixed(2),
    ].map(esc).join(','));
    const blob = new Blob([head.map(esc).join(',') + '\n' + lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders-${iso(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    say(`Exported ${filtered.length} orders to CSV`);
  };

  const bulkPrint = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    const win = window.open('', '_blank');
    if (!win) { say('Allow pop-ups to print'); return; }
    setBusy(true);
    try {
      const payload = await api(`/orders/manage/print/batch?doc=invoice&ids=${ids.join(',')}`, { token: auth?.token });
      if (!payload.orders?.length) { say('No printable orders in selection'); win.close(); }
      else writePrintWindow(win, payload);
    } catch (e) {
      say(e?.message || 'Could not print');
      win.close();
    }
    setBusy(false);
  };

  const bulkMarkPaid = async () => {
    const targets = (orders || []).filter((o) => selected.has(o._id) && o.paymentStatus !== 'Paid');
    if (!targets.length) { say('Selected orders are already Paid'); return; }
    setBusy(true);
    let done = 0;
    for (const o of targets) {
      try {
        await api(`/orders/admin/${o._id}/payment`, { method: 'PATCH', token: auth?.token, body: { paymentStatus: 'Paid' } });
        done++;
      } catch { /* keep going */ }
    }
    await load();
    setBusy(false);
    say(`${done} order${done === 1 ? '' : 's'} marked Paid`);
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(-1); }
  };

  const pagBtns = useMemo(() => {
    const out = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) out.push(i); return out; }
    out.push(1);
    if (safePage > 3) out.push('…');
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) out.push(i);
    if (safePage < totalPages - 2) out.push('…');
    out.push(totalPages);
    return out;
  }, [totalPages, safePage]);

  const pendingCount = tabCount('pending');

  const health = useMemo(() => {
    const t = stats.total;
    const pct = t ? (stats.completed / t) * 100 : 0;
    const label = pct >= 85 ? 'Excellent' : pct >= 70 ? 'Good' : pct >= 45 ? 'Fair' : 'Needs attention';
    const text = pct >= 70 ? 'Your store is performing great!' : pct >= 45 ? 'Steady progress — keep fulfilment tight.' : 'Focus on completing pending orders.';
    return { pct, label, text };
  }, [stats.total, stats.completed]);

  const shell = (children) => (
    <AdminLayout title="Orders" subtitle="Manage and track all customer orders." hideContentTitle chromeless>
      <style>{ORD_CSS}</style>
      <div className="ovp-root">
        <AtelierSidebar active="orders" badge={pendingCount} health={health} onNotify={say} />
        <div className="main">
          {children}
        </div>
      </div>
    </AdminLayout>
  );

  if (err) {
    return shell(
      <div className="wrap">
        <div className="card" style={{ maxWidth: 420, margin: '40px auto', textAlign: 'center' }}>
          <div className="card-t" style={{ justifyContent: 'center' }}>{err}</div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <button type="button" className="btn-sm primary" onClick={() => { setErr(''); load(); }}>Try again</button>
          </div>
        </div>
      </div>,
    );
  }

  if (!orders) {
    return shell(
      <div className="wrap">
        <div className="stats">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="stat" style={{ height: 104 }} />)}</div>
        <div className="card" style={{ height: 420 }} />
      </div>,
    );
  }

  const Change = ({ v, down }) => (
    typeof v === 'number' ? (
      <div className={`stat-change ${v < 0 ? 'down' : ''}`}>{v < 0 ? '↓' : '↑'} {Math.abs(v).toFixed(1)}%</div>
    ) : <div className="stat-vs">—</div>
  );

  return shell(
    <div className="wrap">
      {/* ── topbar ─────────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="top-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" className="icon-btn" style={{ border: 0, boxShadow: 'none' }} aria-label="Open navigation menu" onClick={() => window.dispatchEvent(new window.Event('atelier-nav'))}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div><h1>Orders</h1><p>Manage and track all customer orders.</p></div>
        </div>
        <div className="top-right">
          <div className="search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders, customers, products..." aria-label="Search orders" />
            <span className="kbd">⌘ K</span>
          </div>
          <div className="pill ovp-dd" onClick={() => setDateOpen((v) => !v)}>
            <span>{rangeLabel(range.from, range.to)}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
            <div className={`dropdown ${dateOpen ? 'show' : ''}`} style={{ display: dateOpen ? 'block' : 'none', position: 'absolute', top: 42, right: 0, background: '#fff', border: '1px solid #ececec', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 6, minWidth: 200, zIndex: 100 }}>
              {RANGE_OPTIONS.map((o) => {
                const r = resolvePreset(o.key);
                return <div key={o.key} style={{ padding: '8px 10px', borderRadius: 8, fontSize: 11.5, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); const rr = resolvePreset(o.key); setRange({ preset: o.key, from: rr.from, to: rr.to }); setDateOpen(false); say(`Range: ${o.label}`); }}>{o.label} · {rangeLabel(r.from, r.to)}</div>;
              })}
            </div>
          </div>
          <div className="pill" title={vsLabel}><span>Compare: Previous period</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
          </div>
          <button type="button" className="btn-black" onClick={() => nav('/admin/orders/new')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg> Add Order
          </button>
          <button type="button" className="icon-btn" title="Pending orders" onClick={() => setTab('pending')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
            {pendingCount > 0 && <span className="badge">{pendingCount}</span>}
          </button>
          <button
            type="button"
            className="icon-btn"
            title={fs ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => say('Fullscreen not supported'));
              else document.exitFullscreen().catch(() => {});
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
          </button>
        </div>
      </div>

      {/* ── stats ──────────────────────────────────────────────────────── */}
      <div className="stats">
        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M9 16l2 2 4-4" /></svg> Total Orders</div>
          <div className="stat-val">{stats.total.toLocaleString()}</div>
          <div className="stat-foot"><div><Change v={stats.dTotal} /><div className="stat-vs">{vsLabel}</div></div><div className="spark"><ChartBox deps={[stats.sparkTotal.join(',')]} build={sparkBuild(stats.sparkTotal)} /></div></div>
        </div>
        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> Pending</div>
          <div className="stat-val">{stats.pending.toLocaleString()}</div>
          <div className="stat-foot"><div><Change v={stats.dPending} /><div className="stat-vs">{vsLabel}</div></div><div className="spark"><ChartBox deps={[stats.sparkPending.join(',')]} build={sparkBuild(stats.sparkPending)} /></div></div>
        </div>
        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" /></svg> Processing</div>
          <div className="stat-val">{stats.processing.toLocaleString()}</div>
          <div className="stat-foot"><div><Change v={stats.dProcessing} /><div className="stat-vs">{vsLabel}</div></div><div className="spark"><ChartBox deps={[stats.sparkProcessing.join(',')]} build={sparkBuild(stats.sparkProcessing)} /></div></div>
        </div>
        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg> Completed</div>
          <div className="stat-val">{stats.completed.toLocaleString()}</div>
          <div className="stat-foot"><div><Change v={stats.dCompleted} /><div className="stat-vs">{vsLabel}</div></div><div className="spark"><ChartBox deps={[stats.sparkCompleted.join(',')]} build={sparkBuild(stats.sparkCompleted)} /></div></div>
        </div>
        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg> Cancelled</div>
          <div className="stat-val">{stats.cancelled.toLocaleString()}</div>
          <div className="stat-foot"><div><Change v={stats.dCancelled} down /><div className="stat-vs">{vsLabel}</div></div><div className="spark"><ChartBox deps={[stats.sparkCancelled.join(',')]} build={sparkBuild(stats.sparkCancelled, true)} /></div></div>
        </div>
        <div className="stat">
          <div className="stat-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> Revenue</div>
          <div className="stat-val">{rs(stats.revenue)}</div>
          <div className="stat-foot"><div><Change v={stats.dRevenue} /><div className="stat-vs">{vsLabel}</div></div><div className="spark"><ChartBox deps={[stats.sparkRevenue.join(',')]} build={sparkBuild(stats.sparkRevenue)} /></div></div>
        </div>
      </div>

      {/* ── orders table card ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-h">
          <div className="rev-tabs">
            {TABS.map((t) => (
              <button key={t.key} type="button" className={`rev-tab ${tab === t.key ? 'active' : 'idle'}`} onClick={() => setTab(t.key)}>
                {t.label} <span style={{ marginLeft: 4, background: tab === t.key ? 'rgba(255,255,255,0.2)' : '#e5e7eb', color: tab === t.key ? '#fff' : '#6b7280', padding: '2px 6px', borderRadius: 10, fontSize: 10 }}>{tabCount(t.key).toLocaleString()}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn-sm" onClick={() => setShowFilters((v) => !v)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ verticalAlign: -1 }}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg> Filter
            </button>
            <button type="button" className="btn-sm" onClick={() => setCols((c) => ({ pay: !c.pay, ful: !c.ful }))}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ verticalAlign: -1 }}><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg> Columns
            </button>
            <button type="button" className="btn-sm" onClick={exportCsv}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ verticalAlign: -1 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Export
            </button>
            <div className="ovp-dd" style={{ position: 'relative' }}>
              <button type="button" className="btn-sm" onClick={() => setOpenMenu((v) => (v === 'card' ? '' : 'card'))}>⋮</button>
              {openMenu === 'card' && (
                <div style={{ position: 'absolute', right: 0, top: 30, zIndex: 60, background: '#fff', border: '1px solid #ececec', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 6, minWidth: 170 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 8, fontSize: 11.5, cursor: 'pointer' }} onClick={() => { setOpenMenu(''); load(); say('Orders refreshed'); }}>Refresh data</div>
                  <Link to="/admin/orders/desk" style={{ display: 'block', padding: '8px 10px', borderRadius: 8, fontSize: 11.5 }} onClick={() => setOpenMenu('')}>Open workflow desk</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: '0 10px', height: 32, minWidth: 180 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="6" /><path d="m20 20-3.5-3.5" /></svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders..." style={{ border: 0, outline: 0, background: 'transparent', width: '100%', fontSize: 11.5 }} aria-label="Search orders table" />
          </div>

          {showFilters && [
            { label: 'Status', value: fStatus, set: setFStatus, opts: ['All', ...STATUSES] },
            { label: 'Payment Status', value: fPay, set: setFPay, opts: ['All', 'Paid', 'Pending', 'Refunded', 'Failed'] },
            { label: 'Fulfillment Status', value: fFul, set: setFFul, opts: ['All', 'Fulfilled', 'Processing', 'Unfulfilled', 'Cancelled'] },
            { label: 'Payment Method', value: fMethod, set: setFMethod, opts: ['All', ...METHODS] },
          ].map((f) => <FilterDD key={f.label} {...f} />)}
          {showFilters && (
            <div className="filter" onClick={clearFilters} style={{ cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg> More filters: Clear all
            </div>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn-sm" onClick={clearFilters}>Clear</button>
            <button type="button" className="btn-sm primary" onClick={() => say(`Filters applied — ${filtered.length} orders`)}>Apply</button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="filter-bar" style={{ background: '#111', borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{selected.size} selected</span>
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              <button type="button" className="btn-sm" disabled={busy} onClick={bulkPrint}>Print invoices</button>
              <button type="button" className="btn-sm" disabled={busy} onClick={bulkMarkPaid}>Mark Paid</button>
              <button type="button" className="btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
            </div>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on page" /></th>
                <th>Order</th>
                <th>Customer</th>
                <th className="sortable" onClick={() => toggleSort('date')}>Date {sortKey === 'date' ? (sortDir === -1 ? '↓' : '↑') : ''}</th>
                <th>Status</th>
                {cols.pay && <th>Payment</th>}
                {cols.ful && <th>Fulfillment</th>}
                <th className="sortable" onClick={() => toggleSort('total')}>Total {sortKey === 'total' ? (sortDir === -1 ? '↓' : '↑') : ''}</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 && (
                <tr><td colSpan={6 + (cols.pay ? 1 : 0) + (cols.ful ? 1 : 0) + 1} style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>No orders match these filters.</td></tr>
              )}
              {paged.map((o) => {
                const sb = STATUS_BADGE[familyOf(o)];
                const pb = payBadge(o);
                const fb = fulBadge(o);
                const d = new Date(o.createdAt);
                return (
                  <tr key={o._id}>
                    <td><input type="checkbox" checked={selected.has(o._id)} onChange={() => toggleOne(o._id)} aria-label={`Select ${o.orderNumber}`} /></td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Link to={`/admin/orders/${o._id}`} title={o.status}>{o.orderNumber}</Link>
                        <button type="button" style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }} onClick={() => copyNum(o.orderNumber)} aria-label={`Copy ${o.orderNumber}`}>{COPY_ICON}</button>
                      </div>
                    </td>
                    <td>
                      <div>
                        <b style={{ fontSize: 11.5 }}>{o.customerInfo?.name || 'Customer'}</b>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{o.customerInfo?.email || o.customerInfo?.phone || ''}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <b style={{ fontWeight: 500 }}>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</b>
                        <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                      </div>
                    </td>
                    <td><span className={sb.cls} title={o.status}><span className="dot"></span> {sb.label}</span></td>
                    {cols.pay && <td><span className={pb.cls}><span className="dot"></span> {pb.label}</span></td>}
                    {cols.ful && <td><span className={fb.cls}><span className="dot"></span> {fb.label}</span></td>}
                    <td><b>{rs(o.total)}</b></td>
                    <td style={{ position: 'relative' }}>
                      <button type="button" className="action-btn ovp-dd" aria-label={`Actions for ${o.orderNumber}`} onClick={() => setOpenMenu((v) => (v === o._id ? '' : o._id))}>{DOTS_ICON}</button>
                      {openMenu === o._id && (
                        <div style={{ position: 'absolute', right: 0, top: 30, zIndex: 60, background: '#fff', border: '1px solid #ececec', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 6, minWidth: 150 }}>
                          <Link to={`/admin/orders/${o._id}`} style={{ display: 'block', padding: '8px 10px', borderRadius: 8, fontSize: 11.5 }} onClick={() => setOpenMenu('')}>Open order</Link>
                          <a href={`/admin/orders/${o._id}/invoice`} target="_blank" rel="noreferrer" style={{ display: 'block', padding: '8px 10px', borderRadius: 8, fontSize: 11.5 }} onClick={() => setOpenMenu('')}>Invoice</a>
                          <div style={{ padding: '8px 10px', borderRadius: 8, fontSize: 11.5, cursor: 'pointer' }} onClick={() => { setOpenMenu(''); copyNum(o.orderNumber); }}>Copy number</div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span>Showing {fromN} to {toN} of {filtered.length.toLocaleString()} results</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="pag-btns">
              <button type="button" className="pag-btn" disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              {pagBtns.map((p, i) => (
                p === '…'
                  ? <span key={`e${i}`} style={{ padding: '0 4px' }}>…</span>
                  : <button key={p} type="button" className={`pag-btn ${p === safePage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button type="button" className="pag-btn" disabled={safePage === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="Next page">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
            <div className="ovp-dd" style={{ height: 30, border: '1px solid var(--border)', background: '#fff', borderRadius: 8, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer', position: 'relative' }} onClick={() => setPpOpen((v) => !v)}>
              {perPage} / page ▾
              {ppOpen && (
                <div style={{ position: 'absolute', bottom: 34, right: 0, background: '#fff', border: '1px solid #ececec', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 6, minWidth: 90, zIndex: 60 }}>
                  {[10, 25, 50].map((n) => (
                    <div key={n} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: n === perPage ? 700 : 400 }} onClick={(e) => { e.stopPropagation(); setPerPage(n); setPpOpen(false); }}>{n} / page</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── toast ─────────────────────────────────────────────────────── */}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        <span>{toast || 'Done'}</span>
      </div>
    </div>,
  );
}

/* ── filter dropdown pill (reference .filter + dropdown behaviour) ────────── */
function FilterDD({ label, value, set, opts }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="filter ovp-dd" style={{ position: 'relative' }} onClick={() => setOpen((v) => !v)}>
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>{label}</span> {value} ▾
      {open && (
        <div style={{ position: 'absolute', top: 36, left: 0, zIndex: 60, background: '#fff', border: '1px solid #ececec', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 6, minWidth: 160, maxHeight: 260, overflowY: 'auto' }}>
          {opts.map((o) => (
            <div key={o} style={{ padding: '7px 10px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontWeight: o === value ? 700 : 400, background: o === value ? '#f5f5f5' : 'transparent' }} onClick={(e) => { e.stopPropagation(); set(o); setOpen(false); }}>
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
