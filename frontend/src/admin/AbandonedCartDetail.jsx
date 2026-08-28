import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, Copy, ExternalLink, Flame, Link2,
  Mail, MessageCircle, Package, Phone, Send, ShoppingBag, Sparkles, Trash2, User, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr, ago } from '../lib/format';
import AdminLayout from './AdminLayout';
import styles from './AbandonedCarts.module.css';

/* ============================================================================
 * ABANDONED CART DETAIL — dedicated page for one cart (extreme polish pass).
 *
 * Premium layout in the ATELIER family:
 *   - hero identity (initials avatar, status, contact chips)
 *   - urgency meter — how much of the 2h prime window is gone
 *   - "next best action" — a rule engine that tells the merchant what to do
 *   - sticky action bar (email / WhatsApp / delete always in reach)
 *   - stat cards, richer timeline, item rows with hover polish
 *   - Esc returns to the list; reduced-motion respected
 * ========================================================================== */

const cx = (...names) => names.map((n) => styles[n]).filter(Boolean).join(' ');

/* Province list matches the store's postal-code validation bands. */
const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad (ICT)', 'Gilgit-Baltistan', 'Azad Kashmir'];
const PAYMENT_METHODS = ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Visa'];

const initials = (name, email) => {
  const src = (name || email || '?').trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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

  /* Recover-cart modal state (create order | link existing order) */
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [mode, setMode] = useState('create');
  const [formErr, setFormErr] = useState('');
  const [linkNo, setLinkNo] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', city: '',
    province: '', postalCode: '', notes: '', paymentMethod: 'COD',
  });
  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openRecover = () => {
    setForm({
      name: cart?.name || '', email: cart?.email || '', phone: cart?.phone || '',
      address: '', city: '', province: '', postalCode: '', notes: '',
      paymentMethod: 'COD',
    });
    setMode('create');
    setFormErr('');
    setLinkNo('');
    setRecoverOpen(true);
  };

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

  /* Esc → close modal first, then back to the list (quick keyboard exit). */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (recoverOpen) { setRecoverOpen(false); return; }
      if (!busy) navigate('/admin/abandoned-carts');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, navigate, recoverOpen]);

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

  /* Recover cart → create a real order (backend does stock + totals). */
  const recoverCart = async () => {
    if (busy) return;
    setBusy('recover');
    setFormErr('');
    try {
      const r = await api(`/abandoned-cart/admin/${cart._id}/recover`, {
        method: 'POST', token: auth.token,
        body: { customerInfo: form, paymentMethod: form.paymentMethod, discreetPackaging: true },
      });
      toast(`Order ${r.order.orderNumber} created — cart recovered! 🎉`);
      setRecoverOpen(false);
      await load();
    } catch (ex) {
      setFormErr(ex?.message || 'Could not create the order');
    }
    setBusy('');
  };

  /* Recover cart → link an order the customer already placed. */
  const linkOrder = async () => {
    if (busy) return;
    setBusy('link');
    setFormErr('');
    try {
      const r = await api(`/abandoned-cart/admin/${cart._id}/link-order`, {
        method: 'POST', token: auth.token, body: { orderNumber: linkNo },
      });
      toast(`Linked to order ${r.order.orderNumber}`);
      setRecoverOpen(false);
      await load();
    } catch (ex) {
      setFormErr(ex?.message || 'Could not link the order');
    }
    setBusy('');
  };

  const del = async () => {
    if (!window.confirm('Delete this cart record?')) return;
    try { await api(`/abandoned-cart/admin/${cart._id}`, { method: 'DELETE', token: auth.token }); toast('Cart deleted'); navigate('/admin/abandoned-carts'); }
    catch (ex) { toast(ex.message); }
  };

  const items = useMemo(() => cart?.items || [], [cart]);

  const badge = cart
    ? cart.recoveredOrderId
      ? { cls: 'recovered', label: 'Recovered' }
      : cart.recoveryEmailSentAt
        ? { cls: 'emailed', label: 'Emailed' }
        : { cls: 'open', label: 'Open' }
    : { cls: 'open', label: 'Open' };

  /* Urgency — how much of the 2h prime recovery window has passed. */
  const urgency = useMemo(() => {
    if (!cart?.lastSeenAt) return { tone: 'neutral', label: '—', pct: 0, note: '' };
    const ageHrs = Math.max(0, (Date.now() - new Date(cart.lastSeenAt).getTime()) / 3600000);
    if (cart.recoveredOrderId) return { tone: 'green', label: 'Recovered', pct: 100, note: 'This cart already converted.' };
    if (ageHrs <= 2) return { tone: 'green', label: 'Prime window', pct: Math.round((ageHrs / 2) * 100), note: `Abandoned ${ago(cart.lastSeenAt)} — recovery peaks in the first 2 hours.` };
    if (ageHrs <= 24) return { tone: 'amber', label: 'Warming up', pct: Math.round(20 + (ageHrs / 24) * 60), note: 'A friendly nudge now still converts well.' };
    return { tone: 'red', label: 'Going cold', pct: 100, note: 'Older than a day — a discount code or WhatsApp message works best.' };
  }, [cart]);

  /* Next best action — a simple rule engine for the merchant. */
  const nextAction = useMemo(() => {
    if (!cart) return null;
    if (cart.recoveredOrderId) {
      return { icon: CheckCircle2, tone: 'done', title: 'Recovered — nothing to do', desc: 'This customer placed an order. The cart is closed.', cta: null };
    }
    if (cart.email && !cart.recoveryEmailSentAt) {
      return { icon: Send, tone: 'hot', title: 'Send the recovery email', desc: 'No email sent yet — the first touch converts best.', cta: { label: 'Send now', onClick: sendEmail } };
    }
    if (cart.phone) {
      const since = cart.recoveryEmailSentAt ? Date.now() - new Date(cart.recoveryEmailSentAt).getTime() : Infinity;
      if (since < 48 * 3600000) {
        return { icon: MessageCircle, tone: 'warm', title: 'Follow up on WhatsApp', desc: 'Email sent recently — a personal WhatsApp message roughly doubles the odds.', cta: { label: 'Open WhatsApp', onClick: sendWhatsApp } };
      }
      return { icon: Flame, tone: 'warm', title: 'Re-engage with a fresh angle', desc: 'The email is over 48h old. Try WhatsApp or a discount code to rekindle.', cta: { label: 'Open WhatsApp', onClick: sendWhatsApp } };
    }
    return { icon: User, tone: 'warm', title: 'Add a phone number', desc: 'WhatsApp is the strongest recovery channel — a phone number unlocks it.', cta: null };
  }, [cart, busy]); // eslint-disable-line

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

  const timeline = [
    { label: 'Cart created', at: cart.createdAt, done: true, icon: Calendar },
    { label: 'Last seen at checkout', at: cart.lastSeenAt, done: true, icon: Clock },
    cart.recoveryEmailSentAt ? { label: 'Recovery email sent', at: cart.recoveryEmailSentAt, done: true, icon: Mail } : null,
    cart.recoveredOrderId ? { label: 'Order placed — recovered', at: cart.recoveredOrderId?.createdAt || null, done: true, icon: CheckCircle2 } : null,
  ].filter(Boolean);

  const phoneHref = cart.phone ? cart.phone.replace(/[^\d+]/g, '') : '';

  return (
    <AdminLayout title="Cart detail">
      <div className={styles.acw}>
        {/* ── Breadcrumb ───────────────────────────────────────── */}
        <button type="button" className={styles.back} onClick={() => navigate('/admin/abandoned-carts')}>
          <ArrowLeft size={14} /> Abandoned carts
        </button>

        {/* ── Hero identity ────────────────────────────────────── */}
        <div className={styles.hero}>
          <div className={styles['hero-left']}>
            <span className={cx('avatar', 'avatar-lg')}>{initials(cart.name, cart.email)}</span>
            <div className={styles['hero-meta']}>
              <div className={styles['hero-line']}>
                <h1 className={styles['hero-name']}>{cart.name || 'Anonymous'}</h1>
                <span className={cx('badge', badge.cls)}>{badge.label}</span>
              </div>
              <p className={styles['hero-sub']}>
                {cart.email || 'No email on file'}
                {cart.phone ? ` · ${cart.phone}` : ''}
              </p>
              <div className={styles.chips}>
                {cart.email && (
                  <>
                    <a className={styles.chip} href={`mailto:${cart.email}`}><Mail size={11} strokeWidth={2} /> Email</a>
                    <button type="button" className={styles.chip} onClick={() => copy('email', cart.email)}>
                      {copied === 'email' ? '✓ Copied' : <><Copy size={11} strokeWidth={2} /> Copy</>}
                    </button>
                  </>
                )}
                {cart.phone && (
                  <>
                    <a className={styles.chip} href={`tel:${phoneHref}`}><Phone size={11} strokeWidth={2} /> Call</a>
                    <button type="button" className={cx('chip', 'chip-wa')} onClick={sendWhatsApp}><MessageCircle size={11} strokeWidth={2} /> WhatsApp</button>
                    <button type="button" className={styles.chip} onClick={() => copy('phone', cart.phone)}>
                      {copied === 'phone' ? '✓ Copied' : <><Copy size={11} strokeWidth={2} /> Copy</>}
                    </button>
                  </>
                )}
                <button type="button" className={cx('chip', 'chip-mono')} onClick={() => copy('id', cart._id)}>
                  {copied === 'id' ? '✓ Copied' : <><Link2 size={11} strokeWidth={2} /> {cart._id.slice(-6)}</>}
                </button>
              </div>
            </div>
          </div>
          <div className={styles['hero-right']}>
            <p className={styles['hero-value']}>{pkr(cart.subtotal)}</p>
            <p className={styles['hero-value-sub']}>{cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} in cart</p>
            {!cart.recoveredOrderId && (
              <button type="button" className={cx('btn', 'btn-recover')} onClick={openRecover}>
                <CheckCircle2 size={13} strokeWidth={2.2} /> Recover cart
              </button>
            )}
          </div>
        </div>

        {/* ── Urgency meter ────────────────────────────────────── */}
        <div className={cx('urgency', `urgency-${urgency.tone}`)}>
          <div className={styles['urgency-top']}>
            <span className={styles['urgency-label']}><Flame size={12} strokeWidth={2} /> {urgency.label}</span>
            <span className={styles['urgency-note']}>{urgency.note}</span>
          </div>
          <div className={styles['urgency-track']} role="progressbar" aria-valuenow={urgency.pct} aria-valuemin={0} aria-valuemax={100}>
            <div className={styles['urgency-fill']} style={{ width: `${urgency.pct}%` }} />
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

        {/* ── Sticky action bar ────────────────────────────────── */}
        {!cart.recoveredOrderId && (
          <div className={styles['action-bar']}>
            <p className={styles['action-hint']}><Sparkles size={12} strokeWidth={1.8} /> {nextAction?.desc}</p>
            <div className={styles['action-btns']}>
              <button type="button" className={cx('btn', 'btn-recover')} onClick={openRecover}>
                <CheckCircle2 size={12} strokeWidth={2.2} /> Recover cart
              </button>
              {cart.email && (
                <button type="button" className={styles['btn-dark']} onClick={sendEmail} disabled={busy === 'email'}>
                  <Send size={12} strokeWidth={2} />
                  {busy === 'email' ? 'Sending…' : 'Send recovery email'}
                </button>
              )}
              {cart.phone && (
                <button type="button" className={cx('btn', 'btn-wa')} onClick={sendWhatsApp}>
                  <MessageCircle size={11} strokeWidth={2} /> WhatsApp
                </button>
              )}
              <button type="button" className={styles['icon-btn']} onClick={del} aria-label="Delete cart" title="Delete cart">
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}

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
                    {cart.phone ? <a href={`tel:${phoneHref}`}>{cart.phone}</a> : '—'}
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
                    <span className={cx('tl-dot', 'tl-ico', t.done && 'done')}>
                      <t.icon size={10} strokeWidth={2} />
                    </span>
                    <div className={styles['tl-body']}>
                      <b>{t.label}</b>
                      <span>{t.at ? `${ago(t.at)} · ${fmtDateTime(t.at)}` : ''}</span>
                    </div>
                  </div>
                ))}
                {!cart.recoveredOrderId && (
                  <div className={styles['tl-item']}>
                    <span className={cx('tl-dot', 'tl-ico', 'now')}><Flame size={10} strokeWidth={2} /></span>
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
                        ? <img src={it.image} alt={it.name || ''} loading="lazy" />
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

        {/* ── Recover modal ─────────────────────────────────────── */}
        {recoverOpen && (
          <div className={styles['modal-overlay']} onClick={() => !busy && setRecoverOpen(false)}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Recover cart" onClick={(e) => e.stopPropagation()}>
              <div className={styles['modal-h']}>
                <span className={styles['panel-t']}><CheckCircle2 size={15} strokeWidth={2} /> Recover cart — create order</span>
                <button type="button" className={styles['modal-x']} onClick={() => setRecoverOpen(false)} aria-label="Close" disabled={!!busy}>
                  <X size={15} strokeWidth={2} />
                </button>
              </div>

              <div className={styles['modal-b']}>
                {/* Mode switch */}
                <div className={styles['mode-tabs']}>
                  <button type="button" className={cx('mode-tab', mode === 'create' && 'on')} onClick={() => { setMode('create'); setFormErr(''); }}>
                    <Package size={12} strokeWidth={2} /> Create order
                  </button>
                  <button type="button" className={cx('mode-tab', mode === 'link' && 'on')} onClick={() => { setMode('link'); setFormErr(''); }}>
                    <Link2 size={12} strokeWidth={2} /> Link existing order
                  </button>
                </div>

                {mode === 'create' ? (
                  <>
                    {/* Order summary */}
                    <div className={styles['modal-sum']}>
                      {items.map((it, i) => (
                        <div key={i} className={styles['msum-row']}>
                          <span className={styles['msum-name']}>{it.name || 'Item'}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
                          <span className={styles['msum-line']}>{pkr((it.price || 0) * (it.quantity || 1))}</span>
                        </div>
                      ))}
                      <div className={styles['msum-total']}>
                        <span>Cart subtotal</span>
                        <b>{pkr(cart.subtotal)}</b>
                      </div>
                    </div>

                    <div className={styles.fgrid}>
                      <label className={styles.field}>
                        <span>Full name *</span>
                        <input value={form.name} onChange={setF('name')} placeholder="e.g. Ayesha Khan" />
                      </label>
                      <label className={styles.field}>
                        <span>Phone *</span>
                        <input value={form.phone} onChange={setF('phone')} placeholder="03XX-XXXXXXX" />
                      </label>
                      <label className={cx('field', 'fspan2')}>
                        <span>Email</span>
                        <input value={form.email} onChange={setF('email')} placeholder="customer@email.com" />
                      </label>
                      <label className={cx('field', 'fspan2')}>
                        <span>Street address *</span>
                        <input value={form.address} onChange={setF('address')} placeholder="House #, Street, Area" />
                      </label>
                      <label className={styles.field}>
                        <span>City *</span>
                        <input value={form.city} onChange={setF('city')} placeholder="e.g. Lahore" />
                      </label>
                      <label className={styles.field}>
                        <span>Province *</span>
                        <select value={form.province} onChange={setF('province')}>
                          <option value="">Select province</option>
                          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </label>
                      <label className={styles.field}>
                        <span>Postal code *</span>
                        <input value={form.postalCode} onChange={setF('postalCode')} placeholder="e.g. 54000" inputMode="numeric" />
                      </label>
                      <label className={styles.field}>
                        <span>Payment method</span>
                        <select value={form.paymentMethod} onChange={setF('paymentMethod')}>
                          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </label>
                      <label className={cx('field', 'fspan2')}>
                        <span>Order notes</span>
                        <textarea value={form.notes} onChange={setF('notes')} rows={2} placeholder="Optional — delivery instructions etc." />
                      </label>
                    </div>

                    {formErr && <div className={styles['modal-err']}>{formErr}</div>}

                    <div className={styles['modal-actions']}>
                      <button type="button" className={styles['btn-dark']} onClick={() => setRecoverOpen(false)} disabled={!!busy}>
                        Cancel
                      </button>
                      <button type="button" className={cx('btn', 'btn-recover')} onClick={recoverCart} disabled={busy === 'recover'}>
                        <CheckCircle2 size={13} strokeWidth={2.2} />
                        {busy === 'recover' ? 'Creating order…' : 'Create order & mark recovered'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className={styles['modal-note']}>
                      Already ordered through checkout? Enter the order number — this cart will close
                      against it and count as recovered.
                    </p>
                    <label className={styles.field}>
                      <span>Order number</span>
                      <input value={linkNo} onChange={(e) => setLinkNo(e.target.value)} placeholder="e.g. HU-10234" />
                    </label>
                    {formErr && <div className={styles['modal-err']}>{formErr}</div>}
                    <div className={styles['modal-actions']}>
                      <button type="button" className={styles['btn-dark']} onClick={() => setRecoverOpen(false)} disabled={!!busy}>
                        Cancel
                      </button>
                      <button type="button" className={cx('btn', 'btn-recover')} onClick={linkOrder} disabled={busy === 'link' || !linkNo.trim()}>
                        <Link2 size={13} strokeWidth={2.2} />
                        {busy === 'link' ? 'Linking…' : 'Link order'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
