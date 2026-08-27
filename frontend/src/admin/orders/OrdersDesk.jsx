import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, Bell, Download, FileText, Keyboard, Layers, Loader2, Package,
  Plus, Printer, RefreshCcw, Search, X,
} from 'lucide-react';
import AdminLayout from '../AdminLayout';
import { pkr } from '../../lib/format';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { GROUPS } from './orderConstants';
import { useOrderDesk, useOrderNotifications } from './useOrderDesk';
import { ISSUE_TYPES, REFUND_STATES } from './orderConstants';
import OrderFilters from './OrderFilters';
import BulkBar from './BulkBar';
import OrderRow from './OrderRow';
import QuickFilters from './QuickFilters';
import CustomerPanel from './CustomerPanel';
import { writeErrorWindow, writeLoadingWindow, writePrintWindow } from './printDocument';
import s from './adesk.module.css';

/* ===========================================================================
 * Order desk — ATELIER theme, same design family as /admin (Overview).
 *
 * The polish lives in adesk.module.css: identical tokens to
 * admin/Overview.module.css (colours, radius, shadows, type scale) plus the
 * desk's own parts — clickable stat tiles with a drill-down, 12 order
 * structure pills, a live search dropdown, and a fixed-layout table that can
 * never scroll sideways (rows become cards under 900px).
 *
 * Data + behaviour are unchanged: every filter writes to the URL, every
 * mutation goes through useOrderDesk, counts come from /orders/manage/counts.
 * ========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join(' ');
const int = (v) => (v == null ? '—' : Number(v).toLocaleString('en-US'));
const compact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `₨${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `₨${Math.round(n / 1e3)}K`;
  return `₨${Math.round(n)}`;
};
const shortDate = (str) => (str
  ? new Date(`${str}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  : '');

/** Filters a pill applies; `clear` lists keys it must unset. */
const PILLS = [
  { key: 'all', label: 'All Orders', set: { group: 'all' } },
  ...GROUPS.filter((g) => g.key !== 'all').map((g) => ({ key: `g:${g.key}`, label: g.label, hint: g.hint, set: { group: g.key } })),
  { key: 'delivered', label: 'Delivered', countKey: 'delivered', set: { group: 'delivered' } },
  { key: 'unverified', label: 'Payment Unverified', countKey: 'unverified', set: { paymentState: 'Pending', group: 'all' }, clear: ['preset', 'stage'] },
  { key: 'high-value', label: 'High Value', hint: '₨50,000 and above', preset: 'high-value', set: { preset: 'high-value' }, clear: ['group', 'stage'] },
  { key: 'delayed', label: 'Delayed', hint: 'Stuck in one stage 24h+', preset: 'delayed', set: { preset: 'delayed' }, clear: ['group', 'stage'] },
  { key: 'problem', label: 'Problem Orders', hint: 'An issue is open', preset: 'problem', set: { preset: 'problem' }, clear: ['group', 'stage'] },
];

/* Preset pills (high value / delayed / problem) have no count endpoint, so
   they deliberately render without a number instead of an invented one. */
const EXTRA_COUNTS = {
  unverified: (c) => c.byPaymentState?.Pending ?? null,
  delivered: (c) => c.byGroup?.delivered ?? null,
};

