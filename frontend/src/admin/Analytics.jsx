import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
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

export default function Analytics() {
  const { auth } = useApp();
  const [range, setRange] = useState('30d');
  const [a, setA] = useState(null);
  const [err, setErr] = useState('');

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="adm-chip" style={{ height: 34 }} aria-label="Range">
            {RANGES.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
          </select>
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
    </AdminLayout>
  );
}
