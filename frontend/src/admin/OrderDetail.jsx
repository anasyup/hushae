import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, ExternalLink, MapPin, MessageCircle, Minus, Plus, Printer,
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
 * ORDER DETAIL — premium ATELIER rebuild (boss: same luxury family as the
 * orders desk). Every function preserved: status + payment controls, cancel
 * with reason, items edit (sizes/colors/qty/picker), totals, timeline,
 * tracking, WhatsApp, print, delete, reliability badge, maps link.
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

  const load = () => api(`/orders/admin/${id}`, { token: auth.token })
    .then((d) => { setO(d.order); setReliability(d.reliability || null); })
    .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Could not load order.'); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line

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
      try { const d = await api(`/products/admin/list?ids=${ids.join(',')}`, { token: auth.token }); map = Object.fromEntries(d.products.map((p) => [String(p._id), p])); } catch { /* picker falls back to item snapshot */ }
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
            <div className="pa-sk-row" style={{ height: 40 }} />
            <div className="pa-sk-row" style={{ height: 90 }} />
            <div className="pa-sk-row" style={{ height: 220 }} />
          </div>
        </div></div>
      </AdminLayout>
    );
  }

  const c = o.customerInfo;
  const pcs = o.items.reduce((a, it) => a + (it.quantity || 1), 0);
  const editable = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship'].includes(o.status);
  const editSub = editItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const editTotal = Math.max(0, editSub - (o.discount || 0)) + (o.shippingCharge || 0);
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

          {/* ── head ── */}
          <div className="pa-head">
            <div>
              <h1 style={{ fontFamily: 'inherit' }}>{o.orderNumber}</h1>
              <p>Customer, payment, fulfillment and items.</p>
            </div>
            <div className="pa-head-actions">
              <Link to="/admin/orders" className="pa-btn-sm"><ArrowLeft size={12} strokeWidth={2} /> Back</Link>
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
          <div className="pa-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '12px 16px', marginBottom: 12 }}>
            <span className="pa-badge pa-b-blue"><span className="pa-dot" aria-hidden />{String(o.status || '').toUpperCase()}</span>
            <span className={`pa-badge ${payLabel === 'PAID' ? 'pa-b-green' : 'pa-b-yellow'}`}><span className="pa-dot" aria-hidden />{payLabel}</span>
            {o.discreetPackaging && <span className="pa-badge pa-b-gray"><span className="pa-dot" aria-hidden />Discreet pack</span>}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
          </div>

          {cancelOpen && (
            <div className="pa-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: '12px 16px', marginBottom: 12, borderColor: 'var(--pa-red-border)', background: 'var(--pa-red-bg)' }}>
              <span className="pa-field-label" style={{ margin: 0 }}>Cancel reason</span>
              <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="pa-select">
                <option value="">Select reason…</option>
                {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
              {cancelReason === 'Other' && (
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Describe…" className="pa-modal-input" style={{ height: 34 }} />
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

          {/* ── customer + payment ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)', gap: 12, marginBottom: 12 }} className="od-detail-grid">
            <div className="pa-card" style={{ padding: '16px 18px' }}>
              <p className="pa-section-title" style={{ marginBottom: 12 }}>Customer</p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(180deg,#2c2b28,#121110)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {(c.name || '?').slice(0, 1).toUpperCase()}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 14, letterSpacing: '-0.2px' }}>{c.name}</b>
                    <ReliabilityBadge reliability={reliability} />
                  </div>
                  <p className="pa-field-hint" style={{ marginTop: 2 }}>{c.city}{c.province ? `, ${c.province}` : ''}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {c.phone && <a href={`tel:${c.phone}`} className="pa-btn-sm">Call</a>}
                    {c.phone && <a href={whatsappLink} target="_blank" rel="noreferrer" className="pa-btn-sm">WhatsApp</a>}
                    {c.email && <a href={`mailto:${c.email}`} className="pa-btn-sm">Email</a>}
                    {o.customer && <Link to={`/admin/customers/${o.customer?._id || o.customer}`} className="pa-btn-sm">Customer 360</Link>}
                  </div>
                </div>
              </div>
            </div>
            <div className="pa-card" style={{ padding: '16px 18px' }}>
              <p className="pa-section-title" style={{ marginBottom: 12 }}>Payment</p>
              <div style={{ display: 'grid', gap: 8, fontSize: 12.5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span className="pa-field-hint" style={{ margin: 0 }}>Method</span><b>{o.paymentMethod}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span className="pa-field-hint" style={{ margin: 0 }}>Status</span><b>{o.paymentStatus}</b></div>
                {o.transactionId && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span className="pa-field-hint" style={{ margin: 0 }}>Txn ID</span><code style={{ fontSize: 11 }}>{o.transactionId}</code></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><span className="pa-field-hint" style={{ margin: 0 }}>Packaging</span><b>{o.discreetPackaging ? 'Discreet' : 'Standard'}</b></div>
              </div>
            </div>
          </div>

          {/* ── shipping ── */}
          <div className="pa-card" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <p className="pa-section-title" style={{ marginBottom: 10 }}>Shipping</p>
            <p style={{ fontSize: 13, lineHeight: 1.7 }}>{c.address}</p>
            <p className="pa-field-hint" style={{ marginTop: 2 }}>{c.city}, {c.province}{c.postalCode ? ` — ${c.postalCode}` : ''}</p>
            {c.location?.lat != null && (
              <a
                href={c.location.mapsLink || `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`}
                target="_blank" rel="noreferrer" className="pa-btn-sm" style={{ marginTop: 10 }}
              >
                <MapPin size={12} strokeWidth={2} /> Open in Maps
              </a>
            )}
          </div>

          {/* ── items / timeline / tracking ── */}
          <div className="pa-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div className="pa-tabs" role="tablist" aria-label="Order sections" style={{ display: 'inline-flex', gap: 2, background: 'rgba(17,17,17,0.05)', borderRadius: 999, padding: 3 }}>
                {[{ k: 'items', l: 'Items' }, { k: 'timeline', l: 'Timeline' }, { k: 'tracking', l: 'Tracking' }].map((t) => (
                  <button
                    key={t.k}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.k}
                    onClick={() => setTab(t.k)}
                    style={{
                      height: 30, padding: '0 14px', borderRadius: 999, border: 0, cursor: 'pointer',
                      fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                      background: tab === t.k ? 'linear-gradient(180deg,#2c2b28,#121110)' : 'transparent',
                      color: tab === t.k ? '#fff' : 'var(--pa-muted)',
                      boxShadow: tab === t.k ? '0 3px 10px -2px rgba(16,15,13,.35)' : 'none',
                      transition: 'all .2s cubic-bezier(.16,1,.3,1)',
                    }}
                  >
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
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--pa-border-light)' }}>
                    {it.slug
                      ? <Link to={`/product/${it.slug}`} target="_blank" rel="noreferrer"><Img src={it.image} alt="" style={{ width: 40, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--pa-border-light)' }} /></Link>
                      : <Img src={it.image} alt="" style={{ width: 40, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--pa-border-light)' }} />}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.1px' }}>{it.name}</p>
                      <p className="pa-field-hint" style={{ marginTop: 2 }}>
                        {[it.size, it.color].filter(Boolean).join(' · ')}
                        {(it.size || it.color) ? ' · ' : ''}
                        {pkr(it.price)} × {it.quantity}
                      </p>
                    </div>
                    <b style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(it.lineTotal)}</b>
                  </div>
                ))}

                {editing && editItems.map((it, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--pa-border-light)' }}>
                    <Img src={it.image} alt="" style={{ width: 40, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--pa-border-light)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600 }}>{it.name}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        {it.sizes.length > 0 && (
                          <select value={it.size} onChange={(e) => updLine(i, 'size', e.target.value)} className="pa-select" style={{ height: 30 }}>
                            {it.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        )}
                        {it.colors.length > 0 && (
                          <select value={it.color} onChange={(e) => updLine(i, 'color', e.target.value)} className="pa-select" style={{ height: 30 }}>
                            {it.colors.map((col) => <option key={col.name} value={col.name}>{col.name}</option>)}
                          </select>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <button type="button" onClick={() => stepQty(i, -1)} className="pa-action-btn" style={{ width: 24, height: 24 }} aria-label="Less"><Minus size={10} /></button>
                          <span style={{ width: 20, textAlign: 'center', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{it.quantity}</span>
                          <button type="button" onClick={() => stepQty(i, 1)} className="pa-action-btn" style={{ width: 24, height: 24 }} aria-label="More"><Plus size={10} /></button>
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <b style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(it.price * it.quantity)}</b>
                      <button type="button" onClick={() => delLine(i)} className="pa-action-btn danger" style={{ width: 24, height: 24 }} aria-label="Remove line"><X size={11} /></button>
                    </div>
                  </div>
                ))}

                {editing && (
                  <div style={{ position: 'relative', padding: '12px 0' }}>
                    <div className="pa-search" style={{ maxWidth: 'none', position: 'relative' }}>
                      <input value={pq} onChange={(e) => searchPicker(e.target.value)} placeholder="Add product — search by name or SKU…" className="pa-modal-input" style={{ height: 38 }} aria-label="Search products to add" />
                    </div>
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

                <div style={{ borderTop: '1px solid var(--pa-border)', marginTop: 8, paddingTop: 14, fontSize: 13, display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="pa-field-hint" style={{ margin: 0 }}>Subtotal</span><b>{pkr(editing ? editSub : o.subtotal)}</b></div>
                  {!!o.discount && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="pa-field-hint" style={{ margin: 0 }}>Discount {o.couponCode && `(${o.couponCode})`}</span><b>− {pkr(o.discount)}</b></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="pa-field-hint" style={{ margin: 0 }}>Shipping</span><b>{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--pa-border-light)', paddingTop: 10 }}>
                    <span className="pa-field-label" style={{ margin: 0 }}>Grand total</span>
                    <b style={{ fontSize: 18, letterSpacing: '-0.4px', fontVariantNumeric: 'tabular-nums' }}>{pkr(editing ? editTotal : o.total)}</b>
                  </div>
                  <p className="pa-field-hint">{o.items.length} products · {pcs} pieces · {fmtDateTime(o.createdAt)}</p>
                  {editing && (
                    <div style={{ display: 'flex', gap: 8, paddingTop: 6 }}>
                      <button type="button" onClick={saveItems} disabled={busy} className="pa-btn-black"><Save size={12} strokeWidth={2.2} /> {busy ? 'Saving…' : 'Update order'}</button>
                      <button type="button" onClick={() => setEditing(false)} className="pa-btn-sm">Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'timeline' && (
              <div style={{ padding: '14px 0' }}>
                {(o.statusHistory || []).length === 0 ? (
                  <p className="pa-picker-empty">No status history recorded.</p>
                ) : (
                  <div style={{ display: 'grid', gap: 14 }}>
                    {(o.statusHistory || []).slice().reverse().map((h, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ marginTop: 5, width: 7, height: 7, borderRadius: 999, flexShrink: 0, background: i === 0 ? '#111' : '#d8d4cd', boxShadow: i === 0 ? '0 0 0 3px rgba(17,17,17,.12)' : 'none' }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>{h.status}</p>
                          <p className="pa-field-hint" style={{ marginTop: 1 }}>{fmtDateTime(h.at)}</p>
                          {h.note && <p style={{ marginTop: 3, fontSize: 12, fontStyle: 'italic', color: 'var(--pa-muted)' }}>“{h.note}”</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'tracking' && (
              <div style={{ padding: '14px 0' }}>
                {o.trackingNumber ? (
                  <div style={{ display: 'grid', gap: 16 }}>
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
                  <div className="pa-state" style={{ padding: '36px 0' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--pa-muted)' }}>No tracking info yet</p>
                    <p className="pa-field-hint" style={{ marginTop: 6 }}>Add a tracking number when the order ships.</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  );
}
