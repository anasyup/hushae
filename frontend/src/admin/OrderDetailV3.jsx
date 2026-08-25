import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, ExternalLink, Minus, Plus, RefreshCw, Save, Trash2, X,
  ChevronRight, Printer, MessageCircle, Package, Clock, Truck, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';
import ReliabilityBadge from './ReliabilityBadge';
import { CANCEL_REASONS } from './orders/orderConstants';

/* ============================================================================
 * ORDER DETAIL V3 — Phase 11 Blueprint: Flagship Screen
 * Entity header + status + next action + summary + tabbed details
 * ========================================================================== */

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const PAY = ['Pending', 'Paid', 'Verified', 'Confirmed', 'Failed', 'Refunded'];

const statusBadge = (status) => {
  const map = {
    'Pending': 'v3-status v3-status-pending',
    'Confirmed': 'v3-status v3-status-active',
    'Processing': 'v3-status v3-status-active',
    'Ready to Ship': 'v3-status v3-status-active',
    'Shipped': 'v3-status v3-status-active',
    'Out for Delivery': 'v3-status v3-status-active',
    'Delivered': 'v3-status v3-status-strong',
    'Cancelled': 'v3-status v3-status-inactive',
    'Refunded': 'v3-status v3-status-inactive',
  };
  return map[status] || 'v3-status v3-status-pending';
};

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
  const [editing, setEditing] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [pq, setPq] = useState('');
  const [pRes, setPRes] = useState([]);

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

  const startEdit = async () => {
    const ids = o.items.map((i) => i.product).filter(Boolean);
    let map = {};
    if (ids.length) {
      try { const d = await api(`/products/admin/list?ids=${ids.join(',')}`, { token: auth.token }); map = Object.fromEntries(d.products.map((p) => [String(p._id), p])); } catch {}
    }
    setEditItems(o.items.map((i) => {
      const p = map[String(i.product)] || {};
      return { product: String(i.product), name: i.name, image: i.image, price: i.price, quantity: i.quantity, size: i.size, color: i.color, sizes: p.sizes?.length ? p.sizes : [i.size].filter(Boolean), colors: p.colors?.length ? p.colors : (i.color ? [{ name: i.color }] : []) };
    }));
    setPq(''); setPRes([]); setEditing(true);
  };
  const updLine = (i, k, v) => setEditItems((a) => a.map((it, j) => j === i ? { ...it, [k]: v } : it));
  const stepQty = (i, d) => setEditItems((a) => a.map((it, j) => j === i ? { ...it, quantity: Math.min(10, Math.max(1, it.quantity + d)) } : it));
  const delLine = (i) => setEditItems((a) => a.filter((_, j) => j !== i));
  const searchPicker = async (q) => { setPq(q); if (q.trim().length < 2) { setPRes([]); return; } try { const d = await api(`/products/admin/list?q=${encodeURIComponent(q.trim())}`, { token: auth.token }); setPRes((d.products || []).filter((p) => p.isActive && p.status !== 'draft').slice(0, 6)); } catch { setPRes([]); } };
  const addPicked = (p) => { setEditItems((a) => [...a, { product: String(p._id), name: p.name, image: p.images?.[0]?.url || '', price: p.price, quantity: 1, size: p.sizes?.[0] || '', color: p.colors?.[0]?.name || '', sizes: p.sizes || [], colors: p.colors || [] }]); setPq(''); setPRes([]); };
  const saveItems = async () => {
    if (!editItems.length) { toast('Order must have at least one item'); return; }
    setBusy(true);
    try { await api(`/orders/admin/${id}/items`, { method: 'PATCH', token: auth.token, body: { items: editItems.map((it) => ({ product: it.product, size: it.size, color: it.color, quantity: it.quantity })) } }); toast('Items updated — bill recalculated'); setEditing(false); await load(); }
    catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  if (err) return (
    <AdminLayout title="Order">
      <div className="v3-empty" style={{ minHeight: 300 }}>
        <p className="v3-empty-title">Unable to load order</p>
        <p className="v3-empty-desc">{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="v3-btn v3-btn-secondary mt-3">Try again</button>
      </div>
    </AdminLayout>
  );

  if (!o) return (
    <AdminLayout title="Order">
      <div className="space-y-4">
        <div className="h-20 v3-skeleton rounded-[5px]" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 v3-skeleton rounded-[5px]" />)}</div>
        <div className="h-72 v3-skeleton rounded-[5px]" />
      </div>
    </AdminLayout>
  );

  const c = o.customerInfo;
  const pcs = o.items.reduce((a, it) => a + (it.quantity || 1), 0);
  const editable = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship'].includes(o.status);
  const editSub = editItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const editTotal = Math.max(0, editSub - (o.discount || 0)) + (o.shippingCharge || 0);
  const whatsappLink = `https://wa.me/${String(c.phone || '').replace(/\D/g, '').replace(/^0/, '92')}`;
  const waConfirm = `${whatsappLink}?text=${encodeURIComponent(`Hi ${c.name || 'there'}, this is HUSHAE. Confirming order ${o.orderNumber} for ${pkr(o.total)}. Reply YES to confirm.`)}`;
  const nextMove = o.status === 'Pending' ? { status: 'Confirmed', label: 'Confirm Order' }
    : o.status === 'Confirmed' ? { status: 'Processing', label: 'Start Processing' }
    : o.status === 'Processing' ? { status: 'Ready to Ship', label: 'Mark Ready to Ship' }
    : o.status === 'Ready to Ship' ? { status: 'Shipped', label: 'Mark Shipped' }
    : o.status === 'Shipped' || o.status === 'Out for Delivery' ? { status: 'Delivered', label: 'Mark Delivered' }
    : null;
  const payLabel = o.paymentStatus === 'Paid' || o.paymentState === 'Confirmed' ? 'PAID' : String(o.paymentStatus || o.paymentState || 'PENDING').toUpperCase();

  return (
    <AdminLayout title={`Order ${o.orderNumber}`}>
      {/* ── ENTITY HEADER ──────────────────────────────────────────────── */}
      <div className="v3-page-header">
        <div className="v3-page-header-left">
          <div className="v3-breadcrumb">
            <Link to="/admin">Home</Link><span>/</span>
            <Link to="/admin/orders">Orders</Link><span>/</span>
            <span>{o.orderNumber}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="v3-h-page">{o.orderNumber}</h1>
            <span className={statusBadge(o.status)}><span className="v3-status-dot" />{o.status}</span>
            <span className={`v3-status ${payLabel === 'PAID' ? 'v3-status-strong' : 'v3-status-pending'}`}><span className="v3-status-dot" />{payLabel}</span>
            {o.discreetPackaging && <span className="v3-status v3-status-inactive">Discreet</span>}
          </div>
          <p className="v3-h-small mt-1">Placed {fmtDateTime(o.createdAt)} · {pcs} pieces · {o.items.length} products</p>
        </div>
        <div className="v3-page-header-right">
          <Link to="/admin/orders" className="v3-btn v3-btn-secondary v3-btn-sm"><ArrowLeft size={12} /> Orders</Link>
          {c.phone && <a href={waConfirm} target="_blank" rel="noreferrer" className="v3-btn v3-btn-secondary v3-btn-sm"><MessageCircle size={12} /> WhatsApp</a>}
          <button onClick={() => window.open(`/admin/orders/${id}/invoice`, '_blank')} className="v3-btn v3-btn-secondary v3-btn-sm"><Printer size={12} /> Print</button>
          <button onClick={load} disabled={busy} className="v3-btn v3-btn-icon v3-btn-ghost sm"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /></button>
          {nextMove && (
            <button disabled={busy} onClick={() => patch('/status', { status: nextMove.status }, nextMove.label)} className="v3-btn v3-btn-primary">
              <ChevronRight size={13} /> {nextMove.label}
            </button>
          )}
        </div>
      </div>

      {/* ── STATUS CONTROLS ────────────────────────────────────────────── */}
      <div className="v3-filter-bar mb-6">
        <label className="text-[11px] font-medium text-[#6B7280]">Status</label>
        <select value={o.status} onChange={(e) => {
          if (e.target.value === 'Cancelled') { setCancelOpen(true); setCancelReason(''); return; }
          patch('/status', { status: e.target.value }, 'Status updated');
        }} disabled={busy} className="v3-select" style={{ width: 180 }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <label className="text-[11px] font-medium text-[#6B7280] ml-4">Payment</label>
        <select value={o.paymentStatus} onChange={(e) => patch('/payment', { paymentStatus: e.target.value }, 'Payment updated')} disabled={busy} className="v3-select" style={{ width: 140 }}>
          {PAY.map(s => <option key={s}>{s}</option>)}
        </select>
        {editable && !editing && (
          <button onClick={startEdit} className="v3-btn v3-btn-secondary v3-btn-sm ml-auto">Edit Items</button>
        )}
      </div>

      {/* Cancel confirmation */}
      {cancelOpen && (
        <div className="v3-card mb-6">
          <div className="v3-card-body flex flex-wrap items-center gap-3">
            <span className="v3-h-label">Cancel Reason</span>
            <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="v3-select" style={{ width: 200 }}>
              <option value="">Select reason…</option>
              {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {cancelReason === 'Other' && <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Specify…" className="v3-input" style={{ width: 200 }} />}
            <button onClick={() => patch('/status', { status: 'Cancelled', note: cancelReason || 'Cancelled by admin' }, 'Order cancelled')} disabled={!cancelReason || busy} className="v3-btn v3-btn-primary v3-btn-sm">Confirm Cancel</button>
            <button onClick={() => setCancelOpen(false)} className="v3-btn v3-btn-ghost v3-btn-sm">Keep Order</button>
          </div>
        </div>
      )}

      {/* ── SUMMARY CARDS ──────────────────────────────────────────────── */}
      <div className="v3-card mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#F0F1F3]">
          {/* Customer */}
          <div className="p-5">
            <div className="v3-h-label mb-2">Customer</div>
            <p className="text-[14px] font-semibold text-[#111]">{c.name}</p>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{c.email || '—'}</p>
            <p className="text-[12px] text-[#6B7280]">{c.phone}</p>
            {reliability && <div className="mt-2"><ReliabilityBadge reliability={reliability} /></div>}
          </div>
          {/* Total */}
          <div className="p-5">
            <div className="v3-h-label mb-2">Total</div>
            <p className="text-[22px] font-bold text-[#111] tabular">{pkr(o.total)}</p>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{pcs} pieces · {o.items.length} products</p>
          </div>
          {/* Payment */}
          <div className="p-5">
            <div className="v3-h-label mb-2">Payment</div>
            <p className="text-[14px] font-semibold text-[#111]">{o.paymentMethod}</p>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{payLabel}</p>
          </div>
          {/* Shipping */}
          <div className="p-5">
            <div className="v3-h-label mb-2">Shipping</div>
            <p className="text-[13px] text-[#111]">{c.address || '—'}</p>
            <p className="text-[12px] text-[#6B7280] mt-0.5">{c.city}, {c.province}{c.postalCode ? ` — ${c.postalCode}` : ''}</p>
            {c.location?.lat != null && (
              <a href={c.location.mapsLink || `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer" className="text-[11px] font-medium text-[#111] underline mt-1 inline-block">Open in Maps</a>
            )}
          </div>
        </div>
      </div>

      {/* ── TABBED CONTENT ─────────────────────────────────────────────── */}
      <div className="v3-card">
        <div className="v3-tabs" style={{ padding: '0 20px' }}>
          {[
            { k: 'items', l: 'Items' },
            { k: 'timeline', l: 'Activity' },
            { k: 'tracking', l: 'Tracking' },
          ].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`v3-tab ${tab === t.k ? 'active' : ''}`}>{t.l}</button>
          ))}
        </div>

        <div className="p-5">
          {/* Items Tab */}
          {tab === 'items' && (
            <div>
              {!editing && o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-[#F0F1F3] py-3 last:border-b-0">
                  {it.slug
                    ? <Link to={`/product/${it.slug}`} target="_blank"><Img src={it.image} alt="" className="h-12 w-9 rounded-[3px] border border-[#E5E7EB] object-cover" /></Link>
                    : <Img src={it.image} alt="" className="h-12 w-9 rounded-[3px] border border-[#E5E7EB] object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#111]">{it.name}</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                      {[it.size, it.color].filter(Boolean).join(' · ')}
                      {(it.size || it.color) ? ' · ' : ''}
                      {pkr(it.price)} × {it.quantity}
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-[#111] tabular">{pkr(it.lineTotal)}</p>
                </div>
              ))}

              {editing && editItems.map((it, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-[#F0F1F3] py-3 last:border-b-0">
                  <Img src={it.image} alt="" className="h-12 w-9 shrink-0 rounded-[3px] border border-[#E5E7EB] object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#111]">{it.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {it.sizes.length > 0 && <select value={it.size} onChange={(e) => updLine(i, 'size', e.target.value)} className="v3-select" style={{ height: 28, fontSize: 11 }}>{it.sizes.map(s => <option key={s} value={s}>{s}</option>)}</select>}
                      {it.colors.length > 0 && <select value={it.color} onChange={(e) => updLine(i, 'color', e.target.value)} className="v3-select" style={{ height: 28, fontSize: 11 }}>{it.colors.map(col => <option key={col.name} value={col.name}>{col.name}</option>)}</select>}
                      <div className="flex items-center gap-1">
                        <button onClick={() => stepQty(i, -1)} className="w-6 h-6 rounded-[3px] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:border-[#111] hover:text-[#111]"><Minus size={10} /></button>
                        <span className="w-5 text-center text-[12px] font-medium tabular">{it.quantity}</span>
                        <button onClick={() => stepQty(i, 1)} className="w-6 h-6 rounded-[3px] border border-[#E5E7EB] flex items-center justify-center text-[#6B7280] hover:border-[#111] hover:text-[#111]"><Plus size={10} /></button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[13px] font-semibold text-[#111] tabular">{pkr(it.price * it.quantity)}</p>
                    <button onClick={() => delLine(i)} className="text-[#9CA3AF] hover:text-[#111]"><X size={12} /></button>
                  </div>
                </div>
              ))}

              {editing && (
                <div className="relative py-3">
                  <input value={pq} onChange={(e) => searchPicker(e.target.value)} placeholder="Add product — search by name or SKU…" className="v3-input" />
                  {pRes.length > 0 && (
                    <div className="absolute inset-x-0 top-12 z-20 bg-white border border-[#E5E7EB] rounded-[5px] overflow-hidden" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                      {pRes.map(p => (
                        <button key={p._id} onClick={() => addPicked(p)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F5F6F8]">
                          <Img src={p.images?.[0]?.url} alt="" className="h-8 w-6 rounded-[3px] border border-[#E5E7EB] object-cover" />
                          <span className="flex-1 truncate text-[12px] text-[#111]">{p.name}</span>
                          <span className="text-[11px] text-[#9CA3AF]">{p.sku}</span>
                          <span className="text-[12px] font-medium text-[#111]">{pkr(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Totals */}
              <div className="mt-4 space-y-2 border-t border-[#E5E7EB] pt-4 text-[13px]">
                <div className="flex justify-between"><span className="text-[#6B7280]">Subtotal</span><span className="font-medium tabular">{pkr(editing ? editSub : o.subtotal)}</span></div>
                {!!o.discount && <div className="flex justify-between"><span className="text-[#6B7280]">Discount {o.couponCode && `(${o.couponCode})`}</span><span className="tabular">− {pkr(o.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-[#6B7280]">Shipping</span><span className="font-medium tabular">{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></div>
                <div className="flex justify-between border-t border-[#E5E7EB] pt-3">
                  <span className="v3-h-label">Grand Total</span>
                  <span className="text-[18px] font-bold text-[#111] tabular">{pkr(editing ? editTotal : o.total)}</span>
                </div>
                {editing && (
                  <div className="flex items-center gap-2 pt-3">
                    <button onClick={saveItems} disabled={busy} className="v3-btn v3-btn-primary v3-btn-sm"><Save size={11} /> {busy ? 'Saving…' : 'Update Order'}</button>
                    <button onClick={() => setEditing(false)} className="v3-btn v3-btn-ghost v3-btn-sm">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {tab === 'timeline' && (
            <div>
              {(o.statusHistory || []).length === 0 ? (
                <div className="v3-empty" style={{ padding: '32px 0' }}>
                  <Clock size={20} className="v3-empty-icon" />
                  <p className="text-[12px] text-[#9CA3AF]">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(o.statusHistory || []).slice().reverse().map((h, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-[#111]' : 'bg-[#D1D5DB]'}`} />
                      <div>
                        <p className="text-[13px] font-medium text-[#111]">{h.status}</p>
                        <p className="text-[11px] text-[#9CA3AF]">{fmtDateTime(h.at)}</p>
                        {h.note && <p className="mt-0.5 text-[12px] italic text-[#6B7280]">"{h.note}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tracking Tab */}
          {tab === 'tracking' && (
            <div>
              {o.trackingNumber ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="v3-h-label mb-1">Tracking Number</div>
                      <p className="text-[14px] font-medium text-[#111] tabular">{o.trackingNumber}</p>
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(o.trackingNumber)} className="v3-btn v3-btn-icon v3-btn-ghost sm"><Copy size={13} /></button>
                  </div>
                  {o.courierName && (
                    <div>
                      <div className="v3-h-label mb-1">Courier</div>
                      <p className="text-[13px] text-[#111]">{o.courierName}</p>
                    </div>
                  )}
                  {o.trackingUrl && (
                    <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="v3-btn v3-btn-primary v3-btn-sm">
                      Track Online <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              ) : (
                <div className="v3-empty" style={{ padding: '32px 0' }}>
                  <Truck size={20} className="v3-empty-icon" />
                  <p className="v3-empty-title">No tracking info yet</p>
                  <p className="v3-empty-desc">Add a tracking number when the order ships.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete */}
      <div className="mt-8 pt-6 border-t border-[#E5E7EB] flex justify-end">
        <button onClick={remove} className="v3-btn v3-btn-ghost v3-btn-sm text-[#6B7280] hover:text-[#111]">
          <Trash2 size={12} /> Delete Order
        </button>
      </div>
    </AdminLayout>
  );
}
