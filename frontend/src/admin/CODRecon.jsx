import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, RefreshCw, Truck, Wallet } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import './products-atelier.css';

/* ============================================================================
 * COD RECONCILIATION — ATELIER family (same level as the other Orders pages).
 * The daily cash question for a COD business: "kitna aana tha, kitna aa
 * gaya?" One table answers it. "Mark collected" uses the existing bulk
 * mark-paid pipeline, so reconciliation and payment state can never drift.
 * ========================================================================== */

export default function CODRecon() {
  const { auth, toast } = useApp();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const d = await api('/orders/manage/cod-recon', { token: auth?.token });
      setData(d);
    } catch {
      setData({ rows: [], totals: { count: 0, expected: 0, collected: 0 } });
    } finally {
      setRefreshing(false);
    }
  }, [auth?.token]);

  useEffect(() => { load(); }, [load]);

  const markCollected = async (row) => {
    if (!row.outstandingIds?.length) return;
    setBusy(row.courier);
    try {
      const res = await api('/orders/manage/bulk', {
        method: 'POST', token: auth.token,
        body: { action: 'mark-paid', ids: row.outstandingIds },
      });
      toast?.(res.failedCount ? `${res.okCount} collected · ${res.failedCount} failed` : `${res.okCount} orders marked collected`);
      await load();
    } catch (e) {
      toast?.(e.message || 'Could not mark collected');
    }
    setBusy(null);
  };

  const t = data?.totals || { count: 0, expected: 0, collected: 0 };
  const outstanding = Math.max(0, t.expected - t.collected);

  return (
    <AdminLayout title="COD Reconciliation">
      <div className="pa-outer">
        <div className="pa-wrap">

          {/* ── head ── */}
          <div className="pa-head">
            <div>
              <h1>COD reconciliation</h1>
              <p>Shipped-to-Delivered COD orders · expected vs collected, per courier.</p>
            </div>
            <div className="pa-head-actions">
              <button type="button" onClick={load} className="pa-btn-sm" disabled={refreshing} aria-label="Refresh">
                <RefreshCw size={12} strokeWidth={2} className={refreshing ? 'pa-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* ── stats ── */}
          <div className="pa-stats pa-stats-3">
            <div className="pa-stat">
              <p className="pa-stat-label">Expected cash</p>
              <p className="pa-stat-val" style={{ fontSize: 22 }}>{data ? pkr(t.expected) : '—'}</p>
              <span className="pa-stat-note pa-note-blue">{t.count} COD order{t.count === 1 ? '' : 's'}</span>
            </div>
            <div className="pa-stat">
              <p className="pa-stat-label">Collected</p>
              <p className="pa-stat-val" style={{ fontSize: 22 }}>{data ? pkr(t.collected) : '—'}</p>
              <span className="pa-stat-note pa-note-green">Marked paid</span>
            </div>
            <div className="pa-stat">
              <p className="pa-stat-label">Outstanding</p>
              <p className="pa-stat-val" style={{ fontSize: 22, color: outstanding > 0 ? 'var(--pa-red-text)' : 'var(--pa-text)' }}>
                {data ? pkr(outstanding) : '—'}
              </p>
              <span className={`pa-stat-note ${outstanding > 0 ? 'pa-note-red' : 'pa-note-green'}`}>
                {outstanding > 0 ? 'Courier se lena hai' : 'All settled'}
              </span>
            </div>
          </div>

          {/* ── states ── */}
          {data === null && (
            <div className="pa-card pa-skeleton">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="pa-sk-row" style={{ height: 52, animationDelay: `${i * 0.1}s` }} />)}
            </div>
          )}

          {data !== null && data.rows.length === 0 && (
            <div className="pa-card pa-state">
              <div className="pa-state-icon"><Truck size={18} strokeWidth={1.8} /></div>
              <h3>No COD cash in transit</h3>
              <p>Shipped COD orders with a courier will appear here for reconciliation. Abhi sab settled hai.</p>
            </div>
          )}

          {/* ── table ── */}
          {data !== null && data.rows.length > 0 && (
            <div className="pa-card pa-tbl-card">
              <div className="pa-tbl-scroll">
                <table className="pa-tbl">
                  <thead>
                    <tr>
                      <th style={{ width: '26%' }}>Courier</th>
                      <th style={{ width: '10%' }}>Orders</th>
                      <th style={{ width: '18%' }}>Expected</th>
                      <th style={{ width: '18%' }}>Collected</th>
                      <th style={{ width: '18%' }}>Outstanding</th>
                      <th className="pa-th-act" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r, i) => (
                      <tr key={r.courier} style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                        <td style={{ minWidth: 0 }}>
                          <span className="pa-name" style={{ cursor: 'default' }}>{r.courier}</span>
                          <span className="pa-sub">{r.count} order{r.count === 1 ? '' : 's'} in field</span>
                        </td>
                        <td><span className="pa-cell-muted" style={{ fontVariantNumeric: 'tabular-nums' }}>{r.count}</span></td>
                        <td><span className="pa-price">{pkr(r.expected)}</span></td>
                        <td>
                          <span className="pa-badge pa-b-green"><span className="pa-dot" aria-hidden />{pkr(r.collected)}</span>
                        </td>
                        <td>
                          {r.outstanding > 0
                            ? <span className="pa-badge pa-b-red"><span className="pa-dot" aria-hidden />{pkr(r.outstanding)}</span>
                            : <span className="pa-badge pa-b-gray"><span className="pa-dot" aria-hidden />Settled</span>}
                        </td>
                        <td>
                          <div className="pa-row-actions">
                            {r.outstanding > 0 && (
                              <button
                                type="button"
                                className="pa-btn-black"
                                style={{ height: 26, fontSize: 10, padding: '0 10px' }}
                                disabled={busy === r.courier}
                                onClick={() => markCollected(r)}
                                title="Mark outstanding COD as collected"
                              >
                                {busy === r.courier ? '…' : (<><Banknote size={11} strokeWidth={2.2} /> Mark collected</>)}
                              </button>
                            )}
                            {r.outstanding <= 0 && (
                              <span className="pa-badge pa-b-green"><CheckCircle2 size={10} strokeWidth={2.4} /> Done</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── foot note ── */}
          <p className="pa-field-hint" style={{ marginTop: 12 }}>
            “Mark collected” orders ko paid mark karta hai usi bulk pipeline se — reconciliation aur payment state kabhi drift nahi hoti.
          </p>

        </div>
      </div>
    </AdminLayout>
  );
}
