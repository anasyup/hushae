import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Eye, Mail, MessageCircle, RefreshCcw, Search, Send, ShoppingBag, Trash2, XCircle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr, ago } from '../lib/format';
import AdminLayout from './AdminLayout';
import styles from './AbandonedCarts.module.css';

/* ============================================================================
 * ABANDONED CARTS — ATELIER design language (Overview/Reports family).
 * Light + dark parity. Fully functional: status tabs, live stats, search,
 * recovery email, WhatsApp, bulk send, delete, expandable detail.
 * ========================================================================== */

const cx = (...names) => names.map((n) => styles[n]).filter(Boolean).join(' ');

/* Count-up for stat values — same feel as the Overview dashboard. */
function useCountUp(target) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === null || target === undefined) return undefined;
    const dur = 750;
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function StatCard({ icon: Icon, label, value, sub, chip, chipTone, delay }) {
  return (
    <div className={styles.stat} style={{ animationDelay: `${delay}s` }}>
      <div className={styles['stat-head']}>
        <Icon size={14} strokeWidth={1.8} />
        {label}
      </div>
      <div className={styles['stat-val']}>{value}</div>
      <div className={styles['stat-sub']}>
        {sub}
        {chip && <span className={cx('stat-chip', chipTone === 'amber' ? 'amber' : chipTone === 'red' ? 'red' : 'green')}>{chip}</span>}
      </div>
    </div>
  );
}

