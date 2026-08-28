import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, ExternalLink, Mail, MapPin, MessageCircle, Minus, Phone, Plus, Printer,
  RefreshCw, Save, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import ReliabilityBadge from './ReliabilityBadge';
import { CANCEL_REASONS } from './orders/orderConstants';
import './products-atelier.css';

/* ============================================================================
 * ORDER DETAIL — v2 premium (boss: "information sahi + design behtar").
 * Shopify-grade layout: head with big tabular number + meta strip, working
 * column (items / timeline / tracking) + summary rail (totals, customer,
 * shipping, payment). Every function preserved; classes maintainable.
 * ========================================================================== */

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const PAY = ['Pending', 'Paid', 'Verified', 'Confirmed', 'Failed', 'Refunded'];

export default function OrderDetail() {
  const { id } = useParams();
  const { auth, toast, logout } = useApp();
  const nav = useNavigate();
  const [o, setO] = useState(null);
  const [tab, setTab] = useState('items');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [reliability, setReliability] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [life, setLife] = useState(null);

  const copyText = (t, msg) => {
    try { navigator.clipboard?.writeText(t).then(() => toast(msg || 'Copied')); } catch { toast('Copy failed'); }
  };

  const load = () => api(`/orders/admin/${id}`, { token: auth.token })
    .then((d) => { setO(d.order); setReliability(d.reliability || null); })
    .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Could not load order.'); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  /* Lifetime stats for the linked customer (Shopify-style summary). */
  const custId = o?.customer ? String(o.customer._id || o.customer) : null;
  useEffect(() => {
    if (!custId) return;
    api('/admin/customers', { token: auth.token })
      .then((d) => {
        const m = (d.customers || []).find((cu) => String(cu.id) === custId);
        if (m) setLife({ orders: m.orders || 0, spent: m.spent || 0 });
      })
      .catch(() => {});
  }, [custId, auth.token]);

  const patch = async (path, body, msg) => {
    setBusy(true);
    try { await api(`/orders/admin/${id}${path}`, { method: 'PATCH', token: auth.token, body }); await load(); toast(msg); }
    catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  const remove = async () => {
    if (!window.confirm(`Permanently delete ${o.orderNumber}?`)) return;
    try { await api(`/orders/admin/${id}`, { method: 'DELETE', token: auth.token }); toast('Order deleted'); nav('/admin/orders'); }
    catch (ex) { toast(ex.message); }
  };

  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [pq, setPq] = useState('');
  const [pRes, setPRes] = useState([]);

  const startEdit = async () => {
    const ids = o.items.map((i) => i.product).filter(Boolean);
    let map = {};
    if (ids.length) {
      try { const d = await api(`/products/admin/list?ids=${ids.join(',')}`, { token: auth.token }); map = Object.fromEntries(d.products.map((p) => [String(p._id), p])); } catch { /* fall back to snapshots */ }
    }
    setEditItems(o.items.map((i) => {
      const p = map[String(i.product)] || {};
      return { product: String(i.product), name: i.name, image: i.image, price: i.price, quantity: i.quantity, size: i.size, color: i.color, sizes: p.sizes?.length ? p.sizes : [i.size].filter(Boolean), colors: p.colors?.length ? p.colors : (i.color ? [{ name: i.color }] : []) };
    }));
    setPq(''); setPRes([]); setEditing(true);
  };
  const updLine = (i, k, v) => setEditItems((a) => a.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const stepQty = (i, d) => setEditItems((a) => a.map((it, j) => (j === i ? { ...it, quantity: Math.min(10, Math.max(1, it.quantity + d)) } : it)));
  const delLine = (i) => setEditItems((a) => a.filter((_, j) => j !== i));
  const searchPicker = async (q) => {
    setPq(q);
    if (q.trim().length < 2) { setPRes([]); return; }
    try { const d = await api(`/products/admin/list?q=${encodeURIComponent(q.trim())}`, { token: auth.token }); setPRes((d.products || []).filter((p) => p.isActive && p.status !== 'draft').slice(0, 6)); } catch { setPRes([]); }
  };
  const addPicked = (p) => { setEditItems((a) => [...a, { product: String(p._id), name: p.name, image: p.images?.[0]?.url || '', price: p.price, quantity: 1, size: p.sizes?.[0] || '', color: p.colors?.[0]?.name || '', sizes: p.sizes || [], colors: p.colors || [] }]); setPq(''); setPRes([]); };
  const saveItems = async () => {
    if (!editItems.length) { toast('Order must have at least one item'); return; }
    setBusy(true);
    try { await api(`/orders/admin/${id}/items`, { method: 'PATCH', token: auth.token, body: { items: editItems.map((it) => ({ product: it.product, size: it.size, color: it.color, quantity: it.quantity })) } }); toast('Items updated — bill recalculated'); setEditing(false); await load(); }
    catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  if (err) {
    return (
      <AdminLayout title="Order">
        <div className="pa-outer"><div className="pa-wrap">
          <div className="pa-card pa-state">
            <div className="pa-state-icon"><X size={18} strokeWidth={1.8} /></div>
            <h3>Unable to load order</h3>
            <p>{err}</p>
            <button type="button" onClick={() => { setErr(''); load(); }} className="pa-btn-black">Try again</button>
          </div>
        </div></div>
      </AdminLayout>
    );
  }

  if (!o) {
    return (
      <AdminLayout title="Order">
        <div className="pa-outer"><div className="pa-wrap">
          <div className="pa-card pa-skeleton">
            <div className="pa-sk-row" style={{ height: 44 }} />
            <div className="pa-sk-row" style={{ height: 110 }} />
            <div className="pa-sk-row" style={{ height: 240 }} />
          </div>
        </div></div>
      </AdminLayout>
    );
  }

  const c = o.customerInfo;
  const pcs = o.items.reduce((a, it) => a + (it.quantity || 1), 0);
  const editable = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship'].includes(o.status);
  const editSub = editItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const editTotal = Math.max(0, editSub - (o.discount || 0)) + (o.shippingCharge || 0) + (o.tax || 0);
  const whatsappLink = `https://wa.me/${String(c.phone || '').replace(/\D/g, '').replace(/^0/, '92')}`;
  const waConfirm = `${whatsappLink}?text=${encodeURIComponent(`Hi ${c.name || 'there'}, this is HUSHAE. Confirming order ${o.orderNumber} for ${pkr(o.total)}. Reply YES to confirm.`)}`;
  const nextMove = o.status === 'Pending' ? { status: 'Confirmed', label: 'Confirm order' }
    : o.status === 'Confirmed' ? { status: 'Processing', label: 'Start processing' }
    : o.status === 'Processing' ? { status: 'Ready to Ship', label: 'Mark ready to ship' }
    : o.status === 'Ready to Ship' ? { status: 'Shipped', label: 'Mark shipped' }
    : o.status === 'Shipped' || o.status === 'Out for Delivery' ? { status: 'Delivered', label: 'Mark delivered' }
    : null;
  const payLabel = o.paymentStatus === 'Paid' || o.paymentState === 'Confirmed' ? 'PAID' : String(o.paymentStatus || o.paymentState || 'PENDING').toUpperCase();

  return (
    <AdminLayout title={`Order ${o.orderNumber}`}>
      <div className="pa-outer">
        <div className="pa-wrap">

          {/* ── head: big number + meta + actions ── */}
          <div className="odt-head">
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Link to="/admin/orders" className="pa-action-btn" style={{ width: 32, height: 32 }} aria-label="Back to orders"><ArrowLeft size={14} strokeWidth={2} /></Link>
                <h1 className="odt-no">{o.orderNumber}</h1>
                <span className="pa-badge pa-b-blue"><span className="pa-dot" aria-hidden />{String(o.status || '').toUpperCase()}</span>
                <span className={`pa-badge ${payLabel === 'PAID' ? 'pa-b-green' : 'pa-b-yellow'}`}><span className="pa-dot" aria-hidden />{payLabel}</span>
                {o.discreetPackaging && <span className="pa-badge pa-b-gray"><span className="pa-dot" aria-hidden />Discreet</span>}
              </div>
              <div className="odt-meta">
                <span>Placed <b>{fmtDateTime(o.createdAt)}</b></span>
                <span><b>{pcs}</b> pieces · <b>{o.items.length}</b> products</span>
                {o.source && <span>Source <b>{o.source}</b></span>}
                {o.couponCode && <span>Coupon <b>{o.couponCode}</b></span>}
                {o.trackingNumber && <span>Tracking <b>{o.trackingNumber}</b></span>}
              </div>
            </div>
            <div className="odt-actions">
              {c.phone && (
                <a href={waConfirm} target="_blank" rel="noreferrer" className="pa-btn-sm" title="WhatsApp confirmation">
                  <MessageCircle size={12} strokeWidth={2} /> WhatsApp
                </a>
              )}
              <button type="button" onClick={() => window.open(`/admin/orders/${id}/invoice`, '_blank')} className="pa-btn-sm">
                <Printer size={12} strokeWidth={2} /> Print
              </button>
              <button type="button" onClick={load} disabled={busy} className="pa-action-btn" style={{ width: 32, height: 32 }} aria-label="Refresh" title="Refresh">
                <RefreshCw size={13} strokeWidth={2} className={busy ? 'pa-spin' : ''} />
              </button>
              <button type="button" onClick={remove} className="pa-action-btn danger" style={{ width: 32, height: 32 }} aria-label="Delete order" title="Delete">
                <Trash2 size={13} strokeWidth={2} />
              </button>
              {nextMove && (
                <button type="button" disabled={busy} onClick={() => patch('/status', { status: nextMove.status }, nextMove.label)} className="pa-btn-black">
                  {nextMove.label}
                </button>
              )}
            </div>
          </div>

          {/* ── status / payment controls ── */}
          <div className="odt-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
            <span className="pa-field-label" style={{ margin: 0 }}>Status</span>
            <select
              value={o.status}
              onChange={(e) => {
                if (e.target.value === 'Cancelled') { setCancelOpen(true); setCancelReason(''); return; }
                patch('/status', { status: e.target.value }, 'Status updated');
              }}
              disabled={busy}
              aria-label="Order status"
              className="pa-select"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span className="pa-field-label" style={{ margin: '0 0 0 8px' }}>Payment</span>
            <select
              value={o.paymentStatus}
              onChange={(e) => patch('/payment', { paymentStatus: e.target.value }, 'Payment updated')}
              disabled={busy}
              aria-label="Payment status"
              className="pa-select"
            >
              {PAY.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {cancelOpen && (
            <div className="odt-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, borderColor: 'var(--pa-red-border)', background: 'var(--pa-red-bg)' }}>
              <span className="pa-field-label" style={{ margin: 0 }}>Cancel reason</span>
              <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="pa-select" aria-label="Cancel reason">
                <option value="">Select reason…</option>
                {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              {cancelReason === 'Other' && (
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Describe…" className="pa-modal-input" style={{ height: 34 }} aria-label="Describe reason" />
              )}
              <button
                type="button"
                disabled={!cancelReason || busy}
                onClick={() => { patch('/status', { status: 'Cancelled', cancelReason }, 'Order cancelled'); setCancelOpen(false); }}
                className="pa-btn-black"
              >
                Confirm cancel
              </button>
              <button type="button" onClick={() => setCancelOpen(false)} className="pa-btn-sm">Dismiss</button>
            </div>
          )}

          {/* ── body: working column + summary rail ── */}
          <div className="odt-grid">

            {/* main column */}
            <div>
              <div className="odt-card">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div className="odt-tabs" role="tablist" aria-label="Order sections">
                    {[{ k: 'items', l: `Items (${o.items.length})` }, { k: 'timeline', l: 'Timeline' }, { k: 'tracking', l: 'Tracking' }].map((t) => (
                      <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={`odt-tab ${tab === t.k ? 'on' : ''}`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                  {editable && !editing && tab === 'items' && (
                    <button type="button" onClick={startEdit} className="pa-btn-sm" style={{ marginLeft: 'auto' }}>Edit items</button>
                  )}
                </div>

                {tab === 'items' && (
                  <div>
                    {!editing && o.items.map((it, i) => (
                      <div key={i} className="odt-item">
                        {it.slug
                          ? <Link to={`/product/${it.slug}`} target="_blank" rel="noreferrer"><Img src={it.image} alt="" /></Link>
                          : <Img src={it.image} alt="" />}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p className="nm">{it.name}</p>
                          <p className="sb">
                            {[it.size, it.color].filter(Boolean).join(' · ')}
                            {(it.size || it.color) ? ' · ' : ''}
                            {pkr(it.price)} × {it.quantity}
                          </p>
                        </div>
                        <span className="pr">{pkr(it.lineTotal)}</span>
                      </div>
                    ))}

                    {editing && editItems.map((it, i) => (
                      <div key={i} className="odt-item">
                        <Img src={it.image} alt="" />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p className="nm" style={{ fontSize: 12.5 }}>{it.name}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            {it.sizes.length > 0 && (
                              <select value={it.size} onChange={(e) => updLine(i, 'size', e.target.value)} className="pa-select" style={{ height: 30 }} aria-label="Size">
                                {it.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                            {it.colors.length > 0 && (
                              <select value={it.color} onChange={(e) => updLine(i, 'color', e.target.value)} className="pa-select" style={{ height: 30 }} aria-label="Colour">
                                {it.colors.map((col) => <option key={col.name} value={col.name}>{col.name}</option>)}
                              </select>
                            )}
                            <span className="odt-qty">
                              <button type="button" onClick={() => stepQty(i, -1)} className="pa-action-btn" style={{ width: 24, height: 24 }} aria-label="Less"><Minus size={10} /></button>
                              <span style={{ width: 20, textAlign: 'center', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{it.quantity}</span>
                              <button type="button" onClick={() => stepQty(i, 1)} className="pa-action-btn" style={{ width: 24, height: 24 }} aria-label="More"><Plus size={10} /></button>
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                          <span className="pr">{pkr(it.price * it.quantity)}</span>
                          <button type="button" onClick={() => delLine(i)} className="pa-action-btn danger" style={{ width: 24, height: 24 }} aria-label="Remove line"><X size={11} /></button>
                        </div>
                      </div>
                    ))}

                    {editing && (
                      <div style={{ position: 'relative', padding: '12px 0 0' }}>
                        <input value={pq} onChange={(e) => searchPicker(e.target.value)} placeholder="Add product — search by name or SKU…" className="pa-modal-input" style={{ height: 38 }} aria-label="Search products to add" />
                        {pRes.length > 0 && (
                          <div className="pa-picker" style={{ position: 'absolute', inset: '56px 0 auto 0', zIndex: 20, maxHeight: 220 }}>
                            {pRes.map((p) => (
                              <button type="button" key={p._id} onClick={() => addPicked(p)} className="pa-picker-row">
                                <Img src={p.images?.[0]?.url} alt="" style={{ width: 24, height: 32, objectFit: 'cover', borderRadius: 6 }} />
                                <span style={{ minWidth: 0, flex: 1 }}>
                                  <span className="pa-picker-name">{p.name}</span>
                                  <span className="pa-picker-sub">{p.sku}</span>
                                </span>
                                <span className="pa-picker-price">{pkr(p.price)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {editing && (
                      <div style={{ display: 'flex', gap: 8, paddingTop: 12 }}>
                        <button type="button" onClick={saveItems} disabled={busy} className="pa-btn-black"><Save size={12} strokeWidth={2.2} /> {busy ? 'Saving…' : 'Update order'}</button>
                        <button type="button" onClick={() => setEditing(false)} className="pa-btn-sm">Cancel</button>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'timeline' && (
                  <div style={{ padding: '8px 0' }}>
                    {(o.statusHistory || []).length === 0 ? (
                      <p className="pa-picker-empty">No status history recorded.</p>
                    ) : (
                      (o.statusHistory || []).slice().reverse().map((h, i) => (
                        <div key={i} className="odt-tl">
                          <span className={`odt-dot ${i === 0 ? 'now' : ''}`} />
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>{h.status}</p>
                            <p className="pa-field-hint" style={{ marginTop: 1 }}>{fmtDateTime(h.at)}</p>
                            {h.note && <p style={{ marginTop: 3, fontSize: 12, fontStyle: 'italic', color: 'var(--pa-muted)' }}>“{h.note}”</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {tab === 'tracking' && (
                  <div style={{ padding: '8px 0' }}>
                    {o.trackingNumber ? (
                      <div style={{ display: 'grid', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pa-border-light)', paddingBottom: 12 }}>
                          <div>
                            <p className="pa-field-label" style={{ marginBottom: 3 }}>Tracking number</p>
                            <code style={{ fontSize: 14 }}>{o.trackingNumber}</code>
                          </div>
                          <button type="button" onClick={() => navigator.clipboard?.writeText(o.trackingNumber)} className="pa-action-btn" style={{ width: 32, height: 32 }} aria-label="Copy tracking">
                            <Copy size={13} strokeWidth={2} />
                          </button>
                        </div>
                        {o.courierName && (
                          <div>
                            <p className="pa-field-label" style={{ marginBottom: 3 }}>Courier</p>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>{o.courierName}</p>
                          </div>
                        )}
                        {o.trackingUrl && (
                          <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="pa-btn-black" style={{ justifySelf: 'start' }}>
                            Track online <ExternalLink size={11} strokeWidth={2.2} />
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="pa-state" style={{ padding: '32px 0' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pa-muted)' }}>No tracking info yet</p>
                        <p className="pa-field-hint" style={{ marginTop: 6 }}>Add a tracking number when the order ships.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* summary rail */}
            <div>
              <div className="odt-card">
                <h3>Summary</h3>
                <div className="odt-row"><span className="k">Subtotal</span><span className="v">{pkr(editing ? editSub : o.subtotal)}</span></div>
                {!!o.discount && <div className="odt-row"><span className="k">Discount{o.couponCode ? ` (${o.couponCode})` : ''}</span><span className="v">− {pkr(o.discount)}</span></div>}
                <div className="odt-row"><span className="k">Shipping</span><span className="v">{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></div>
                {!!o.tax && <div className="odt-row"><span className="k">Tax{o.taxPercent ? ` (${o.taxPercent}%)` : ''}</span><span className="v">{pkr(o.tax)}</span></div>}
                <div className="odt-total"><span className="k">Grand total</span><span className="v">{pkr(editing ? editTotal : o.total)}</span></div>
                {editing && <p className="pa-field-hint" style={{ marginTop: 8 }}>Editing — totals preview; bill recalculates on save.</p>}
              </div>

              <div className="odt-card">
                <h3>Customer</h3>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span className="odt-ava">{(c.name || '?').slice(0, 1).toUpperCase()}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontSize: 14, letterSpacing: '-0.2px' }}>{c.name}</b>
                      <ReliabilityBadge reliability={reliability} />
                    </div>
                    {life && (
                      <div className="odt-life">
                        <div><b>{life.orders}</b><span>Orders</span></div>
                        <div><b>{pkr(life.spent)}</b><span>Lifetime</span></div>
                      </div>
                    )}
                    <div className="odt-links">
                      {o.customer && <Link to={`/admin/customers/${o.customer?._id || o.customer}`} className="pa-btn-sm">Customer 360</Link>}
                    </div>
                  </div>
                </div>

                <div className="odt-crow" style={{ marginTop: 12 }}>
                  <span className="ico"><Phone size={13} strokeWidth={2} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className="lbl">Phone</p>
                    <p className="val">{c.phone || '—'}</p>
                  </div>
                  <div className="acts">
                    {c.phone && <a href={`tel:${c.phone}`} className="pa-action-btn" style={{ width: 26, height: 26 }} aria-label="Call customer" title="Call"><Phone size={11} strokeWidth={2} /></a>}
                    {c.phone && <a href={whatsappLink} target="_blank" rel="noreferrer" className="pa-action-btn" style={{ width: 26, height: 26 }} aria-label="WhatsApp customer" title="WhatsApp"><MessageCircle size={11} strokeWidth={2} /></a>}
                    {c.phone && <button type="button" onClick={() => copyText(c.phone, 'Phone copied')} className="pa-action-btn" style={{ width: 26, height: 26 }} aria-label="Copy phone" title="Copy"><Copy size={11} strokeWidth={2} /></button>}
                  </div>
                </div>

                <div className="odt-crow">
                  <span className="ico"><Mail size={13} strokeWidth={2} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className="lbl">Email</p>
                    <p className="val">{c.email || '—'}</p>
                  </div>
                  <div className="acts">
                    {c.email && <a href={`mailto:${c.email}`} className="pa-action-btn" style={{ width: 26, height: 26 }} aria-label="Email customer" title="Email"><Mail size={11} strokeWidth={2} /></a>}
                    {c.email && <button type="button" onClick={() => copyText(c.email, 'Email copied')} className="pa-action-btn" style={{ width: 26, height: 26 }} aria-label="Copy email" title="Copy"><Copy size={11} strokeWidth={2} /></button>}
                  </div>
                </div>

                <div className="odt-crow">
                  <span className="ico"><MapPin size={13} strokeWidth={2} /></span>
                  <div style={{ minWidth: 0 }}>
                    <p className="lbl">Shipping address</p>
                    <p className="odt-addr">{c.address || '—'}<br /><span className="dim">{[c.city, c.province].filter(Boolean).join(', ')}{c.postalCode ? ` — ${c.postalCode}` : ''}</span></p>
                  </div>
                  <div className="acts" style={{ flexDirection: 'column', gap: 5 }}>
                    <button type="button" onClick={() => copyText([c.name, c.phone, c.address, [c.city, c.province].filter(Boolean).join(', '), c.postalCode].filter(Boolean).join(', '), 'Address copied')} className="pa-action-btn" style={{ width: 26, height: 26 }} aria-label="Copy address" title="Copy address"><Copy size={11} strokeWidth={2} /></button>
                    {c.location?.lat != null && (
                      <a href={c.location.mapsLink || `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer" className="pa-action-btn" style={{ width: 26, height: 26 }} aria-label="Open in Maps" title="Open in Maps"><ExternalLink size={11} strokeWidth={2} /></a>
                    )}
                  </div>
                </div>
              </div>

              <div className="odt-card">
                
                <h3>Payment</h3>
                <div className="odt-row"><span className="k">Method</span><span className="v">{o.paymentMethod}</span></div>
                <div className="odt-row"><span className="k">Status</span><span className="v">{o.paymentStatus}</span></div>
                {o.transactionId && <div className="odt-row"><span className="k">Txn ID</span><span className="v" style={{ fontSize: 11 }}>{o.transactionId}</span></div>}
                <div className="odt-row"><span className="k">Packaging</span><span className="v">{o.discreetPackaging ? 'Discreet' : 'Standard'}</span></div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
