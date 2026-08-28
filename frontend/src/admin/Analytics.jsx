import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, HeartHandshake, MessageCircle, RefreshCcw, ShieldCheck, Ticket } from 'lucide-react';
import Chart from 'chart.js/auto';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import {
  BenchRow, Chip, CohortGrid, ConvChip, EmptyState, HeadRow, Metric, Pills, Row, Section, StatStrip,
} from './analytics/sections';
import {
  COUPON_COLS, CUSTOM_COLS, CUSTOMER_COLS, PRODUCT_COLS, QUALITY_COLS, VARIANT_COLS, WINBACK_COLS,
} from './analytics/columns';
import {
  BubbleScatter, CandleChart, DonutChart, GaugeChart, ParetoChart, toCandles,
} from './analytics/svgcharts';

/* ============================================================================
 * ANALYTICS = INTELLIGENCE (reports), NOT a second dashboard.
 *
 * Overview answers "how is the store doing?" with KPI cards and charts.
 * This page answers the questions the dashboard can't:
 *
 *   R1  Which products convert — and which burn traffic?
 *   R2  Which coupons earn their keep? Is cart recovery paying?
 *   R3  Who are my best customers, and how loyal is the base?
 *   R4  Which products come back (quality radar)?
 *
 * Report aesthetic on purpose: dense tables, ranks, tabular numerals and
 * hairlines — deliberately different from the Overview card grid.
 * ========================================================================== */

const RANGES = [
  { v: '7d', label: 'Last 7 days' },
  { v: '30d', label: 'Last 30 days' },
  { v: '90d', label: 'Last 90 days' },
];

/* Report tables no longer use inline cell styles — column rhythm, alignment
 * and tabular numerals all live in ./analytics/analytics.css so every section
 * shares one system. */

/* Count-up number animation (reduced-motion safe). */
function CountUp({ value, fmt }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(value); return undefined; }
    let raf; const t0 = performance.now(); const dur = 700;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{fmt(v)}</>;
}

