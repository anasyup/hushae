import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { pkr } from '../../lib/format';
import styles from '../Overview.module.css';

/* ============================================================================
 * FINANCE OPERATIONS — the "do things with money" half of the Finance page.
 *
 * The rest of the page reports. This is where money is recorded and matched:
 *   - Expenses   rent, salaries, photoshoot — the costs that are not per order
 *   - Payouts    what gateways owe, and whether it actually landed
 *   - Reconciliation  expected vs received, with exceptions named
 *   - Ledger     every movement in one place, newest first
 *
 * Styled with the same Overview.module.css the page itself uses, so nothing
 * here introduces a fourth design language.
 * ========================================================================== */

const cx = (...n) => n.map((x) => styles[x]).filter(Boolean).join(' ');

const int = (v) => Number(v || 0).toLocaleString('en-US');
const money = (v) => pkr(v);
const fmtD = (s) => (s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

const CATS = [
  'marketing', 'seo', 'rent', 'salaries', 'utilities', 'software', 'packaging',
  'logistics', 'photoshoot', 'legal', 'bank', 'maintenance', 'other',
];
const PAID_VIA = ['cash', 'bank', 'card', 'jazzcash', 'easypaisa', 'other'];

/* Small field wrapper — the module has no form styles, so these stay inline
 * and deliberately plain rather than inventing a new look. */
const fld = { display: 'grid', gap: 4, minWidth: 0 };
const lbl = { fontSize: 10, fontWeight: 600, letterSpacing: '.3px', textTransform: 'uppercase', color: '#9ca3af' };
const inp = {
  height: 34, border: '1px solid #ececec', borderRadius: 8, padding: '0 10px',
  fontSize: 12.5, background: '#fff', color: '#111', width: '100%', boxSizing: 'border-box',
};

export default function FinanceOps({ days, onChanged }) {
  const { auth } = useApp();
  const [exp, setExp] = useState(null);
  const [pay, setPay] = useState(null);
  const [rec, setRec] = useState(null);
  const [led, setLed] = useState(null);
  const [tab, setTab] = useState('expenses');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  /* expense form */
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ date: '', category: 'marketing', label: '', amount: '', payee: '', paidVia: 'bank', reference: '' });
  const [formErr, setFormErr] = useState('');

  /* payout form */
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ gateway: '', periodFrom: '', periodTo: '', gross: '', fees: '', refundsDeducted: '' });

  /* reconcile prompt */
  const [recRow, setRecRow] = useState(null);
  const [recAmt, setRecAmt] = useState('');

  const load = useCallback(async () => {
    try {
      const [e, p, r, l] = await Promise.all([
        api(`/finance/expenses?days=${days}`, { token: auth?.token }),
        api('/finance/payouts', { token: auth?.token }),
        api(`/finance/reconciliation?days=${days}`, { token: auth?.token }),
        api(`/finance/ledger?days=${days}`, { token: auth?.token }),
      ]);
      setExp(e); setPay(p); setRec(r); setLed(l);
    } catch { /* the page shows its own empty states */ }
  }, [auth?.token, days]);

  useEffect(() => { load(); }, [load]);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(''), 2600); };

  const submitExpense = async () => {
    setFormErr('');
    const amount = Number(form.amount);
    if (!form.date) return setFormErr('Date zaroori hai — P&L expense ko usi period me file karta hai.');
    if (!Number.isFinite(amount) || amount <= 0) return setFormErr('Amount zero se zyada hona chahiye.');
    if (form.category === 'other' && !form.label.trim()) return setFormErr('"Other" ke liye label likhein, warna baad me koi samajh nahi aayega.');
    setBusy(true);
    try {
      await api('/finance/expenses', {
        method: 'POST',
        token: auth?.token,
        body: { ...form, amount, recurring: { isRecurring: false, note: '' } },
      });
      setFormOpen(false);
      setForm({ date: '', category: 'marketing', label: '', amount: '', payee: '', paidVia: 'bank', reference: '' });
      flash('Expense record ho gaya');
      await load();
      onChanged?.();
    } catch (e) {
      setFormErr(e.message || 'Save nahi ho saka');
    } finally { setBusy(false); }
  };

  const voidExpense = async (id) => {
    const reason = window.prompt('Void karne ki wajah? (record delete nahi hoga, sirf void mark hoga)');
    if (reason === null) return;
    setBusy(true);
    try {
      await api(`/finance/expenses/${id}`, { method: 'DELETE', token: auth?.token, body: { reason } });
      flash('Expense void kar diya gaya');
      await load();
      onChanged?.();
    } finally { setBusy(false); }
  };

  const submitPayout = async () => {
    setFormErr('');
    if (!payForm.gateway.trim()) return setFormErr('Gateway ka naam zaroori hai.');
    if (!payForm.periodFrom || !payForm.periodTo) return setFormErr('Period (from aur to) zaroori hai.');
    setBusy(true);
    try {
      await api('/finance/payouts', {
        method: 'POST', token: auth?.token,
        body: {
          gateway: payForm.gateway.trim(),
          periodFrom: payForm.periodFrom, periodTo: payForm.periodTo,
          gross: Number(payForm.gross) || 0,
          fees: Number(payForm.fees) || 0,
          refundsDeducted: Number(payForm.refundsDeducted) || 0,
        },
      });
      setPayOpen(false);
      setPayForm({ gateway: '', periodFrom: '', periodTo: '', gross: '', fees: '', refundsDeducted: '' });
      flash('Payout add ho gaya');
      await load();
      onChanged?.();
    } catch (e) { setFormErr(e.message || 'Save nahi ho saka'); }
    finally { setBusy(false); }
  };

  const submitReconcile = async () => {
    const received = Number(recAmt);
    if (!Number.isFinite(received) || received < 0) { setFormErr('Received amount sahi nahi hai.'); return; }
    setBusy(true);
    try {
      const r = await api(`/finance/payouts/${recRow.id}/reconcile`, {
        method: 'POST', token: auth?.token, body: { received },
      });
      setRecRow(null); setRecAmt('');
      flash(r.payout.status === 'short'
        ? `Settled, lekin ${money(Math.abs(r.variance))} kam aaya — exception mark ho gaya`
        : 'Payout reconcile ho gaya');
      await load();
      onChanged?.();
    } catch (e) { setFormErr(e.message || 'Reconcile nahi ho saka'); }
    finally { setBusy(false); }
  };

  const TABS = [
    { key: 'expenses', label: 'Expenses' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'recon', label: 'Reconciliation' },
    { key: 'ledger', label: 'Ledger' },
  ];

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={styles.card}>
      <div className={styles['card-h']}>
        <div className={styles['card-t']}>Money Operations</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {tab === 'expenses' && (
            <button className={styles['btn-black']} onClick={() => { setFormOpen(true); setFormErr(''); }}>
              + Record expense
            </button>
          )}
          {tab === 'payouts' && (
            <button className={styles['btn-black']} onClick={() => { setPayOpen(true); setFormErr(''); }}>
              + Add payout
            </button>
          )}
          <button className={styles['btn-sm']} onClick={load} disabled={busy}>Refresh</button>
        </div>
      </div>

      {msg && <div style={{ fontSize: 11.5, color: '#0e9f6e', marginBottom: 10 }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={styles['btn-sm']}
            onClick={() => setTab(t.key)}
            style={tab === t.key ? { background: '#111', color: '#fff', borderColor: '#111' } : undefined}
          >
            {t.label}
            {t.key === 'recon' && rec?.summary?.exceptions > 0 && (
              <span style={{ marginLeft: 6, background: '#dc2626', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: 9.5 }}>
                {rec.summary.exceptions}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ------------------------- EXPENSES ------------------------- */}
      {tab === 'expenses' && (
        <>
          <div className={styles.glance} style={{ marginBottom: 14 }}>
            <div className={styles['g-item']}>
              <b>{money(exp?.total || 0)}</b><span>Recorded this period</span>
            </div>
            <div className={styles['g-item']}>
              <b>{int(exp?.rows?.length || 0)}</b><span>Entries</span>
            </div>
            <div className={styles['g-item']}>
              <b>{exp?.byCategory?.[0]?.category || '—'}</b><span>Largest category</span>
            </div>
            <div className={styles['g-item']}>
              <b>{money(exp?.byCategory?.[0]?.amount || 0)}</b><span>Its total</span>
            </div>
          </div>

          {!exp?.rows?.length ? (
            <div className={styles['ovw-empty']}>
              Is period me koi expense record nahi hua. Rent, salary, photoshoot — jo bhi order se
              juda nahi, yahan likhein. Iske bina net profit sirf andaza rehta hai.
            </div>
          ) : (
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Date</th><th>Category</th><th>Label</th><th>Payee</th>
                  <th style={{ textAlign: 'right' }}>Amount</th><th />
                </tr>
              </thead>
              <tbody>
                {exp.rows.map((r) => (
                  <tr key={r._id}>
                    <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtD(r.date)}</td>
                    <td><span style={{ textTransform: 'capitalize' }}>{r.category}</span></td>
                    <td>{r.label || '—'}</td>
                    <td style={{ color: '#6b7280' }}>{r.payee || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>−{money(r.amount)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles['btn-sm']} onClick={() => voidExpense(r._id)}>Void</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ------------------------- PAYOUTS ------------------------- */}
      {tab === 'payouts' && (
        <>
          <div className={styles.glance} style={{ marginBottom: 14 }}>
            <div className={styles['g-item']}>
              <b>{money(pay?.outstanding || 0)}</b><span>Andar aana baaki</span>
            </div>
            <div className={styles['g-item']}>
              <b>{int(pay?.outstandingCount || 0)}</b><span>Pending payouts</span>
            </div>
            <div className={styles['g-item']}>
              <b style={pay?.shortfall > 0 ? { color: '#dc2626' } : undefined}>{money(pay?.shortfall || 0)}</b>
              <span>Short received</span>
            </div>
            <div className={styles['g-item']}>
              <b>{int(pay?.shortfallCount || 0)}</b><span>Shortfalls</span>
            </div>
          </div>

          {!pay?.rows?.length ? (
            <div className={styles['ovw-empty']}>
              Koi payout record nahi. Gateway settlement add karein taake pata chale kitna
              paisa andar aana baaki hai aur kab aaya.
            </div>
          ) : (
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Gateway</th><th>Period</th>
                  <th style={{ textAlign: 'right' }}>Expected</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th>Status</th><th />
                </tr>
              </thead>
              <tbody>
                {pay.rows.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontWeight: 600 }}>{p.gateway}</td>
                    <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtD(p.periodFrom)} – {fmtD(p.periodTo)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(p.expected)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {p.received === null || p.received === undefined
                        ? <span style={{ color: '#9ca3af' }}>—</span>
                        : money(p.received)}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                        background: p.status === 'settled' ? '#ecfdf5' : p.status === 'short' || p.status === 'failed' ? '#fef2f2' : '#fef3c7',
                        color: p.status === 'settled' ? '#065f46' : p.status === 'short' || p.status === 'failed' ? '#991b1b' : '#92400e',
                      }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className={styles['btn-sm']} onClick={() => { setRecRow({ id: p._id, expected: p.expected, gateway: p.gateway }); setRecAmt(p.expected || ''); setFormErr(''); }}>
                        Reconcile
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* --------------------- RECONCILIATION --------------------- */}
      {tab === 'recon' && (
        <>
          <div className={styles.glance} style={{ marginBottom: 14 }}>
            <div className={styles['g-item']}><b>{int(rec?.summary?.matched || 0)}</b><span>Matched</span></div>
            <div className={styles['g-item']}>
              <b style={rec?.summary?.exceptions > 0 ? { color: '#dc2626' } : undefined}>{int(rec?.summary?.exceptions || 0)}</b>
              <span>Exceptions</span>
            </div>
            <div className={styles['g-item']}>
              <b style={rec?.summary?.totalVariance < 0 ? { color: '#dc2626' } : undefined}>{money(rec?.summary?.totalVariance || 0)}</b>
              <span>Total variance</span>
            </div>
            <div className={styles['g-item']}>
              <b>{int(rec?.summary?.oldestExceptionDays || 0)}d</b><span>Oldest exception</span>
            </div>
          </div>

          {!rec?.rows?.length ? (
            <div className={styles['ovw-empty']}>Reconcile karne ke liye pehle payouts add karein.</div>
          ) : (
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Gateway</th><th>Period</th>
                  <th style={{ textAlign: 'right' }}>Expected</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Variance</th>
                  <th>Issue</th>
                </tr>
              </thead>
              <tbody>
                {rec.rows.map((r) => (
                  <tr key={r.id} style={r.needsAttention ? { background: '#fef9f9' } : undefined}>
                    <td style={{ fontWeight: 600 }}>{r.gateway}</td>
                    <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtD(r.periodFrom)} – {fmtD(r.periodTo)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{money(r.expected)}</td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {r.received === null ? <span style={{ color: '#9ca3af' }}>not recorded</span> : money(r.received)}
                    </td>
                    <td style={{
                      textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
                      color: (r.variance || 0) < -1 ? '#dc2626' : undefined,
                    }}
                    >
                      {r.variance === null ? '—' : `${r.variance < 0 ? '−' : ''}${money(Math.abs(r.variance))}`}
                    </td>
                    <td style={{ fontSize: 11, color: r.needsAttention ? '#991b1b' : '#9ca3af' }}>
                      {r.reason || 'matched'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* ------------------------- LEDGER ------------------------- */}
      {tab === 'ledger' && (
        <>
          <div className={styles.glance} style={{ marginBottom: 14 }}>
            <div className={styles['g-item']}><b>{money(led?.totals?.in || 0)}</b><span>In</span></div>
            <div className={styles['g-item']}><b>{money(led?.totals?.out || 0)}</b><span>Out</span></div>
            <div className={styles['g-item']}>
              <b style={(led?.totals?.net || 0) < 0 ? { color: '#dc2626' } : undefined}>{money(led?.totals?.net || 0)}</b>
              <span>Net</span>
            </div>
            <div className={styles['g-item']}><b>{int(led?.entries?.length || 0)}</b><span>Movements</span></div>
          </div>

          {!led?.entries?.length ? (
            <div className={styles['ovw-empty']}>Is period me koi movement record nahi hui.</div>
          ) : (
            <table className={styles.tbl}>
              <thead>
                <tr><th>Date</th><th>Type</th><th>Detail</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
              </thead>
              <tbody>
                {led.entries.map((e) => (
                  <tr key={`${e.kind}-${e.id}`}>
                    <td style={{ whiteSpace: 'nowrap', color: '#6b7280' }}>{fmtD(e.at)}</td>
                    <td><span style={{ textTransform: 'capitalize' }}>{e.kind}</span></td>
                    <td>
                      {e.label}
                      {e.detail && <span style={{ color: '#9ca3af' }}> · {e.detail}</span>}
                    </td>
                    <td style={{
                      textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                      color: e.amount < 0 ? '#dc2626' : '#0e9f6e',
                    }}
                    >
                      {e.amount < 0 ? '−' : '+'}{money(Math.abs(e.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 10, lineHeight: 1.5 }}>
            Order payments yahan duplicate nahi kiye gaye — wo Transactions page pe hain.
            Yahan expenses aur settlements hain, taake "paisa kahan gaya" ka ek hi jawab ho.
          </p>
        </>
      )}

      {/* ---------------------- expense modal ---------------------- */}
      {formOpen && createPortal(
        <div className={cx('modal', 'show')} onClick={() => setFormOpen(false)}>
          <div className={styles['modal-box']} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Record an expense</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={fld}>
                  <span style={lbl}>Date</span>
                  <input type="date" style={inp} value={form.date || today} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
                <label style={fld}>
                  <span style={lbl}>Amount (PKR)</span>
                  <input type="number" min="0" style={inp} value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </label>
              </div>
              <label style={fld}>
                <span style={lbl}>Category</span>
                <select style={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label style={fld}>
                <span style={lbl}>Label {form.category === 'other' && <span style={{ color: '#dc2626' }}>(required)</span>}</span>
                <input style={inp} value={form.label} placeholder="e.g. Warehouse rent August" onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={fld}>
                  <span style={lbl}>Payee</span>
                  <input style={inp} value={form.payee} placeholder="Vendor / person" onChange={(e) => setForm({ ...form, payee: e.target.value })} />
                </label>
                <label style={fld}>
                  <span style={lbl}>Paid via</span>
                  <select style={inp} value={form.paidVia} onChange={(e) => setForm({ ...form, paidVia: e.target.value })}>
                    {PAID_VIA.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              </div>
              <label style={fld}>
                <span style={lbl}>Reference (receipt / invoice no.)</span>
                <input style={inp} value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
              </label>
              {formErr && <div style={{ fontSize: 11.5, color: '#dc2626' }}>{formErr}</div>}
            </div>
            <div className={styles['modal-actions']} style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className={styles['btn-sm']} onClick={() => setFormOpen(false)}>Cancel</button>
              <button className={styles['btn-black']} onClick={submitExpense} disabled={busy}>Save expense</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ---------------------- payout modal ---------------------- */}
      {payOpen && createPortal(
        <div className={cx('modal', 'show')} onClick={() => setPayOpen(false)}>
          <div className={styles['modal-box']} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Add a gateway payout</div>
            <div style={{ display: 'grid', gap: 10 }}>
              <label style={fld}>
                <span style={lbl}>Gateway</span>
                <input style={inp} value={payForm.gateway} placeholder="JazzCash / Safepay / EasyPaisa" onChange={(e) => setPayForm({ ...payForm, gateway: e.target.value })} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={fld}>
                  <span style={lbl}>Period from</span>
                  <input type="date" style={inp} value={payForm.periodFrom} onChange={(e) => setPayForm({ ...payForm, periodFrom: e.target.value })} />
                </label>
                <label style={fld}>
                  <span style={lbl}>Period to</span>
                  <input type="date" style={inp} value={payForm.periodTo} onChange={(e) => setPayForm({ ...payForm, periodTo: e.target.value })} />
                </label>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <label style={fld}>
                  <span style={lbl}>Gross</span>
                  <input type="number" min="0" style={inp} value={payForm.gross} onChange={(e) => setPayForm({ ...payForm, gross: e.target.value })} />
                </label>
                <label style={fld}>
                  <span style={lbl}>Fees</span>
                  <input type="number" min="0" style={inp} value={payForm.fees} onChange={(e) => setPayForm({ ...payForm, fees: e.target.value })} />
                </label>
                <label style={fld}>
                  <span style={lbl}>Refunds</span>
                  <input type="number" min="0" style={inp} value={payForm.refundsDeducted} onChange={(e) => setPayForm({ ...payForm, refundsDeducted: e.target.value })} />
                </label>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>
                Expected = gross − fees − refunds = <b>{money(Math.max(0, (Number(payForm.gross) || 0) - (Number(payForm.fees) || 0) - (Number(payForm.refundsDeducted) || 0)))}</b>
              </div>
              {formErr && <div style={{ fontSize: 11.5, color: '#dc2626' }}>{formErr}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className={styles['btn-sm']} onClick={() => setPayOpen(false)}>Cancel</button>
              <button className={styles['btn-black']} onClick={submitPayout} disabled={busy}>Add payout</button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* --------------------- reconcile modal --------------------- */}
      {recRow && createPortal(
        <div className={cx('modal', 'show')} onClick={() => setRecRow(null)}>
          <div className={styles['modal-box']} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Reconcile {recRow.gateway}</div>
            <div style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 14 }}>
              Expected: <b>{money(recRow.expected)}</b> — bank me asal me kitna aaya?
            </div>
            <label style={fld}>
              <span style={lbl}>Received (PKR)</span>
              <input type="number" min="0" style={inp} value={recAmt} onChange={(e) => setRecAmt(e.target.value)} autoFocus />
            </label>
            {formErr && <div style={{ fontSize: 11.5, color: '#dc2626', marginTop: 8 }}>{formErr}</div>}
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 10, lineHeight: 1.5 }}>
              Kam aaya to payout automatically <b>short</b> mark ho jayega aur reconciliation me
              exception ke tor pe dikhega. Kuch na aaya to <b>failed</b>.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className={styles['btn-sm']} onClick={() => setRecRow(null)}>Cancel</button>
              <button className={styles['btn-black']} onClick={submitReconcile} disabled={busy}>Save</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
