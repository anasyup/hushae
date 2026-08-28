import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Chart from 'chart.js/auto';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import { buildKpis, buildStatement, delta, runwayDays } from './finance/pnl';
import { exportPnlReport } from './finance/exportPnl';
import OrderProfitability from './finance/OrderProfitability';
import { BreakEven, CodExposure, ProfitByCustomer, ProfitByProduct } from './finance/ProfitTables';
/* Same stylesheet the Overview page uses, imported rather than copied so the
 * two pages cannot drift apart. Finance is an ATELIER page now, not its own
 * design. */
import styles from './Overview.module.css';

/* ============================================================================
 * FINANCE — ATELIER design, matching the Overview page exactly.
 *
 * Every figure comes from GET /api/finance/pnl, which is built on the
 * backend's utils/orderEconomics.js — the single source of truth that every
 * other finance endpoint also uses. The page used to recompute P&L in the
 * browser with different rules and so disagreed with its own order table by
 * PKR 1,120 on a 10-order sample (margin shown 27.2% against a true 24.6%).
 *
 * Charts are deliberately few, the way Overview does it: one trend line, one
 * doughnut, and sparklines on the KPI cards. Everything else is a table,
 * because for money the exact number matters more than the shape.
 * ========================================================================== */

const PALETTES = {
  light: { main: '#111', g2: '#555', g3: '#8a8a8a', g4: '#d6d6d6', mutedLine: '#c8c8c8', grid: '#f2f2f2', grid2: '#f5f5f5', tick: '#9ca3af', cardBg: '#fff', tooltip: '#111', red: '#dc2626', green: '#0e9f6e' },
  dark: { main: '#f4f4f5', g2: '#a1a1aa', g3: '#71717a', g4: '#3f3f46', mutedLine: '#52525b', grid: '#26262c', grid2: '#1d1d21', tick: '#71717a', cardBg: '#111113', tooltip: '#27272a', red: '#f87171', green: '#34d399' },
};

const isDarkAdmin = () => document.documentElement.classList.contains('dark-admin');
const P = () => (isDarkAdmin() ? PALETTES.dark : PALETTES.light);
const cx = (...names) => names.map((n) => styles[n]).filter(Boolean).join(' ');

