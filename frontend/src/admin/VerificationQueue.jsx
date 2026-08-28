import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, Ban, CheckCircle2, ClipboardCheck, Clock, Copy,
  MessageCircle, Phone, PhoneMissed, RefreshCw, Wallet, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import ReliabilityBadge from './ReliabilityBadge';
import { CANCEL_REASONS } from './orders/orderConstants';
import styles from './VerificationQueue.module.css';

/* ============================================================================
 * VERIFICATION QUEUE — ATELIER rebuild.
 *
 * Orders that have been awaiting payment verification for 24h+ (oldest first).
 * One eye-scan per row: identity, contact, value, age, no-answer history —
 * then a one-click action: Verified / No answer / Cancel.
 *
 *   - stat cards (queue size, value, oldest wait, flags)
 *   - keyboard flow: V verify · N no-answer · C cancel (applies to the
 *     first row, which is highlighted)
 *   - inline cancel row with reason (+ free-text when "Other")
 *   - light + dark-admin parity, reduced-motion respected
 * ========================================================================== */

const cx = (...names) => names.map((n) => styles[n]).filter(Boolean).join(' ');

const waDigits = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) return `92${d.slice(1)}`;
  if (d.startsWith('92')) return d;
  return `92${d}`;
};

const ageHrs = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));

