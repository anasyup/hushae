import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Banknote, ChevronDown, Copy, ExternalLink, Mail,
  MapPin, MessageCircle, Minus, Package, Pencil, Phone,
  Plus, Printer, ReceiptText, RefreshCw, Save, Trash2, Truck, User, X,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * ORDER DETAIL — Shopify-style tabbed redesign. Phase 6.
 *
 * Tabs: Items · Timeline · Invoice
 * Clean 3-column layout: Main (items) + Sidebar (customer/address/payment)
 * Action bar: status, payment, print, delete — all inline with order info
 * ========================================================================== */

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const PAY = ['Pending', 'Paid', 'Verified', 'Confirmed', 'Failed', 'Refunded'];

const statusPillClass = (s) => s === 'Delivered' ? 'bg-emerald-100 text-emerald-700' : s === 'Cancelled' ? 'bg-red-100 text-red-700' : s === 'Refunded' ? 'bg-orange-100 text-orange-700' : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-purple-100 text-purple-700' : s === 'Ready to Ship' ? 'bg-blue-100 text-blue-700' : s === 'Processing' ? 'bg-sky-100 text-sky-700' : s === 'Confirmed' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700';

export default function OrderDetail() {
  const { id } = useParams();
  const { auth, toast, logout } = useApp();
  const nav = useNavigate();
  const [o, setO] = useState(null);
  const [tab, setTab] = useState('items');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api(`/orders/admin/${id}`, { token: auth.token })
    .then((d) => setO(d.order))
    .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Could not load order.'); });
  useEffect(() => { load(); }, [id]);

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

  // ── Items editing ────────────────────────────────────────────────────
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
  const addPicked = (p) => { setEditItems((a) => [...a, { product: String(p._id), name: p.name, image: p.images[0]?.url || '', price: p.price, quantity: 1, size: p.sizes[0] || '', color: p.colors[0]?.name || '', sizes: p.sizes || [], colors: p.colors || [] }]); setPq(''); setPRes([]); };
  const saveItems = async () => {
    if (!editItems.length) { toast('Order must have at least one item'); return; }
    setBusy(true);
    try { await api(`/orders/admin/${id}/items`, { method: 'PATCH', token: auth.token, body: { items: editItems.map((it) => ({ product: it.product, size: it.size, color: it.color, quantity: it.quantity })) } }); toast('Items updated — bill recalculated'); setEditing(false); await load(); }
    catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  if (err) return <AdminLayout title="Order"><div className="mx-auto grid max-w-md place-items-center rounded-2xl border border-red-200 bg-red-50 p-10"><p className="text-sm text-red-700">{err}</p><button onClick={() => { setErr(''); load(); }} className="mt-4 rounded-full border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Try again</button></div></AdminLayout>;
  if (!o) return <AdminLayout title="Order"><div className="grid gap-4"><div className="animate-pulse rounded-xl bg-neutral-100 h-20 rounded-xl" /><div className="animate-pulse rounded-xl bg-neutral-100 h-64 rounded-xl" /><div className="animate-pulse rounded-xl bg-neutral-100 h-32 rounded-xl" /></div></AdminLayout>;

  const c = o.customerInfo;
  const pcs = o.items.reduce((a, it) => a + (it.quantity || 1), 0);
  const editable = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship'].includes(o.status);
  const editSub = editItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const editTotal = Math.max(0, editSub - (o.discount || 0)) + (o.shippingCharge || 0);
  const whatsappLink = `https://wa.me/${String(c.phone || '').replace(/\D/g, '').replace(/^0/, '92')}`;

  return (
    <AdminLayout title={`Order ${o.orderNumber}`}>
      {/* ═══ TOP BAR ═══════════════════════════════════════════════ */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link to="/admin/orders" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:border-neutral-400"><ArrowLeft size={12} /> Back</Link>

        {/* Status dropdown */}
        <select value={o.status} onChange={(e) => patch('/status', { status: e.target.value }, 'Status updated')} disabled={busy}
          className={`cursor-pointer rounded-full border-0 px-3 py-2 text-[12px] font-bold uppercase tracking-wide outline-none ${statusPillClass(o.status)}`}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* Payment dropdown */}
        <select value={o.paymentStatus} onChange={(e) => patch('/payment', { paymentStatus: e.target.value }, 'Payment updated')} disabled={busy}
          className="cursor-pointer rounded-full border-0 bg-neutral-900 px-3 py-2 text-[12px] font-bold uppercase tracking-wide text-white outline-none">
          {PAY.map((s) => <option key={s}>{s}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={load} disabled={busy} className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50" title="Refresh"><RefreshCw size={13} className={busy ? 'animate-spin' : ''} /></button>
          <button onClick={() => window.open(`/admin/orders/${id}/invoice`, '_blank')} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 transition hover:bg-neutral-50"><Printer size={11} /> Invoice</button>
          <button onClick={remove} className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"><Trash2 size={11} /> Delete</button>
        </div>
      </div>

      {/* ═══ ORDER INFO STRIP ═══════════════════════════════════════ */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: User, label: 'Customer', value: c.name, sub: c.city },
          { icon: Package, label: 'Items', value: `${o.items.length} products`, sub: `${pcs} pieces` },
          { icon: Banknote, label: 'Payment', value: o.paymentMethod, sub: o.paymentStatus },
          { icon: ReceiptText, label: 'Total', value: pkr(o.total), sub: fmtDateTime(o.createdAt) },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 bg-white p-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600"><Icon size={14} /></span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold uppercase tracking-wider text-neutral-400">{label}</p>
              <p className="mt-0.5 truncate text-[13px] font-semibold text-neutral-900">{value}</p>
              <p className="truncate text-[12px] text-neutral-500">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ MAIN CONTENT ════════════════════════════════════════ */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        {/* ── Left: Items + tab content ──────────────────────────────── */}
        <div className="rounded-2xl border border-neutral-200 bg-white">
          {/* Tabs */}
          <div className="flex border-b border-neutral-100 px-5 pt-4 gap-1">
            {[
              { k: 'items', l: 'Items' },
              { k: 'timeline', l: 'Timeline' },
              { k: 'tracking', l: 'Tracking' },
            ].map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)}
                className={`px-3 pb-3 text-xs font-semibold transition border-b-2 -mb-px ${tab === t.k ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-400 hover:text-neutral-700'}`}>
                {t.l}
              </button>
            ))}
            {editable && !editing && (
              <button onClick={startEdit} className="ml-auto mb-2 inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"><Pencil size={11} /> Edit</button>
            )}
          </div>

          {/* ═══ ITEMS TAB ══════════════════════════════════════ */}
          {tab === 'items' && (
            <div className="divide-y divide-neutral-100">
              {!editing ? o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  {it.slug ? <Link to={`/product/${it.slug}`} target="_blank"><Img src={it.image} alt="" className="h-14 w-10 rounded-lg border border-neutral-200 object-cover" /></Link> : <Img src={it.image} alt="" className="h-14 w-10 rounded-lg border border-neutral-200 object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-neutral-900 leading-snug">{it.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-neutral-500">
                      {it.size && <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium">{it.size}</span>}
                      {it.color && <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium">{it.color}</span>}
                      <span className="text-neutral-400">{pkr(it.price)} × {it.quantity}</span>
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold tabular-nums text-neutral-900">{pkr(it.lineTotal)}</p>
                </div>
              )) : null}

              {/* Editing mode */}
              {editing && editItems.map((it, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Img src={it.image} alt="" className="h-14 w-10 rounded-lg border border-neutral-200 object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-neutral-900 leading-snug">{it.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {it.sizes.length > 0 && <select value={it.size} onChange={(e) => updLine(i, 'size', e.target.value)} className="rounded-lg border border-neutral-200 px-2 py-1 text-[12px] outline-none focus:border-neutral-900">{it.sizes.map((s) => <option key={s} value={s}>{s}</option>)}</select>}
                      {it.colors.length > 0 && <select value={it.color} onChange={(e) => updLine(i, 'color', e.target.value)} className="rounded-lg border border-neutral-200 px-2 py-1 text-[12px] outline-none focus:border-neutral-900">{it.colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select>}
                      <div className="flex items-center gap-1 ml-1">
                        <button type="button" onClick={() => stepQty(i, -1)} className="grid h-5 w-5 place-items-center rounded border border-neutral-200 text-neutral-500 hover:border-neutral-900"><Minus size={10} /></button>
                        <span className="w-5 text-center text-[12px] font-bold tabular-nums">{it.quantity}</span>
                        <button type="button" onClick={() => stepQty(i, 1)} className="grid h-5 w-5 place-items-center rounded border border-neutral-200 text-neutral-500 hover:border-neutral-900"><Plus size={10} /></button>
                        <span className="text-[13px] text-neutral-400">× {pkr(it.price)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <p className="text-[12px] font-bold tabular-nums">{pkr(it.price * it.quantity)}</p>
                    <button type="button" onClick={() => delLine(i)} className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"><X size={12} /></button>
                  </div>
                </div>
              ))}

              {/* Add product search */}
              {editing && (
                <div className="relative px-5 py-3">
                  <input value={pq} onChange={(e) => searchPicker(e.target.value)} placeholder="Add product — search by name or SKU…" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-[12px] outline-none focus:border-neutral-900" />
                  {pRes.length > 0 && (
                    <div className="absolute inset-x-5 top-12 z-20 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">{pRes.map((p) => (
                      <button type="button" key={p._id} onClick={() => addPicked(p)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-neutral-50">
                        <Img src={p.images[0]?.url} alt="" className="h-8 w-6 rounded object-cover" />
                        <span className="flex-1 truncate text-[12px] font-medium">{p.name}</span>
                        <span className="text-[13px] text-neutral-400">{p.sku}</span>
                        <span className="text-[12px] font-bold">{pkr(p.price)}</span>
                      </button>
                    ))}</div>
                  )}
                </div>
              )}

              {/* Totals footer */}
              <div className="space-y-1 bg-neutral-50/60 px-5 py-4 text-[12px]">
                <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{pkr(editing ? editSub : o.subtotal)}</span></div>
                {!!o.discount && <div className="flex justify-between font-medium text-emerald-700"><span>Discount {o.couponCode && `(${o.couponCode})`}</span><span>− {pkr(o.discount)}</span></div>}
                <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span>{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></div>
                <div className="flex justify-between pt-1.5 border-t border-neutral-200 text-[12px] font-semibold"><span>Total</span><span>{pkr(editing ? editTotal : o.total)}</span></div>
                {editing && (
                  <div className="flex items-center gap-2 pt-3">
                    <button onClick={saveItems} disabled={busy} className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black disabled:opacity-50"><Save size={11} /> {busy ? 'Saving…' : 'Update order'}</button>
                    <button onClick={() => setEditing(false)} className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TIMELINE TAB ═══════════════════════════════════ */}
          {tab === 'timeline' && (
            <div className="px-5 py-4">
              {(o.statusHistory || []).length === 0 ? (
                <p className="py-8 text-center text-[12px] text-neutral-400">No status history recorded.</p>
              ) : (
                <div className="space-y-3">
                  {(o.statusHistory || []).slice().reverse().map((h, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-0.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'bg-neutral-900 ring-4 ring-neutral-900/20' : 'bg-neutral-300'}`} />
                        {i < (o.statusHistory || []).length - 1 && <div className="mt-0.5 h-full w-px bg-neutral-200" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-[13px] font-semibold text-neutral-900">{h.status}</p>
                        <p className="text-[12px] text-neutral-500">{fmtDateTime(h.at)}</p>
                        {h.note && <p className="mt-0.5 text-[12px] text-neutral-600 italic">"{h.note}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ TRACKING TAB ═══════════════════════════════════ */}
          {tab === 'tracking' && (
            <div className="px-5 py-4">
              {o.trackingNumber ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
                    <div>
                      <p className="text-[13px] font-bold uppercase tracking-wider text-neutral-400">Tracking number</p>
                      <p className="mt-0.5 font-mono text-[12px] font-semibold text-neutral-900">{o.trackingNumber}</p>
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(o.trackingNumber)} className="rounded-full border border-neutral-300 bg-white p-2 text-neutral-500 hover:bg-neutral-100"><Copy size={13} /></button>
                  </div>
                  {o.courierName && (
                    <div className="rounded-lg bg-neutral-50 px-4 py-3">
                      <p className="text-[13px] font-bold uppercase tracking-wider text-neutral-400">Courier</p>
                      <p className="mt-0.5 text-[13px] font-semibold text-neutral-900">{o.courierName}</p>
                    </div>
                  )}
                  {o.trackingUrl && (
                    <a href={o.trackingUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black">
                      <Truck size={11} /> Track online <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Truck size={24} className="mx-auto mb-2 text-neutral-300" />
                  <p className="text-[12px] font-medium text-neutral-600">No tracking info yet</p>
                  <p className="mt-1 text-[12px] text-neutral-400">Add a tracking number when the order ships.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT SIDEBAR ────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Customer */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold uppercase tracking-wider text-neutral-400">Customer</p>
              <Link to={`/admin/customers`} className="text-[13px] font-semibold text-neutral-400 hover:text-neutral-900">View all</Link>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-[12px] font-bold text-white">{(c.name || '?').slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-neutral-900 truncate">{c.name}</p>
                <p className="text-[12px] text-neutral-500">{c.city}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.phone && (
                <>
                  <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"><Phone size={10} /> Call</a>
                  <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-emerald-700"><MessageCircle size={10} /> WhatsApp</a>
                </>
              )}
              {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-neutral-700 transition hover:bg-neutral-50"><Mail size={10} /> Email</a>}
            </div>
          </div>

          {/* Address */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin size={13} className="text-neutral-500" />
              <p className="text-[13px] font-bold uppercase tracking-wider text-neutral-400">Delivery address</p>
            </div>
            <p className="text-[12px] leading-relaxed text-neutral-900">{c.address}</p>
            <p className="mt-1 text-[12px] font-medium text-neutral-600">{c.city}, {c.province}{c.postalCode ? ` — ${c.postalCode}` : ''}</p>
            {c.location?.lat != null && (
              <a href={c.location.mapsLink || `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`} target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[13px] font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100">
                📍 Open in Maps
              </a>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-3">
              <Banknote size={13} className="text-neutral-500" />
              <p className="text-[13px] font-bold uppercase tracking-wider text-neutral-400">Payment</p>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-neutral-500">Method</span><span className="font-semibold">{o.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-neutral-500">Status</span><span className="font-semibold">{o.paymentStatus}</span></div>
              {o.transactionId && <div className="flex justify-between"><span className="text-neutral-500">Txn ID</span><span className="font-mono text-[12px]">{o.transactionId.slice(0, 16)}…</span></div>}
              <div className="flex justify-between"><span className="text-neutral-500">Packaging</span><span className="font-semibold">{o.discreetPackaging ? 'Discreet' : 'Standard'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
