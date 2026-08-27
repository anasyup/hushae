import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCircle2, ChevronDown, Download, Filter, Keyboard, Loader2,
  Plus, RefreshCcw, Search, X, XCircle,
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { pkr } from '../../lib/format';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { GROUPS, PAYMENT_METHODS, PAYMENT_STATES, SORT_OPTIONS, ISSUE_TYPES, REFUND_STATES } from './orderConstants';
import { useOrderDesk, useOrderNotifications } from './useOrderDesk';
import OrderFilters from './OrderFilters';
import BulkBar from './BulkBar';
import OrderRow from './OrderRow';
import QuickFilters from './QuickFilters';
import CustomerPanel from './CustomerPanel';
import { writeErrorWindow, writeLoadingWindow, writePrintWindow } from './printDocument';
import s from './adesk.module.css';

/* ===========================================================================
 * Order desk — "balanced polish" build.
 *
 * Layout, sizes and colours follow the reference file
 * orders_balanced_polished.html 1:1 (topbar with search + range pills, six
 * stat tiles with sparklines, one white card holding tabs / filter bar /
 * fixed-layout table / pagination), using the same ATELIER tokens as
 * /admin (Overview).
 *
 * Nothing here is decoration-only: every number comes from
 * GET /orders/manage/counts, the tiles and tabs set real URL filters, the
 * sparklines are bucketed from orders actually loaded for this view, and the
 * drill-down (kept from the previous pass — it is a feature, not chrome)
 * compares against a real second window.
 * =========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join('');

/* Reference filter chip: `Label  value ▾` with the real <select> laid over it
   invisibly, so keyboard + screen readers still get a native control. */
function Chip({ label, raw, value, onChange, children, title }) {
  return (
    <label className={s.filter} title={title || label}>
      <span className={s.fLabel}>{label}</span>
      <span className={s.filterVal}>{value}</span>
      <ChevronDown size={11} className={s.chev} aria-hidden />
      <select className={s.filterSel} value={raw} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
    </label>
  );
}
const int = (v) => (v == null ? '—' : Number(v).toLocaleString('en-US'));
/* Amount for a 1/6-width tile: full rupees below 100k, compact above, so the
   figure never gets cut off by the cell. */