const money = (v) => pkr(v);
const int = (v) => Number(v || 0).toLocaleString('en-US');
const compactRs = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `₨${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `₨${Math.round(n / 1e3)}K`;
  return `₨${Math.round(n)}`;
};
const fmtD = (s) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—');
const changeLabel = (c) => (c == null ? 'New' : `${c >= 0 ? '+' : ''}${c.toFixed(1)}%`);

const RANGES = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
];

/* Count-up animation, same behaviour as the Overview cards. */
function animateCountTo(el, target, { prefix = '', suffix = '', decimals = 0 } = {}) {
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = prefix + (decimals ? Number(target).toFixed(decimals) : Math.round(target).toLocaleString('en-US')) + suffix;
    return;
  }
  const duration = 1100;
  const start = performance.now();
  const fmt = (n) => prefix + (decimals ? n.toFixed(decimals) : Math.floor(n).toLocaleString('en-US')) + suffix;
  function update(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * ease);
    if (p < 1) requestAnimationFrame(update);
    else el.textContent = prefix + (decimals ? Number(target).toFixed(decimals) : Math.round(target).toLocaleString('en-US')) + suffix;
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

export default function Finance() {
  const { auth } = useApp();
  const nav = useNavigate();
  const dark = useAdminDark();
  const [range, setRange] = useState('30');
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const countedRef = useRef(false);

  const days = RANGES.find((r) => r.key === range)?.days || 30;

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      setD(await api(`/finance/pnl?days=${days}`, { token: auth?.token }));
    } catch (e) {
      setErr(e.message || 'Could not load finance');
    } finally {
      setBusy(false);
    }
  }, [auth?.token, days]);

  useEffect(() => { load(); }, [load]);

  /* close the range dropdown on any outside click */
  useEffect(() => {
    if (!rangeOpen) return undefined;
    const off = () => setRangeOpen(false);
    window.addEventListener('click', off);
    return () => window.removeEventListener('click', off);
  }, [rangeOpen]);

  const c = d?.current;
  const prev = d?.previous;
  const vsLabel = `vs previous ${days} days`;

  const kpis = useMemo(() => buildKpis(c, prev), [c, prev]);
  const statement = useMemo(() => buildStatement(c), [c]);

  /* one sparkline series per KPI card, taken from the real daily rows */
  const sparks = useMemo(() => {
    const rows = c?.daily || [];
    const pick = (fn) => (rows.length ? rows.map(fn) : [0]);
    return [
      pick((r) => r.revenue),
      pick((r) => r.revenue - r.cogs),
      pick((r) => r.revenue - r.cogs - r.costs),
      pick((r) => r.profit),
      pick((r) => r.cogs + r.costs),
      pick((r) => r.profit),
    ];
  }, [c]);

  /* cost breakdown for the doughnut — what actually took the money */
  const costSlices = useMemo(() => {
    if (!c) return { rows: [], total: 0 };
    const rows = [
      { label: 'Cost of goods', value: c.costs?.cogs || 0 },
      { label: 'Courier', value: c.costs?.courier || 0 },
      { label: 'Marketing', value: c.opex?.marketing || 0 },
      { label: 'Packaging', value: c.costs?.packaging || 0 },
      { label: 'Payment fees', value: c.costs?.paymentFees || 0 },
      { label: 'SEO', value: c.opex?.seo || 0 },
      { label: 'Other', value: c.opex?.other || 0 },
    ].filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const top = rows.slice(0, 4);
    const rest = rows.slice(4).reduce((s, r) => s + r.value, 0);
    const out = rest > 0 ? [...top, { label: 'Other costs', value: rest }] : top;
    return { rows: out, total: out.reduce((s, r) => s + r.value, 0) };
  }, [c]);

  /* --------------------------- charts --------------------------- */
  useEffect(() => {
    if (!c) return undefined;
    const pal = P();
    const charts = [];
    const mk = (id, cfg) => {
      const el = document.getElementById(id);
      if (el) charts.push(new Chart(el, cfg));
    };
    const rows = c.daily || [];
    const labels = rows.map((r) => new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));

    kpis.forEach((k, i) => {
      const series = sparks[i]?.length ? sparks[i] : [0];
      mk(`finSpark${i + 1}`, {
        type: 'line',
        data: { labels: series.map((_, j) => j), datasets: [{ data: series, borderColor: pal.main, borderWidth: 1.4, pointRadius: 0, tension: 0.4, fill: false }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 } }, animation: { duration: 1000, easing: 'easeOutQuart' } },
      });
    });

    /* Profit trend — revenue against what each day actually left behind */
    mk('finTrend', {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Revenue', data: rows.map((r) => r.revenue), borderColor: pal.main, backgroundColor: pal.main, borderWidth: 2.2, tension: 0.35, pointRadius: rows.length > 14 ? 0 : 4, pointBackgroundColor: pal.main, pointBorderWidth: 2, pointHoverRadius: 6 },
          { label: 'Profit', data: rows.map((r) => r.profit), borderColor: pal.mutedLine, backgroundColor: pal.mutedLine, borderWidth: 1.5, borderDash: [4, 4], tension: 0.35, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1200, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: pal.tooltip, titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 8, cornerRadius: 8, displayColors: false, callbacks: { label: (t) => ` ${t.dataset.label}: ${money(t.parsed.y)}` } },
        },
        scales: {
          y: { grid: { color: pal.grid, borderDash: [3, 3] }, ticks: { callback: (v) => compactRs(v), font: { size: 10 }, color: pal.tick, maxTicksLimit: 5 }, border: { display: false } },
          x: { grid: { display: false }, ticks: { font: { size: 10 }, color: pal.tick, maxTicksLimit: 8 }, border: { display: false } },
        },
      },
    });

    /* Where the money goes */
    if (costSlices.rows.length) {
      mk('finCostDonut', {
        type: 'doughnut',
        data: { labels: costSlices.rows.map((r) => r.label), datasets: [{ data: costSlices.rows.map((r) => r.value), backgroundColor: [pal.main, pal.g2, pal.g3, pal.g4, '#b5b5b5'], borderWidth: 0, hoverOffset: 5 }] },
        options: { cutout: '70%', animation: { animateRotate: true, duration: 1300, easing: 'easeOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, padding: 8, cornerRadius: 8, displayColors: false, callbacks: { label: (t) => ` ${t.label}: ${money(t.parsed)}` } } }, responsive: true, maintainAspectRatio: false },
      });
    }

    return () => charts.forEach((ch) => ch.destroy());
  }, [c, kpis, sparks, costSlices, dark]);

  /* --------------------------- count-up --------------------------- */
  useEffect(() => {
    if (!c) return;
    const els = document.querySelectorAll('.' + styles['count-up']);
    kpis.forEach((k, i) => {
      if (!els[i]) return;
      setTimeout(() => animateCountTo(els[i], Math.abs(Number(k.value) || 0), { prefix: k.value < 0 ? '−PKR ' : 'PKR ' }), 120 + i * 70);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c]);

  /* --------------------------- render --------------------------- */
  const rangeLabel = RANGES.find((r) => r.key === range)?.label || 'Last 30 days';
  const cover = c ? runwayDays(c.contribution, (c.opexTotal || 0) * (30 / Math.max(1, c.days || days))) : null;
  const drift = Math.abs(Number(c?.reconcileDrift) || 0);
  const ladder = Number(c?.ladderCheck) || 0;

  return (
    <AdminLayout title="Finance">
      <div className={styles.ovw}>
        <div className={styles.wrap}>

          {/* ------------------------- topbar ------------------------- */}
          <div className={styles.topbar}>
            <div className={styles['top-left']}>
              <div
                className={cx('pill', rangeOpen && 'active')}
                onClick={(e) => { e.stopPropagation(); setRangeOpen((v) => !v); }}
              >
                <span>{rangeLabel}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
                {rangeOpen && (
                  <div className={cx('dropdown', 'show')} onClick={(e) => e.stopPropagation()}>
                    {RANGES.map((r) => (
                      <div key={r.key} onClick={() => { setRange(r.key); setRangeOpen(false); }}>{r.label}</div>
                    ))}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                {c ? `${fmtD(d.range.from)} – ${fmtD(d.range.to)} · compared with the ${days} days before` : ''}
              </span>
            </div>
            <div className={styles['top-right']}>
              <button className={styles['btn-black']} disabled={!c} onClick={() => exportPnlReport({ data: d, rangeLabel })}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                Export P&amp;L
              </button>
              <button className={styles['icon-btn']} onClick={load} disabled={busy} title="Refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={busy ? { animation: 'spin 1s linear infinite' } : undefined}><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
              </button>
              <button className={styles['icon-btn']} onClick={() => nav('/admin/finance/transactions')} title="Transactions">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
              </button>
            </div>
          </div>

          {err && !c && (
            <div className={cx('card', 'ovw-error')}>
              <p>{err}</p>
              <button className={styles['btn-black']} onClick={load}>Retry</button>
            </div>
          )}

          {/* The page refuses to present numbers that do not tie. */}
          {c && (drift > 1 || ladder !== 0) && (
            <div className={cx('card', 'ovw-error')}>
              <p>
                These figures do not fully reconcile
                {drift > 1 ? ` — income lines differ from net sales by ${money(c.reconcileDrift)}` : ''}
                {ladder !== 0 ? ` — profit ladder drift ${money(ladder)}` : ''}.
                Check product cost prices before relying on this statement.
              </p>
            </div>
          )}

          {/* ------------------------- KPI stats ------------------------- */}
          <div className={styles.stats}>
            {!c
              ? Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.stat}><div className={cx('skeleton', 'sk-block')} /></div>)
              : kpis.map((k, i) => (
                <div className={styles.stat} key={k.key}>
                  <div className={styles['stat-head']}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                      {k.key === 'revenue' && <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>}
                      {k.key === 'gross' && <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></>}
                      {k.key === 'contribution' && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>}
                      {k.key === 'net' && <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 10h20" /><circle cx="12" cy="15" r="2" /></>}
                      {k.key === 'costs' && <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></>}
                      {k.key === 'sunk' && <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>}
                    </svg>
                    {k.label}
                  </div>
                  <div className={cx('stat-val', 'count-up')} style={k.verdict && Number(k.value) < 0 ? { color: '#dc2626' } : undefined}>
                    {money(k.value)}
                  </div>
                  <div className={styles['stat-foot']}>
                    <div>
                      <div className={cx('stat-change', k.tone === 'bad' && 'neg')}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={k.tone === 'bad' ? 'M12 5v14M5 12l7 7 7-7' : 'M12 19V5M5 12l7-7 7 7'} /></svg>
                        {changeLabel(k.pct)}
                      </div>
                      <div className={styles['stat-vs']}>{k.sub || vsLabel}</div>
                    </div>
                    <canvas className={styles.spark} id={`finSpark${i + 1}`} />
                  </div>
                </div>
              ))}
          </div>

          {/* ------------------------ charts row ------------------------ */}
          <div className={cx('grid3', 'reveal')}>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <div className={styles['card-t']}>Profit Trend</div>
                <button className={styles['btn-sm']} onClick={() => nav('/admin/reports')}>Reports</button>
              </div>
              <div className={styles.legend}>
                <span><b style={{ background: '#111' }} /> Revenue</span>
                <span><b style={{ background: '#c8c8c8' }} /> Profit after costs</span>
              </div>
              <div className={styles['chart-main']}><canvas id="finTrend" role="img" aria-label="Revenue against profit, day by day" /></div>
            </div>

            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Where the Money Goes</span></div>
              {costSlices.rows.length === 0 ? (
                <div className={styles['ovw-empty']}>No costs recorded in this period</div>
              ) : (
                <div className={styles['donut-row']}>
                  <div className={styles.donut}>
                    <canvas id="finCostDonut" role="img" aria-label="Cost breakdown" />
                    <div className={styles['donut-center']}>
                      <b>{compactRs(costSlices.total)}</b><span>Total Costs</span>
                    </div>
                  </div>
                  <div className={styles['ch-list']}>
                    {costSlices.rows.map((r) => (
                      <div className={styles['ch-item']} key={r.label}>
                        <div className={styles.dot} style={{ background: '#111' }} />
                        <span className={styles['ch-name']}>{r.label}</span>
                        <span className={styles.pct}>{costSlices.total ? Math.round((r.value / costSlices.total) * 100) : 0}%</span>
                        <span className={styles.val}>{money(r.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ textAlign: 'right', marginTop: 14 }}>
                <button className={styles['btn-sm']} onClick={() => nav('/admin/settings/shipping')}>Edit cost rates</button>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Health at a Glance</span></div>
              <div className={styles.glance}>
                <div className={styles['g-item']} onClick={() => nav('/admin/orders')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg></div>
                  <b>{int(c?.orders)}</b><span>Orders</span>
                </div>
                <div className={styles['g-item']}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg></div>
                  <b>{compactRs(c?.aov)}</b><span>Avg order</span>
                </div>
                <div className={styles['g-item']}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /></svg></div>
                  <b>{c ? `${c.netMargin}%` : '—'}</b><span>Net margin</span>
                </div>
                <div className={styles['g-item']}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></div>
                  <b>{cover == null ? '—' : `${cover}d`}</b><span>Runway</span>
                </div>
                <div className={styles['g-item']} onClick={() => nav('/admin/cod')}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg></div>
                  <b>{int(c?.health?.profitable)}</b><span>Profitable</span>
                </div>
                <div className={styles['g-item']}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg></div>
                  <b>{int(c?.health?.thin)}</b><span>Thin margin</span>
                </div>
                <div className={styles['g-item']}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg></div>
                  <b>{int(c?.failed?.returnedAfterShip)}</b><span>Returns</span>
                </div>
                <div className={styles['g-item']}>
                  <div className={styles['g-ico']}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
                  <b>{int(c?.failed?.cancelledBeforeShip)}</b><span>Cancelled</span>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------- tables row ------------------------- */}
          <div className={cx('grid4', 'reveal')}>
            <div className={styles.card}>
              <div className={styles['card-h']}>
                <div className={styles['card-t']}>Profit &amp; Loss</div>
                <button className={styles['btn-sm']} onClick={() => exportPnlReport({ data: d, rangeLabel })}>Print</button>
              </div>
              {!c ? <div className={cx('skeleton', 'sk-block')} /> : (
                <table className={styles.tbl}>
                  <tbody>
                    {statement.map((g) => (
                      <>
                        <tr key={`${g.title}-h`}>
                          <td colSpan="2" style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.3px', paddingTop: 12, borderBottom: 0 }}>
                            {g.title}
                          </td>
                        </tr>
                        {g.rows.filter((r) => r.value !== 0).map((r) => (
                          <tr key={r.label}>
                            <td style={{ color: '#6b7280', paddingLeft: 8 }}>{r.label}</td>
                            <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.value < 0 ? '#6b7280' : undefined }}>
                              {r.value < 0 ? '−' : ''}{money(Math.abs(r.value))}
                            </td>
                          </tr>
                        ))}
                        <tr key={`${g.title}-t`}>
                          <td style={{ fontWeight: 700, borderTop: '1px solid #ececec' }}>{g.subtotal.label}</td>
                          <td style={{
                            textAlign: 'right', fontWeight: 700, borderTop: '1px solid #ececec',
                            fontVariantNumeric: 'tabular-nums',
                            color: g.subtotal.value < 0 ? '#dc2626' : undefined,
                          }}
                          >
                            {g.subtotal.value < 0 ? '−' : ''}{money(Math.abs(g.subtotal.value))}
                            {g.subtotal.rate != null && <span style={{ color: '#9ca3af', fontWeight: 500, marginLeft: 6 }}>{g.subtotal.rate}%</span>}
                          </td>
                        </tr>
                      </>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Payment Methods</span></div>
              {!c?.paymentMix?.length ? <div className={styles['ovw-empty']}>No payments in this period</div> : (
                <table className={styles.tbl}>
                  <thead>
                    <tr><th>Method</th><th style={{ textAlign: 'right' }}>Fees</th><th style={{ textAlign: 'right' }}>Profit</th></tr>
                  </thead>
                  <tbody>
                    {c.paymentMix.map((m) => (
                      <tr key={m.method}>
                        <td>
                          <div className={styles.prod}>
                            <span className={styles['prod-ico']}>{(m.method || '?').slice(0, 1).toUpperCase()}</span>
                            <span>{m.method}<span style={{ color: '#9ca3af' }}> · {int(m.orders)} orders</span></span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: m.fees > 0 ? undefined : '#9ca3af' }}>
                          {m.fees > 0 ? `−${money(m.fees)}` : money(0)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: m.profit < 0 ? '#dc2626' : undefined }}>
                          {m.profit < 0 ? '−' : ''}{money(Math.abs(m.profit))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles['card-h']}><span className={styles['card-t']}>Not Revenue</span></div>
              <p style={{ fontSize: 10.5, color: '#9ca3af', marginBottom: 8, lineHeight: 1.5 }}>
                Money that moved but is not income — kept out of the statement so the accounts stay readable.
              </p>
              <table className={styles.tbl}>
                <tbody>
                  {Number(c?.income?.tax) > 0 && (
                    <tr><td style={{ color: '#6b7280' }}>Tax collected · liability</td><td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(c.income.tax)}</td></tr>
                  )}
                  {Number(c?.memos?.refundedValue) > 0 && (
                    <tr><td style={{ color: '#6b7280' }}>Refunded to customers · {int(c.memos.refundedCount)}</td><td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(c.memos.refundedValue)}</td></tr>
                  )}
                  {Number(c?.memos?.cancelledValue) > 0 && (
                    <tr><td style={{ color: '#6b7280' }}>Cancelled, never collected · {int(c.memos.cancelledCount)}</td><td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(c.memos.cancelledValue)}</td></tr>
                  )}
                  {Number(c?.sunkCost) > 0 && (
                    <tr><td style={{ color: '#6b7280' }}>Sunk cost of failed orders</td><td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>−{money(c.sunkCost)}</td></tr>
                  )}
                  {![c?.income?.tax, c?.memos?.refundedValue, c?.memos?.cancelledValue, c?.sunkCost].some((v) => Number(v) > 0) && (
                    <tr><td colSpan="2" style={{ color: '#9ca3af' }}>Nothing to report in this period</td></tr>
                  )}
                </tbody>
              </table>
              <div className={styles['view-all']} onClick={() => nav('/admin/finance/transactions')}>
                View transactions
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>

          {/* --------------------- detailed tables ---------------------
              Real, order-level detail. Kept as tables rather than charts
              because for money the exact figure matters more than the shape —
              the same call the Overview page makes. */}
          {c && (
            <div className={cx('grid3', 'reveal')} style={{ gridTemplateColumns: '1fr' }}>
              <div className={styles.card}>
                <div className={styles['card-h']}><span className={styles['card-t']}>Order Profitability</span></div>
                <OrderProfitability days={days} bare />
              </div>
            </div>
          )}

          {c && (
            <div className={cx('grid4', 'reveal')}>
              <div className={styles.card}>
                <div className={styles['card-h']}><span className={styles['card-t']}>Profit by Product</span></div>
                <ProfitByProduct days={days} bare />
              </div>
              <div className={styles.card}>
                <div className={styles['card-h']}><span className={styles['card-t']}>Profit by Customer</span></div>
                <ProfitByCustomer days={days} bare />
              </div>
            </div>
          )}

          {c && (
            <div className={cx('grid4', 'reveal')}>
              <div className={styles.card}>
                <div className={styles['card-h']}><span className={styles['card-t']}>COD Exposure</span></div>
                <CodExposure bare />
              </div>
              <div className={styles.card}>
                <div className={styles['card-h']}><span className={styles['card-t']}>Break-even</span></div>
                <BreakEven days={days} bare />
              </div>
            </div>
          )}

          <p style={{ fontSize: 10.5, color: '#9ca3af', lineHeight: 1.6, marginTop: 12 }}>
            Costs resolve from the value stored on each order, then your settings default, then zero — so recording a real
            courier invoice against an order overrides the estimate with no code change. Fixed monthly costs are prorated
            across the period. Set rates in Settings → Shipping &amp; Operating Costs.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