export default function AbandonedCarts() {
  const { auth, toast } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState('open');          // open | recovered | all
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async (silent) => {
    if (!silent) setRefreshing(true);
    try {
      const d = await api(`/abandoned-cart/admin?status=${status}`, { token: auth.token });
      setData(d);
    } catch {
      if (!silent) toast('Could not load carts');
      setData((prev) => prev || { carts: [], stats: {} });
    }
    if (!silent) setRefreshing(false);
  }, [status]); // eslint-disable-line

  useEffect(() => { load(false); }, [status]); // eslint-disable-line

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(true); } finally { setTimeout(() => setRefreshing(false), 550); }
  };

  const sendEmail = async (id) => {
    setBusy(`email-${id}`);
    try {
      const r = await api(`/abandoned-cart/admin/${id}/send`, { method: 'POST', token: auth.token });
      toast(r.mail?.ok ? 'Recovery email sent!' : (r.mail?.reason || 'Skipped'));
      await load(true);
    } catch (ex) { toast(ex.message || 'Failed to send email'); }
    setBusy('');
  };

  const sendWhatsApp = (phone) => {
    if (!phone) { toast('No phone number available'); return; }
    const clean = phone.replace(/\D/g, '').replace(/^0/, '92');
    const msg = encodeURIComponent('Hi! We noticed you left some items in your cart at HUSHAE. Would you like to complete your order?');
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const bulkSend = async () => {
    if (!window.confirm('Send recovery emails to ALL open carts older than 24 hours?')) return;
    setBusy('bulk');
    try {
      const r = await api('/abandoned-cart/admin/auto-send', { method: 'POST', token: auth.token, body: { hours: 24 } });
      toast(`${r.sent} sent · ${r.failed} failed`);
      await load(true);
    } catch (ex) { toast(ex.message || 'Failed'); }
    setBusy('');
  };

  const del = async (id) => {
    if (!window.confirm('Delete this cart record?')) return;
    try { await api(`/abandoned-cart/admin/${id}`, { method: 'DELETE', token: auth.token }); await load(true); }
    catch (ex) { toast(ex.message); }
  };

  const stats = useMemo(() => {
    const s = data?.stats || {};
    const rate = s.openCount + (s.recoveredCount || 0) > 0
      ? (((s.recoveredCount || 0) / (s.openCount + (s.recoveredCount || 0))) * 100).toFixed(1)
      : '0.0';
    return {
      openCount: s.openCount ?? 0,
      openValue: s.openValue ?? 0,
      recoveredCount: s.recoveredCount ?? 0,
      recoveredValue: s.recoveredValue ?? 0,
      totalCount: (data?.total ?? 0) || ((s.openCount ?? 0) + (s.recoveredCount ?? 0)),
      rate,
    };
  }, [data]);

  const carts = data?.carts || [];
  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return carts;
    return carts.filter((c) =>
      (c.name || '').toLowerCase().includes(qq) ||
      (c.email || '').toLowerCase().includes(qq) ||
      (c.phone || '').includes(qq),
    );
  }, [carts, q]);

  const oCount = useCountUp(stats.openCount);
  const rCount = useCountUp(stats.recoveredCount);
  const rvCount = useCountUp(stats.recoveredValue);
  const ovCount = useCountUp(stats.openValue);

  const TABS = [
    { key: 'open', label: 'Open', count: stats.openCount },
    { key: 'recovered', label: 'Recovered', count: stats.recoveredCount },
    { key: 'all', label: 'All', count: stats.totalCount },
  ];

  const badgeFor = (c) => {
    if (c.recoveredOrderId) return { cls: 'recovered', label: 'Recovered' };
    if (c.recoveryEmailSentAt) return { cls: 'emailed', label: 'Emailed' };
    return { cls: 'open', label: 'Open' };
  };

  const loading = !data;

  return (
    <AdminLayout title="Abandoned carts">
      <div className={styles.acw}>
        {/* ── Head ─────────────────────────────────────────────── */}
        <div className={styles.head}>
          <div className={styles['head-left']}>
            <p className={styles.eyebrow}>Recovery</p>
            <h1 className={styles.title}>Abandoned carts</h1>
            <p className={styles.sub}>
              Customers who started checkout but didn't finish. Reach them by email or WhatsApp —
              the earlier the message, the higher the recovery.
            </p>
          </div>
          <p className={styles['head-note']}>
            <span className={styles['live-dot']} />
            Live store data · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* ── Live stats ───────────────────────────────────────── */}
        <div className={styles.stats}>
          <StatCard icon={ShoppingBag} label="Open carts" value={loading ? <span className={cx('skeleton')} style={{ display: 'inline-block', width: 48, height: 15 }} /> : oCount.toLocaleString('en-US')}
            sub={loading ? '' : `Worth ${pkr(stats.openValue)}`} delay={0.04} />
          <StatCard icon={Mail} label="Recovery rate" value={loading ? <span className={cx('skeleton')} style={{ display: 'inline-block', width: 48, height: 15 }} /> : `${stats.rate}%`}
            sub={loading ? '' : `${stats.recoveredCount} converted`} chip={loading ? '' : stats.rate >= 10 ? 'Healthy' : 'Focus'} chipTone={stats.rate >= 10 ? 'green' : 'amber'} delay={0.09} />
          <StatCard icon={ShoppingBag} label="Recovered value" value={loading ? <span className={cx('skeleton')} style={{ display: 'inline-block', width: 64, height: 15 }} /> : pkr(rvCount)}
            sub={loading ? '' : `${rCount} orders recovered`} delay={0.14} />
          <StatCard icon={XCircle} label="At risk" value={loading ? <span className={cx('skeleton')} style={{ display: 'inline-block', width: 48, height: 15 }} /> : pkr(ovCount)}
            sub="Open value not yet recovered" chip={loading ? '' : stats.openCount > 0 ? 'Action' : ''} chipTone="red" delay={0.19} />
        </div>

        {/* ── Toolbar ──────────────────────────────────────────── */}
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Cart status">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={status === t.key}
                className={cx('tab', status === t.key && 'active')}
                onClick={() => { setStatus(t.key); setQ(''); setExpanded(null); }}
              >
                {t.label}
                <span className={styles.cnt}>{t.count}</span>
              </button>
            ))}
          </div>
          <div className={styles['tool-right']}>
            <div className={styles.search}>
              <Search size={13} strokeWidth={2} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, phone…"
                aria-label="Search carts"
              />
            </div>
            <button type="button" className={cx('icon-btn', refreshing && 'spin')} onClick={onRefresh} aria-label="Refresh carts" title="Refresh">
              <RefreshCcw size={14} strokeWidth={1.8} />
            </button>
            {status === 'open' && carts.length > 0 && (
              <button type="button" className={styles['btn-dark']} onClick={bulkSend} disabled={busy === 'bulk'}>
                <Send size={12} strokeWidth={2} />
                {busy === 'bulk' ? 'Sending…' : 'Bulk email (24h+)'}
              </button>
            )}
          </div>
        </div>

        {/* ── List ─────────────────────────────────────────────── */}
        <div className={styles.list}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.row}>
                <div className={styles['row-main']}>
                  <div className={cx('skeleton')} style={{ width: 38, height: 38, borderRadius: 10 }} />
                  <div><div className={cx('skeleton')} style={{ width: 160, height: 12, marginBottom: 8 }} /><div className={cx('skeleton')} style={{ width: 220, height: 10 }} /></div>
                  <div className={cx('skeleton')} style={{ width: 60, height: 12 }} />
                  <div className={cx('skeleton')} style={{ width: 44, height: 12 }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles['empty-ico']}><ShoppingBag size={20} strokeWidth={1.5} /></div>
              <b>{q ? 'No carts match your search' : status === 'open' ? 'No open carts' : status === 'recovered' ? 'No recovered carts yet' : 'No cart data'}</b>
              <p>
                {q
                  ? 'Try a different name, email or phone number.'
                  : status === 'open'
                    ? 'Customers who leave items at checkout appear here the moment they enter their email.'
                    : status === 'recovered'
                      ? 'Recovered carts are where the customer came back and placed an order.'
                      : 'Cart tracking activates when a customer enters their email at checkout.'}
              </p>
              {q && <button type="button" className={styles.btn} onClick={() => setQ('')}>Clear search</button>}
            </div>
          ) : (
            filtered.map((c) => {
              const isOpen = expanded === c._id;
              const badge = badgeFor(c);
              const items = c.items || [];
              return (
                <article key={c._id} className={styles.row}>
                  <div className={styles['row-main']}>
                    <span className={styles.avatar}>{(c.name || c.email || '?').slice(0, 1).toUpperCase()}</span>

                    <div className={styles['row-body']}>
                      <p className={styles['row-name']}>
                        <button
                          type="button"
                          className={styles['row-link']}
                          onClick={() => navigate(`/admin/abandoned-carts/${c._id}`)}
                          title="Open cart detail"
                        >
                          {c.name || 'Anonymous'}
                        </button>
                        <span className={cx('badge', badge.cls)}>{badge.label}</span>
                      </p>
                      <p className={styles['row-contact']}>
                        {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : <span>No email</span>}
                        {c.phone && <span>·</span>}
                        {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>}
                      </p>
                      <div className={styles.thumbs}>
                        {items.slice(0, 4).map((it, i) => (
                          it.image
                            ? <img key={i} src={it.image} alt="" className={styles.thumb} loading="lazy" />
                            : <span key={i} className={styles['thumb-more']}>{it.name?.slice(0, 1) || '·'}</span>
                        ))}
                        {items.length > 4 && <span className={styles['thumb-more']}>+{items.length - 4}</span>}
                        <span className={styles['row-meta']}>
                          {c.itemCount} item{c.itemCount === 1 ? '' : 's'} · last seen {c.lastSeenAt ? ago(c.lastSeenAt) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className={styles['row-sub']}>
                      <p className={styles['row-price']}>{pkr(c.subtotal)}</p>
                      {c.discountCodeIssued && <span className={styles['row-code']}>{c.discountCodeIssued}</span>}
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles['icon-btn-sm']}
                        onClick={() => navigate(`/admin/abandoned-carts/${c._id}`)}
                        aria-label="Open cart detail"
                        title="Open cart detail"
                      >
                        <Eye size={13} strokeWidth={1.8} />
                      </button>
                      {!c.recoveredOrderId && c.email && (
                        <button type="button" className={styles.btn} onClick={() => sendEmail(c._id)} disabled={busy === `email-${c._id}`}>
                          <Mail size={11} strokeWidth={2} />
                          {busy === `email-${c._id}` ? '…' : 'Email'}
                        </button>
                      )}
                      {!c.recoveredOrderId && c.phone && (
                        <button type="button" className={cx('btn', 'btn-wa')} onClick={() => sendWhatsApp(c.phone)} title={`WhatsApp ${c.phone}`}>
                          <MessageCircle size={11} strokeWidth={2} />
                          WhatsApp
                        </button>
                      )}
                      <button type="button" className={styles['icon-btn-sm']} onClick={() => del(c._id)} aria-label="Delete cart" title="Delete">
                        <Trash2 size={12} strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        className={cx('icon-btn-sm', 'chev', isOpen && 'open')}
                        onClick={() => setExpanded(isOpen ? null : c._id)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Collapse details' : 'Expand details'}
                      >
                        <ChevronDown size={13} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className={styles.detail}>
                      <div>
                        <p className={styles['det-label']}>Customer</p>
                        <dl>
                          {c.name && <div className={styles.dl}><dt>Name</dt><dd>{c.name}</dd></div>}
                          {c.email && <div className={styles.dl}><dt>Email</dt><dd><a href={`mailto:${c.email}`}>{c.email}</a></dd></div>}
                          {c.phone && <div className={styles.dl}><dt>Phone</dt><dd><a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a></dd></div>}
                          <div className={styles.dl}><dt>Last seen</dt><dd>{c.lastSeenAt ? fmtDateTime(c.lastSeenAt) : '—'}</dd></div>
                          {c.createdAt && <div className={styles.dl}><dt>First seen</dt><dd>{fmtDateTime(c.createdAt)}</dd></div>}
                          {c.recoveredOrderId && <div className={styles.dl}><dt>Recovered</dt><dd>✓</dd></div>}
                        </dl>
                      </div>
                      <div>
                        <p className={styles['det-label']}>Items ({c.itemCount})</p>
                        <div className={styles.items}>
                          {items.map((it, i) => (
                            <div key={i} className={styles.item}>
                              {it.image
                                ? <img src={it.image} alt="" className={styles.thumb} loading="lazy" />
                                : <span className={styles.ph} />}
                              <div className={styles['item-name']}>
                                {it.name || 'Item'}
                                {(it.size || it.color) && (
                                  <span className={styles['item-var']}>
                                    {' '}{[it.size, it.color].filter(Boolean).join(' · ')}
                                  </span>
                                )}
                              </div>
                              <span className={styles['item-qty']}>×{it.quantity}</span>
                              <span className={styles['item-price']}>{pkr((it.price || 0) * (it.quantity || 1))}</span>
                            </div>
                          ))}
                        </div>
                        <div className={styles['det-total']}>
                          <span>Subtotal</span>
                          <b>{pkr(c.subtotal)}</b>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {/* ── Tip ───────────────────────────────────────────────── */}
        {status === 'open' && !loading && carts.length > 0 && (
          <div className={styles.tip}>
            <p>
              Best results within the first 2 hours — the fresher the cart, the warmer the lead.{' '}
              <Link to="/admin/settings/email">Email templates →</Link>
            </p>
            <p><code>{filtered.length} shown · {stats.totalCount} total</code></p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