const ageLabel = (iso) => {
  const h = ageHrs(iso);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h old`;
  return `${Math.floor(h / 24)}d ${h % 24}h old`;
};

const initials = (name) => {
  const src = String(name || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function VerificationQueue() {
  const { auth, toast, settings } = useApp();
  const [orders, setOrders] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelFor, setCancelFor] = useState(null);
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const load = useCallback(() => {
    setRefreshing(true);
    api('/orders/manage/verification-queue', { token: auth.token })
      .then((d) => setOrders(d.orders))
      .catch((e) => { if (e?.status === 401) return; toast('Could not load the queue'); })
      .finally(() => setRefreshing(false));
  }, [auth.token]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const storePhone = settings?.contactPhone || settings?.integrations?.whatsapp?.number || '';

  const act = async (id, action, extra = {}) => {
    setBusy(true);
    try {
      await api(`/orders/manage/${id}/verify-action`, { method: 'PATCH', token: auth.token, body: { action, ...extra } });
      toast(action === 'verified' ? 'Marked verified ✓' : action === 'no-answer' ? 'No answer logged' : 'Order cancelled');
      setOrders((list) => (list || []).filter((o) => o._id !== id));
    } catch (e) { toast(e.message || 'Action failed'); }
    setBusy(false);
    setCancelFor(null); setReason(''); setOtherReason('');
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value || '');
      toast('Phone copied');
    } catch { toast('Copy failed — select manually'); }
  };

  const openCancel = (id) => { setCancelFor(id); setReason(''); setOtherReason(''); };
  const dismissCancel = () => { setCancelFor(null); setReason(''); setOtherReason(''); };

  /* Keyboard flow — V verify / N no-answer / C cancel on the next row. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      const first = orders?.[0];
      if (!first || busy) return;
      if (k === 'v') act(first._id, 'verified');
      else if (k === 'n') act(first._id, 'no-answer');
      else if (k === 'c') openCancel(first._id);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [orders, busy]); // eslint-disable-line

  /* Queue aggregates for the stat cards. */
  const stats = useMemo(() => {
    const list = orders || [];
    const value = list.reduce((s, o) => s + Number(o.total || 0), 0);
    const flagged = list.filter((o) => (o.noAnswer?.attempts || 0) >= 3).length;
    const oldest = list[0] || null;
    return { count: list.length, value, flagged, oldest };
  }, [orders]);

  const first = orders?.[0];

  return (
    <AdminLayout title="Verification queue">
      <div className={styles.vqw}>
        {/* ── Page head ─────────────────────────────────────────── */}
        <div className={styles.head}>
          <div className={styles['head-left']}>
            <p className={styles.eyebrow}>Order desk · Payment verification</p>
            <h1 className={styles.title}>Verification queue</h1>
            <p className={styles.sub}>
              {orders === null
                ? 'Loading…'
                : `${stats.count} order${stats.count === 1 ? '' : 's'} awaiting payment verification for 24h+ — oldest first.`}
            </p>
          </div>
          <div className={styles['head-right']}>
            <span className={styles.hints}><b>V</b> verify · <b>N</b> no-answer · <b>C</b> cancel</span>
            <button type="button" className={cx('icon-btn', refreshing && 'spin')} onClick={load} aria-label="Refresh queue" title="Refresh" disabled={refreshing}>
              <RefreshCw size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Stats ─────────────────────────────────────────────── */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles['stat-head']}><ClipboardCheck size={14} strokeWidth={1.8} /> In queue</div>
            <div className={styles['stat-val']}>{stats.count}</div>
            <div className={styles['stat-sub']}>oldest first · 24h+ cutoff</div>
          </div>
          <div className={styles.stat}>
            <div className={styles['stat-head']}><Wallet size={14} strokeWidth={1.8} /> Queue value</div>
            <div className={styles['stat-val']}>{pkr(stats.value)}</div>
            <div className={styles['stat-sub']}>{stats.count === 0 ? 'no orders' : `${stats.count} order${stats.count === 1 ? '' : 's'} awaiting`}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles['stat-head']}><Clock size={14} strokeWidth={1.8} /> Oldest waiting</div>
            <div className={styles['stat-val']}>{stats.oldest ? ageLabel(stats.oldest.createdAt) : '—'}</div>
            <div className={styles['stat-sub']}>
              {stats.oldest ? `since ${fmtDateTime(stats.oldest.createdAt)}` : 'queue clear'}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles['stat-head']}><AlertTriangle size={14} strokeWidth={1.8} /> No-answer flags</div>
            <div className={styles['stat-val']}>{stats.flagged}</div>
            <div className={styles['stat-sub']}>
              3+ attempts — review
              <span className={cx('stat-chip', stats.flagged > 0 ? 'red' : 'green')}>{stats.flagged > 0 ? 'Action needed' : 'All clear'}</span>
            </div>
          </div>
        </div>

        {/* ── Queue ─────────────────────────────────────────────── */}
        <p className={styles['queue-label']}>
          Queue
          <span className={styles.count}>{stats.count}</span>
        </p>

        {orders === null ? (
          <div className={styles['vq-list']}>
            {[0, 1, 2].map((i) => <div key={i} className={cx('skel-row', 'skel')} style={{ animationDelay: `${i * 0.12}s` }} />)}
          </div>
        ) : orders.length === 0 ? (
          <div className={styles['vq-empty']}>
            <span className={styles['vq-empty-ico']}><ClipboardCheck size={22} strokeWidth={1.6} /></span>
            <b>All caught up</b>
            <p>No orders waiting for payment verification.</p>
          </div>
        ) : (
          <div className={styles['vq-list']}>
            {orders.map((o, idx) => {
              const phone = waDigits(o.customerInfo?.phone);
              const wa = phone
                ? `https://wa.me/${phone}?text=${encodeURIComponent(
                    `Hi ${o.customerInfo?.name || 'there'}, this is Hushae. Confirming your order ${o.orderNumber} for PKR ${Number(o.total || 0).toLocaleString('en-PK')}. Please reply YES to confirm or call us at ${storePhone} if you have questions.`
                  )}`
                : '';
              const flagged = (o.noAnswer?.attempts || 0) >= 3;
              const attempts = o.noAnswer?.attempts || 0;
              const cancelling = cancelFor === o._id;
              return (
                <div key={o._id} className={cx('vq-row', idx === 0 && 'first', cancelling && 'open')}>
                  <div className={styles['vq-main']}>
                    <span className={styles['vq-idx']}>{String(idx + 1).padStart(2, '0')}</span>
                    <span className={styles.avatar}>{initials(o.customerInfo?.name)}</span>

                    <div className={styles['vq-id']}>
                      <div className={styles['vq-name-row']}>
                        <b className={styles['vq-name']}>{o.customerInfo?.name || 'Customer'}</b>
                        <ReliabilityBadge reliability={o.reliability || null} compact />
                        <Link to={`/admin/orders/${o._id}`} className={styles['vq-orderno']} title="Open order">
                          {o.orderNumber} <ArrowUpRight size={10} strokeWidth={2} />
                        </Link>
                        <span className={styles['pay-chip']}>{o.paymentMethod || 'COD'}</span>
                      </div>
                      <div className={styles['vq-meta']}>
                        <a href={`tel:${o.customerInfo?.phone}`} className={styles['meta-link']}>
                          <Phone size={10.5} strokeWidth={2} /> {o.customerInfo?.phone}
                        </a>
                        {wa && (
                          <a href={wa} target="_blank" rel="noreferrer" className={cx('meta-link', 'wa')}>
                            <MessageCircle size={10.5} strokeWidth={2} /> WhatsApp
                          </a>
                        )}
                        {o.customerInfo?.phone && (
                          <button type="button" className={styles['meta-link']} onClick={() => copy(o.customerInfo.phone)} aria-label="Copy phone">
                            <Copy size={10.5} strokeWidth={2} /> Copy
                          </button>
                        )}
                        <span className={styles['meta-sep']}>·</span>
                        <span>{o.customerInfo?.city || '—'}</span>
                        <span className={cx('age-chip', ageHrs(o.createdAt) >= 72 && 'cold')}>{ageLabel(o.createdAt)}</span>
                        <span className={styles['vq-amt']}>{pkr(o.total)}</span>
                      </div>
                    </div>

                    <div className={styles['vq-side']}>
                      {attempts > 0 && (
                        <span className={cx('na-pill', flagged && 'flag')}>
                          <PhoneMissed size={10} strokeWidth={2} /> {attempts}× no answer{flagged && <b> · FLAGGED</b>}
                        </span>
                      )}
                      <div className={styles['vq-actions']}>
                        <button type="button" className={styles['btn-solid']} disabled={busy} onClick={() => act(o._id, 'verified')}>
                          <CheckCircle2 size={11.5} strokeWidth={2.2} /> Verified
                        </button>
                        <button type="button" className={styles['btn-ghost']} disabled={busy} onClick={() => act(o._id, 'no-answer')}>
                          <PhoneMissed size={11.5} strokeWidth={2} /> No answer
                        </button>
                        <button type="button" className={cx('btn-ghost', 'danger')} disabled={busy} onClick={() => openCancel(o._id)}>
                          <Ban size={11.5} strokeWidth={2} /> Cancel
                        </button>
                      </div>
                    </div>
                  </div>

                  {cancelling && (
                    <div className={styles['vq-cancel']}>
                      <span className={styles['vq-cancel-label']}>Cancel reason</span>
                      <select value={reason} onChange={(e) => setReason(e.target.value)} className={styles.ctl} aria-label="Cancel reason">
                        <option value="">Select reason…</option>
                        {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {reason === 'Other' && (
                        <input
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                          placeholder="Describe…"
                          className={styles.ctl}
                          aria-label="Describe reason"
                        />
                      )}
                      <button
                        type="button"
                        className={cx('btn-solid', 'danger')}
                        disabled={!reason || busy || (reason === 'Other' && !otherReason.trim())}
                        onClick={() => act(o._id, 'cancel', { reason: reason === 'Other' ? otherReason.trim() : reason })}
                      >
                        <Ban size={11.5} strokeWidth={2.2} /> Confirm cancel
                      </button>
                      <button type="button" className={styles['btn-ghost']} onClick={dismissCancel} disabled={busy}>
                        <X size={11.5} strokeWidth={2} /> Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className={styles['vq-foot']}>
          <p>
            Orders appear here once they have been awaiting payment verification for more than 24 hours.
            Three or more no-answer attempts flag the order for review. The first row is next up —
            <b> V</b> to verify, <b>N</b> to log a no-answer, <b>C</b> to cancel.
          </p>
          <Link to="/admin/orders?payment=pending" className={styles['vq-link']}>
            All pending orders <ArrowUpRight size={11} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