function buildDrill(key, counts, rows) {
  const byStage = counts?.byStage || {};
  const byGroup = counts?.byGroup || {};
  const c = counts?.total ?? 0;
  const paid = (counts?.byPaymentState?.Confirmed || 0) + (counts?.byPaymentState?.Verified || 0);
  const unpaid = counts?.byPaymentState?.Pending || 0;
  const rev = counts?.revenue || 0;
  const delivered = byGroup.delivered || 0;
  const issues = byGroup.issues || 0;
  const rowsUnprinted = rows.filter((o) => !o.printStatus?.invoice?.printed).length;

  const SERIES = {
    total: [
      ['New', byGroup.new || 0], ['Processing', byGroup.processing || 0], ['To Ship', byGroup['to-ship'] || 0],
      ['Shipped', byGroup.shipped || 0], ['Delivered', delivered], ['Issues', issues],
    ],
    revenue: Object.entries(byStage).sort((a, b) => b[1] - a[1]).slice(0, 7),
    aov: Object.entries(byStage).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => [k, v]),
    paid: [['Paid', paid], ['Unverified', unpaid], ['Failed / expired', (counts?.byPaymentState?.Failed || 0) + (counts?.byPaymentState?.Expired || 0)]],
    unpaid: [['Unverified', unpaid], ['Paid', paid], ['Confirmed', counts?.byPaymentState?.Confirmed || 0]],
    fulfilled: [['Fulfilled', delivered], ['In flight', (byGroup['to-ship'] || 0) + (byGroup.shipped || 0)], ['Awaiting', (byGroup.new || 0) + (byGroup.processing || 0)]],
  };
  const NOTES = {
    total: [
      ['Orders in this view', int(c), 'Every stage, whatever its status'],
      ['Awaiting review', int(byGroup.new || 0), 'Just received — nothing done yet'],
      ['Delivered', int(delivered), `${c ? Math.round((delivered / c) * 100) : 0}% of all orders`],
      ['Issues', int(issues), 'Cancellations, returns, refunds'],
    ],
    revenue: [
      ['Value in view', pkr(rev), 'Sum of every order total'],
      ['Average order', c ? pkr(Math.round(rev / c)) : '—', 'Revenue ÷ orders'],
      ['Inflights', int(rowsUnprinted), 'Invoice not printed on this page'],
      ['Paid value', pkr(Math.round((rev * (c ? paid / c : 0)) || 0)), 'Share carried by paid orders'],
    ],
    aov: [
      ['Average order value', c ? pkr(Math.round(rev / c)) : '—', 'Revenue ÷ orders'],
      ['Paid orders', int(paid), 'Confirmed + verified payments'],
      ['Unpaid orders', int(c - paid), 'COD and unverified transfers'],
      ['Page sample', int(rows.length), `Across ${counts?.pages || 1} page(s)`],
    ],
    paid: [
      ['Paid', int(paid), `${c ? Math.round((paid / c) * 100) : 0}% of orders`],
      ['Unverified', int(unpaid), 'Waiting on your check'],
      ['Value paid', pkr(Math.round((rev * (c ? paid / c : 0)) || 0)), 'Approximate, by share'],
      ['Failed / expired', int((counts?.byPaymentState?.Failed || 0) + (counts?.byPaymentState?.Expired || 0)), 'Dead gateways'],
    ],
    unpaid: [
      ['Unverified', int(unpaid), 'Awaiting payment check'],
      ['Of all orders', `${c ? Math.round((unpaid / c) * 100) : 0}%`, 'Higher means more chasing'],
      ['Filters set', 'Payment Unverified', 'Table below is narrowed'],
      ['Next step', 'Verify', 'Open a row and confirm the transfer'],
    ],
    fulfilled: [
      ['Delivered', int(delivered), `${c ? Math.round((delivered / c) * 100) : 0}% closed`],
      ['To Ship', int(byGroup['to-ship'] || 0), 'Packed, courier pending'],
      ['Shipped', int(byGroup.shipped || 0), 'In transit'],
      ['Unprinted (page)', int(rowsUnprinted), 'Invoices not printed yet'],
    ],
  };
  return { series: SERIES[key] || [], notes: NOTES[key] || [] };
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
  const [activeStat, setActiveStat] = useState(null);
  const [term, setTerm] = useState(filters.q || '');
  const [sugOpen, setSugOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hushae.orderSearches') || '[]'); } catch { return []; }
  });
  const searchRef = useRef(null);
  const searchWrap = useRef(null);
  const debounce = useRef(null);
  const chartRef = useRef(null);
  const chartObj = useRef(null);

  const orders = data.orders || [];
  const ids = useMemo(() => orders.map((o) => o._id), [orders]);

  useEffect(() => {
    setSelected([]);
    setSelectAllMatching(false);
  }, [filters.group, filters.preset]);

  useEffect(() => { setTerm(filters.q || ''); }, [filters.q]);

  const toggle = useCallback((id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])), []);
  const allOnPage = orders.length > 0 && selected.length === orders.length;

  /* ── print (unchanged) ─────────────────────────────────────────────── */
  const openPrintTab = useCallback(async (docType, orderIds) => {
    const win = window.open('', '_blank');
    if (!win) { toast?.('Allow pop-ups for this site to print'); return; }
    writeLoadingWindow(win, 'Preparing documents…');
    try {
      const qs = new URLSearchParams({ doc: docType });
      if (orderIds?.length) qs.set('ids', orderIds.join(','));
      else Object.entries(filters).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const payload = await api(`/orders/manage/print/batch?${qs}`, { token: auth?.token });
      if (!payload.orders?.length) { writeErrorWindow(win, 'There were no orders to print.'); return; }
      writePrintWindow(win, payload);
      const printedIds = payload.orders.map((o) => o._id).slice(0, 200);
      bulk('print', printedIds, { docType }).catch(() => {});
    } catch (e) {
      writeErrorWindow(win, e.message || 'Could not load the documents.');
      toast?.(e.message || 'Print failed');
    }
  }, [auth?.token, filters, bulk, toast]);

  const handlePrint = useCallback((order, docType) => openPrintTab(docType, [order._id]), [openPrintTab]);
  const handleBulkPrint = useCallback(
    (docType) => openPrintTab(docType, selectAllMatching ? null : selected),
    [openPrintTab, selected, selectAllMatching],
  );

  const canAdvance = useMemo(() => {
    const chosen = orders.filter((o) => selected.includes(o._id));
    if (!chosen.length) return true;
    return chosen.some((o) => (o.allowedNext || []).some(
      (n) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(n)));
  }, [orders, selected]);

  /* ── keyboard ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA'
        || el?.tagName === 'SELECT' || el?.isContentEditable;

      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); searchRef.current?.focus(); return;
      }
      if (e.key === '/' && !typing) { e.preventDefault(); searchRef.current?.focus(); return; }
      if (e.key === 'Escape') {
        if (sugOpen) { setSugOpen(false); return; }
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
  }, [selected, bulk, handleBulkPrint, activeStat, sugOpen]);

  /* close the suggestion dropdown on outside click */
  useEffect(() => {
    if (!sugOpen) return undefined;
    const h = (e) => { if (searchWrap.current && !searchWrap.current.contains(e.target)) setSugOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [sugOpen]);

  const remember = (value) => {
    if (!value) return;
    setRecent((prev) => {
      const next = [value, ...prev.filter((r) => r !== value)].slice(0, 6);
      try { localStorage.setItem('hushae.orderSearches', JSON.stringify(next)); } catch { /* private mode */ }
      return next;
    });
  };

  const runSearch = (value) => {
    setTerm(value);
    setSugOpen(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setFilter({ q: value.trim() });
      if (value.trim().length >= 2 && auth?.token) {
        api(`/orders/insights/suggest?q=${encodeURIComponent(value.trim())}`, { token: auth.token })
          .then((d) => setSuggestions(d.suggestions || []))
          .catch(() => setSuggestions([]));
      } else setSuggestions([]);
    }, 250);
  };
  const applyTerm = (value) => {
    setTerm(value); setFilter({ q: value }); remember(value); setSugOpen(false);
  };

  /* ── derived metrics ───────────────────────────────────────────────── */
  const m = useMemo(() => {
    const c = counts || {};
    const paid = (c.byPaymentState?.Confirmed || 0) + (c.byPaymentState?.Verified || 0);
    const unpaid = c.byPaymentState?.Pending || 0;
    return {
      total: c.total ?? null,
      paid, unpaid,
      fulfilled: c.byGroup?.delivered ?? 0,
      revenue: c.revenue ?? 0,
      aov: c.total ? Math.round(c.revenue / c.total) : 0,
      new: c.byGroup?.new || 0,
      issues: c.byGroup?.issues || 0,
    };
  }, [counts]);

  const groupActive = filters.group || 'all';
  const presetActive = filters.preset || '';
  const isPillOn = (p) => {
    if (p.preset) return presetActive === p.preset && !p.set.group;
    const want = { group: 'all', stage: '', paymentState: 'all', preset: '', ...p.set };
    return Object.entries(want).every(([k, v]) => (filters[k] ?? '') === v || (v === 'all' && !filters[k]));
  };
  const pillCount = (p) => {
    if (p.countKey && EXTRA_COUNTS[p.countKey]) return EXTRA_COUNTS[p.countKey](counts || {});
    if (p.key.startsWith('g:')) return counts?.byGroup?.[p.key.slice(2)] ?? null;
    if (p.key === 'all') return counts?.total ?? null;
    return null;
  };
  const applyPill = (p) => {
    if (isPillOn(p)) { setFilter({ group: 'all', stage: '', paymentState: 'all', preset: '', minTotal: '', maxTotal: '', printed: '', hasIssue: '', q: '' }); return; }
    const patch = { ...p.set };
    (p.clear || []).forEach((k) => { patch[k] = k === 'group' ? 'all' : k === 'paymentState' ? 'all' : ''; });
    setFilter(patch);
  };

  const STATS = [
    { key: 'total', label: 'Total Orders', icon: Layers, value: int(m.total), note: loading ? 'Loading…' : `${int(data.total)} in this view`, filter: { group: 'all', stage: '', paymentState: 'all', preset: '', q: '', minTotal: '', maxTotal: '', printed: '', hasIssue: '' } },
    { key: 'revenue', label: 'Order Value', icon: Download, value: m.revenue ? compact(m.revenue) : '—', note: m.revenue ? `${pkr(m.revenue)} in view` : 'Value of all orders', filter: { group: 'all', stage: '', paymentState: 'all', preset: '' } },
    { key: 'aov', label: 'Avg. Order Value', icon: FileText, value: m.aov ? compact(m.aov) : '—', note: 'Revenue ÷ orders', filter: { group: 'all', stage: '', paymentState: 'all', preset: '', sort: 'amount-desc' } },
    { key: 'paid', label: 'Paid', icon: ArrowRight, value: int(m.paid), note: m.total ? `${Math.round((m.paid / m.total) * 100)}% of orders` : 'Paid + verified', filter: { group: 'all', paymentState: 'Confirmed', preset: '', stage: '' }, activeText: filters.paymentState === 'Confirmed' ? 'Paid only' : null },
    { key: 'unpaid', label: 'Payment Unverified', icon: RefreshCcw, value: int(m.unpaid), note: 'Awaiting your check', tone: m.unpaid ? 'amber' : null, filter: { group: 'all', paymentState: 'Pending', preset: '', stage: '' }, activeText: filters.paymentState === 'Pending' ? 'Unverified only' : null },
    { key: 'fulfilled', label: 'Fulfilled', icon: Package, value: int(m.fulfilled), note: m.total ? `${Math.round((m.fulfilled / m.total) * 100)}% delivered` : 'Reached the customer', filter: { group: 'delivered', preset: '', stage: '', paymentState: 'all' } },
  ];
  const drill = useMemo(() => buildDrill(activeStat, counts, orders), [activeStat, counts, orders]);

  /* ── drill-down chart (same visual language as Overview) ───────────── */
  useEffect(() => {
    if (!activeStat || !chartRef.current) return undefined;
    const series = (drill.series || []).filter(([, v]) => Number(v) > 0);
    if (!series.length) return undefined;
    const dark = document.documentElement.classList.contains('dark-admin');
    const main = dark ? '#f4f4f5' : '#111111';
    const grid = dark ? '#26262c' : '#f2f2f2';
    const tick = dark ? '#71717a' : '#9ca3af';
    chartObj.current = new Chart(chartRef.current, {
      type: 'bar',
      data: {
        labels: series.map(([k]) => k),
        datasets: [{ data: series.map(([, v]) => v), backgroundColor: main, barThickness: 16, borderRadius: 4 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 500 },
        plugins: { legend: { display: false }, tooltip: { backgroundColor: dark ? '#27272a' : '#111', padding: 8, titleFont: { size: 10 }, bodyFont: { size: 11 }, displayColors: false } },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { color: tick, font: { size: 9.5 }, maxRotation: 0, autoSkip: false } },
          y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: tick, font: { size: 9.5 }, maxTicksLimit: 4, precision: 0 } },
        },
      },
    });
    return () => { chartObj.current?.destroy(); chartObj.current = null; };
  }, [activeStat, drill]);

  const toggleStat = (stat) => {
    if (activeStat === stat.key) { setActiveStat(null); return; }
    setActiveStat(stat.key);
    setFilter(stat.filter);
    requestAnimationFrame(() => document.getElementById('ordersDrill')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const rangeLabel = filters.from || filters.to
    ? `${shortDate(filters.from) || '…'} → ${shortDate(filters.to) || 'now'}`
    : 'All time';
  const shownFrom = (data.page - 1) * Number(filters.limit || 50) + 1;
  const shownTo = Math.min(data.total || 0, (data.page - 1) * Number(filters.limit || 50) + orders.length);
  const grouped = useMemo(() => {
    const g = {};
    suggestions.forEach((sg) => { (g[sg.type] = g[sg.type] || []).push(sg); });
    return Object.entries(g);
  }, [suggestions]);

  return (
    <AdminLayout title="Orders">
      <div className={s.desk}>
        <div className={s.wrap}>

          {/* ── top bar ─────────────────────────────────────────────── */}
          <header className={s.topbar}>
            <div className={s.topLeft}>
              <h1 className={s.title}>
                Orders
                <span className={s.titleSub}>{int(m.total)} total · {int(data.total)} in this view · {rangeLabel}</span>
              </h1>
            </div>
            <div className={s.topRight}>
              <div className={s.search} ref={searchWrap}>
                <Search size={13} style={{ color: 'var(--muted2)', flexShrink: 0 }} />
                <input
                  ref={searchRef}
                  data-order-search
                  value={term}
                  onChange={(e) => runSearch(e.target.value)}
                  onFocus={() => setSugOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { applyTerm(term.trim()); }
                    if (e.key === 'Escape') setSugOpen(false);
                  }}
                  placeholder="Search orders, customers, invoices…"
                  aria-label="Search orders"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={sugOpen}
                  aria-controls="ordersSearchDropdown"
                />
                {term && (
                  <button type="button" className={s.searchBtn} aria-label="Clear search"
                    onClick={() => { setTerm(''); setSuggestions([]); setFilter({ q: '' }); }}>
                    <X size={13} />
                  </button>
                )}
                <div id="ordersSearchDropdown" className={cx(s.dd, sugOpen && s.ddShow)} role="listbox">
                  {suggestions.length > 0 && grouped.map(([type, items]) => (
                    <div key={type}>
                      <p className={s.ddGroup}>{type}</p>
                      {items.map((sg) => (
                        <button key={`${sg.type}-${sg.value}`} type="button" className={s.ddItem}
                          role="option" aria-selected="false" onClick={() => applyTerm(sg.value)}>
                          <span className={s.ddBody}>
                            <b>{sg.value}</b>
                            {sg.hint && <span>{sg.hint}</span>}
                          </span>
                          <ArrowRight size={12} style={{ color: 'var(--muted2)' }} />
                        </button>
                      ))}
                    </div>
                  ))}
                  {suggestions.length === 0 && term.trim().length >= 2 && (
                    <p className={s.ddGroup}>No matches for “{term.trim()}”</p>
                  )}
                  {suggestions.length === 0 && term.trim().length < 2 && recent.length > 0 && (
                    <div>
                      <p className={s.ddGroup}>Recent searches</p>
                      {recent.map((r) => (
                        <button key={r} type="button" className={s.ddItem} onClick={() => applyTerm(r)}>
                          <Search size={12} style={{ color: 'var(--muted2)', flexShrink: 0 }} />
                          <span className={s.ddBody}><b>{r}</b></span>
                        </button>
                      ))}
                    </div>
                  )}
                  {suggestions.length === 0 && term.trim().length < 2 && recent.length === 0 && (
                    <p className={s.ddGroup}>Type an order number, name, phone or city</p>
                  )}
                  <div className={s.ddFoot}>
                    <button type="button" className={s.btnSm} onClick={() => { applyTerm(term.trim()); }}>View all results</button>
                    <button type="button" className={s.btnSm} onClick={() => setSugOpen(false)}>Close</button>
                  </div>
                </div>
              </div>

              <Link to="/admin/orders/new" className={s.btnBlack}><Plus size={13} /> Create order</Link>

              <div style={{ position: 'relative' }}>
                <button type="button" className={s.iconBtn} aria-label="Notifications"
                  onClick={() => { setShowNotes((v) => !v); if (!showNotes) notes.markRead(); }}>
                  <Bell size={14} />
                  {notes.unread > 0 && <span className={s.iconBadge}>{notes.unread > 9 ? '9+' : notes.unread}</span>}
                </button>
                <div className={cx(s.menu, s.menuRight, s.menuWide, showNotes && s.show)} id="ordersNotes">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px 8px' }}>
                    <span className={s.cardTitle}>Notifications</span>
                    <button type="button" className={s.searchBtn} aria-label="Close notifications" onClick={() => setShowNotes(false)}><X size={13} /></button>
                  </div>
                  {notes.items.length === 0 && <p style={{ padding: '14px 8px', fontSize: 11.5, color: 'var(--muted2)' }}>Nothing yet</p>}
                  {notes.items.map((n) => (
                    <button key={n._id} type="button" className={s.menuItem}
                      onClick={() => { if (n.link) nav(n.link); setShowNotes(false); }}>
                      <span className={cx(s.dot, n.read ? '' : s.dotGreen)} style={{ marginTop: 5 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600 }}>{n.title}</span>
                        {n.body && <i>{n.body}</i>}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="button" className={s.iconBtn} aria-label="Refresh" onClick={() => reload()}>
                <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button type="button" className={cx(s.iconBtn, 'hidden sm:grid')} aria-label="Keyboard shortcuts" onClick={() => setShowShortcuts(true)}>
                <Keyboard size={13} />
              </button>
            </div>
          </header>

          {/* ── stats: click a tile to narrow + drill down ──────────── */}
          <div className={s.stats} role="group" aria-label="Order metrics">
            {STATS.map((st) => {
              const active = activeStat === st.key;
              return (
                <button type="button" key={st.key}
                  className={cx(s.stat, active && s.statActive)}
                  onClick={() => toggleStat(st)}
                  aria-pressed={active}
                  title={`${st.label} — click to narrow the table`}>
                  <span className={s.statHead}>
                    <span className={cx(s.dot, st.tone === 'amber' && s.dotAmber)} />
                    {st.label}
                  </span>
                  <span className={s.statVal}>{st.value}</span>
                  <span className={s.statFoot}>
                    <span className={s.statNote}>{st.activeText || st.note}</span>
                  </span>
                  <span className={s.statArrow}>▼</span>
                </button>
              );
            })}
          </div>

          {/* ── drill-down ──────────────────────────────────────────── */}
          {activeStat && (
            <div className={s.drill} id="ordersDrill" role="region" aria-label={`${activeStat} breakdown`}>
              <div className={s.drillHead}>
                <div>
                  <p className={s.cardTitle}>{(STATS.find((x) => x.key === activeStat) || {}).label} — breakdown</p>
                  <p className={s.cardHint} style={{ marginTop: 3 }}>
                    Table below is narrowed to “{(STATS.find((x) => x.key === activeStat) || {}).label}”. Click the tile again or press Esc to reset.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button type="button" className={s.btnSm} onClick={exportCsv}><Download size={11} /> Export</button>
                  <button type="button" className={s.btnSm} onClick={() => setActiveStat(null)}><X size={11} /> Close</button>
                </div>
              </div>
              <div className={s.drillBody}>
                <div className={s.drillChartWrap}>
                  {drill.series.filter(([, v]) => Number(v) > 0).length
                    ? <div style={{ height: 190, position: 'relative' }}><canvas ref={chartRef} /></div>
                    : <p className={s.drillEmpty}>No distribution to plot for this range yet.</p>}
                </div>
                <div className={s.drillGrid}>
                  {drill.notes.map(([label, value, hint]) => (
                    <div className={s.ddStat} key={label}>
                      <b>{value}</b>
                      <span>{label}</span>
                      {hint && <span style={{ color: 'var(--muted2)' }}>{hint}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── workspace: 12 order pages + saved views + quick actions ─ */}
          <section className={cx(s.card, 'mb-3')}>
            <div className={s.cardHead}>
              <p className={s.cardTitle}>Order workspace</p>
              <p className={s.cardHint}>{int(data.total)} orders · sorted {({ oldest: 'oldest first', newest: 'newest first', 'amount-desc': 'amount high → low', 'amount-asc': 'amount low → high', 'customer-asc': 'customer A–Z', 'customer-desc': 'customer Z–A', 'payment-unpaid': 'unpaid first' })[filters.sort] || filters.sort}</p>
            </div>
            <div className={s.structWrap} role="tablist" aria-label="Order structure">
              {PILLS.map((p) => {
                const on = isPillOn(p);
                const n = pillCount(p);
                return (
                  <button key={p.key} type="button" role="tab" aria-selected={on} title={p.hint || p.label}
                    className={cx(s.struct, on && s.structOn)} onClick={() => applyPill(p)}>
                    {p.label}
                    {n != null && <span className={s.structCount}>{int(n)}</span>}
                  </button>
                );
              })}
            </div>
            <QuickFilters filters={filters} setFilter={setFilter} token={auth?.token}
              currentQuery={window.location.search.replace(/^\?/, '')} toast={toast} />
            <div className={s.quick}>
              <Link to="/admin/orders/new" className={s.qBtn}><Plus size={13} /> Create order</Link>
              <button type="button" className={s.qBtn} disabled={!selected.length} onClick={() => handleBulkPrint('packing_slip')}>
                <Printer size={13} /> Packing slips{selected.length ? ` (${selected.length})` : ''}
              </button>
              <button type="button" className={s.qBtn} onClick={() => handleBulkPrint('invoice')} disabled={!selected.length}>
                <FileText size={13} /> Invoices
              </button>
              <button type="button" className={s.qBtn} onClick={exportCsv}><Download size={13} /> Export CSV</button>
              <button type="button" className={s.qBtn} onClick={() => setFilter({ printed: filters.printed === 'no' ? '' : 'no' })}>
                <Layers size={13} /> {filters.printed === 'no' ? 'Show printed' : 'Unprinted only'}
              </button>
              <button type="button" className={s.qBtn} onClick={() => reload()}>
                {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />} Reload
              </button>
            </div>
          </section>

          {/* ── filters ─────────────────────────────────────────────── */}
          <OrderFilters
            filters={filters} setFilter={setFilter} resetFilters={resetFilters}
            activeFilterCount={activeFilterCount} facets={facets} onExport={exportCsv}
            token={auth?.token} hideSearch
          />

          {/* ── orders table ────────────────────────────────────────── */}
          <section className={cx(s.card, s.tableCard)}>
            <BulkBar
              selected={selected} total={data.total}
              onClear={() => { setSelected([]); setSelectAllMatching(false); }}
              onSelectAll={() => { setSelected(ids); setSelectAllMatching(true); }}
              onBulk={bulk} onExport={exportCsv}
              onPrint={handleBulkPrint} canAdvance={canAdvance}
              token={auth?.token} toast={toast}
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
              <div aria-hidden style={{ display: 'grid', gap: 8, padding: '10px 0' }}>
                {Array.from({ length: 7 }).map((_, i) => <div key={i} className={s.skell} style={{ width: `${100 - i * 3}%` }} />)}
              </div>
            )}

            {!loading && orders.length === 0 && !error && (
              <div className={s.empty}>
                <h3>{activeFilterCount > 0 || filters.group !== 'all' || filters.preset ? 'No orders here' : 'No orders yet'}</h3>
                <p>{activeFilterCount > 0 || filters.group !== 'all' || filters.preset
                  ? 'Nothing matches these filters. Widen the date range, clear the search, or pick another pill above.'
                  : 'Orders will appear here the moment customers complete a purchase.'}</p>
                {(activeFilterCount > 0 || filters.group !== 'all' || filters.preset) ? (
                  <button type="button" className={s.btnBlack} style={{ margin: '0 auto' }} onClick={() => { resetFilters(); setActiveStat(null); }}>Clear all filters</button>
                ) : (
                  <Link to="/admin/orders/new" className={s.btnBlack} style={{ margin: '0 auto', width: 'max-content' }}>Create order</Link>
                )}
              </div>
            )}

            {orders.length > 0 && (
              <>
                <div className={s.tableWrap}>
                  <table className={s.tbl}>
                    <colgroup>
                      <col className={s.colChk} /><col /><col /><col className={s.colDate} />
                      <col className={s.colItems} /><col className={s.colTotal} />
                      <col className={s.colPay} /><col className={s.colFulfil} />
                      <col className={s.colStatus} /><col className={s.colAct} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">
                          <input type="checkbox" className={s.chk} checked={allOnPage}
                            onChange={() => setSelected(allOnPage ? [] : ids)}
                            aria-label="Select all orders on this page" />
                        </th>
                        <th scope="col">Order</th>
                        <th scope="col">Customer</th>
                        <th scope="col" className={s.colDate}>Date</th>
                        <th scope="col" className={s.colItems}>Items</th>
                        <th scope="col" className={s.colTotal}>Total</th>
                        <th scope="col" className={s.colPay}>Payment</th>
                        <th scope="col" className={s.colFulfil}>Fulfillment</th>
                        <th scope="col" className={s.colStatus}>Status</th>
                        <th scope="col" className={s.colAct} style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <OrderRow
                          key={o._id} order={o}
                          selected={selected.includes(o._id)} onSelect={toggle}
                          busy={busyIds.has(o._id)}
                          onStage={setStage} onVerify={verifyPayment}
                          onPrint={handlePrint} onOpenService={setServiceFor}
                          onOpenCustomer={setCustomerPhone}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={s.mList}>
                  {orders.map((o) => (
                    <OrderRow
                      key={`m-${o._id}`} order={o} mobile
                      selected={selected.includes(o._id)} onSelect={toggle}
                      busy={busyIds.has(o._id)}
                      onStage={setStage} onVerify={verifyPayment}
                      onPrint={handlePrint} onOpenService={setServiceFor}
                      onOpenCustomer={setCustomerPhone}
                    />
                  ))}
                </div>
              </>
            )}

            <div className={s.deskFoot}>
              <p className={s.footNote}>
                {data.total > 0 ? `Showing ${shownFrom}–${shownTo} of ${int(data.total)}` : 'Nothing to show'}
                {loading ? ' · refreshing…' : ''}
              </p>
              <nav className={s.pager} aria-label="Pagination">
                <button type="button" className={s.pg} disabled={data.page <= 1}
                  onClick={() => setFilter({ page: String(data.page - 1) })}>‹ Prev</button>
                {Array.from({ length: Math.min(data.pages || 1, 7) }, (_, i) => {
                  const total = data.pages || 1;
                  const half = 3;
                  let page = i + 1;
                  if (total > 7) page = Math.min(Math.max(1, data.page - half), total - 6) + i;
                  return (
                    <button key={i} type="button" className={cx(s.pg, page === data.page && s.pgOn)}
                      onClick={() => setFilter({ page: String(page) })}
                      aria-current={page === data.page ? 'page' : undefined}>{page}</button>
                  );
                })}
                <button type="button" className={s.pg} disabled={data.page >= (data.pages || 1)}
                  onClick={() => setFilter({ page: String(data.page + 1) })}>Next ›</button>
              </nav>
            </div>
          </section>

          <p className={s.footNote} style={{ marginTop: 12 }}>
            {activeFilterCount > 0
              ? <>Filters active: <b style={{ color: 'var(--text)' }}>{activeFilterCount}</b> · <button type="button" className="linky" onClick={() => { resetFilters(); setActiveStat(null); setTerm(''); }}>Clear all</button></>
              : 'Tip: press / or ⌘K to search, ? for shortcuts, Esc to clear a selection.'}
          </p>
        </div>
      </div>

      {customerPhone && (
        <CustomerPanel phone={customerPhone} token={auth?.token} onClose={() => setCustomerPhone(null)} />
      )}

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
        <IssueModal order={serviceFor} token={auth?.token} toast={toast}
          onClose={() => setServiceFor(null)} onSaved={() => { setServiceFor(null); reload({ silent: true }); }} />
      )}
    </AdminLayout>
  );
}

/** Log a customer issue — same endpoint, ATELIER chrome. */
function IssueModal({ order, token, toast, onClose, onSaved }) {
  const [form, setForm] = useState({
    issueType: 'Damaged', description: '', severity: 'Normal',
    refundStatus: 'No Issue', refundAmount: 0,
  });
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
            <textarea rows={3} className={s.ctlArea} value={form.description}
              placeholder="Describe the problem for the team"
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
            {busy ? <Loader2 size={12} className="animate-spin" /> : null} Save issue
          </button>
        </div>
      </div>
    </div>
  );
}