/* Trapezoid funnel like the reference dashboards. */
function Funnel({ k }) {
  const steps = [
    ['Sessions', k.sessions],
    ['Added to cart', k.carts],
    ['Checkout', k.checkouts],
    ['Purchased', k.orders],
  ];
  const max = Math.max(steps[0][1], 1);
  return (
    <svg viewBox="0 0 300 220" style={{ width: '100%' }} aria-label="Purchase funnel">
      {steps.map(([label, v], i) => {
        const wTop = Math.max(14, (steps[i][1] / max) * 280);
        const wBot = i < steps.length - 1 ? Math.max(10, (steps[i + 1][1] / max) * 280) : wTop * 0.7;
        const y = i * 54;
        const pct = steps[0][1] ? Math.round((v / steps[0][1]) * 100) : 0;
        return (
          <g key={label}>
            <polygon
              points={`${150 - wTop / 2},${y + 2} ${150 + wTop / 2},${y + 2} ${150 + wBot / 2},${y + 50} ${150 - wBot / 2},${y + 50}`}
              fill={['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf'][i]}
            />
            <text x={150} y={y + 30} textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="700">{pct}%</text>
            <text x={292} y={y + 30} textAnchor="end" fontSize="9" fill="var(--adm-label)">{label} · {Number(v).toLocaleString()}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Analytics() {
  const { auth } = useApp();
  const [range, setRange] = useState('30d');
  const [a, setA] = useState(null);
  const [err, setErr] = useState('');
  const [adv, setAdv] = useState(null);
  const [bench, setBench] = useState(null);
  const [dim, setDim] = useState('category');
  const [metric, setMetric] = useState('revenue');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const rangeLabel = range === 'custom'
    ? 'custom range'
    : (RANGES.find((r) => r.v === range)?.label || 'last 30 days');

  const load = useCallback(async () => {
    setErr('');
    setA(null);
    try {
      const d = await api(`/analytics/intelligence?range=${range}`, { token: auth?.token });
      setA(d);
    } catch (e) {
      setErr(e.message || 'Could not load intelligence');
    }
  }, [auth?.token, range]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api(`/analytics/advanced?range=${range}&dim=${dim}&metric=${metric}`, { token: auth?.token })
      .then(setAdv).catch(() => setAdv(null));
  }, [auth?.token, range, dim, metric]);

  useEffect(() => {
    api(`/analytics/overview?range=${range}`, { token: auth?.token }).then(setBench).catch(() => setBench(null));
  }, [auth?.token, range]);

  /* graphs rebuild on data + theme toggle */
  const chartsRef = useRef([]);
  useEffect(() => {
    if (!bench?.series) return undefined;
    const make = () => {
      chartsRef.current.forEach((c) => c.destroy());
      chartsRef.current = [];
      const dark = document.documentElement.classList.contains('dark-admin');
      const pal = dark
        ? { main: '#f4f4f5', g2: '#a1a1aa', g3: '#71717a', grid: '#26262c', tick: '#71717a', blue: '#93c5fd', green: '#34d399', amber: '#fbbf24', tooltip: '#27272a' }
        : { main: '#111', g2: '#8a8a8a', g3: '#b3b3b3', grid: '#f2f2f2', tick: '#9ca3af', blue: '#2563eb', green: '#0e9f6e', amber: '#d97706', tooltip: '#111' };
      const ser = bench.series;
      const el = document.getElementById('anCombo');
      if (el) {
        chartsRef.current.push(new Chart(el, {
          data: {
            labels: ser.map((d) => d.date.slice(5)),
            datasets: [
              { type: 'bar', label: 'Revenue', data: ser.map((d) => d.revenue), backgroundColor: dark ? 'rgba(244,244,245,0.35)' : 'rgba(17,17,17,0.16)', borderRadius: 3, yAxisID: 'y1' },
              { type: 'line', label: 'Sessions', data: ser.map((d) => d.sessions), borderColor: pal.blue, backgroundColor: pal.blue, tension: 0.35, pointRadius: 0, borderWidth: 2, yAxisID: 'y' },
              { type: 'line', label: 'Orders', data: ser.map((d) => d.orders), borderColor: pal.green, backgroundColor: pal.green, tension: 0.35, pointRadius: 0, borderWidth: 2, yAxisID: 'y' },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'bottom', labels: { color: pal.tick, boxWidth: 8, boxHeight: 8, font: { size: 10 } } },
              tooltip: { backgroundColor: pal.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${c.dataset.yAxisID === 'y1' ? 'Rs ' + Number(c.parsed.y).toLocaleString() : c.parsed.y}` } },
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: pal.tick, font: { size: 10 }, maxTicksLimit: 10 } },
              y: { position: 'left', grid: { color: pal.grid }, ticks: { color: pal.tick, font: { size: 10 } } },
              y1: { position: 'right', grid: { display: false }, ticks: { color: pal.tick, font: { size: 10 }, callback: (v) => (v >= 1000 ? Math.round(v / 1000) + 'K' : v) } },
            },
          },
        }));
      }
      const rv = document.getElementById('anRevArea');
      if (rv) {
        const avg = ser.map((_, i) => {
          const w = ser.slice(Math.max(0, i - 6), i + 1);
          return Math.round(w.reduce((a, d) => a + d.revenue, 0) / w.length);
        });
        chartsRef.current.push(new Chart(rv, {
          type: 'line',
          data: {
            labels: ser.map((d) => d.date.slice(5)),
            datasets: [
              { label: 'Revenue', data: ser.map((d) => d.revenue), borderColor: pal.amber, fill: true, tension: 0.4, pointRadius: 0, borderWidth: 2,
                backgroundColor: (c) => {
                  const { ctx, chartArea } = c.chart;
                  if (!chartArea) return 'rgba(217,119,0,0.10)';
                  const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                  g.addColorStop(0, dark ? 'rgba(251,191,36,0.28)' : 'rgba(217,119,0,0.18)');
                  g.addColorStop(1, 'rgba(217,119,0,0)');
                  return g;
                } },
              { label: '7-day average', data: avg, borderColor: pal.g2, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0 },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: pal.tick, boxWidth: 8, boxHeight: 8, font: { size: 10 } } }, tooltip: { backgroundColor: pal.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: Rs ${Number(c.parsed.y).toLocaleString()}` } } },
            scales: { x: { grid: { display: false }, ticks: { color: pal.tick, font: { size: 10 }, maxTicksLimit: 10 } }, y: { grid: { color: pal.grid }, ticks: { color: pal.tick, font: { size: 10 }, callback: (v) => (v >= 1000 ? Math.round(v / 1000) + 'K' : v) } } },
          },
        }));
      }
    };
    make();
    const mo = new MutationObserver(make);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); chartsRef.current.forEach((c) => c.destroy()); chartsRef.current = []; };
  }, [bench]);

  const burners = (a?.productIntel || []).filter((p) => p.views >= 40 && p.conv !== null && p.conv < 1);

  /* scale maxima so the inline bars are comparable within each section */
  const pi = a?.productIntel || [];
  const maxConv = Math.max(...pi.map((p) => p.conv || 0), 1);
  const maxRev = Math.max(...pi.map((p) => p.revenue || 0), 1);
  const vars_ = adv?.variants || [];
  const maxQty = Math.max(...vars_.map((v) => v.qty || 0), 1);
  const maxVarRev = Math.max(...vars_.map((v) => v.revenue || 0), 1);
  const totOrders = (adv?.custom || []).reduce((s, r) => s + (r.orders || 0), 0);
  const totRev = (adv?.custom || []).reduce((s, r) => s + (r.revenue || 0), 0);
  const { candles: revCandles } = toCandles(bench?.series || [], 6);
  const candleTrend = revCandles.length >= 2 && revCandles[0].total > 0
    ? Math.round(((revCandles[revCandles.length - 1].total - revCandles[0].total) / revCandles[0].total) * 100)
    : 0;

  /* benchmark scorecard — computed once, drawn as gauges AND as rows */
  const refundRate = bench?.kpis?.orders
    ? +(((adv?.quality || a?.quality || []).reduce((t, q) => t + q.returns, 0) / bench.kpis.orders) * 100).toFixed(1)
    : 0;
  const benchmarks = [
    { label: 'Conversion rate', value: +(bench?.kpis?.conversion || 0).toFixed(1), lo: 1.5, hi: 2.5 },
    { label: 'Repeat purchase rate', value: adv?.repeatRate ?? a?.repeatRate ?? 0, lo: 15, hi: 25 },
    { label: 'Refund rate', value: refundRate, lo: 0, hi: 5, lower: true },
  ].map((m) => {
    const good = m.lower ? m.value <= m.hi : m.value >= m.lo;
    const note = m.lower
      ? (good ? 'healthy' : 'above target — check quality')
      : (m.value < m.lo ? 'below benchmark' : m.value > m.hi * 1.6 ? 'above benchmark' : 'in range');
    return { ...m, good, note };
  });

  return (
    <AdminLayout title="Analytics">
      <div className="od-page">
      <div className="od-head">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Intelligence</p>
          <h2 className="od-display" style={{ fontSize: 26 }}>Reports & Intelligence</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            The questions the dashboard doesn't answer — conversion, ROI, loyalty, quality.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="od-seg" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button key={r.v} type="button" className={range === r.v ? 'on' : ''} onClick={() => setRange(r.v)}>{r.label.replace('Last ', '')}</button>
            ))}
            <button type="button" className={range === 'custom' ? 'on' : ''} onClick={() => setRange('custom')}>Custom</button>
          </div>
          {range === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="adm-chip" style={{ height: 32 }} aria-label="From" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="adm-chip" style={{ height: 32 }} aria-label="To" />
            </>
          )}
          <button type="button" className="adm-chip" onClick={load}><RefreshCcw size={13} /> Refresh</button>
        </div>
      </div>

      {err && (
        <div className="od-empty">
          <p className="od-empty-t">Unable to load reports</p>
          <p className="od-empty-b">{err}</p>
          <button type="button" className="od-fbtn" style={{ marginTop: 12 }} onClick={load}>Retry</button>
        </div>
      )}

      {!a && !err && (
        <div style={{ display: 'grid', gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="od-card"><div className="od-skel" style={{ height: 16, width: '40%' }} /><div className="od-skel" style={{ height: 90, marginTop: 10 }} /></div>
          ))}
        </div>
      )}

      {bench && bench.kpis && (
        <>
          {/* KPI cards — accent tints, count-up, staggered reveal */}
          <div className="od-stats">
            {[
              { label: 'Revenue', raw: bench.kpis.revenue, fmt: (v) => `Rs ${Math.round(v).toLocaleString()}`, bars: bench.series.map((d) => d.revenue), key: 'revenue', acc: 'acc-blue', color: '#2563eb' },
              { label: 'Orders', raw: bench.kpis.orders, fmt: (v) => Math.round(v).toLocaleString(), bars: bench.series.map((d) => d.orders), key: 'orders', acc: 'acc-green', color: '#0e9f6e' },
              { label: 'Sessions', raw: bench.kpis.sessions, fmt: (v) => Math.round(v).toLocaleString(), bars: bench.series.map((d) => d.sessions), key: 'sessions', acc: 'acc-teal', color: '#0d9488' },
              { label: 'Conversion', raw: bench.kpis.conversion, fmt: (v) => `${v.toFixed(1)}%`, bars: null, key: null, acc: 'acc-amber' },
              { label: 'Avg order', raw: bench.kpis.aov, fmt: (v) => `Rs ${Math.round(v).toLocaleString()}`, bars: null, key: null, acc: 'acc-pink' },
              { label: 'Cart → checkout', raw: bench.kpis.carts ? (bench.kpis.checkouts / bench.kpis.carts) * 100 : 0, fmt: (v) => `${Math.round(v)}%`, bars: null, key: null, acc: 'acc-gray' },
            ].map((m2, idx) => {
              const ser = bench.series;
              const last = ser[ser.length - 1]; const prevD = ser[ser.length - 2];
              const dlt = m2.key && prevD && prevD[m2.key] ? Math.round(((last[m2.key] - prevD[m2.key]) / prevD[m2.key]) * 100) : null;
              return (
                <div key={m2.label} className={`od-stat od-rise ${m2.acc}`} style={{ animationDelay: `${idx * 60}ms` }}>
                  <div className="od-stat-head">{m2.label}</div>
                  <div className="od-stat-val"><CountUp value={m2.raw} fmt={m2.fmt} /></div>
                  <div className="od-stat-foot">
                    <span className="od-delta" style={{ color: dlt == null ? 'var(--adm-label)' : dlt >= 0 ? '#10b981' : '#ef4444' }}>
                      {dlt == null ? 'this period' : `${dlt >= 0 ? '↑' : '↓'} ${Math.abs(dlt)}% vs prev day`}
                    </span>
                    {m2.bars && (
                      <svg width="70" height="24" aria-hidden="true" style={{ color: m2.color || 'inherit' }}>
                        {m2.bars.slice(-14).map((v, i, arr) => {
                          const max = Math.max(...arr, 1);
                          const h = Math.max(2, (v / max) * 22);
                          return <rect key={i} x={i * 5} y={24 - h} width="3.5" height={h} rx="1" fill="currentColor" opacity="0.6" />;
                        })}
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* combo + revenue area */}
          <div className="od-charts">
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}>
                <p className="od-card-t">Performance over time</p>
                <span className="od-bar-val">sessions & orders (left) · revenue bars (right)</span>
              </div>
              <div style={{ height: 300 }}><canvas id="anCombo" /></div>
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Revenue & 7-day average</p></div>
              <div style={{ height: 300 }}><canvas id="anRevArea" /></div>
            </div>
          </div>

          {/* funnel + traffic */}
          <div className="od-charts-3">
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Purchase funnel</p></div>
              <Funnel k={bench.kpis} />
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 4 }}><p className="od-card-t">Top referrers</p></div>
              {bench.traffic.refs.length === 0 && <p className="od-empty-b" style={{ padding: 12 }}>No referral traffic yet.</p>}
              {bench.traffic.refs.slice(0, 6).map((r) => {
                const max = Math.max(...bench.traffic.refs.map((x) => x.views), 1);
                return (
                  <div key={r.ref} className="od-bar-row">
                    <div className="od-bar-meta"><span className="od-bar-label">{r.ref}</span><span className="od-bar-val">{r.views.toLocaleString()}</span></div>
                    <div className="od-bar-track"><div className="od-bar-fill" style={{ width: `${Math.max(2, Math.round((r.views / max) * 100))}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 4 }}><p className="od-card-t">Landing pages</p></div>
              {bench.traffic.landing.length === 0 && <p className="od-empty-b" style={{ padding: 12 }}>No traffic yet.</p>}
              {bench.traffic.landing.slice(0, 6).map((l) => {
                const max = Math.max(...bench.traffic.landing.map((x) => x.views), 1);
                return (
                  <div key={l.path} className="od-bar-row">
                    <div className="od-bar-meta"><span className="od-bar-label">{l.path}</span><span className="od-bar-val">{l.views.toLocaleString()}</span></div>
                    <div className="od-bar-track"><div className="od-bar-fill" style={{ width: `${Math.max(2, Math.round((l.views / max) * 100))}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ══ REPORT SECTIONS ══════════════════════════════════════════
            * Same visual language as the cards above: one <Section> card,
            * one 12-column row rhythm, chips + bars, one empty state.
            * Order = how a owner reads the store: score → conversion →
            * customers → marketing → product depth → retention → quality →
            * build-your-own. */}
          <div className="an-grid an-charts">

            {/* ── 1 · scorecard vs industry ─────────────────────────────── */}
            {bench?.kpis && (
              <Section
                className="an-c12"
                title="You vs industry benchmarks"
                subtitle={`${rangeLabel} · where the store sits against typical fashion e-commerce`}
              >
                <div className="an-gauges">
                  {benchmarks.map((m) => (
                    <GaugeChart key={m.label} value={m.value} lo={m.lo} hi={m.hi} label={m.label} />
                  ))}
                </div>
                {benchmarks.map((m) => (
                  <BenchRow key={m.label} label={m.label} value={m.value} lo={m.lo} hi={m.hi} note={m.note} good={m.good} />
                ))}
              </Section>
            )}

            {/* ── 2 · revenue candles ─────────────────────────────────────── */}
            {bench?.series?.length > 1 && (
              <Section
                className="an-c12"
                delay={40}
                title="Revenue candles"
                subtitle="Each candle is a period of real daily sales — open, high, low, close. Green = the period ended higher than it started."
                actions={
                  <Chip tone={candleTrend >= 0 ? 'good' : 'bad'}>
                    {candleTrend >= 0 ? '▲' : '▼'} {Math.abs(candleTrend)}% first → last period
                  </Chip>
                }
              >
                <CandleChart series={bench.series} fmt={(v) => `Rs ${Math.round(v).toLocaleString('en-US')}`} />
              </Section>
            )}

            {/* ── 3 · product conversion ────────────────────────────────── */}
            {a && (
              <Section
                className="an-c12"
                delay={60}
                title="Product conversion"
                subtitle={`Views → orders, ${rangeLabel.toLowerCase()}`}
                actions={burners.length > 0 ? <Chip tone="warn">{burners.length} burning traffic</Chip> : null}
              >
                {burners.length > 0 && (
                  <div className="an-callout">
                    <AlertTriangle size={14} />
                    <span>
                      <b>{burners.length} product{burners.length === 1 ? '' : 's'}</b> pulling traffic but converting under 1% —
                      check price, photos or stock: {burners.slice(0, 3).map((b) => b.name).join(', ')}.
                    </span>
                  </div>
                )}
                {a.productIntel.length > 0 && (
                  <div className="an-chart-block">
                    <p className="an-sub-h">Views vs conversion</p>
                    <BubbleScatter points={a.productIntel} target={1.5} />
                  </div>
                )}
                {a.productIntel.length === 0 ? (
                  <EmptyState title="No traffic or sales in this range" body="Product views and orders will show up here as soon as the store gets traffic." />
                ) : (
                  <>
                    <HeadRow
                      label="Product"
                      cols={PRODUCT_COLS}
                    />
                    <div className="an-list">
                      {a.productIntel.map((p, i) => (
                        <Row
                          key={p.slug || p.name + i}
                          rank={i + 1}
                          top={i < 3}
                          title={p.name}
                          sub={p.returns > 0 ? `${p.returns} returned` : `${p.views.toLocaleString()} views`}
                        >
                          <Metric span={1} hide="md" value={p.views.toLocaleString()} mute />
                          <Metric span={2} align="c" chip={<ConvChip v={p.conv} max={maxConv} />} />
                          <Metric span={1} hide="sm" value={p.orders} big={p.orders > 0} mute={p.orders === 0} />
                          <Metric span={3} value={pkr(p.revenue)} money big bar={p.revenue ? (p.revenue / maxRev) * 100 : 0} barTone="teal" />
                          <Metric
                            span={1}
                            align="c"
                            hide="md"
                            chip={p.returns > 0 ? <Chip tone="bad">{p.returns}</Chip> : <Chip tone="plain">0</Chip>}
                          />
                        </Row>
                      ))}
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* ── 4 · customer value ────────────────────────────────────── */}
            {a && (
              <Section
                className="an-c7"
                delay={120}
                title="Customer value"
                subtitle={`${a.repeatRate}% repeat rate · ${a.totalCustomers} buyers in range`}
              >
                {a.topCustomers.length === 0 ? (
                  <EmptyState title="No customers in this range" body="Orders placed in this window will rank your buyers by lifetime spend." />
                ) : (
                  <>
                    <HeadRow
                      label="Customer"
                      cols={CUSTOMER_COLS}
                    />
                    <div className="an-list">
                      {a.topCustomers.map((c, i) => (
                        <Row
                          key={c.name + i}
                          rank={i + 1}
                          top={i < 3}
                          title={c.name}
                          badge={c.orders > 1 ? <Chip tone="good">repeat</Chip> : null}
                          sub={c.orders > 1 ? `${c.orders} orders` : 'first order'}
                        >
                          <Metric span={2} align="c" chip={<Chip tone={c.orders > 1 ? 'info' : 'plain'}>{c.orders}×</Chip>} />
                          <Metric
                            span={6}
                            value={pkr(c.revenue)}
                            money
                            big
                            bar={(c.revenue / (a.topCustomers[0]?.revenue || 1)) * 100}
                            barTone="green"
                          />
                        </Row>
                      ))}
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* ── 5 · revenue mix ─────────────────────────────────────────── */}
            {(bench?.byCategory?.length > 0 || bench?.byPayment?.length > 0) && (
              <Section
                className="an-c12"
                delay={210}
                title="Where the money comes from"
                subtitle={`Revenue split, ${rangeLabel.toLowerCase()} — hover a slice or a legend row for its share`}
              >
                <div className="an-donuts">
                  <div className="an-donut-cell">
                    <p className="an-sub-h">By category</p>
                    <DonutChart
                      label="Categories"
                      data={(bench.byCategory || []).map((c) => ({ label: c.cat, value: c.revenue }))}
                      fmt={(v) => `Rs ${Math.round(v).toLocaleString('en-US')}`}
                    />
                  </div>
                  <div className="an-donut-cell">
                    <p className="an-sub-h">By payment method</p>
                    <DonutChart
                      label="Payments"
                      data={(bench.byPayment || []).map((p) => ({ label: p.method || 'Unspecified', value: p.revenue }))}
                      fmt={(v) => `Rs ${Math.round(v).toLocaleString('en-US')}`}
                    />
                  </div>
                </div>
              </Section>
            )}

            {/* ── 6 · revenue concentration ─────────────────────────────────── */}
            {bench?.topProducts?.length > 0 && (
              <Section
                className="an-c12"
                delay={240}
                title="Revenue concentration"
                subtitle="Top products with the running share of total revenue — shows how much rides on how few lines"
              >
                <ParetoChart
                  rows={bench.topProducts}
                  fmt={(v) => `Rs ${Math.round(v).toLocaleString('en-US')}`}
                />
              </Section>
            )}

            {/* ── 7 · marketing ROI ─────────────────────────────────────── */}
            {a && (
              <Section className="an-c5" delay={180} title="Marketing ROI" subtitle="Coupons & cart recovery, same window">
                <p className="an-sub-h">Cart recovery</p>
                <StatStrip
                  items={[
                    { label: 'Captured', value: a.recovery.captured },
                    { label: 'Recovered', value: a.recovery.recovered },
                    { label: 'Rate', value: `${a.recovery.rate}%` },
                  ]}
                />
                <div className="an-hero">
                  <div className="an-hero-l">Recovered revenue</div>
                  <div className="an-hero-v">{pkr(a.recovery.revenue)}</div>
                  <div className="an-hero-s">
                    Recovery emails are doing {a.recovery.rate >= 10 ? 'great' : a.recovery.rate >= 5 ? 'okay' : 'weak'} work this period.
                  </div>
                </div>

                <p className="an-sub-h" style={{ marginTop: 16 }}>Coupons</p>
                {a.coupons.length === 0 ? (
                  <EmptyState
                    icon={<Ticket size={15} />}
                    title="No coupon usage in this range"
                    body="Discount codes used at checkout will show their revenue against cost here."
                  />
                ) : (
                  <>
                    <HeadRow label="Code" cols={COUPON_COLS} />
                    <div className="an-list">
                      {a.coupons.map((c) => (
                        <Row key={c.code} title={c.code} badge={<Chip mono>{c.code}</Chip>} sub={c.uses > 1 ? `${c.uses} redemptions` : '1 redemption'}>
                          <Metric span={2} align="c" value={c.uses} />
                          <Metric span={3} value={pkr(c.revenue)} money />
                          <Metric span={3} value={`−${pkr(c.cost)}`} mute />
                        </Row>
                      ))}
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* ── 8 · variant depth ─────────────────────────────────────── */}
            {adv?.variants?.length > 0 && (
              <Section
                className="an-c12"
                delay={240}
                title="Top variants"
                subtitle={`Size / colour selling best · ${rangeLabel.toLowerCase()}`}
                actions={<Chip tone="plain">{adv.variants.length} variants</Chip>}
              >
                <HeadRow label="Variant" cols={VARIANT_COLS} />
                <div className="an-list scroll">
                  {adv.variants.map((v, i) => {
                    const [name, opt] = String(v.variant).split(' · ');
                    return (
                      <Row key={v.variant} rank={i + 1} top={i < 3} title={name || v.variant} sub={opt || 'default variant'}>
                        <Metric span={2} align="c" value={v.qty} big={v.qty >= 10} bar={(v.qty / maxQty) * 100} barTone="blue" />
                        <Metric span={6} value={pkr(v.revenue)} money big bar={(v.revenue / maxVarRev) * 100} barTone="teal" />
                      </Row>
                    );
                  })}
                </div>
              </Section>
            )}

            {/* ── 9 · retention ─────────────────────────────────────────── */}
            {adv && (
              <Section className="an-c7" delay={300} title="Cohort retention" subtitle="Repeat purchase % by month after first order">
                {adv.cohorts.length === 0 ? (
                  <EmptyState title="Not enough history yet" body="Cohorts build automatically as customers place a second order." />
                ) : (
                  <CohortGrid rows={adv.cohorts} />
                )}
              </Section>
            )}

            {/* ── 10 · win-back list ─────────────────────────────────────── */}
            {adv && (
              <Section className="an-c5" delay={360} title="Win-back list" subtitle="Repeat buyers silent for 60+ days">
                {adv.atRisk.length === 0 ? (
                  <EmptyState
                    icon={<HeartHandshake size={15} />}
                    title="Nobody gone quiet"
                    body="No repeat buyer has crossed 60 silent days — retention is holding."
                  />
                ) : (
                  <>
                    <HeadRow label="Customer" cols={WINBACK_COLS} />
                    <div className="an-list">
                    {adv.atRisk.map((c) => (
                      <Row key={c.name + c.phone} title={c.name} sub={`${c.orders} orders · ${c.days} days silent`}>
                        <Metric span={2} align="c" chip={<Chip tone={c.days > 120 ? 'bad' : 'warn'}>{c.days}d</Chip>} />
                        <Metric
                          span={6}
                          align="r"
                          chip={
                            <a
                              className="an-chip act"
                              target="_blank"
                              rel="noreferrer"
                              href={`https://wa.me/${String(c.phone).replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(
                                `Hi ${c.name}, we miss you at HUSHAE — here is 10% off your next order: WELCOME10`,
                              )}`}
                            >
                              <MessageCircle size={11} /> Win back
                            </a>
                          }
                        />
                      </Row>
                    ))}
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* ── 11 · quality ───────────────────────────────────────────── */}
            {a && (
              <Section className="an-c4" delay={420} title="Product quality" subtitle="Returns by product, this window">
                {a.quality.length === 0 ? (
                  <EmptyState
                    icon={<ShieldCheck size={15} />}
                    title="Zero returns this period"
                    body="Quality is holding — nothing came back in this range."
                  />
                ) : (
                  <>
                    <HeadRow label="Product" cols={QUALITY_COLS} />
                    <div className="an-list">
                    {a.quality.map((q) => (
                      <Row key={q.name} title={q.name} sub={`${q.returns} returned`}>
                        <Metric span={4} align="c" chip={<Chip tone="bad">{q.returns} return{q.returns === 1 ? '' : 's'}</Chip>} />
                        <Metric span={4} bar={Math.min(100, q.returns * 20)} barTone="red" />
                      </Row>
                    ))}
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* ── 12 · build-your-own report ─────────────────────────────── */}
            {adv && (
              <Section
                className="an-c8"
                delay={480}
                title="Build your own report"
                subtitle="Any dimension, either metric — totals update with the range"
                actions={
                  <>
                    <Pills
                      ariaLabel="Dimension"
                      value={dim}
                      onChange={setDim}
                      options={['category', 'product', 'city', 'payment', 'coupon'].map((d) => ({ v: d, label: d }))}
                    />
                    <Pills
                      ariaLabel="Metric"
                      value={metric}
                      onChange={setMetric}
                      options={[{ v: 'revenue', label: 'revenue' }, { v: 'orders', label: 'orders' }]}
                    />
                  </>
                }
                footer={
                  <span>
                    Total · <b>{totOrders.toLocaleString()}</b> orders · <b>{pkr(totRev)}</b>
                  </span>
                }
              >
                {adv.custom.length === 0 ? (
                  <EmptyState title="No data for this combination" body="Try another dimension or a wider date range." />
                ) : (
                  <>
                    <HeadRow
                      label={dim}
                      cols={CUSTOM_COLS}
                    />
                    <div className="an-list">
                      {adv.custom.map((r, i) => (
                        <Row key={r.name} rank={i + 1} top={i === 0} title={r.name}>
                          <Metric span={2} align="c" value={r.orders} />
                          <Metric span={3} value={pkr(r.revenue)} money big bar={(r.revenue / (adv.custom[0]?.revenue || 1)) * 100} barTone="teal" />
                          <Metric
                            span={3}
                            hide="md"
                            chip={<Chip tone="plain">{totRev ? Math.round((r.revenue / totRev) * 100) : 0}%</Chip>}
                          />
                        </Row>
                      ))}
                    </div>
                  </>
                )}
              </Section>
            )}
          </div>
      </div>
    </AdminLayout>
  );
}
