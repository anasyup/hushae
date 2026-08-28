import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, Clock, Copy, ExternalLink, Link2, Mail, MessageCircle,
  Package, Phone, Send, ShoppingBag, Trash2, User, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr, ago } from '../lib/format';
import AdminLayout from './AdminLayout';
import styles from './AbandonedCarts.module.css';

/* ============================================================================
 * ABANDONED CART DETAIL — dedicated page for one cart.
 * Opens from the Abandoned Carts list ("View"). Full customer + item
 * workspace: contact copy, WhatsApp, recovery email, timeline, linked order
 * and customer profile. Same ATELIER design family as the list page.
 * ========================================================================== */

const cx = (...names) => names.map((n) => styles[n]).join(' ');

function Stat({ icon: Icon, label, value, sub, chip, chipTone, delay }) {
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

export default function AbandonedCartDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth, toast } = useApp();
  const [cart, setCart] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const d = await api(`/abandoned-cart/admin/${id}`, { token: auth.token });
      setCart(d.cart);
    } catch (e) {
      setErr(e?.message || 'Could not load this cart');
      if (e?.status === 404) setErr('Cart not found — it may have been deleted.');
    }
  }, [id]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const copy = async (label, value) => {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopied(label);
      setTimeout(() => setCopied(''), 1400);
    } catch { toast('Copy failed — select manually'); }
  };

  const sendEmail = async () => {
    if (!cart || cart.recoveredOrderId) return;
    setBusy('email');
    try {
      const r = await api(`/abandoned-cart/admin/${cart._id}/send`, { method: 'POST', token: auth.token });
      toast(r.mail?.ok ? 'Recovery email sent!' : (r.mail?.reason || 'Skipped'));
      await load();
    } catch (ex) { toast(ex.message || 'Failed to send email'); }
    setBusy('');
  };

  const sendWhatsApp = () => {
    if (!cart?.phone) { toast('No phone number available'); return; }
    const clean = cart.phone.replace(/\D/g, '').replace(/^0/, '92');
    const msg = encodeURIComponent('Hi! We noticed you left some items in your cart at HUSHAE. Would you like to complete your order?');
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  const del = async () => {
    if (!window.confirm('Delete this cart record?')) return;
    try { await api(`/abandoned-cart/admin/${cart._id}`, { method: 'DELETE', token: auth.token }); toast('Cart deleted'); navigate('/admin/abandoned-carts'); }
    catch (ex) { toast(ex.message); }
  };

  if (err) {
    return (
      <AdminLayout title="Cart detail">
        <div className={styles.acw}>
          <button type="button" className={styles.back} onClick={() => navigate('/admin/abandoned-carts')}>
            <ArrowLeft size={14} /> Back to abandoned carts
          </button>
          <div className={styles.empty} style={{ marginTop: 18 }}>
            <div className={styles['empty-ico']}><ShoppingBag size={20} strokeWidth={1.5} /></div>
            <b>{err.includes('404') ? 'Cart not found' : 'Could not load cart'}</b>
            <p>{err}</p>
            <Link to="/admin/abandoned-carts" className={styles['btn-dark']}>Back to abandoned carts</Link>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!cart) {
    return (
      <AdminLayout title="Cart detail">
        <div className={styles.acw}>
          <button type="button" className={styles.back} onClick={() => navigate('/admin/abandoned-carts')}>
            <ArrowLeft size={14} /> Back to abandoned carts
          </button>
          <div className={styles.stats} style={{ marginTop: 14 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.stat}><div className={cx('skeleton')} style={{ width: '70%', height: 14, marginBottom: 8 }} /><div className={cx('skeleton')} style={{ width: '45%', height: 20 }} /></div>
            ))}
          </div>
          <div className={cx('skeleton')} style={{ height: 220, borderRadius: 12 }} />
        </div>
      </AdminLayout>
    );
  }

  const items = cart.items || [];
  const badge = cart.recoveredOrderId
    ? { cls: 'recovered', label: 'Recovered' }
    : cart.recoveryEmailSentAt
      ? { cls: 'emailed', label: 'Emailed' }
      : { cls: 'open', label: 'Open' };

  const timeline = [
    { label: 'Cart created', at: cart.createdAt, done: true, icon: Calendar },
    { label: 'Last seen at checkout', at: cart.lastSeenAt, done: true, icon: Clock },
    cart.recoveryEmailSentAt ? { label: 'Recovery email sent', at: cart.recoveryEmailSentAt, done: true, icon: Mail } : null,
    cart.recoveredOrderId ? { label: 'Order placed — recovered', at: cart.recoveredOrderId?.createdAt || null, done: true, icon: CheckCircle2 } : null,
  ].filter(Boolean);

  return (
    <AdminLayout title="Cart detail">
      <div className={styles.acw}>
        {/* ── Head ─────────────────────────────────────────────── */}
        <button type="button" className={styles.back} onClick={() => navigate('/admin/abandoned-carts')}>
          <ArrowLeft size={14} /> Abandoned carts
        </button>
        <div className={styles.head} style={{ marginTop: 8 }}>
          <div className={styles['head-left']}>
            <p className={styles.eyebrow}>Cart detail</p>
            <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {cart.name || 'Anonymous'}
              <span className={cx('badge', badge.cls)}>{badge.label}</span>
            </h1>
            <p className={styles.sub}>
              {cart.email || 'No email on file'}
              {cart.phone ? ` · ${cart.phone}` : ''}
            </p>
          </div>
          <div className={styles['head-actions']}>
            {!cart.recoveredOrderId && cart.email && (
              <button type="button" className={styles['btn-dark']} onClick={sendEmail} disabled={busy === 'email'}>
                <Send size={12} strokeWidth={2} />
                {busy === 'email' ? 'Sending…' : 'Send recovery email'}
              </button>
            )}
            {!cart.recoveredOrderId && cart.phone && (
              <button type="button" className={styles.btn} onClick={sendWhatsApp}>
                <MessageCircle size={11} strokeWidth={2} /> WhatsApp
              </button>
            )}
            <button type="button" className={styles['icon-btn']} onClick={del} aria-label="Delete cart" title="Delete cart">
              <Trash2 size={14} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Recovered banner ─────────────────────────────────── */}
        {cart.recoveredOrderId && (
          <div className={styles['order-ref']}>
            <b>✓ Recovered — this customer came back and ordered.</b>
            <Link to={`/admin/orders/${cart.recoveredOrderId._id}`}>
              {cart.recoveredOrderId.orderNumber || 'Order'} · {pkr(cart.recoveredOrderId.total)} →
            </Link>
          </div>
        )}

        {/* ── Stats ────────────────────────────────────────────── */}
        <div className={styles.stats}>
          <Stat icon={ShoppingBag} label="Cart value" value={pkr(cart.subtotal)} sub={`${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`} delay={0.04} />
          <Stat icon={Clock} label="Last seen" value={cart.lastSeenAt ? ago(cart.lastSeenAt) : '—'} sub={cart.lastSeenAt ? fmtDateTime(cart.lastSeenAt) : ''} delay={0.09} />
          <Stat icon={Mail} label="Recovery email" value={cart.recoveryEmailSentAt ? 'Sent' : 'Not sent'} sub={cart.recoveryEmailSentAt ? ago(cart.recoveryEmailSentAt) : 'Ready when you are'}
            chip={cart.recoveryEmailSentAt ? '' : cart.recoveredOrderId ? '' : 'Action'} chipTone={cart.recoveredOrderId ? 'green' : 'amber'} delay={0.14} />
          <Stat icon={CheckCircle2} label="Status" value={badge.label} sub={cart.discountCodeIssued ? `Code ${cart.discountCodeIssued}` : 'No code issued'}
            chip={badge.cls === 'recovered' ? 'Closed' : badge.cls === 'emailed' ? 'Follow up' : 'Warm lead'} chipTone={badge.cls === 'recovered' ? 'green' : badge.cls === 'emailed' ? 'amber' : 'red'} delay={0.19} />
        </div>

        {/* ── Workspace ────────────────────────────────────────── */}
        <div className={styles['detail-grid']}>
          {/* Customer panel */}
          <div className={styles.panel}>
            <div className={styles['panel-h']}>
              <span className={styles['panel-t']}><User size={14} strokeWidth={1.8} /> Customer</span>
              {cart.customer && (
                <Link to={`/admin/customers/${cart.customer._id}`} className={styles['btn-dark']} style={{ padding: '4px 9px', fontSize: 10.5 }}>
                  <ExternalLink size={11} strokeWidth={2} /> Full profile
                </Link>
              )}
            </div>
            <div className={styles['panel-b']}>
              <dl>
                {cart.name && (
                  <div className={styles.kv}>
                    <dt>Name</dt>
                    <dd>{cart.name}</dd>
                  </div>
                )}
                <div className={styles.kv}>
                  <dt>Email</dt>
                  <dd>
                    {cart.email ? <a href={`mailto:${cart.email}`}>{cart.email}</a> : '—'}
                    {cart.email && (
                      <button type="button" className={styles['copy-btn']} onClick={() => copy('email', cart.email)} aria-label="Copy email">
                        {copied === 'email' ? '✓' : <Copy size={9} />}
                      </button>
                    )}
                  </dd>
                </div>
                <div className={styles.kv}>
                  <dt>Phone</dt>
                  <dd>
                    {cart.phone ? <a href={`tel:${cart.phone.replace(/[^\d+]/g, '')}`}>{cart.phone}</a> : '—'}
                    {cart.phone && (
                      <button type="button" className={styles['copy-btn']} onClick={() => copy('phone', cart.phone)} aria-label="Copy phone">
                        {copied === 'phone' ? '✓' : <Copy size={9} />}
                      </button>
                    )}
                    {cart.phone && (
                      <button type="button" className={styles['copy-btn']} onClick={sendWhatsApp} aria-label="WhatsApp">
                        <MessageCircle size={9} /> WA
                      </button>
                    )}
                  </dd>
                </div>
                <div className={styles.kv}>
                  <dt>First seen</dt>
                  <dd>{cart.createdAt ? fmtDateTime(cart.createdAt) : '—'}</dd>
                </div>
                <div className={styles.kv}>
                  <dt>Last seen</dt>
                  <dd>{cart.lastSeenAt ? fmtDateTime(cart.lastSeenAt) : '—'}</dd>
                </div>
                {cart.discountCodeIssued && (
                  <div className={styles.kv}>
                    <dt>Discount code</dt>
                    <dd><span className={styles['row-code']}>{cart.discountCodeIssued}</span></dd>
                  </div>
                )}
              </dl>

              <p className={styles['det-label']} style={{ marginTop: 16 }}>Timeline</p>
              <div className={styles.timeline}>
                {timeline.map((t, i) => (
                  <div key={i} className={styles['tl-item']}>
                    <span className={cx('tl-dot', t.done && 'done')} />
                    <div className={styles['tl-body']}>
                      <b>{t.label}</b>
                      <span>{t.at ? `${ago(t.at)} · ${fmtDateTime(t.at)}` : ''}</span>
                    </div>
                  </div>
                ))}
                {!cart.recoveredOrderId && (
                  <div className={styles['tl-item']}>
                    <span className={cx('tl-dot', 'now')} />
                    <div className={styles['tl-body']}>
                      <b>Awaiting recovery</b>
                      <span>Email or WhatsApp this customer to bring them back</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items panel */}
          <div className={styles.panel}>
            <div className={styles['panel-h']}>
              <span className={styles['panel-t']}><Package size={14} strokeWidth={1.8} /> Items in cart</span>
              <span className={styles['group-n']}>{items.length} line{items.length === 1 ? '' : 's'}</span>
            </div>
            <div className={styles['panel-b']}>
              {items.length === 0 ? (
                <div className={styles['ovw-empty']}>No items recorded for this cart.</div>
              ) : (
                <>
                  {items.map((it, i) => (
                    <div key={i} className={styles['item-row']}>
                      {it.image
                        ? <img src={it.image} alt="" loading="lazy" />
                        : <span className={styles.ph} />}
                      <div className={styles['item-info']}>
                        <b>{it.name || 'Item'}</b>
                        <span>{[it.size, it.color].filter(Boolean).join(' · ') || 'No variant'}</span>
                      </div>
                      <span className={styles['item-qty']}>×{it.quantity}</span>
                      <span className={styles['item-line']}>{pkr((it.price || 0) * (it.quantity || 1))}</span>
                    </div>
                  ))}
                  <div className={styles.grand}>
                    <span>Subtotal</span>
                    <b>{pkr(cart.subtotal)}</b>
                  </div>
                </>
              )}
              <p className={styles['note-line']}>
                <Link2 size={11} strokeWidth={1.8} />
                {cart.customer ? 'Linked to a registered customer profile.' : 'Anonymous cart — no account was attached at checkout.'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Help text ────────────────────────────────────────── */}
        <div className={styles.tip}>
          <p>
            Recovery works best within the first 2 hours. A personal WhatsApp message often converts
            better than a second email — try both.{' '}
            <Link to="/admin/settings/email">Email templates →</Link>
          </p>
          <p><code>{cart._id}</code></p>
        </div>
      </div>
    </AdminLayout>
  );
}
