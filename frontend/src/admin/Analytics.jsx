import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { RefreshCcw } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ANALYTICS — the business-intelligence page, rebuilt on the admin's od-
 * design system (light editorial + dark parity), richer than Shopify's
 * default analytics without adding gimmicks:
 *
 *   KPI strip with period deltas
 *   Revenue line (previous period dashed) + sessions bars
 *   Conversion funnel · customer split · devices
 *   Top products · categories · payment mix
 *   Traffic: referrers · landing pages · order cities
 *
 * All figures come from the existing /analytics/overview aggregate —
 * this page only presents, never mutates.
 * ========================================================================== */

const RANGES = [
  { v: 'today', label: 'Today' },
  { v: '7d', label: 'Last 7 days' },
  { v: '30d', label: 'Last 30 days' },
  { v: '90d', label: 'Last 90 days' },
  { v: 'all', label: 'All time' },
  { v: 'custom', label: 'Custom range' },
];

const PALETTES = {
  light: { main: '#111', g2: '#8a8a8a', grid: '#f2f2f2', tick: '#9ca3af', mutedLine: '#c8c8c8', green: '#0e9f6e', red: '#dc2626', tooltip: '#111' },
  dark: { main: '#f4f4f5', g2: '#71717a', grid: '#26262c', tick: '#71717a', mutedLine: '#52525b', green: '#34d399', red: '#f87171', tooltip: '#27272a' },
};
const P = () => (document.documentElement.classList.contains('dark-admin') ? PALETTES.dark : PALETTES.light);

