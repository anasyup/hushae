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
import { btnGhost, btnIcon, btnSolid, ctl, ctlInline, MonoStatus } from './orders/orderUi';

/* ============================================================================
 * ORDER DETAIL — Phase 5 Premium Rebuild
 * Professional order workspace. White + Jet Black.
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
        <div className="rounded-md border border-[#EAEAEA] bg-white py-20 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#999999]">Unable to load order</p>
          <p className="mt-3 text-[13px] text-[#777777]">{err}</p>
          <button onClick={() => { setErr(''); load(); }} className="mt-6 rounded-md border border-[#DCDCDC] bg-white px-5 py-2 text-[12px] font-medium text-black transition hover:bg-[#F5F5F5]">Try again</button>
        </div>
      </AdminLayout>
    );
  }

  if (!o) {
    return (
      <AdminLayout title="Order">
        <div className="space-y-6" aria-hidden>
          <div className="h-20 v2-skeleton rounded-md" />
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 v2-skeleton rounded-md" />)}
          </div>
          <div className="h-72 v2-skeleton rounded-md" />
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
      <div className="mb-10 flex flex-wrap items-center gap-3 border-b border-[#EAEAEA] pb-5">
        <MonoStatus label={String(o.status || '').toUpperCase()} />
        <MonoStatus label={payLabel} />
        {o.discreetPackaging && <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#AAAAAA]">Discreet pack</span>}

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
        <div className="mb-8 flex flex-wrap items-center gap-2 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] p-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Cancel reason</span>
          <select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className={ctlInline}>
            <option value="">Select reason…</option>
            {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {cancelReason === 'Other' && (
            <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Specify…" className={ctl} style={{ maxWidth: 200 }} />
          )}
          <button onClick={() => patch('/status', { status: 'Cancelled', note: cancelReason || 'Cancelled by admin' }, 'Order cancelled')} disabled={!cancelReason || busy} className={btnSolid}>Confirm cancel</button>
          <button onClick={() => setCancelOpen(false)} className={btnGhost}>Keep order</button>
        </div>
      )}

      {/* Customer + Money tiles */}
      <div className="mb-10 grid gap-4 lg:grid-cols-4">
        <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Customer</p>
          <p className="mt-3 text-[15px] font-semibold text-black">{c.name}</p>
          <p className="mt-1 text-[13px] text-[#777777]">{c.email || '—'}</p>
          <p className="mt-0.5 text-[13px] text-[#777777]">{c.phone}</p>
          {reliability && <div className="mt-2"><ReliabilityBadge reliability={reliability} /></div>}
        </div>
        <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Total</p>
          <p className="mt-3 text-[24px] font-semibold tracking-tight text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(o.total)}</p>
          <p className="mt-1 text-[12px] text-[#999999]">{pcs} piece{pcs === 1 ? '' : 's'} · {o.items.length} product{o.items.length === 1 ? '' : 's'}</p>
        </div>
        <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Payment</p>
          <p className="mt-3 text-[15px] font-semibold text-black">{o.paymentMethod}</p>
          <p className="mt-1 text-[13px] text-[#777777]">{payLabel}</p>
        </div>
        <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Created</p>
          <p className="mt-3 text-[15px] font-semibold text-black">{fmtDateTime(o.createdAt)}</p>
          <p className="mt-1 text-[13px] text-[#777777]">{o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online payment'}</p>
        </div>
      </div>

      {/* Shipping */}
      <section className="mb-10">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Shipping Address</p>
        <div className="rounded-md border border-[#EAEAEA] bg-white p-5">
          <p className="text-[14px] leading-relaxed text-black">{c.address}</p>
          <p className="mt-1.5 text-[13px] text-[#999999]">{c.city}, {c.province}{c.postalCode ? ` — ${c.postalCode}` : ''}</p>
          {c.location?.lat != null && (
            <a href={c.location.mapsLink || `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#777777] transition-colors hover:text-black">
              Open in Maps <ExternalLink size={11} />
            </a>
          )}
        </div>
      </section>

      {/* Items / timeline / tracking */}
      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">Items & Details</p>
          {editable && !editing && (
            <button onClick={startEdit} className={btnGhost}>Edit Items</button>
          )}
        </div>

        <div className="rounded-md border border-[#EAEAEA] bg-white">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#EAEAEA] px-5">
            {[
              { k: 'items', l: 'Items' },
              { k: 'timeline', l: 'Timeline' },
              { k: 'tracking', l: 'Tracking' },
            ].map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`border-b-2 pb-3 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${
                  tab === t.k ? 'border-black text-black' : 'border-transparent text-[#AAAAAA] hover:text-[#777777]'
                }`}>
                {t.l}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === 'items' && (
              <div>
                {!editing && o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-4 border-b border-[#F0F0F0] py-4 last:border-b-0">
                    {it.slug
                      ? <Link to={`/product/${it.slug}`} target="_blank"><Img src={it.image} alt="" className="h-14 w-11 rounded-md border border-[#EAEAEA] object-cover" /></Link>
                      : <Img src={it.image} alt="" className="h-14 w-11 rounded-md border border-[#EAEAEA] object-cover" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium leading-snug text-black">{it.name}</p>
                      <p className="mt-1 text-[12px] text-[#999999]">
                        {[it.size, it.color].filter(Boolean).join(' · ')}
                        {(it.size || it.color) ? ' · ' : ''}
                        {pkr(it.price)} × {it.quantity}
                      </p>
                    </div>
                    <p className="text-[14px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(it.lineTotal)}</p>
                  </div>
                ))}

                {editing && editItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-4 border-b border-[#F0F0F0] py-4 last:border-b-0">
                    <Img src={it.image} alt="" className="h-14 w-11 shrink-0 rounded-md border border-[#EAEAEA] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium leading-snug text-black">{it.name}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
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
                          <button type="button" onClick={() => stepQty(i, -1)} className="grid h-7 w-7 place-items-center rounded-md border border-[#DCDCDC] text-[#777777] transition hover:border-black hover:text-black"><Minus size={11} /></button>
                          <span className="w-6 text-center text-[13px] font-medium text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{it.quantity}</span>
                          <button type="button" onClick={() => stepQty(i, 1)} className="grid h-7 w-7 place-items-center rounded-md border border-[#DCDCDC] text-[#777777] transition hover:border-black hover:text-black"><Plus size={11} /></button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-[14px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(it.price * it.quantity)}</p>
                      <button type="button" onClick={() => delLine(i)} className="text-[#AAAAAA] transition hover:text-black"><X size={13} /></button>
                    </div>
                  </div>
                ))}

                {editing && (
                  <div className="relative py-4">
                    <input value={pq} onChange={(e) => searchPicker(e.target.value)} placeholder="Add product — search by name or SKU…" className={ctl} />
                    {pRes.length > 0 && (
                      <div className="absolute inset-x-0 top-14 z-20 overflow-hidden rounded-md border border-[#EAEAEA] bg-white" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                        {pRes.map((p) => (
                          <button type="button" key={p._id} onClick={() => addPicked(p)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[#FAFAFA]">
                            <Img src={p.images?.[0]?.url} alt="" className="h-9 w-7 rounded-md border border-[#EAEAEA] object-cover" />
                            <span className="flex-1 truncate text-[13px] text-black">{p.name}</span>
                            <span className="text-[11px] text-[#AAAAAA]">{p.sku}</span>
                            <span className="text-[13px] font-medium text-black">{pkr(p.price)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 space-y-2.5 border-t border-[#EAEAEA] pt-5 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#999999]">Subtotal</span><span className="font-medium text-black">{pkr(editing ? editSub : o.subtotal)}</span></div>
                  {!!o.discount && <div className="flex justify-between text-[#555555]"><span>Discount {o.couponCode && `(${o.couponCode})`}</span><span>− {pkr(o.discount)}</span></div>}
                  <div className="flex justify-between"><span className="text-[#999999]">Shipping</span><span className="font-medium text-black">{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></div>
                  <div className="flex justify-between border-t border-[#EAEAEA] pt-4">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Grand Total</span>
                    <span className="text-[20px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(editing ? editTotal : o.total)}</span>
                  </div>
                  <p className="text-[11px] text-[#AAAAAA]">{o.items.length} products · {pcs} pieces · {fmtDateTime(o.createdAt)}</p>
                  {editing && (
                    <div className="flex items-center gap-2 pt-4">
                      <button onClick={saveItems} disabled={busy} className={btnSolid}><Save size={11} /> {busy ? 'Saving…' : 'Update order'}</button>
                      <button onClick={() => setEditing(false)} className={btnGhost}>Cancel</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'timeline' && (
              <div>
                {(o.statusHistory || []).length === 0 ? (
                  <p className="py-12 text-center text-[13px] text-[#AAAAAA]">No status history recorded.</p>
                ) : (
                  <div className="space-y-5">
                    {(o.statusHistory || []).slice().reverse().map((h, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${i === 0 ? 'bg-black' : 'bg-[#DCDCDC]'}`} />
                        <div>
                          <p className="text-[14px] font-medium text-black">{h.status}</p>
                          <p className="mt-0.5 text-[12px] text-[#999999]">{fmtDateTime(h.at)}</p>
                          {h.note && <p className="mt-1 text-[13px] italic text-[#777777]">"{h.note}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'tracking' && (
              <div>
                {o.trackingNumber ? (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Tracking Number</p>
                        <p className="mt-2 text-[15px] font-medium text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.trackingNumber}</p>
                      </div>
                      <button onClick={() => navigator.clipboard?.writeText(o.trackingNumber)} className={btnIcon} aria-label="Copy tracking"><Copy size={13} /></button>
                    </div>
                    {o.courierName && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Courier</p>
                        <p className="mt-2 text-[14px] text-black">{o.courierName}</p>
                      </div>
                    )}
                    {o.trackingUrl && (
                      <a href={o.trackingUrl} target="_blank" rel="noreferrer" className={btnSolid}>
                        Track online <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#999999]">No tracking info yet</p>
                    <p className="mt-2 text-[13px] text-[#AAAAAA]">Add a tracking number when the order ships.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </AdminLayout>
  );
}
