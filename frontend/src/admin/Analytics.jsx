import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import './analytics-intel.css';

/* ============================================================================
 * ANALYTICS — the 4-question intelligence page (boss spec, zero clutter):
 *  1 paisa kahan se? 2 customer kahan drop? 3 profit vs burner 4 delivery
 *  nuksan. Architecture: date engine → 5 telemetry tiles → revenue curve +
 *  funnel → R1–R4 matrices. Quiet luxury palette, self-contained charts.
 * ========================================================================== */

const RANGES = [
  ['today', 'Today'], ['7d', '7D'], ['30d', '30D'], ['90d', '90D'], ['ytd', 'YTD'],
];

const money = (n) => pkr(Math.round(n || 0));
const int = (n) => (n || 0).toLocaleString();

function Delta({ v, suffix = '%' }) {
  if (v == null) return <span className="d an-d-flat">— no baseline</span>;
  const cls = v > 0 ? 'an-d-good' : v < 0 ? 'an-d-bad' : 'an-d-flat';
  return <span className={`d ${cls}`}>{v > 0 ? '↑' : v < 0 ? '↓' : '→'} {Math.abs(v)}{suffix}</span>;
}

export default function Analytics() {
  const { auth } = useApp();
  const [range, setRange] = useState('30d');
  const [compare, setCompare] = useState('prev');
  const [exec, setExec] = useState(null);
  const [intel, setIntel] = useState(null);

  useEffect(() => {
    let alive = true;
    setExec(null);
    api(`/analytics/executive?range=${range}&compare=${compare}`, { token: auth?.token })
      .then((d) => { if (alive) setExec(d); }).catch(() => { if (alive) setExec({ kpis: null, error: true }); });
    api(`/analytics/intelligence?range=${range}`, { token: auth?.token })
      .then((d) => { if (alive) setIntel(d); }).catch(() => { if (alive) setIntel({}); });
    return () => { alive = false; };
  }, [range, compare, auth?.token]);

  const k = exec?.kpis?.cur;
  const d = exec?.kpis?.deltas;

  /* ── revenue trajectory chart (area + 7d MA, live scrubber tooltip) ── */
  const chartRef = useRef(null);
  useEffect(() => {
    if (!chartRef.current || !exec?.series) return undefined;
    const series = exec.series;
    const ch = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: series.map((s) => s.d.slice(5)),
        datasets: [
          {
            label: 'Revenue', data: series.map((s) => s.revenue),
            borderColor: '#141414', backgroundColor: 'rgba(20,20,20,0.06)',
            fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHitRadius: 18,
          },
          {
            label: '7-day avg', data: series.map((s) => s.ma7),
            borderColor: '#B4B0A5', borderDash: [5, 5], borderWidth: 1.6,
            fill: false, tension: 0.4, pointRadius: 0, pointHitRadius: 18,
          },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, labels: { boxWidth: 14, boxHeight: 2, font: { size: 10 } } },
          tooltip: {
            backgroundColor: '#141414', titleFont: { size: 11 }, bodyFont: { size: 11 },
            callbacks: { label: (c) => ` ${c.dataset.label}: ${pkr(c.parsed.y)}` },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9.5 }, maxTicksLimit: 10 } },
          y: { grid: { color: 'rgba(20,20,20,0.05)' }, ticks: { font: { size: 9.5 }, callback: (v) => `${Math.round(v / 1000)}k` } },
        },
      },
    });
    return () => ch.destroy();
  }, [exec]);

  /* ── funnel geometry ── */
  const funnel = useMemo(() => {
    const f = exec?.funnel;
    if (!f) return [];
    const top = Math.max(1, f.sessions);
    const stages = [
      ['Store Sessions', f.sessions], ['Product Views', f.views], ['Add to Cart', f.carts],
      ['Checkout Started', f.checkouts], ['Completed Orders', f.orders],
    ];
    return stages.map(([n, v], i) => ({
      n, v, pct: +((v / top) * 100).toFixed(1),
      drop: i > 0 && stages[i - 1][1] ? +(((stages[i - 1][1] - v) / stages[i - 1][1]) * 100).toFixed(0) : null,
    }));
  }, [exec]);

  /* ── R1 converters vs burners ── */
  const r1 = useMemo(() => {
    const list = intel?.productIntel || [];
    const converters = list.filter((p) => p.orders > 0 && p.conv != null).sort((a, b) => b.conv - a.conv).slice(0, 5);
    const burners = list.filter((p) => p.views >= 15 && (p.orders || 0) === 0).sort((a, b) => b.views - a.views).slice(0, 5);
    return { converters, burners, maxV: Math.max(1, ...list.map((p) => p.views)) };
  }, [intel]);

  const cmpLabel = compare === 'yoy' ? 'vs same period last year' : 'vs previous period';

  return (
    <AdminLayout title="Analytics">
      <div className="an-wrap">

        {/* ── 1 · intelligence & date engine ── */}
        <div className="an-head an-in">
          <div>
            <h1 className="an-title">Analytics Intelligence</h1>
            <p className="an-sub">Paisa kahan se aaya, customer kahan gira, kaunsa product jalaya, delivery me kitna gaya.</p>
          </div>
          <div className="an-engine">
            <div className="an-range" role="group" aria-label="Date range">
              {RANGES.map(([key, label]) => (
                <button key={key} type="button" className={range === key ? 'on' : ''} onClick={() => setRange(key)}>{label}</button>
              ))}
            </div>
            <div className="an-cmp" role="group" aria-label="Compare">
              <button type="button" className={compare === 'prev' ? 'on' : ''} onClick={() => setCompare('prev')}>vs Previous</button>
              <button type="button" className={compare === 'yoy' ? 'on' : ''} onClick={() => setCompare('yoy')}>vs Last Year</button>
            </div>
          </div>
        </div>

        {/* ── 2 · executive telemetry ── */}
        <div className="an-tiles">
          {!k ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="an-tile an-in"><div className="an-skel" style={{ height: 64 }} /></div>)
          ) : (
            <>
              <div className="an-tile an-in"><p className="l">Gross GMV</p><p className="v">{money(k.gmv)}</p><Delta v={d?.gmv} /><p className="an-sub" style={{ marginTop: 6 }}>{cmpLabel}</p></div>
              <div className="an-tile an-in"><p className="l">Net Realized Cash</p><p className="v">{money(k.net)}</p><Delta v={d?.net} /><p className="an-sub" style={{ marginTop: 6 }}>after cancels + COD risk</p></div>
              <div className="an-tile an-in"><p className="l">Conversion</p><p className="v">{k.conversion}%</p><span className="d an-d-flat">benchmark 2.5–5%</span><p className="an-sub" style={{ marginTop: 6 }}>orders / sessions</p></div>
              <div className="an-tile an-in"><p className="l">Avg Order Value</p><p className="v">{money(k.aov)}</p><Delta v={d?.aov} /><p className="an-sub" style={{ marginTop: 6 }}>{cmpLabel}</p></div>
              <div className="an-tile an-in"><p className="l">Return Patronage</p><p className="v">{k.retention}%</p><Delta v={d?.retention} /><p className="an-sub" style={{ marginTop: 6 }}>repeat customers</p></div>
            </>
          )}
        </div>

        {/* ── 3 · trajectory + funnel ── */}
        <div className="an-grid2">
          <div className="an-card an-in">
            <h3>Revenue Trajectory</h3>
            {exec?.series ? (
              <div className="an-chart"><canvas ref={chartRef} /></div>
            ) : <div className="an-skel" style={{ height: 240 }} />}
          </div>
          <div className="an-card an-in">
            <h3>Purchase Conversion Funnel</h3>
            {funnel.length ? (
              <div className="an-fun">
                {funnel.map((s, i) => (
                  <div key={s.n}>
                    <div className="an-fun-row">
                      <span className="n">{s.n}</span>
                      <div className="an-fun-track"><div className="an-fun-fill" style={{ width: `${Math.max(2, s.pct)}%` }} /></div>
                      <span className="v">{int(s.v)}</span>
                    </div>
                    {s.drop != null && s.drop > 0 && <p className="an-fun-drop">−{s.drop}% drop{ i === 3 && s.drop > 70 ? ' · shipping/form friction?' : ''}</p>}
                  </div>
                ))}
              </div>
            ) : <div className="an-skel" style={{ height: 240 }} />}
          </div>
        </div>

        {/* ── 4 · R1–R4 matrices ── */}
        <div className="an-mx">

          {/* R1 */}
          <div className="an-card an-in">
            <h3>R1 · Product Velocity & Burner Radar</h3>
            <div className="an-split">
              <div>
                <p className="an-h4" style={{ color: 'var(--an-good)' }}>Top converters</p>
                {(r1.converters || []).map((p) => (
                  <div key={p.slug} className="an-row">
                    <span className="nm">{p.name}</span>
                    <span className="an-bar"><i style={{ width: `${Math.min(100, (p.views / r1.maxV) * 100)}%` }} /></span>
                    <span className="mt">{p.conv}% · {p.orders} ord</span>
                  </div>
                ))}
                {!r1.converters?.length && <p className="an-sub">No conversions in range yet.</p>}
              </div>
              <div>
                <p className="an-h4" style={{ color: 'var(--an-bad)' }}>Traffic burners</p>
                {(r1.burners || []).map((p) => (
                  <div key={p.slug} className="an-row">
                    <span className="nm">{p.name}</span>
                    <span className="an-bar bad"><i style={{ width: `${Math.min(100, (p.views / r1.maxV) * 100)}%` }} /></span>
                    <span className="mt">{p.views} views · 0 ord</span>
                  </div>
                ))}
                {!r1.burners?.length && <p className="an-sub">No burners — traffic convert ho raha hai.</p>}
              </div>
            </div>
          </div>

          {/* R2 */}
          <div className="an-card an-in">
            <h3>R2 · Promo & Cart Recovery ROI</h3>
            <div className="an-split">
              <div>
                <p className="an-h4">Coupon yield</p>
                {(intel?.coupons || []).slice(0, 5).map((c) => (
                  <div key={c.code} className="an-row">
                    <span className="nm">{c.code}</span>
                    <span className="an-bar"><i style={{ width: `${Math.min(100, (c.revenue / Math.max(1, intel.coupons[0].revenue)) * 100)}%` }} /></span>
                    <span className="mt">{c.uses}× · {money(c.revenue)}</span>
                  </div>
                ))}
                {!intel?.coupons?.length && <p className="an-sub">No coupon orders in range.</p>}
              </div>
              <div>
                <p className="an-h4">Cart recovery</p>
                <div className="an-kv"><span className="k">Carts captured</span><span className="v">{int(intel?.recovery?.captured)}</span></div>
                <div className="an-kv"><span className="k">Recovered</span><span className="v" style={{ color: 'var(--an-good)' }}>{int(intel?.recovery?.recovered)}</span></div>
                <div className="an-kv"><span className="k">Recovery rate</span><span className="v">{intel?.recovery?.rate || 0}%</span></div>
                <div className="an-kv"><span className="k">Revenue recovered</span><span className="v">{money(intel?.recovery?.revenue)}</span></div>
              </div>
            </div>
          </div>

          {/* R3 */}
          <div className="an-card an-in">
            <h3>R3 · VIP Cohorts & Lifetime Value</h3>
            <div className="an-tiers">
              <div className="an-tier t-d"><b>{int(exec?.tiers?.diamond)}</b><span>Diamond 50+</span></div>
              <div className="an-tier t-g"><b>{int(exec?.tiers?.gold)}</b><span>Gold 10+</span></div>
              <div className="an-tier"><b>{int(exec?.tiers?.silver)}</b><span>Silver 3+</span></div>
              <div className="an-tier"><b>{int(exec?.tiers?.bronze)}</b><span>Bronze</span></div>
            </div>
            <div className="an-kv"><span className="k">Repeat purchase rate</span><span className="v">{intel?.repeatRate || 0}%</span></div>
            <div className="an-kv"><span className="k">Avg gap between orders</span><span className="v">{exec?.avgGapDays != null ? `${exec.avgGapDays} days` : '—'}</span></div>
            <p className="an-h4" style={{ marginTop: 12 }}>Top clients (range)</p>
            {(intel?.topCustomers || []).slice(0, 4).map((c) => (
              <div key={c.name + c.revenue} className="an-row">
                <span className="nm">{c.name}</span>
                <span className="mt">{c.orders}× · {money(c.revenue)}</span>
              </div>
            ))}
          </div>

          {/* R4 */}
          <div className="an-card an-in">
            <h3>R4 · Courier SLA & RTO Prevention</h3>
            <div className="an-split">
              <div>
                <p className="an-h4">Courier scorecard</p>
                {(exec?.couriers || []).slice(0, 5).map((c) => (
                  <div key={c.name} className="an-row">
                    <span className="nm">{c.name}</span>
                    <span className={`an-bar ${+c.cancelRate > 20 ? 'bad' : +c.cancelRate > 10 ? 'warn' : ''}`}><i style={{ width: `${c.onTimeRate}%` }} /></span>
                    <span className="mt">{c.onTimeRate}% on-time · {c.cancelRate}% RTO</span>
                  </div>
                ))}
                {!exec?.couriers?.length && <p className="an-sub">No courier data in range.</p>}
              </div>
              <div>
                <p className="an-h4">City RTO radar</p>
                {(exec?.cities || []).slice(0, 5).map((c) => (
                  <div key={c.city} className="an-row">
                    <span className="nm">{c.city}</span>
                    <span className={`an-bar ${c.rtoRate > 20 ? 'bad' : c.rtoRate > 10 ? 'warn' : ''}`}><i style={{ width: `${Math.min(100, c.rtoRate * 3)}%` }} /></span>
                    <span className="mt">{c.rtoRate}% · {c.orders} ord</span>
                  </div>
                ))}
                {!exec?.cities?.length && <p className="an-sub">Not enough city volume yet.</p>}
              </div>
            </div>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
