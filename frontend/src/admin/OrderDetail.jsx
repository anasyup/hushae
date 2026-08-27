import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Copy, ExternalLink, Minus, Plus, RefreshCw, Save, Trash2, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import Img from '../components/Img';
import ReliabilityBadge from './ReliabilityBadge';
import { CANCEL_REASONS } from './orders/orderConstants';
import TrackingModal from './orders/TrackingModal';
import { btnGhost, btnIcon, btnSolid, ctl, ctlInline, MonoStatus } from './orders/orderUi';

/* ===========================================================================
 * ORDER DETAIL — Phase 03-R editorial presentation.
 * Functionality unchanged: status, payment, items edit, delete, tracking.
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
  const [trackOpen, setTrackOpen] = useState(false);
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

  if (err) {
    return (
      <AdminLayout title="Order">
        <div className="border-y border-white/10 py-16 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/80">Unable to load order</p>
          <p className="mt-3 text-[13px] text-white/35">{err}</p>
          <button onClick={() => { setErr(''); load(); }} className={`${btnGhost} mt-6`}>Try again</button>
        </div>
      </AdminLayout>
    );
  }

  if (!o) {
    return (
      <AdminLayout title="Order">
        <div className="space-y-6" aria-hidden>
          <div className="h-16 animate-pulse bg-white/5" />
          <div className="grid grid-cols-2 gap-px border-y border-white/10 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse bg-white/[0.04]" />)}
          </div>
          <div className="h-64 animate-pulse bg-white/[0.04]" />
        </div>
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
      <PageHeader
        title={o.orderNumber}
        description="Customer, payment, fulfillment and items."
        actions={(
          <>
            <Link to="/admin/orders" className={btnGhost}><ArrowLeft size={12} /> Back</Link>
            {c.phone && (
              <a href={waConfirm} target="_blank" rel="noreferrer" className={btnGhost}>WhatsApp</a>
            )}
            {nextMove && (
              <button type="button" disabled={busy} onClick={() => patch('/status', { status: nextMove.status }, nextMove.label)} className={btnSolid}>
                {nextMove.label}
              </button>
            )}
            <button type="button" onClick={() => window.open(`/admin/orders/${id}/invoice`, '_blank')} className={btnGhost}>Print</button>
            <button onClick={load} disabled={busy} className={btnIcon} title="Refresh"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /></button>
            <button onClick={remove} className={btnGhost}><Trash2 size={11} /> Delete</button>
          </>
        )}
      />

      {/* Status / payment controls */}
      <div className="mb-10 flex flex-wrap items-center gap-3 border-b border-white/10 pb-5">
        <MonoStatus label={String(o.status || '').toUpperCase()} />
        <MonoStatus label={payLabel} />
        {o.discreetPackaging && <span className="text-[9px] font-medium uppercase tracking-[0.16em] text-white/40">Discreet pack</span>}

        <select
          value={o.status}
          onChange={(e) => {
            if (e.target.value === 'Cancelled') { setCancelOpen(true); setCancelReason(''); return; }
            patch('/status', { status: e.target.value }, 'Status updated');
          }}
          disabled={busy}
          aria-label="Order status"
          className={`${ctlInline} ml-auto`}
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={o.paymentStatus}
          onChange={(e) => patch('/payment', { paymentStatus: e.target.value }, 'Payment updated')}
          disabled={busy}
          aria-label="Payment status"
          className={ctlInline}
        >
          {PAY.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {cancelOpen && (
        <div className="mb-8 flex flex-wrap items-center gap-2 border-y border-white/10 py-3">
          <span className="adm-label">Cancel reason</span>
          <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className={ctlInline}>
            <option value="">Select reason…</option>
            {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {cancelReason === 'Other' && (
            <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Describe…" className={ctlInline} />
          )}
          <button
            disabled={!cancelReason || busy}
            onClick={() => { patch('/status', { status: 'Cancelled', cancelReason }, 'Order cancelled'); setCancelOpen(false); }}
            className={btnSolid}
          >
            Confirm
          </button>
          <button onClick={() => setCancelOpen(false)} className={btnGhost}>Dismiss</button>
        </div>
      )}

      {/* Order information */}
      <section className="mb-10">
        <p className="adm-index">Order information</p>
        <div className="grid gap-8 border-y border-white/10 py-6 md:grid-cols-2">
          <div>
            <p className="adm-label mb-3">Customer</p>
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center bg-white text-[11px] font-medium text-black">
                {(c.name || '?').slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-medium text-white">{c.name}</p>
                  <ReliabilityBadge reliability={reliability} />
                </div>
                <p className="mt-0.5 text-[12px] text-white/40">{c.city}{c.province ? `, ${c.province}` : ''}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {c.phone && <a href={`tel:${c.phone}`} className="text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white">Call</a>}
                  {c.phone && <a href={whatsappLink} target="_blank" rel="noreferrer" className="text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white">WhatsApp</a>}
                  {c.email && <a href={`mailto:${c.email}`} className="text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white">Email</a>}
                  {o.customer && <Link to={`/admin/customers/${o.customer?._id || o.customer}`} className="text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white">Customer 360</Link>}
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="adm-label mb-3">Payment</p>
            <dl className="space-y-2 text-[13px]">
              <div className="flex justify-between gap-4"><dt className="text-white/35">Method</dt><dd className="text-white">{o.paymentMethod}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-white/35">Status</dt><dd className="text-white">{o.paymentStatus}</dd></div>
              {o.transactionId && <div className="flex justify-between gap-4"><dt className="text-white/35">Txn ID</dt><dd className="font-mono text-[12px] text-white/70">{o.transactionId}</dd></div>}
              <div className="flex justify-between gap-4"><dt className="text-white/35">Packaging</dt><dd className="text-white">{o.discreetPackaging ? 'Discreet' : 'Standard'}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* Shipping */}
      <section className="mb-10">
        <p className="adm-index">Shipping</p>
        <div className="border-y border-white/10 py-6">
          <p className="text-[13px] leading-relaxed text-white/85">{c.address}</p>
          <p className="mt-1 text-[12px] text-white/40">{c.city}, {c.province}{c.postalCode ? ` — ${c.postalCode}` : ''}</p>
          {c.location?.lat != null && (
            <a href={c.location.mapsLink || `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-white/50 hover:text-white">
              Open in Maps <ExternalLink size={10} />
            </a>
          )}
        </div>
      </section>

      {/* Items / timeline / tracking */}
      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="adm-index mb-0 flex-1">Items</p>
          {editable && !editing && (
            <button onClick={startEdit} className={btnGhost}>Edit</button>
          )}
        </div>

        <div className="flex gap-5 border-b border-white/10">
          {[
            { k: 'items', l: 'Items' },
            { k: 'timeline', l: 'Timeline' },
            { k: 'tracking', l: 'Tracking' },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`pb-2.5 text-[10px] font-medium uppercase tracking-[0.16em] transition-colors ${
                tab === t.k ? 'border-b border-white text-white' : 'border-b border-transparent text-white/35 hover:text-white/70'
              }`}>
              {t.l}
            </button>
          ))}
        </div>

        {tab === 'items' && (
          <div>
            {!editing && o.items.map((it, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-white/5 py-3.5">
                {it.slug
                  ? <Link to={`/product/${it.slug}`} target="_blank"><Img src={it.image} alt="" className="h-14 w-10 object-cover" /></Link>
                  : <Img src={it.image} alt="" className="h-14 w-10 object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug text-white">{it.name}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">
                    {[it.size, it.color].filter(Boolean).join(' · ')}
                    {(it.size || it.color) ? ' · ' : ''}
                    {pkr(it.price)} × {it.quantity}
                  </p>
                </div>
                <p className="adm-metric text-[13px] text-white">{pkr(it.lineTotal)}</p>
              </div>
            ))}

            {editing && editItems.map((it, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-white/5 py-3.5">
                <Img src={it.image} alt="" className="h-14 w-10 shrink-0 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium leading-snug text-white">{it.name}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {it.sizes.length > 0 && (
                      <select value={it.size} onChange={(e) => updLine(i, 'size', e.target.value)} className={ctlInline}>
                        {it.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    )}
                    {it.colors.length > 0 && (
                      <select value={it.color} onChange={(e) => updLine(i, 'color', e.target.value)} className={ctlInline}>
                        {it.colors.map((col) => <option key={col.name} value={col.name}>{col.name}</option>)}
                      </select>
                    )}
                    <div className="ml-1 flex items-center gap-1">
                      <button type="button" onClick={() => stepQty(i, -1)} className="grid h-6 w-6 place-items-center border border-white/20 text-white/60 hover:text-white"><Minus size={10} /></button>
                      <span className="w-5 text-center text-[12px] tabular-nums text-white">{it.quantity}</span>
                      <button type="button" onClick={() => stepQty(i, 1)} className="grid h-6 w-6 place-items-center border border-white/20 text-white/60 hover:text-white"><Plus size={10} /></button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <p className="adm-metric text-[13px] text-white">{pkr(it.price * it.quantity)}</p>
                  <button type="button" onClick={() => delLine(i)} className="text-white/30 hover:text-white"><X size={12} /></button>
                </div>
              </div>
            ))}

            {editing && (
              <div className="relative py-3">
                <input value={pq} onChange={(e) => searchPicker(e.target.value)} placeholder="Add product — search by name or SKU…" className={ctl} />
                {pRes.length > 0 && (
                  <div className="absolute inset-x-0 top-12 z-20 overflow-hidden border border-white/15 bg-[#0D0D0D]">
                    {pRes.map((p) => (
                      <button type="button" key={p._id} onClick={() => addPicked(p)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5">
                        <Img src={p.images?.[0]?.url} alt="" className="h-8 w-6 object-cover" />
                        <span className="flex-1 truncate text-[12px] text-white">{p.name}</span>
                        <span className="text-[11px] text-white/30">{p.sku}</span>
                        <span className="text-[12px] text-white">{pkr(p.price)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 border-t border-white/10 py-5 text-[13px]">
              <div className="flex justify-between"><span className="text-white/35">Subtotal</span><span className="text-white">{pkr(editing ? editSub : o.subtotal)}</span></div>
              {!!o.discount && <div className="flex justify-between text-white/80"><span>Discount {o.couponCode && `(${o.couponCode})`}</span><span>− {pkr(o.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-white/35">Shipping</span><span className="text-white">{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="adm-label">Grand total</span>
                <span className="adm-metric text-[18px] text-white">{pkr(editing ? editTotal : o.total)}</span>
              </div>
              <p className="text-[11px] text-white/30">{o.items.length} products · {pcs} pieces · {fmtDateTime(o.createdAt)}</p>
              {editing && (
                <div className="flex items-center gap-2 pt-3">
                  <button onClick={saveItems} disabled={busy} className={btnSolid}><Save size={11} /> {busy ? 'Saving…' : 'Update order'}</button>
                  <button onClick={() => setEditing(false)} className={btnGhost}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'timeline' && (
          <div className="py-6">
            {(o.statusHistory || []).length === 0 ? (
              <p className="py-10 text-center text-[12px] text-white/35">No status history recorded.</p>
            ) : (
              <div className="space-y-4">
                {(o.statusHistory || []).slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/25'}`} />
                    <div>
                      <p className="text-[13px] text-white">{h.status}</p>
                      <p className="text-[11px] text-white/35">{fmtDateTime(h.at)}</p>
                      {h.note && <p className="mt-0.5 text-[12px] italic text-white/50">“{h.note}”</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'tracking' && (
          <div className="py-6">
            <div className="flex justify-end pb-3">
              <button type="button" onClick={() => setTrackOpen(true)} className={btnGhost}>
                Add / edit tracking
              </button>
            </div>
            {o.trackingNumber ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="adm-label">Tracking number</p>
                    <p className="mt-1 font-mono text-[14px] text-white">{o.trackingNumber}</p>
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(o.trackingNumber)} className={btnIcon} aria-label="Copy tracking"><Copy size={13} /></button>
                </div>
                {o.courierName && (
                  <div>
                    <p className="adm-label">Courier</p>
                    <p className="mt-1 text-[13px] text-white">{o.courierName}</p>
                  </div>
                )}
                {o.trackingUrl && (
                  <a href={o.trackingUrl} target="_blank" rel="noreferrer" className={btnSolid}>
                    Track online <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ) : (
              <div className="py-10 text-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">No tracking info yet</p>
                <p className="mt-2 text-[12px] text-white/35">Add a tracking number when the order ships.</p>
              </div>
            )}
          </div>
        )}
      </section>
      {trackOpen && o && (
        <TrackingModal
          order={o}
          stageLabel=""
          busy={false}
          onSubmit={async ({ courier, tracking }) => {
            setTrackOpen(false);
            try {
              await api(`/orders/manage/${o._id}/tracking`, {
                method: 'PATCH', token: auth.token, body: { courier, tracking },
              });
              setO({ ...o, courierName: courier, trackingNumber: tracking });
            } catch { /* silent */ }
          }}
          onClose={() => setTrackOpen(false)}
        />
      )}
    </AdminLayout>
  );
}