const compact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `₨${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `₨${Math.round(n / 1e3)}K`;
  return `₨${Math.round(n)}`;
};

export default function Analytics() {
  const { auth, logout } = useApp();
  const [range, setRange] = useState('30d');
  const [customFrom, setCustomFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [a, setA] = useState(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);
  const chartsRef = useRef([]);

  useEffect(() => {
    setA(null); setErr('');
    const qs = range === 'custom' ? `range=custom&from=${customFrom}&to=${customTo}` : `range=${range}`;
    api(`/analytics/overview?${qs}`, { token: auth.token })
      .then(setA)
      .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Failed to load analytics — please try again.'); });
  }, [auth, range, tick]); // eslint-disable-line

  /* charts: rebuild on data + theme toggle */
  useEffect(() => {
    if (!a) return undefined;
    const make = () => {
      chartsRef.current.forEach((c) => c.destroy());
      chartsRef.current = [];
      const pal = P();
      const add = (el, cfg) => { if (el) chartsRef.current.push(new Chart(el, cfg)); };
      const axis = (fmt) => ({
        x: { grid: { display: false }, ticks: { color: pal.tick, font: { size: 10 } } },
        y: { grid: { color: pal.grid }, ticks: { color: pal.tick, font: { size: 10 }, callback: fmt } },
      });

      add(document.getElementById('anRev'), {
        type: 'line',
        data: {
          labels: a.series.map((s) => s.date),
          datasets: [
            { label: 'Revenue', data: a.series.map((s) => s.revenue), borderColor: pal.main, backgroundColor: pal.main, tension: 0.35, pointRadius: 0, borderWidth: 2 },
            ...(a.prev ? [{ label: 'Previous period', data: a.series.map((s) => s.prevRevenue ?? null), borderColor: pal.mutedLine, borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0 }] : []),
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: pal.tooltip, callbacks: { label: (c) => ` ${c.dataset.label}: ${pkr(c.parsed.y)}` } } }, scales: axis((v) => compact(v)) },
      });

      add(document.getElementById('anSess'), {
        type: 'bar',
        data: { labels: a.traffic.sessionsSeries.map((s) => s.date), datasets: [{ label: 'Sessions', data: a.traffic.sessionsSeries.map((s) => s.sessions), backgroundColor: pal.g2, borderRadius: 3 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: axis() },
      });

      add(document.getElementById('anCust'), {
        type: 'doughnut',
        data: { labels: ['New', 'Returning'], datasets: [{ data: [a.customerSplit.fresh, a.customerSplit.returning], backgroundColor: [pal.main, pal.g2], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: pal.tick, boxWidth: 8, boxHeight: 8, font: { size: 10 } } } } },
      });

      add(document.getElementById('anDev'), {
        type: 'doughnut',
        data: { labels: a.traffic.byDevice.map((d) => d.device || 'Unknown'), datasets: [{ data: a.traffic.byDevice.map((d) => d.sessions), backgroundColor: [pal.main, pal.g2, pal.mutedLine, pal.grid], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: pal.tick, boxWidth: 8, boxHeight: 8, font: { size: 10 } } } } },
      });

      add(document.getElementById('anPay'), {
        type: 'doughnut',
        data: { labels: a.byPayment.map((p) => p.method), datasets: [{ data: a.byPayment.map((p) => p.revenue), backgroundColor: [pal.main, pal.g2, pal.mutedLine, pal.grid, pal.tick], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { color: pal.tick, boxWidth: 8, boxHeight: 8, font: { size: 10 } } }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${pkr(c.parsed)}` } } } },
      });
    };
    make();
    const mo = new MutationObserver(make);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { mo.disconnect(); chartsRef.current.forEach((c) => c.destroy()); chartsRef.current = []; };
  }, [a]);

  const k = a?.kpis;
  const deltaPct = (v, p) => {
    if (!a?.prev || p == null) return null;
    if (p === 0) return v > 0 ? { txt: 'new', up: true } : null;
    const pc = Math.round(((v - p) / p) * 100);
    return { txt: `${pc >= 0 ? '+' : ''}${pc}%`, up: pc >= 0 };
  };
  const Delta = ({ d }) => d && (
    <span className="od-delta" style={{ color: d.up ? '#10b981' : '#ef4444' }}>{d.up ? '↑' : '↓'} {d.txt}</span>
  );

  const bar = (rows, key, fmt) => {
    const max = Math.max(...rows.map((r) => r[key]), 1);
    return rows.map((r) => (
      <div key={r.name || r.cat || r.method || r.city || r.ref || r.path} className="od-bar-row">
        <div className="od-bar-meta">
          <span className="od-bar-label">{r.name || r.cat || r.method || r.city || r.ref || r.path}</span>
          <span className="od-bar-val">{fmt ? fmt(r[key]) : r[key]}</span>
        </div>
        <div className="od-bar-track"><div className="od-bar-fill" style={{ width: `${Math.max(2, Math.round((r[key] / max) * 100))}%` }} /></div>
      </div>
    ));
  };

  const inputCls = { height: 34, border: '1px solid var(--admin-border)', borderRadius: 8, background: 'var(--admin-surface)', color: 'var(--admin-text)', padding: '0 10px', fontSize: 12 };

  return (
    <AdminLayout title="Analytics">
      {/* head */}
      <div className="od-head">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Growth</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Analytics</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Revenue, conversion and traffic — {RANGES.find((r) => r.v === range)?.label.toLowerCase()}.
            {a?.prev && range !== 'custom' && range !== 'all' && ' Compared with the previous period.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={range} onChange={(e) => setRange(e.target.value)} style={inputCls} aria-label="Date range">
            {RANGES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
          {range === 'custom' && (
            <>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputCls} aria-label="From" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputCls} aria-label="To" />
            </>
          )}
          <button type="button" className="adm-chip" onClick={() => setTick((t) => t + 1)}><RefreshCcw size={13} /> Refresh</button>
        </div>
      </div>

      {err && (
        <div className="od-empty">
          <p className="od-empty-t">Unable to load analytics</p>
          <p className="od-empty-b">{err}</p>
          <button type="button" className="od-fbtn" onClick={() => setTick((t) => t + 1)} style={{ marginTop: 12 }}>Retry</button>
        </div>
      )}

      {!a && !err && (
        <div className="od-stats" aria-label="Loading analytics">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="od-stat"><div className="od-skel" style={{ height: 14, width: '60%' }} /><div className="od-skel" style={{ height: 26, marginTop: 10 }} /></div>
          ))}
        </div>
      )}

      {a && k && (
        <>
          {/* KPI strip */}
          <div className="od-stats">
            {[
              ['Revenue', pkr(k.revenue), deltaPct(k.revenue, a.prev?.revenue)],
              ['Orders', k.orders.toLocaleString(), deltaPct(k.orders, a.prev?.orders)],
              ['Avg order value', pkr(k.aov), null],
              ['Items sold', k.itemsSold.toLocaleString(), null],
              ['Sessions', k.sessions.toLocaleString(), null],
              ['Conversion', `${k.conversion}%`, null],
            ].map(([label, value, d]) => (
              <div key={label} className="od-stat">
                <div className="od-stat-head">{label} <Delta d={d} /></div>
                <div className="od-stat-val">{value}</div>
              </div>
            ))}
          </div>

          {/* revenue + sessions */}
          <div className="od-charts">
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Revenue over time</p></div>
              <div style={{ height: 240 }}><canvas id="anRev" /></div>
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Sessions over time</p></div>
              <div style={{ height: 240 }}><canvas id="anSess" /></div>
            </div>
          </div>

          {/* funnel + splits */}
          <div className="od-charts-3">
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Online store conversion</p></div>
              {[
                ['Sessions', k.sessions, 100],
                ['Added to cart', k.carts, k.sessions ? Math.round((k.carts / k.sessions) * 100) : 0],
                ['Reached checkout', k.checkouts, k.sessions ? Math.round((k.checkouts / k.sessions) * 100) : 0],
                ['Purchased', k.orders, k.sessions ? Math.round((k.orders / k.sessions) * 100) : 0],
              ].map(([label, val, pct], i, arr) => (
                <div key={label} style={{ padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--admin-border-subtle)' : 0 }}>
                  <div className="od-bar-meta">
                    <span className="od-bar-label">{label}</span>
                    <span className="od-bar-val">{Number(val).toLocaleString()} · {pct}%</span>
                  </div>
                  <div className="od-bar-track"><div className="od-bar-fill" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">New vs returning</p></div>
              <div style={{ height: 190 }}><canvas id="anCust" /></div>
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Devices</p></div>
              <div style={{ height: 190 }}><canvas id="anDev" /></div>
            </div>
          </div>

          {/* sales intelligence */}
          <div className="od-charts">
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Top products</p></div>
              {a.topProducts.length === 0 && <p className="od-empty-b" style={{ padding: 16 }}>No sales in this range yet.</p>}
              {a.topProducts.slice(0, 8).map((p, i) => (
                <div key={p.id || p.name} className="od-bar-row">
                  <div className="od-bar-meta">
                    <span className="od-bar-label">{i + 1}. {p.name}</span>
                    <span className="od-bar-val">{p.orders} orders · {pkr(p.revenue)}</span>
                  </div>
                  <div className="od-bar-track"><div className="od-bar-fill" style={{ width: `${Math.max(2, Math.round((p.revenue / Math.max(a.topProducts[0].revenue, 1)) * 100))}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Revenue by category</p></div>
              {a.byCategory.length === 0 && <p className="od-empty-b" style={{ padding: 16 }}>No category sales yet.</p>}
              {bar(a.byCategory.slice(0, 6), 'revenue', compact)}
              <div className="od-card-h" style={{ margin: '16px 0 8px' }}><p className="od-card-t">Payment mix</p></div>
              <div style={{ height: 170 }}><canvas id="anPay" /></div>
            </div>
          </div>

          {/* traffic */}
          <div className="od-charts-3">
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Top referrers</p></div>
              {a.traffic.refs.length === 0 && <p className="od-empty-b" style={{ padding: 16 }}>No referral traffic yet.</p>}
              {bar(a.traffic.refs.slice(0, 6), 'views')}
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Landing pages</p></div>
              {a.traffic.landing.length === 0 && <p className="od-empty-b" style={{ padding: 16 }}>No traffic yet.</p>}
              {bar(a.traffic.landing.slice(0, 6), 'views')}
            </div>
            <div className="od-card">
              <div className="od-card-h" style={{ marginBottom: 8 }}><p className="od-card-t">Order cities</p></div>
              {a.orderCities.length === 0 && <p className="od-empty-b" style={{ padding: 16 }}>No orders yet.</p>}
              {bar(a.orderCities.slice(0, 6), 'orders')}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
