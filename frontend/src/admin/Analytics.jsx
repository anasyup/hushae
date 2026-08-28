import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import Chart from 'chart.js/auto';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

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

const th = { textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-label)', padding: '8px 10px', borderBottom: '1px solid var(--admin-border)' };
const td = { fontSize: 12, padding: '9px 10px', borderBottom: '1px solid var(--admin-border-subtle)', color: 'var(--admin-text)' };
const num = { ...td, fontVariantNumeric: 'tabular-nums' };

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
              fill="currentColor" opacity={0.75 - i * 0.16}
            />
            <text x={150} y={y + 30} textAnchor="middle" fontSize="10" fill="var(--admin-bg)" fontWeight="700">{pct}%</text>
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

  return (
    <AdminLayout title="Analytics">
      <div className="od-head">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Intelligence</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Reports & Intelligence</h2>
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
              { label: 'Revenue', raw: bench.kpis.revenue, fmt: (v) => `Rs ${Math.round(v).toLocaleString()}`, bars: bench.series.map((d) => d.revenue), key: 'revenue', acc: 'acc-blue' },
              { label: 'Orders', raw: bench.kpis.orders, fmt: (v) => Math.round(v).toLocaleString(), bars: bench.series.map((d) => d.orders), key: 'orders', acc: 'acc-green' },
              { label: 'Sessions', raw: bench.kpis.sessions, fmt: (v) => Math.round(v).toLocaleString(), bars: bench.series.map((d) => d.sessions), key: 'sessions', acc: 'acc-teal' },
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
                      <svg width="70" height="24" aria-hidden="true" style={{ color: 'inherit' }}>
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
              <div style={{ height: 260 }}><canvas id="anCombo" /></div>
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Revenue & 7-day average</p></div>
              <div style={{ height: 260 }}><canvas id="anRevArea" /></div>
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

      {a && (
        <>
          {/* R1 — product conversion */}
          <section className="od-card" style={{ marginBottom: 12 }}>
            <div className="od-card-h" style={{ marginBottom: 4 }}>
              <p className="od-card-t">R1 — Product conversion</p>
              <span className="od-bar-val">views → orders, {RANGES.find((r) => r.v === range)?.label.toLowerCase()}</span>
            </div>
            {burners.length > 0 && (
              <p style={{ margin: '6px 0 10px', padding: '8px 10px', borderRadius: 8, background: 'var(--od-yellow-bg)', border: '1px solid var(--od-yellow-bd)', color: 'var(--od-yellow-tx)', fontSize: 11.5 }}>
                {burners.length} product{burners.length === 1 ? '' : 's'} pulling traffic but converting under 1% — check price, photos or stock: {burners.slice(0, 3).map((b) => b.name).join(', ')}.
              </p>
            )}
            <div className="od-table-wrap">
              <table className="od-tbl" style={{ minWidth: 640 }}>
                <thead><tr><th style={th}>#</th><th style={th}>Product</th><th style={th}>Views</th><th style={th}>Conv.</th><th style={th}>Orders</th><th style={th}>Revenue</th><th style={th}>Returns</th></tr></thead>
                <tbody>
                  {a.productIntel.map((p, i) => (
                    <tr key={p.slug}>
                      <td style={{ ...num, color: 'var(--adm-label)' }}>{i + 1}</td>
                      <td style={{ ...td, fontWeight: 600, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</td>
                      <td style={num}>{p.views.toLocaleString()}</td>
                      <td style={num}>
                        {p.conv === null ? '—' : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <span className="od-bar-track" style={{ width: 44 }}><span className="od-bar-fill" style={{ width: `${Math.min(100, p.conv * 10)}%`, display: 'block' }} /></span>
                            {p.conv}%
                          </span>
                        )}
                      </td>
                      <td style={num}>{p.orders}</td>
                      <td style={num}>{pkr(p.revenue)}</td>
                      <td style={num}>{p.returns > 0 ? <span className="od-b od-b-red"><span className="dot" />{p.returns}</span> : <span style={{ color: 'var(--adm-label)' }}>0</span>}</td>
                    </tr>
                  ))}
                  {a.productIntel.length === 0 && <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--adm-label)', padding: 24 }}>No traffic or sales in this range yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* R2 — marketing ROI */}
          <div className="od-charts" style={{ marginBottom: 12 }}>
            <section className="od-card">
              <div className="od-card-h" style={{ marginBottom: 4 }}><p className="od-card-t">R2a — Coupon ROI</p></div>
              <div className="od-table-wrap">
                <table className="od-tbl" style={{ minWidth: 420 }}>
                  <thead><tr><th style={th}>Code</th><th style={th}>Uses</th><th style={th}>Revenue</th><th style={th}>Cost</th></tr></thead>
                  <tbody>
                    {a.coupons.map((c) => (
                      <tr key={c.code}>
                        <td style={{ ...td, fontWeight: 700, fontFamily: 'monospace', fontSize: 11 }}>{c.code}</td>
                        <td style={num}>{c.uses}</td>
                        <td style={num}>{pkr(c.revenue)}</td>
                        <td style={{ ...num, color: c.cost > c.revenue * 0.3 ? '#ef4444' : 'var(--adm-label)' }}>−{pkr(c.cost)}</td>
                      </tr>
                    ))}
                    {a.coupons.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--adm-label)', padding: 24 }}>No coupon usage in this range.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">R2b — Cart recovery ROI</p></div>
              <div className="od-stats" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 8 }}>
                <div className="od-stat"><div className="od-stat-head">Captured</div><div className="od-stat-val">{a.recovery.captured}</div></div>
                <div className="od-stat"><div className="od-stat-head">Recovered</div><div className="od-stat-val">{a.recovery.recovered}</div></div>
                <div className="od-stat"><div className="od-stat-head">Rate</div><div className="od-stat-val">{a.recovery.rate}%</div></div>
              </div>
              <p className="od-bar-val">Recovered revenue: <b style={{ color: 'var(--od-text)' }}>{pkr(a.recovery.revenue)}</b> — recovery emails are doing {a.recovery.rate >= 10 ? 'great' : a.recovery.rate >= 5 ? 'okay' : 'weak'} work this period.</p>
            </section>
          </div>

          {/* R3 + R4 */}
          <div className="od-charts">
            <section className="od-card">
              <div className="od-card-h" style={{ marginBottom: 4 }}>
                <p className="od-card-t">R3 — Customer value</p>
                <span className="od-bar-val">repeat rate {a.repeatRate}% · {a.totalCustomers} buyers</span>
              </div>
              <div className="od-table-wrap">
                <table className="od-tbl" style={{ minWidth: 420 }}>
                  <thead><tr><th style={th}>#</th><th style={th}>Customer</th><th style={th}>Orders</th><th style={th}>Lifetime spend</th></tr></thead>
                  <tbody>
                    {a.topCustomers.map((c, i) => (
                      <tr key={c.name + i}>
                        <td style={{ ...num, color: 'var(--adm-label)' }}>{i + 1}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{c.name} {c.orders > 1 && <span className="od-b od-b-green"><span className="dot" />repeat</span>}</td>
                        <td style={num}>{c.orders}</td>
                        <td style={num}>{pkr(c.revenue)}</td>
                      </tr>
                    ))}
                    {a.topCustomers.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: 'var(--adm-label)', padding: 24 }}>No customers in this range yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">R4 — Quality radar (returns)</p></div>
              {a.quality.length === 0 && (
                <p className="od-bar-val" style={{ padding: '12px 0' }}>Zero returns this period — quality is holding.</p>
              )}
              {a.quality.map((q) => (
                <div key={q.name} className="od-bar-row">
                  <div className="od-bar-meta">
                    <span className="od-bar-label">{q.name}</span>
                    <span className="od-bar-val" style={{ color: '#ef4444' }}>{q.returns} return{q.returns === 1 ? '' : 's'}</span>
                  </div>
                  <div className="od-bar-track"><div className="od-bar-fill" style={{ width: `${Math.min(100, q.returns * 20)}%`, background: '#ef4444' }} /></div>
                </div>
              ))}
            </section>
          </div>
        </>
      )}

      {adv && (
        <>
          {/* R0 — benchmarks vs industry */}
          {bench?.kpis && (
            <section className="od-card" style={{ marginBottom: 12 }}>
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">R0 — You vs industry benchmarks</p></div>
              {[
                ['Conversion rate', bench.kpis.conversion, 1.5, 2.5, '%'],
                ['Repeat purchase rate', adv.repeatRate ?? 0, 15, 25, '%'],
                ['Refund rate', bench.kpis.orders ? +(((adv?.quality || []).reduce((a, q) => a + q.returns, 0)) / bench.kpis.orders * 100).toFixed(1) : 0, 0, 5, '%', true],
              ].map(([label, val, lo, hi, unit, lower]) => {
                const v = Number(val) || 0;
                const good = lower ? v <= hi : v >= lo && v <= hi * 1.6;
                const note = lower ? (v <= hi ? 'healthy' : 'above target — check quality') : v < lo ? 'below benchmark' : v > hi ? 'above benchmark' : 'in range';
                return (
                  <div key={label} className="od-bar-row">
                    <div className="od-bar-meta">
                      <span className="od-bar-label">{label}: <b>{v}{unit}</b> <span style={{ color: good ? '#10b981' : '#f59e0b' }}>({note})</span></span>
                      <span className="od-bar-val">industry {lo}–{hi}{unit}</span>
                    </div>
                    <div className="od-bar-track"><div className="od-bar-fill" style={{ width: `${Math.min(100, (v / (hi || 1)) * 50)}%`, background: good ? '#10b981' : '#f59e0b' }} /></div>
                  </div>
                );
              })}
            </section>
          )}

          {/* R5 — cohorts */}
          <section className="od-card" style={{ marginBottom: 12 }}>
            <div className="od-card-h" style={{ marginBottom: 4 }}><p className="od-card-t">R5 — Cohort retention (repeat % by month)</p></div>
            <div className="od-table-wrap">
              <table className="od-tbl" style={{ minWidth: 560 }}>
                <thead><tr><th style={th}>Cohort</th><th style={th}>Buyers</th>{[1,2,3,4,5,6].map((m) => <th key={m} style={th}>M{m}</th>)}</tr></thead>
                <tbody>
                  {adv.cohorts.map((c) => (
                    <tr key={c.cohort}>
                      <td style={{ ...td, fontWeight: 700 }}>{c.cohort}</td>
                      <td style={num}>{c.customers}</td>
                      {c.rates.map((r, i) => (
                        <td key={i} style={{ ...num, color: r >= 25 ? '#10b981' : r >= 10 ? 'var(--admin-text)' : 'var(--adm-label)', fontWeight: r >= 25 ? 700 : 400 }}>{r}%</td>
                      ))}
                    </tr>
                  ))}
                  {adv.cohorts.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: 'center', color: 'var(--adm-label)', padding: 24 }}>Not enough history yet — cohorts build as customers repeat.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          {/* R6 + R7 */}
          <div className="od-charts" style={{ marginBottom: 12 }}>
            <section className="od-card">
              <div className="od-card-h" style={{ marginBottom: 4 }}><p className="od-card-t">R6 — At-risk customers (60+ days silent)</p></div>
              {adv.atRisk.length === 0 && <p className="od-bar-val" style={{ padding: 12 }}>No repeat buyers gone quiet — retention is holding.</p>}
              {adv.atRisk.map((c) => (
                <div key={c.name + c.phone} className="od-bar-row">
                  <div className="od-bar-meta">
                    <span className="od-bar-label">{c.name} <span style={{ color: 'var(--adm-label)' }}>· {c.orders} orders · {c.days}d silent</span></span>
                    <a className="od-chip" style={{ height: 24, fontSize: 10 }} target="_blank" rel="noreferrer"
                      href={`https://wa.me/${String(c.phone).replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent('Hi ' + c.name + ', we miss you at HUSHAE — here is 10% off your next order: WELCOME10')}`}>
                      Win back
                    </a>
                  </div>
                </div>
              ))}
            </section>
            <section className="od-card">
              <div className="od-card-h" style={{ marginBottom: 4 }}><p className="od-card-t">R7 — Variant performance</p></div>
              <div className="od-table-wrap">
                <table className="od-tbl" style={{ minWidth: 380 }}>
                  <thead><tr><th style={th}>Variant</th><th style={th}>Qty</th><th style={th}>Revenue</th></tr></thead>
                  <tbody>
                    {adv.variants.map((v) => (
                      <tr key={v.variant}>
                        <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.variant}</td>
                        <td style={num}>{v.qty}</td>
                        <td style={num}>{pkr(v.revenue)}</td>
                      </tr>
                    ))}
                    {adv.variants.length === 0 && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: 'var(--adm-label)', padding: 24 }}>No sales in range.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* R8 — custom report builder */}
          <section className="od-card">
            <div className="od-card-h" style={{ marginBottom: 8 }}>
              <p className="od-card-t">R8 — Custom report</p>
              <span style={{ display: 'flex', gap: 6 }}>
                <select className="adm-chip" style={{ height: 30 }} value={dim} onChange={(e) => setDim(e.target.value)} aria-label="Dimension">
                  {['category', 'product', 'city', 'payment', 'coupon'].map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="adm-chip" style={{ height: 30 }} value={metric} onChange={(e) => setMetric(e.target.value)} aria-label="Metric">
                  <option value="revenue">revenue</option>
                  <option value="orders">orders</option>
                </select>
              </span>
            </div>
            <div className="od-table-wrap">
              <table className="od-tbl" style={{ minWidth: 380 }}>
                <thead><tr><th style={th}>{dim}</th><th style={th}>Orders</th><th style={th}>Revenue</th></tr></thead>
                <tbody>
                  {adv.custom.map((r) => (
                    <tr key={r.name}>
                      <td style={{ ...td, fontWeight: 600 }}>{r.name}</td>
                      <td style={num}>{r.orders}</td>
                      <td style={num}>{pkr(r.revenue)}</td>
                    </tr>
                  ))}
                  {adv.custom.length === 0 && <tr><td colSpan={3} style={{ ...td, textAlign: 'center', color: 'var(--adm-label)', padding: 24 }}>No data for this combination.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AdminLayout>
  );
}