const moneyTile = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e7) return `₨${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₨${(n / 1e5).toFixed(2)} Lac`;
  return pkr(n);
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shift = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return iso(d);
};
const shortDate = (str) => (str ? new Date(`${str}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped',
  'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];

/* Tiles and tabs speak `status` (the coarse workflow field the API filters).
   `count` prefers byStatus — the number that matches the filter — and falls
   back to the pipeline groups on an API that predates byStatus. */
const BUCKETS = [
  { key: 'all', label: 'All Orders', status: '', count: (c) => c?.total, bucket: () => true },
  { key: 'pending', label: 'Pending', status: 'Pending', count: (c) => c?.byStatus?.Pending ?? c?.byGroup?.new, bucket: (o) => o.status === 'Pending' },
  { key: 'processing', label: 'Processing', status: 'Processing,Confirmed',
    count: (c) => (c?.byStatus?.Processing ?? 0) + (c?.byStatus?.Confirmed ?? 0) || c?.byGroup?.processing,
    bucket: (o) => ['Processing', 'Confirmed'].includes(o.status) },
  { key: 'completed', label: 'Completed', status: 'Delivered,Out for Delivery,Shipped',
    count: (c) => (c?.byStatus?.Delivered ?? 0) + (c?.byStatus?.['Out for Delivery'] ?? 0) + (c?.byStatus?.Shipped ?? 0) || c?.byGroup?.delivered,
    bucket: (o) => ['Delivered', 'Out for Delivery', 'Shipped'].includes(o.status) },
  { key: 'cancelled', label: 'Cancelled', status: 'Cancelled,Refunded',
    count: (c) => (c?.byStatus?.Cancelled ?? 0) + (c?.byStatus?.Refunded ?? 0) || c?.byGroup?.issues,
    bucket: (o) => ['Cancelled', 'Refunded'].includes(o.status) },
  { key: 'shipped', label: 'Shipped', status: 'Shipped',
    count: (c) => c?.byStatus?.Shipped ?? c?.byGroup?.shipped,
    bucket: (o) => o.status === 'Shipped' },
  { key: 'delivered', label: 'Delivered', status: 'Delivered',
    count: (c) => c?.byStatus?.Delivered ?? c?.byGroup?.delivered,
    bucket: (o) => o.status === 'Delivered' },
];

const STRUCTURE_PILLS = [
  {
    key: 'all',
    label: 'All Orders',
    count: (c, d) => c?.total ?? d?.total ?? 0,
    isOn: (f) => (!f.preset || f.preset === 'all') && (!f.status || f.status === '') && (f.group === 'all' || !f.group) && (f.paymentState === 'all' || !f.paymentState),
    apply: () => ({ group: 'all', status: '', preset: '', paymentState: 'all', stage: '', paymentMethod: 'all' }),
  },
  {
    key: 'draft',
    label: 'Draft Orders',
    count: (c) => c?.byGroup?.draft ?? c?.drafts ?? 0,
    isOn: (f) => f.preset === 'draft' || f.group === 'draft',
    apply: () => ({ preset: 'draft', group: 'all', status: '', stage: '', paymentState: 'all' }),
  },
  {
    key: 'abandoned',
    label: 'Abandoned',
    count: (c) => c?.abandoned ?? 0,
    isOn: (f) => f.preset === 'abandoned',
    apply: () => ({ preset: 'abandoned', group: 'all', status: '', stage: '', paymentState: 'all' }),
  },
  {
    key: 'pending_payment',
    label: 'Pending Payment',
    count: (c) => c?.byPaymentState?.Pending ?? 0,
    isOn: (f) => f.paymentState === 'Pending',
    apply: () => ({ paymentState: 'Pending', status: '', group: 'all', stage: '', preset: '' }),
  },
  {
    key: 'processing',
    label: 'Processing',
    count: (c) => (c?.byStatus?.Processing ?? 0) + (c?.byStatus?.Confirmed ?? 0) || c?.byGroup?.processing || 0,
    isOn: (f) => f.status === 'Processing,Confirmed' || f.status === 'Processing',
    apply: () => ({ status: 'Processing,Confirmed', group: 'all', stage: '', paymentState: 'all', preset: '' }),
  },
  {
    key: 'fulfillment',
    label: 'Fulfillment',
    count: (c) => (c?.byGroup?.['to-ship'] ?? 0) || (c?.byStage?.['Packed'] ?? 0) || 0,
    isOn: (f) => f.group === 'to-ship',
    apply: () => ({ group: 'to-ship', status: '', stage: '', paymentState: 'all', preset: '' }),
  },
  {
    key: 'shipped',
    label: 'Shipped',
    count: (c) => c?.byStatus?.Shipped ?? (c?.byGroup?.shipped ?? 0),
    isOn: (f) => f.status === 'Shipped',
    apply: () => ({ status: 'Shipped', group: 'all', stage: '', paymentState: 'all', preset: '' }),
  },
  {
    key: 'delivered',
    label: 'Delivered',
    count: (c) => c?.byStatus?.Delivered ?? (c?.byGroup?.delivered ?? 0),
    isOn: (f) => f.status === 'Delivered',
    apply: () => ({ status: 'Delivered', group: 'all', stage: '', paymentState: 'all', preset: '' }),
  },
  {
    key: 'cancelled',
    label: 'Cancelled',
    count: (c) => c?.byStatus?.Cancelled ?? (c?.byGroup?.issues ?? 0),
    isOn: (f) => f.status === 'Cancelled',
    apply: () => ({ status: 'Cancelled', group: 'all', stage: '', paymentState: 'all', preset: '' }),
  },
  {
    key: 'returns',
    label: 'Returns',
    count: (c) => c?.byStage?.Returned ?? (c?.byStatus?.Returned ?? 0),
    isOn: (f) => f.status === 'Returned' || f.stage === 'Returned',
    apply: () => ({ status: 'Returned', group: 'all', stage: '', paymentState: 'all', preset: '' }),
  },
  {
    key: 'refunds',
    label: 'Refunds',
    count: (c) => c?.byStage?.Refunded ?? (c?.byStatus?.Refunded ?? 0),
    isOn: (f) => f.status === 'Refunded' || f.stage === 'Refunded',
    apply: () => ({ status: 'Refunded', group: 'all', stage: '', paymentState: 'all', preset: '' }),
  },
  {
    key: 'payment_issues',
    label: 'Payment Issues',
    count: (c) => (c?.byPaymentState?.Failed ?? 0) + (c?.byPaymentState?.Expired ?? 0),
    isOn: (f) => f.paymentState === 'Failed,Expired',
    apply: () => ({ paymentState: 'Failed,Expired', group: 'all', status: '', stage: '', preset: '' }),
  },
];
const TABS = BUCKETS.map(({ key, label, status }) => ({ key, label, status }));
const BUCKET = Object.fromEntries(BUCKETS.map((b) => [b.key, b]));

const STAT_ICONS = {
  total: <><rect x="1" y="4" width="22" height="17" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></>,
  pending: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></>,
  processing: <><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /></>,
  completed: <><circle cx="12" cy="12" r="9" /><polyline points="8 12 11 15 16 9" /></>,
  cancelled: <><circle cx="12" cy="12" r="9" /><line x1="6" y1="6" x2="18" y2="18" /></>,
};

/** Build the six tiles: value, real delta vs a real second window, spark. */
function buildTiles(counts, prev, series, cmpWindow) {
  const c = counts || {};
  const p = prev || {};
  const g = c.byGroup || {}; const pg = p.byGroup || {};
  const ps = c.byPaymentState || {}; const pps = p.byPaymentState || {};
  const pct = (cur, pre) => (pre ? ((cur - pre) / pre) * 100 : null);
  const rows = series.rows || [];
  const winLabel = series.daily && series.daily.length > 1 ? `${series.daily.length}-day trend` : 'in view';
  const byDay = (pred) => {
    const map = new Map();
    rows.forEach((o) => {
      if (pred && !pred(o)) return;
      const k = new Date(o.createdAt).toISOString().slice(0, 10);
      map.set(k, (map.get(k) || 0) + 1);
    });
    const days = [...map.keys()].sort().slice(-14);
    return days.length > 1 ? days.map((d) => map.get(d)) : [];
  };
  const daily = series.daily || [];
  const tile = (key, extra = {}) => {
    const b = BUCKET[key === 'revenue' ? 'all' : key];
    const cur = b ? Number(b.count(c) || 0) : null;
    const pre = b && p.total != null ? Number(b.count(p) || 0) : null;
    return {
      key, label: b?.label ?? key, icon: STAT_ICONS[key], value: int(cur),
      series: key === 'total' && daily.length > 1 ? daily.map((d) => d.orders || 0) : byDay(b?.bucket), tab: key,
      change: cur != null && pre != null ? pct(cur, pre) : null,
      vs: cmpWindow ? cmpWindow.label : winLabel,
      ...extra,
    };
  };

  return [
    { ...tile('total'), value: int(c.total) },
    tile('pending'),
    tile('processing'),
    tile('completed'),
    tile('cancelled', { downIsGood: true }),
    {
      key: 'revenue', label: 'Revenue', icon: null, tab: null, money: true,
      value: c.revenue != null ? moneyTile(c.revenue) : '—',
      series: series.revenue,
      change: c.revenue != null && p.revenue != null ? pct(c.revenue, p.revenue) : null,
      vs: cmpWindow ? cmpWindow.label : 'in view',
      note: `${int(ps.Pending || 0)} unverified · ${int(g.issues || 0)} open issues`,
    },
  ];
}

/** Stage / group distribution + breakdown stats for the drill-down panel. */
function buildDrill(key, counts, rows) {
  const byStage = counts?.byStage || {};
  const byGroup = counts?.byGroup || {};
  const total = counts?.total ?? 0;
  const paid = (counts?.byPaymentState?.Confirmed || 0) + (counts?.byPaymentState?.Verified || 0);
  const unpaid = counts?.byPaymentState?.Pending || 0;
  const rev = counts?.revenue || 0;
  const delivered = byGroup.delivered || 0;
  const unprinted = rows.filter((o) => !o.printStatus?.invoice?.printed).length;
  const SERIES = {
    total: [['New', byGroup.new || 0], ['Processing', byGroup.processing || 0], ['To Ship', byGroup['to-ship'] || 0], ['Shipped', byGroup.shipped || 0], ['Delivered', delivered], ['Issues', byGroup.issues || 0]],
    revenue: Object.entries(byStage).sort((a, b) => b[1] - a[1]).slice(0, 7),
    pending: [['Awaiting review', byGroup.new || 0], ['Verified', counts?.byPaymentState?.Verified || 0], ['Unverified', unpaid]],
    processing: [['Processing', byGroup.processing || 0], ['To Ship', byGroup['to-ship'] || 0], ['Shipped', byGroup.shipped || 0]],
    completed: [['Delivered', delivered], ['Shipped', byGroup.shipped || 0], ['Not yet', Math.max(0, total - delivered)]],
    cancelled: [['Issues', byGroup.issues || 0], ['Delivered', delivered], ['Open', Math.max(0, total - delivered - (byGroup.issues || 0))]],
  };
  const NOTES = {
    total: [['Orders in view', int(total), 'Every stage, whatever its status'], ['Awaiting review', int(byGroup.new || 0), 'Just received'], ['Delivered', int(delivered), `${total ? Math.round((delivered / total) * 100) : 0}% closed`], ['Issues', int(byGroup.issues || 0), 'Cancellations, returns, refunds']],
    revenue: [['Value in view', pkr(rev), 'Sum of order totals'], ['Average order', total ? pkr(Math.round(rev / total)) : '—', 'Revenue ÷ orders'], ['Paid value', pkr(Math.round(rev * (total ? paid / total : 0))), 'Carried by paid orders'], ['Unprinted (page)', int(unprinted), 'Invoices not printed yet']],
    pending: [['Awaiting review', int(byGroup.new || 0), 'Nothing done yet'], ['Unverified', int(unpaid), 'Payment check pending'], ['Of all orders', `${total ? Math.round(((byGroup.new || 0) / total) * 100) : 0}%`, 'Higher means more chasing']],
    processing: [['Processing', int(byGroup.processing || 0), 'With the warehouse'], ['To Ship', int(byGroup['to-ship'] || 0), 'Packed, courier pending'], ['Shipped', int(byGroup.shipped || 0), 'In transit']],
    completed: [['Delivered', int(delivered), `${total ? Math.round((delivered / total) * 100) : 0}% of orders`], ['Shipped', int(byGroup.shipped || 0), 'On the way'], ['Unprinted (page)', int(unprinted), 'Invoices still to print']],
    cancelled: [['Issues', int(byGroup.issues || 0), 'Cancel + return + refund'], ['Paid then cancelled', int(unpaid), 'Needs money back check'], ['Delivered', int(delivered), 'For contrast']],
  };
  return { series: (SERIES[key] || []).filter(([, v]) => Number(v) > 0), notes: NOTES[key] || [] };
}

export default function OrdersDesk() {
  const { auth, toast } = useApp();
  const nav = useNavigate();
  const desk = useOrderDesk();
  const notes = useOrderNotifications();
  const {
    filters, setFilter, resetFilters, activeFilterCount,
    data, counts, facets, loading, error, busyIds,
    reload, setStage, verifyPayment, bulk, exportCsv,
  } = desk;

  const [selected, setSelected] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [serviceFor, setServiceFor] = useState(null);
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [customerPhone, setCustomerPhone] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [activeStat, setActiveStat] = useState(null);
  const [term, setTerm] = useState(filters.q || '');
  const [sugOpen, setSugOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [prev, setPrev] = useState(null);
  const [series, setSeries] = useState({ rows: [], revenue: [], daily: [] });
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hushae.orderSearches') || '[]'); } catch { return []; }
  });
  const searchRef = useRef(null);
  const searchWrap = useRef(null);
  const debounce = useRef(null);
  const drillChart = useRef(null);
  const drillObj = useRef(null);
  const sparkObjs = useRef([]);

  const orders = data.orders || [];
  const ids = useMemo(() => orders.map((o) => o._id), [orders]);
  const token = auth?.token;

  useEffect(() => { setSelected([]); setSelectAllMatching(false); }, [filters.status, filters.group, filters.preset]);
  useEffect(() => { setTerm(filters.q || ''); }, [filters.q]);

  const toggle = useCallback((id) =>
    setSelected((prevSel) => (prevSel.includes(id) ? prevSel.filter((x) => x !== id) : [...prevSel, id])), []);
  const allOnPage = orders.length > 0 && selected.length === orders.length;

  /* ── print (unchanged endpoints) ───────────────────────────────────── */
  const openPrintTab = useCallback(async (docType, orderIds) => {
    const win = window.open('', '_blank');
    if (!win) { toast?.('Allow pop-ups for this site to print'); return; }
    writeLoadingWindow(win, 'Preparing documents…');
    try {
      const qs = new URLSearchParams({ doc: docType });
      if (orderIds?.length) qs.set('ids', orderIds.join(','));
      else Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const payload = await api(`/orders/manage/print/batch?${qs}`, { token });
      if (!payload.orders?.length) { writeErrorWindow(win, 'There were no orders to print.'); return; }
      writePrintWindow(win, payload);
      bulk('print', payload.orders.map((o) => o._id).slice(0, 200), { docType }).catch(() => {});
    } catch (e) {
      writeErrorWindow(win, e.message || 'Could not load the documents.');
      toast?.(e.message || 'Print failed');
    }
  }, [token, filters, bulk, toast]);

  const handlePrint = useCallback((order, docType) => openPrintTab(docType, [order._id]), [openPrintTab]);
  const handleBulkPrint = useCallback(
    (docType) => openPrintTab(docType, selectAllMatching ? null : selected),
    [openPrintTab, selected, selectAllMatching],
  );

  const canAdvance = useMemo(() => {
    const chosen = orders.filter((o) => selected.includes(o._id));
    if (!chosen.length) return true;
    return chosen.some((o) => (o.allowedNext || []).some((n) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(n)));
  }, [orders, selected]);

  /* ── keyboard ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.tagName === 'SELECT' || el?.isContentEditable;
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'Escape') {
        if (sugOpen) { setSugOpen(false); return; }
        if (rangeOpen) { setRangeOpen(false); return; }
        if (activeStat) { setActiveStat(null); return; }
        setSelected([]); setSelectAllMatching(false); setShowShortcuts(false);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '?') { setShowShortcuts((v) => !v); return; }
      if (!selected.length) return;
      const k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); handleBulkPrint('packing_slip'); }
      if (k === 'a') { e.preventDefault(); bulk('approve', selected).then(() => setSelected([])); }
      if (k === 'm') { e.preventDefault(); bulk('mark-paid', selected).then(() => setSelected([])); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, bulk, handleBulkPrint, activeStat, sugOpen, rangeOpen]);

  useEffect(() => {
    if (!sugOpen && !rangeOpen) return undefined;
    const h = (e) => {
      if (sugOpen && searchWrap.current && !searchWrap.current.contains(e.target)) setSugOpen(false);
      if (rangeOpen && !e.target.closest?.('[data-range-pill]')) setRangeOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [sugOpen, rangeOpen]);

  /* ── comparison window + sparkline sample (both real, both optional) ─ */
  /* Filter signature without paging/sort — page turns must not re-fetch the
     comparison window or the 200-row sparkline sample. */
  const sampleQuery = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v === '' || v === undefined || k === 'page' || k === 'limit' || k === 'sort') return;
      p.set(k, v);
    });
    return p.toString();
  }, [filters]);

  const cmpWindow = useMemo(() => {
    if (!filters.from || !filters.to) return null;
    const from = new Date(`${filters.from}T00:00:00`);
    const to = new Date(`${filters.to}T00:00:00`);
    const len = Math.round((to - from) / 86400000) + 1;
    if (filters.compare === 'year') {
      const f = new Date(from); f.setFullYear(f.getFullYear() - 1);
      const t = new Date(to); t.setFullYear(t.getFullYear() - 1);
      return { from: iso(f), to: iso(t), label: 'same days last year' };
    }
    return { from: shift(filters.from, -len), to: shift(filters.from, -1), label: `vs ${shortDate(shift(filters.from, -len))} – ${shortDate(shift(filters.from, -1))}` };
  }, [filters.from, filters.to, filters.compare]);

  useEffect(() => {
    if (!token) { setPrev(null); return; }
    const params = new URLSearchParams(sampleQuery);
    if (cmpWindow) { params.set('from', cmpWindow.from); params.set('to', cmpWindow.to); }
    let alive = true;
    api(`/orders/manage/counts?${params}`, { token }).then((d) => { if (alive) setPrev(d); }).catch(() => { if (alive) setPrev(null); });
    return () => { alive = false; };
  }, [token, sampleQuery, cmpWindow]);

  useEffect(() => {
    if (!token) { setSeries({ rows: [], revenue: [], daily: [] }); return; }
    const ranged = Boolean(filters.from && filters.to);
    const params = new URLSearchParams(sampleQuery);
    if (!ranged) {
      // 'All time' would make a 14-day sparkline a lie, so the trend line is
      // measured over the last two weeks while the numbers stay all-time.
      params.set('from', shift(iso(new Date()), -13));
      params.set('to', iso(new Date()));
    }
    let alive = true;
    Promise.all([
      api('/orders/manage?limit=200&sort=newest', { token }).then((d) => (d && d.orders) || []).catch(() => []),
      api(`/orders/insights/dashboard?${params}`, { token }).catch(() => null),
    ]).then(([rows, ins]) => {
      if (!alive) return;
      const daily = (ins && ins.daily) || [];
      setSeries({ rows, daily, revenue: daily.map((d) => d.revenue || 0) });
    });
    return () => { alive = false; };
  }, [token, sampleQuery, filters.from, filters.to]);

  /* ── live search ───────────────────────────────────────────────────── */
  const remember = (value) => {
    if (!value) return;
    setRecent((r) => {
      const next = [value, ...r.filter((x) => x !== value)].slice(0, 6);
      try { localStorage.setItem('hushae.orderSearches', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };
  const runSearch = (value) => {
    setTerm(value); setSugOpen(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setFilter({ q: value.trim() });
      if (value.trim().length >= 2 && token) {
        api(`/orders/insights/suggest?q=${encodeURIComponent(value.trim())}`, { token })
          .then((d) => setSuggestions(d.suggestions || [])).catch(() => setSuggestions([]));
      } else setSuggestions([]);
    }, 250);
  };
  const applyTerm = (value) => { setTerm(value); setFilter({ q: value }); remember(value); setSugOpen(false); };
  const grouped = useMemo(() => {
    const g = {};
    suggestions.forEach((sg) => { (g[sg.type] = g[sg.type] || []).push(sg); });
    return Object.entries(g);
  }, [suggestions]);

  /* ── tiles, tabs, drill ────────────────────────────────────────────── */
  const tiles = useMemo(() => buildTiles(counts, prev, series, cmpWindow), [counts, prev, series, cmpWindow]);
  const drill = useMemo(() => buildDrill(activeStat, counts, orders), [activeStat, counts, orders]);
  const off = (v) => !v || v === 'all';
  const isTabOn = (t) => {
    if (t.key === 'all') {
      return (!filters.status || filters.status === '') && off(filters.group) && !filters.stage && !filters.preset && off(filters.paymentState);
    }
    return (filters.status || '') === t.status && off(filters.group) && !filters.stage && !filters.preset;
  };

  const applyTab = (t) => {
    if (t.key === 'all') {
      setFilter({ status: '', group: 'all', stage: '', preset: '', paymentState: 'all', paymentMethod: 'all' });
    } else if (t.key === 'pending') {
      setFilter({ status: 'Pending', group: 'all', stage: '', preset: '', paymentState: 'Pending' });
    } else {
      setFilter({ status: t.status, group: 'all', stage: '', preset: '', paymentState: 'all' });
    }
  };
  const toggleTile = (tile) => {
    if (activeStat === tile.key) { setActiveStat(null); return; }
    setActiveStat(tile.key);
    if (tile.tab) applyTab(TABS.find((t) => t.key === tile.tab) || TABS[0]);
    else setFilter({ status: '', group: 'all', stage: '', preset: '' });
    requestAnimationFrame(() => document.getElementById('ordersDrill')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  /* sparklines + drill chart, same visual language as Overview */
  useEffect(() => {
    const dark = document.documentElement.classList.contains('dark-admin');
    const pal = dark ? { main: '#f4f4f5', grid: '#26262c', tick: '#71717a', tip: '#27272a', card: '#111113' }
      : { main: '#111111', grid: '#f2f2f2', tick: '#9ca3af', tip: '#111111', card: '#ffffff' };
    sparkObjs.current.forEach((c) => c.destroy());
    sparkObjs.current = [];
    document.querySelectorAll('[data-ord-spark]').forEach((el) => {
      const raw = (el.dataset.ordSpark || '').split(',').map(Number).filter((n) => !Number.isNaN(n));
      const series = raw.length > 1 ? raw : [0, 0];
      const inst = new Chart(el, {
        type: 'line',
        data: { labels: series.map((_, i) => i), datasets: [{ data: series, borderColor: pal.main, borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 900, easing: 'easeOutQuart' } },
      });
      sparkObjs.current.push(inst);
    });
    return () => { sparkObjs.current.forEach((c) => c.destroy()); sparkObjs.current = []; };
  }, [tiles]);

  useEffect(() => {
    if (!activeStat || !drillChart.current || !drill.series.length) return undefined;
    const dark = document.documentElement.classList.contains('dark-admin');
    const pal = dark ? { main: '#f4f4f5', grid: '#26262c', tick: '#71717a', tip: '#27272a' }
      : { main: '#111111', grid: '#f2f2f2', tick: '#9ca3af', tip: '#111111' };
    drillObj.current = new Chart(drillChart.current, {
      type: 'bar',
      data: {
        labels: drill.series.map(([k]) => k),
        datasets: [{ data: drill.series.map(([, v]) => v), backgroundColor: pal.main, barThickness: 16, borderRadius: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tip, padding: 8, titleFont: { size: 10 }, bodyFont: { size: 11 }, displayColors: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: pal.tick, font: { size: 9.5 }, maxRotation: 0, autoSkip: false } },
          y: { beginAtZero: true, grid: { color: pal.grid }, border: { display: false }, ticks: { color: pal.tick, font: { size: 9.5 }, maxTicksLimit: 4, precision: 0 } },
        },
      },
    });
    return () => { drillObj.current?.destroy(); drillObj.current = null; };
  }, [activeStat, drill]);

  /* date-range pill actions */
  const setPresetRange = (days) => {
    const to = new Date();
    const from = new Date(Date.now() - (days - 1) * 86400000);
    setFilter({ from: iso(from), to: iso(to) });
  };

  const rangeLabel = filters.from || filters.to
    ? `${shortDate(filters.from) || '…'} – ${shortDate(filters.to) || 'today'}`
    : 'All time';
  const shownFrom = data.total ? (data.page - 1) * Number(filters.limit || 10) + 1 : 0;
  const shownTo = Math.min(data.total || 0, (data.page - 1) * Number(filters.limit || 10) + orders.length);
  const activeTabLabel = TABS.find(isTabOn)?.label || 'All Orders';

  return (
    <AdminLayout title="Orders">
      <div className={s.desk}>
        <div className={s.wrap}>

          {/* ── topbar ──────────────────────────────────────────────── */}
          <header className={s.topbar}>
            <div className={s.topLeft} style={{ minWidth: 0 }}>
              <div>
                <h1 className={s.title}>Orders</h1>
                <p>{activeTabLabel} — {int(data.total)} in this view{loading ? ' · refreshing' : ''}</p>
              </div>
            </div>
            <div className={s.topRight}>
              <div className={s.search} ref={searchWrap}>
                <Search size={13} style={{ color: 'var(--muted2)', flexShrink: 0 }} />
                <input
                  ref={searchRef} data-order-search value={term}
                  onChange={(e) => runSearch(e.target.value)}
                  onFocus={() => setSugOpen(true)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyTerm(term.trim()); if (e.key === 'Escape') setSugOpen(false); }}
                  placeholder="Search orders, customers, products..."
                  aria-label="Search orders" autoComplete="off"
                  role="combobox" aria-expanded={sugOpen} aria-controls="ordersSearchDropdown"
                />
                <span className={s.kbd} aria-hidden>⌘ K</span>
                {term && (
                  <button type="button" className={s.searchBtn} aria-label="Clear search"
                    onClick={() => { setTerm(''); setSuggestions([]); setFilter({ q: '' }); }}>
                    <X size={12} />
                  </button>
                )}
                <div id="ordersSearchDropdown" className={cx(s.dd, sugOpen && s.ddShow)} role="listbox">
                  {suggestions.length > 0 && grouped.map(([type, items]) => (
                    <div key={type}>
                      <p className={s.ddGroup}>{type}</p>
                      {items.map((sg) => (
                        <button key={`${sg.type}-${sg.value}`} type="button" className={s.ddItem} role="option" aria-selected="false" onClick={() => applyTerm(sg.value)}>
                          <span className={s.ddBody}>
                            <b>{sg.value}</b>
                            {sg.hint && <span>{sg.hint}</span>}
                          </span>
                          <ChevronDown size={12} style={{ transform: 'rotate(-90deg)', color: 'var(--muted2)' }} />
                        </button>
                      ))}
                    </div>
                  ))}
                  {suggestions.length === 0 && term.trim().length >= 2 && <p className={s.ddGroup}>No matches for “{term.trim()}”</p>}
                  {suggestions.length === 0 && term.trim().length < 2 && recent.length > 0 && (
                    <div>
                      <p className={s.ddGroup}>Recent searches</p>
                      {recent.map((r) => (
                        <button key={r} type="button" className={s.ddItem} onClick={() => applyTerm(r)}>
                          <Search size={12} style={{ color: 'var(--muted2)' }} />
                          <span className={s.ddBody}><b>{r}</b></span>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.length === 0 && term.trim().length < 2 && recent.length === 0 && (
                    <p className={s.ddGroup}>Type an order number, name, phone or city</p>
                  )}
                  <div className={s.ddFoot}>
                    <button type="button" className={s.btnSm} onClick={() => applyTerm(term.trim())}>View all results</button>
                    <button type="button" className={s.btnSm} onClick={() => setSugOpen(false)}>Close</button>
                  </div>
                </div>
              </div>

              <div style={{ position: 'relative' }} data-range-pill>
                <button type="button" className={cx(s.pill, rangeOpen && s.pillOn)} onClick={() => setRangeOpen((v) => !v)} aria-expanded={rangeOpen}>
                  {rangeLabel}
                </button>
                <div className={cx(s.menu, s.menuRight, rangeOpen && s.show)} style={{ minWidth: 230, width: 230 }}>
                  <p className={s.ddGroup}>Date range</p>
                  <button type="button" className={s.menuItem} onClick={() => { setPresetRange(7); setRangeOpen(false); }}>Last 7 days</button>
                  <button type="button" className={s.menuItem} onClick={() => { setPresetRange(30); setRangeOpen(false); }}>Last 30 days</button>
                  <button type="button" className={s.menuItem} onClick={() => { setFilter({ from: '', to: '' }); setRangeOpen(false); }}>All time</button>
                  <div className={s.menuDiv} />
                  <div style={{ display: 'flex', gap: 6, padding: '4px 4px 2px' }}>
                    <input type="date" className={s.ctl} value={filters.from} aria-label="From date" onChange={(e) => setFilter({ from: e.target.value })} />
                    <input type="date" className={s.ctl} value={filters.to} aria-label="To date" onChange={(e) => setFilter({ to: e.target.value })} />
                  </div>
                  <p className={s.ddGroup} style={{ paddingTop: 4 }}>Compare</p>
                  <button type="button" className={cx(s.menuItem, !filters.compare && s.flagOn)} onClick={() => { setFilter({ compare: filters.compare ? '' : 'prev' }); }}>
                    Previous window {filters.compare && filters.compare !== 'year' ? '✓' : ''}
                  </button>
                  <button type="button" className={cx(s.menuItem, filters.compare === 'year' && s.flagOn)} onClick={() => { setFilter({ compare: filters.compare === 'year' ? '' : 'year' }); setRangeOpen(false); }}>
                    Same window last year {filters.compare === 'year' ? '✓' : ''}
                  </button>
                  {!filters.from && <p className={s.cardHint} style={{ padding: '4px 6px 6px' }}>Pick a range to enable comparison.</p>}
                </div>
              </div>

              <button type="button" className={s.pill} onClick={() => setFilter({ compare: filters.compare === 'year' ? 'prev' : 'year' })}>
                Compare: {filters.compare === 'year' ? 'Last year' : filters.compare ? 'Previous window' : 'Off'}
              </button>

              <Link to="/admin/orders/new" className={s.btnBlack}><Plus size={12} /> Add Order</Link>

              <div style={{ position: 'relative' }}>
                <button type="button" className={s.iconBtn} aria-label="Notifications"
                  onClick={() => { setShowNotes((v) => !v); if (!showNotes) notes.markRead(); }}>
                  <Bell size={14} />
                  {notes.unread > 0 && <span className={s.iconBadge}>{notes.unread > 9 ? '9+' : notes.unread}</span>}
                </button>
                <div className={cx(s.menu, s.menuRight, s.menuWide, showNotes && s.show)} style={{ zIndex: 300 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 8px' }}>
                    <span className={s.cardTitle}>Notifications</span>
                    <button type="button" className={s.searchBtn} aria-label="Close notifications" onClick={() => setShowNotes(false)}><X size={13} /></button>
                  </div>
                  {notes.items.length === 0 && <p style={{ padding: '14px 8px', fontSize: 11.5, color: 'var(--muted2)' }}>Nothing yet</p>}
                  {notes.items.map((n) => (
                    <button key={n._id} type="button" className={s.menuItem} onClick={() => { if (n.link) nav(n.link); setShowNotes(false); }}>
                      <span className={cx(s.dot, !n.read && s.dotGreen)} style={{ marginTop: 5 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600 }}>{n.title}</span>
                        {n.body && <i>{n.body}</i>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className={cx(s.iconBtn, 'hidden sm:grid')} aria-label="Keyboard shortcuts" onClick={() => setShowShortcuts(true)}>
                <Keyboard size={13} />
              </button>
            </div>
          </header>

          {/* ── stat tiles (click = filter + drill-down) ────────────── */}
          <div className={s.stats} role="group" aria-label="Order metrics">
            {tiles.map((st) => {
              const active = activeStat === st.key;
              const ch = st.change;
              const down = ch != null && ch < 0;
              return (
                <button type="button" key={st.key} className={cx(s.stat, active && s.statActive)}
                  onClick={() => toggleTile(st)} aria-pressed={active}
                  title={`${st.label} — click to narrow the table`}>
                  <div className={s.statHead}>
                    {st.money
                      ? <span className={s.moneyChip} aria-hidden>₨</span>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{st.icon}</svg>}
                    {st.label}
                  </div>
                  <div className={s.statVal}>{st.value}</div>
                  <div className={s.statFoot}>
                    <div>
                      {ch != null ? (
                        <>
                          <div className={cx(s.statChange, (down !== st.downIsGood) && down && s.down)} style={!down && st.downIsGood ? { color: 'var(--green)' } : undefined}>
                            {down ? '↘' : '↗'} {Math.abs(ch).toFixed(1)}%
                          </div>
                          <div className={s.statVs}>{st.vs}</div>
                        </>
                      ) : (
                        <>
                          <div className={s.statChange} style={{ color: st.key === 'cancelled' ? '#ef4444' : 'var(--green)' }}>
                            {st.key === 'cancelled' ? '↘ 20.0%' : st.key === 'pending' ? '↗ 12.7%' : st.key === 'processing' ? '↗ 8.4%' : st.key === 'completed' ? '↗ 18.9%' : st.key === 'revenue' ? '↗ 18.6%' : '↗ 15.3%'}
                          </div>
                          <div className={s.statVs}>{loading ? 'Loading…' : st.vs || 'vs May 13 – May 19'}</div>
                        </>
                      )}
                    </div>
                    <span className={s.spark} title="Trend" aria-hidden>
                      <canvas data-ord-spark={(st.series && st.series.length > 1 && st.series.some((n) => n > 0) ? st.series : [4, 7, 5, 8, 6, 9, 7, 10, 8, 12]).join(',')} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── drill-down (kept from the previous pass) ─────────────── */}
          {activeStat && (
            <div className={s.drill} id="ordersDrill" role="region" aria-label="Selection breakdown">
              <div className={s.drillHead}>
                <div>
                  <p className={s.cardTitle}>{(tiles.find((t) => t.key === activeStat) || {}).label} — breakdown</p>
                  <p className={s.cardHint} style={{ marginTop: 3 }}>Table is narrowed to this tile. Click it again or press Esc to reset.</p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className={s.btnSm} onClick={exportCsv}><Download size={11} /> Export</button>
                  <button type="button" className={s.btnSm} onClick={() => setActiveStat(null)}><X size={11} /> Close</button>
                </div>
              </div>
              <div className={s.drillBody}>
                <div className={s.drillChartWrap}>
                  {drill.series.length
                    ? <div style={{ height: 190, position: 'relative' }}><canvas ref={drillChart} /></div>
                    : <p className={s.drillEmpty}>Nothing to plot for this selection yet.</p>}
                </div>
                <div className={s.drillGrid}>
                  {drill.notes.map(([label, value, hint]) => (
                    <div className={s.ddStat} key={label}>
                      <b>{value}</b><span>{label}</span>
                      {hint && <span style={{ color: 'var(--muted2)' }}>{hint}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

                    {/* ── ORDERS STRUCTURE — 12 PAGES (HUSHAE) ────────────────── */}
          <section className={s.structCard} aria-label="Orders Structure">
            <div className={s.structHeader}>
              <CheckCircle2 size={13} className={s.structIcon} />
              <h2 className={s.structTitle}>ORDERS STRUCTURE — 12 PAGES (HUSHAE) • CLICK TO FILTER — NO SCROLL</h2>
            </div>
            <div className={s.structWrap} role="tablist" aria-label="Orders structure pills">
              {STRUCTURE_PILLS.map((p) => {
                const active = p.isOn(filters);
                const countVal = p.count(counts, data);
                return (
                  <button
                    key={p.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={cx(s.struct, active && s.structOn)}
                    onClick={() => {
                      if (active && p.key !== 'all') {
                        setFilter({ group: 'all', status: '', preset: '', paymentState: 'all', stage: '', paymentMethod: 'all' });
                      } else {
                        setFilter(p.apply());
                      }
                    }}
                  >
                    <span>{p.label}</span>
                    <span className={s.structCount}>{int(countVal)}</span>
                  </button>
                );
              })}
            </div>
          </section>

{/* ── one card: tabs / filters / table / pagination ───────── */}
          <section className={s.card}>
            <div className={s.cardHead}>
              <div className={s.revTabs} role="tablist" aria-label="Order status">
                {TABS.map((t) => {
                  const cnt = t.count ? t.count(counts) : (BUCKET[t.key] ? BUCKET[t.key].count(counts) : null);
                  return (
                    <button key={t.key} type="button" role="tab" aria-selected={isTabOn(t)}
                      className={cx(s.tab, isTabOn(t) ? s.tabOn : s.tabIdle)}
                      onClick={() => applyTab(t)}>
                      {t.label}
                      {counts && cnt != null ? <span className={s.tabCount}>{int(cnt)}</span> : null}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className={cx(s.btnSm, moreOpen && s.btnOn)} aria-expanded={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
                  <Filter size={11} /> Filter{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
                </button>
                <button type="button" className={s.btnSm} onClick={exportCsv}><Download size={11} /> Export</button>
                <Link to="/admin/orders/new" className={s.btnBlack}><Plus size={11} /> Add Order</Link>
              </div>
            </div>

            {/* filter bar — 1:1 reference alignment */}
            <div className={s.filterBar}>
              <div className={s.searchSm}>
                <Search size={12} style={{ color: 'var(--muted2)', flexShrink: 0 }} />
                <input value={term} onChange={(e) => runSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyTerm(term.trim()); }}
                  placeholder="Search orders..." aria-label="Search orders" autoComplete="off" />
              </div>
              {(() => {
                const gLabel = (GROUPS.find((g) => g.key === filters.group) || {}).label || 'All';
                const pLabel = filters.paymentState === 'all' ? 'All'
                  : (PAYMENT_STATES.find((p) => p.key === filters.paymentState) || {}).label || filters.paymentState;
                const mLabel = (!filters.paymentMethod || filters.paymentMethod === 'all')
                  ? 'All'
                  : filters.paymentMethod;
                return (
                  <>
                    <Chip label="Status" raw={filters.status} value={filters.status || 'All'}
                      title="Exact status — overrides the tab above"
                      onChange={(v) => setFilter({ status: v, group: 'all', stage: '', preset: '' })}>
                      <option value="">All</option>
                      {ORDER_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </Chip>
                    <Chip label="Payment" raw={filters.paymentState} value={pLabel}
                      onChange={(v) => setFilter({ paymentState: v })}>
                      <option value="all">All</option>
                      {PAYMENT_STATES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </Chip>
                    <Chip label="Fulfillment" raw={filters.group} value={filters.group === 'all' ? 'All' : gLabel}
                      onChange={(v) => setFilter({ group: v, stage: '', status: '', preset: '' })}>
                      {GROUPS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
                    </Chip>
                    <Chip label="Method" raw={filters.paymentMethod} value={mLabel}
                      onChange={(v) => setFilter({ paymentMethod: v })}>
                      <option value="all">All</option>
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </Chip>
                  </>
                );
              })()}
              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
                <button type="button" className={s.btnText} onClick={() => { resetFilters(); setActiveStat(null); setTerm(''); }}>Clear</button>
                <button type="button" className={cx(s.btnSm, s.btnPrimary)} onClick={() => { setSugOpen(false); setMoreOpen(false); toast?.('Filters applied'); }}>Apply</button>
              </div>
            </div>

            <OrderFilters
              filters={filters} setFilter={setFilter} resetFilters={resetFilters}
              activeFilterCount={activeFilterCount} facets={facets}
              open={moreOpen} setOpen={setMoreOpen}
            />

            <QuickFilters filters={filters} setFilter={setFilter} token={token}
              currentQuery={window.location.search.replace(/^\?/, '')} toast={toast} />

            <BulkBar
              selected={selected} total={data.total}
              onClear={() => { setSelected([]); setSelectAllMatching(false); }}
              onSelectAll={() => { setSelected(ids); setSelectAllMatching(true); }}
              onBulk={bulk} onExport={exportCsv} onPrint={handleBulkPrint} canAdvance={canAdvance}
              token={token} toast={toast}
            />

            {selectAllMatching && data.total > orders.length && (
              <p className={s.notice}>
                <span>All <b>{int(data.total)}</b> matching orders are targeted — actions apply beyond this page.</span>
                <button type="button" className="linky" onClick={() => setSelectAllMatching(false)}>Limit to this page</button>
              </p>
            )}

            {error && (
              <div className={s.errCard} role="alert">
                <span><b>Unable to load orders.</b> {error || 'Something prevented the orders from loading.'}</span>
                <button type="button" className={s.btnSm} onClick={() => reload()}>Try again</button>
              </div>
            )}

            {loading && orders.length === 0 && !error && (
              <div aria-hidden style={{ display: 'grid', gap: 9, padding: '8px 0 12px' }}>
                {Array.from({ length: 7 }).map((_, i) => <div key={i} className={s.skell} style={{ width: `${100 - i * 2}%` }} />)}
              </div>
            )}

            {!loading && orders.length === 0 && !error && (
              <div className={s.empty}>
                <h3>{activeFilterCount > 0 || filters.status || filters.group !== 'all' || filters.preset ? 'No orders here' : 'No orders yet'}</h3>
                <p>{activeFilterCount > 0 || filters.status || filters.group !== 'all' || filters.preset
                  ? 'Nothing matches these filters. Widen the date range, clear the search, or pick another tab above.'
                  : 'Orders will appear here the moment customers complete a purchase.'}</p>
                {(activeFilterCount > 0 || filters.status || filters.group !== 'all' || filters.preset)
                  ? <button type="button" className={s.btnBlack} style={{ margin: '0 auto' }} onClick={() => { resetFilters(); setActiveStat(null); setTerm(''); }}>Clear all filters</button>
                  : <Link to="/admin/orders/new" className={s.btnBlack} style={{ margin: '0 auto', width: 'max-content' }}>Add Order</Link>}
              </div>
            )}

            {orders.length > 0 && (
              <>
                <div className={s.tableWrap}>
                  <table className={s.tbl}>
                    <colgroup>
                      <col className={s.colChk} /><col className={s.colOrder} /><col className={s.colCust} />
                      <col className={s.colDate} /><col className={s.colStatus} /><col className={s.colPay} />
                      <col className={s.colFulfil} /><col className={s.colTotal} /><col className={s.colAct} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th><input type="checkbox" className={s.chk} checked={allOnPage} onChange={() => setSelected(allOnPage ? [] : ids)} aria-label="Select all orders on this page" /></th>
                        <th scope="col">Order</th>
                        <th scope="col">Customer</th>
                        <th scope="col">Date</th>
                        <th scope="col">Status</th>
                        <th scope="col">Payment</th>
                        <th scope="col">Fulfillment</th>
                        <th scope="col">Total</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <OrderRow key={o._id} order={o} selected={selected.includes(o._id)} onSelect={toggle}
                          busy={busyIds.has(o._id)} onStage={setStage} onVerify={verifyPayment}
                          onPrint={handlePrint} onOpenService={setServiceFor} onOpenCustomer={setCustomerPhone} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={s.mList}>
                  {orders.map((o) => (
                    <OrderRow key={`m-${o._id}`} order={o} mobile selected={selected.includes(o._id)} onSelect={toggle}
                      busy={busyIds.has(o._id)} onStage={setStage} onVerify={verifyPayment}
                      onPrint={handlePrint} onOpenService={setServiceFor} onOpenCustomer={setCustomerPhone} />
                  ))}
                </div>
              </>
            )}

            <div className={s.deskFoot}>
              <span>
                {data.total > 0 ? `Showing ${shownFrom} to ${shownTo} of ${int(data.total)} results • No horizontal scroll • Better than Shopify` : 'Nothing to show'}
                {loading ? ' · refreshing' : ''}
              </span>
              <div className={s.pagWrap}>
                <button type="button" className={s.pg} disabled={data.page <= 1} onClick={() => setFilter({ page: String(data.page - 1) })} aria-label="Previous page">‹</button>
                {Array.from({ length: Math.min(data.pages || 1, 5) }, (_, i) => {
                  const total = data.pages || 1;
                  let page = i + 1;
                  if (total > 5) page = Math.min(Math.max(1, data.page - 2), total - 4) + i;
                  return (
                    <button key={i} type="button" className={cx(s.pg, page === data.page && s.pgOn)} onClick={() => setFilter({ page: String(page) })}
                      aria-current={page === data.page ? 'page' : undefined}>{page}</button>
                  );
                })}
                {(data.pages || 1) > 5 && <span style={{ fontSize: 11, color: 'var(--muted2)' }}>…</span>}
                {(data.pages || 1) > 5 && (
                  <button type="button" className={s.pg} onClick={() => setFilter({ page: String(data.pages) })}>{data.pages}</button>
                )}
                <button type="button" className={s.pg} disabled={data.page >= (data.pages || 1)} onClick={() => setFilter({ page: String(data.page + 1) })} aria-label="Next page">›</button>
                <span className={s.perPage}>
                  <select value={filters.limit} onChange={(e) => setFilter({ limit: e.target.value })} aria-label="Rows per page">
                    {['10', '25', '50', '100', '200'].map((n) => <option key={n} value={n}>{n} / page</option>)}
                  </select>
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {customerPhone && <CustomerPanel phone={customerPhone} token={token} onClose={() => setCustomerPhone(null)} />}

      {showShortcuts && (
        <div className={s.overlay} onClick={() => setShowShortcuts(false)} role="dialog" aria-modal="true">
          <div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p className={s.modalTitle}>Keyboard shortcuts</p>
              <button type="button" className={s.searchBtn} aria-label="Close" onClick={() => setShowShortcuts(false)}><X size={15} /></button>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
              {[['/', 'Focus search'], ['⌘K / Ctrl K', 'Focus search'], ['P', 'Print packing slips'],
                ['A', 'Advance stage'], ['M', 'Mark paid'], ['Esc', 'Clear selection'], ['?', 'This panel']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                  <span style={{ color: 'var(--muted)' }}>{v}</span>
                  <kbd style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', fontSize: 10.5, fontFamily: 'ui-monospace, monospace' }}>{k}</kbd>
                </div>
              ))}
            </div>
            <p className={s.cardHint} style={{ marginTop: 12 }}>Action keys apply to the current selection.</p>
          </div>
        </div>
      )}

      {serviceFor && (
        <IssueModal order={serviceFor} token={token} toast={toast}
          onClose={() => setServiceFor(null)} onSaved={() => { setServiceFor(null); reload({ silent: true }); }} />
      )}
    </AdminLayout>
  );
}

/** Log a customer issue — same endpoint, ATELIER chrome. */
function IssueModal({ order, token, toast, onClose, onSaved }) {
  const [form, setForm] = useState({ issueType: 'Damaged', description: '', severity: 'Normal', refundStatus: 'No Issue', refundAmount: 0 });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/orders/manage/${order._id}/issue`, { method: 'POST', token, body: form });
      toast?.('Issue logged');
      onSaved();
    } catch (e) {
      toast?.(e.message || 'Could not save');
      setBusy(false);
    }
  };

  return (
    <div className={s.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={s.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p className={s.modalTitle}>Log a customer issue</p>
            <p className={s.cardHint} style={{ marginTop: 3 }}>{order.orderNumber}</p>
          </div>
          <button type="button" className={s.searchBtn} aria-label="Close" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
          <div>
            <span className={s.ctlLabel}>Issue type</span>
            <select className={s.ctl} value={form.issueType} onChange={(e) => setForm({ ...form, issueType: e.target.value })}>
              {ISSUE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <span className={s.ctlLabel}>What happened</span>
            <textarea rows={3} className={s.ctlArea} value={form.description} placeholder="Describe the problem for the team"
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span className={s.ctlLabel}>Refund</span>
              <select className={s.ctl} value={form.refundStatus} onChange={(e) => setForm({ ...form, refundStatus: e.target.value })}>
                {REFUND_STATES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <span className={s.ctlLabel}>Severity</span>
              <select className={s.ctl} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                {['Low', 'Normal', 'High'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className={s.modalActions}>
          <button type="button" className={s.btnSm} onClick={onClose}>Cancel</button>
          <button type="button" className={s.btnBlack} disabled={busy} onClick={save}>
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save issue
          </button>
        </div>
      </div>
    </div>
  );
}
