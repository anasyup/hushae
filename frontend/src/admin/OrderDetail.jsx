import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, MapPin, Minus, Package, Pencil, Plus, Printer, ReceiptText, Save, Trash2, User, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, fmtDateTime, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import { statusPill } from './Orders';
import Img from '../components/Img';

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const PAY = ['Pending', 'Paid', 'Failed', 'Refunded'];

export default function OrderDetail() {
  const { id } = useParams();
  const { auth, toast, logout } = useApp();
  const nav = useNavigate();
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api(`/orders/admin/${id}`, { token: auth.token })
    .then((d) => setO(d.order))
    .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Order load nahi hua — internet check kar ke dobara try karein.'); });
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const patch = async (path, body, msg) => {
    try { await api(`/orders/admin/${id}${path}`, { method: 'PATCH', token: auth.token, body }); await load(); toast(msg); }
    catch (ex) { toast(ex.message); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete order ${o.orderNumber} permanently?\n\nYe record hamesha ke liye delete ho jayega.`)) return;
    try { await api(`/orders/admin/${id}`, { method: 'DELETE', token: auth.token }); toast('Order deleted'); nav('/admin/orders'); }
    catch (ex) { toast(ex.message); }
  };

  /* ---- items editing (upgrade order before shipping) ---- */
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
      return {
        product: String(i.product), name: i.name, image: i.image, price: i.price, quantity: i.quantity, size: i.size, color: i.color,
        sizes: p.sizes?.length ? p.sizes : [i.size].filter(Boolean), colors: p.colors?.length ? p.colors : (i.color ? [{ name: i.color }] : []),
      };
    }));
    setPq(''); setPRes([]);
    setEditing(true);
  };
  const updLine = (i, k, v) => setEditItems((a) => a.map((it, j) => (j === i ? { ...it, [k]: v } : it)));
  const stepQty = (i, d) => setEditItems((a) => a.map((it, j) => (j === i ? { ...it, quantity: Math.min(10, Math.max(1, it.quantity + d)) } : it)));
  const delLine = (i) => setEditItems((a) => a.filter((_, j) => j !== i));
  const searchPicker = async (q) => {
    setPq(q);
    if (q.trim().length < 2) { setPRes([]); return; }
    try { const d = await api(`/products/admin/list?q=${encodeURIComponent(q.trim())}`, { token: auth.token }); setPRes(d.products.filter((p) => p.isActive && p.status !== 'draft').slice(0, 6)); } catch { setPRes([]); }
  };
  const addPicked = (p) => {
    setEditItems((a) => [...a, { product: String(p._id), name: p.name, image: p.images[0]?.url || '', price: p.price, quantity: 1, size: p.sizes[0] || '', color: p.colors[0]?.name || '', sizes: p.sizes || [], colors: p.colors || [] }]);
    setPq(''); setPRes([]);
  };
  const saveItems = async () => {
    if (!editItems.length) { toast('Order must have at least one item'); return; }
    try {
      await api(`/orders/admin/${id}/items`, { method: 'PATCH', token: auth.token, body: { items: editItems.map((it) => ({ product: it.product, size: it.size, color: it.color, quantity: it.quantity })) } });
      toast('Order updated — bill recalculated');
      setEditing(false);
      await load();
    } catch (ex) { toast(ex.message); }
  };

  if (err) return (
    <AdminLayout title="Order">
      <div className="card mx-auto max-w-md p-10 text-center">
        <p className="text-sm text-red-700">{err}</p>
        <button onClick={() => { setErr(''); load(); }} className="btn-outline mt-5 !px-5 !py-2 !text-[11px]">Try again</button>
      </div>
    </AdminLayout>
  );
  if (!o) return <AdminLayout title="Order"><div className="skeleton h-96 w-full" /></AdminLayout>;
  const c = o.customerInfo;
  const pcs = o.items.reduce((a, it) => a + (it.quantity || 1), 0);
  const editable = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship'].includes(o.status);
  const editSub = editItems.reduce((s, it) => s + it.price * it.quantity, 0);
  const editTotal = Math.max(0, editSub - (o.discount || 0)) + (o.shippingCharge || 0);

  const summary = [
    [User, 'Customer', c.name, c.city],
    [Package, 'Items', `${o.items.length} products`, `${pcs} pieces`],
    [Banknote, 'Payment', o.paymentMethod, o.paymentStatus],
    [ReceiptText, 'Grand total', pkr(o.total), o.status],
  ];

  return (
    <AdminLayout title={`Order ${o.orderNumber}`}>
      {/* Action bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/orders" className="btn-outline !px-4 !py-2 !text-[11px]"><ArrowLeft size={13} /> All orders</Link>
        <select value={o.status} onChange={(e) => patch('/status', { status: e.target.value }, 'Status updated')} className={`pill cursor-pointer !px-4 !py-2.5 ${statusPill(o.status)}`}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={o.paymentStatus} onChange={(e) => patch('/payment', { paymentStatus: e.target.value }, 'Payment updated')} className="pill cursor-pointer bg-obsidian/85 !px-4 !py-2.5 text-alabaster">
          {PAY.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => window.print()} className="btn-outline !px-4 !py-2 !text-[11px]"><Printer size={13} /> Print invoice</button>
        <button onClick={remove} className="btn-outline !border-red-300 !px-4 !py-2 !text-[11px] !text-red-700 hover:!bg-red-50"><Trash2 size={13} /> Delete order</button>
        <span className="text-xs text-ash">{fmtDateTime(o.createdAt)}</span>
      </div>

      {/* Summary strip */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map(([Icon, label, v1, v2]) => (
          <div key={label} className="card flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-satin text-sagedeep"><Icon size={16} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ash">{label}</p>
              <p className="mt-0.5 truncate text-sm font-semibold">{v1}</p>
              <p className="truncate text-[11px] text-ash">{v2}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: items + timeline */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-satin/30 px-6 py-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Ordered items</p>
              {editable && !editing && (
                <button onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-alabaster px-3.5 py-1.5 text-[11px] font-bold text-obsidian transition hover:border-obsidian"><Pencil size={12} /> Edit items</button>
              )}
            </div>
            <div className="divide-y divide-line/60 px-6">
              {!editing && o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  {it.slug
                    ? <Link to={`/product/${it.slug}`} target="_blank" title="Open in store"><Img src={it.image} alt="" className="h-16 w-12 rounded-xl border border-line object-cover" /></Link>
                    : <Img src={it.image} alt="" className="h-16 w-12 rounded-xl border border-line object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{it.name}</p>
                    <p className="mt-1 text-xs text-ash">
                      <span className="rounded-md bg-satin px-2 py-0.5 font-medium">{it.size}</span>
                      {it.color && <span className="ml-1.5 rounded-md bg-satin px-2 py-0.5 font-medium">{it.color}</span>}
                    </p>
                    <p className="mt-1 text-[11px] text-ash">{pkr(it.price)} × {it.quantity}</p>
                  </div>
                  <p className="text-sm font-bold">{pkr(it.lineTotal)}</p>
                </div>
              ))}

              {editing && editItems.map((it, i) => (
                <div key={i} className="flex items-center gap-4 py-4">
                  <Img src={it.image} alt="" className="h-16 w-12 rounded-xl border border-line object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{it.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {it.sizes.length > 0 && (
                        <select value={it.size} onChange={(e) => updLine(i, 'size', e.target.value)} className="input !w-auto !px-2.5 !py-1 !text-[11px]">
                          {it.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                      {it.colors.length > 0 && (
                        <select value={it.color} onChange={(e) => updLine(i, 'color', e.target.value)} className="input !w-auto !px-2.5 !py-1 !text-[11px]">
                          {it.colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => stepQty(i, -1)} className="grid h-6 w-6 place-items-center rounded-full border border-line transition hover:border-obsidian"><Minus size={11} /></button>
                      <b className="w-5 text-center text-xs">{it.quantity}</b>
                      <button type="button" onClick={() => stepQty(i, 1)} className="grid h-6 w-6 place-items-center rounded-full border border-line transition hover:border-obsidian"><Plus size={11} /></button>
                      <span className="ml-1 text-[11px] text-ash">× {pkr(it.price)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-bold">{pkr(it.price * it.quantity)}</p>
                    <button type="button" onClick={() => delLine(i)} className="rounded-full p-1.5 text-ash transition hover:bg-red-50 hover:text-red-700" title="Remove item"><X size={14} /></button>
                  </div>
                </div>
              ))}

              {editing && (
                <div className="relative py-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-ash">Add a product to this order</p>
                  <input value={pq} onChange={(e) => searchPicker(e.target.value)} placeholder="Search by name or SKU…" className="input !py-2.5 text-sm" />
                  {pRes.length > 0 && (
                    <div className="absolute inset-x-0 top-[84px] z-20 overflow-hidden rounded-xl border border-line bg-alabaster shadow-card">
                      {pRes.map((p) => (
                        <button type="button" key={p._id} onClick={() => addPicked(p)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-satin/50">
                          <Img src={p.images[0]?.url} alt="" className="h-9 w-7 rounded-md object-cover" />
                          <span className="flex-1 truncate text-xs font-medium">{p.name}</span>
                          <span className="font-mono text-[10px] text-ash">{p.sku}</span>
                          <span className="text-xs font-bold">{pkr(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5 border-t border-line bg-satin/20 px-6 py-5 text-sm">
              <p className="flex justify-between"><span className="text-ash">Subtotal</span><span>{pkr(editing ? editSub : o.subtotal)}</span></p>
              {!!o.discount && <p className="flex justify-between font-medium text-sagedeep"><span>Discount {o.couponCode ? `(${o.couponCode})` : ''}</span><span>− {pkr(o.discount)}</span></p>}
              <p className="flex justify-between"><span className="text-ash">Shipping</span><span>{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></p>
              <p className="flex justify-between pt-1 font-display text-xl"><span>Total</span><span>{pkr(editing ? editTotal : o.total)}</span></p>
              {editing && (
                <div className="flex items-center gap-3 !pt-4">
                  <button onClick={saveItems} className="btn-primary !px-5 !py-2.5 !text-[11px]"><Save size={13} /> Update order</button>
                  <button onClick={() => setEditing(false)} className="btn-outline !px-5 !py-2.5 !text-[11px]">Cancel</button>
                  <span className="text-[11px] text-ash">Stock & bill dono apne aap recalculate honge</span>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ash">Status timeline</p>
            <ol className="space-y-2.5">
              {o.statusHistory.map((h, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className={`h-2 w-2 rounded-full ${i === o.statusHistory.length - 1 ? 'bg-sagedeep' : 'bg-line'}`} />
                  <b className="w-36">{h.status}</b>
                  <span className="text-xs text-ash">{fmtDateTime(h.at)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* RIGHT: customer / address / payment */}
        <div className="space-y-6">
          <div className="card p-6">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ash"><User size={13} /> Customer</p>
            <p className="text-[15px] font-bold">{c.name}</p>
            <a href={`tel:${c.phone}`} className="mt-2 block font-mono text-sm text-obsidian hover:underline">{c.phone}</a>
            {c.email && <a href={`mailto:${c.email}`} className="mt-1 block break-all text-sm text-ash hover:underline">{c.email}</a>}
            {c.notes && <p className="mt-3 rounded-xl bg-satin/40 p-3 text-xs italic text-ash">“{c.notes}”</p>}
          </div>

          <div className="card p-6">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ash"><MapPin size={13} /> Delivery address</p>
            <p className="text-sm leading-relaxed">{c.address}</p>
            <p className="mt-1 text-sm font-medium">{c.city}, {c.province}{c.postalCode ? ` — ${c.postalCode}` : ''}</p>
            {c.location?.lat != null && c.location?.lng != null && (
              <a href={c.location.mapsLink || `https://www.google.com/maps?q=${c.location.lat},${c.location.lng}`}
                target="_blank" rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100">
                📍 Pin location — open in Google Maps
              </a>
            )}
          </div>

          <div className="card p-6">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ash"><Banknote size={13} /> Payment details</p>
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span className="text-ash">Method</span><b>{o.paymentMethod}</b></p>
              <p className="flex justify-between"><span className="text-ash">Status</span><b>{o.paymentStatus}</b></p>
              {o.transactionId && <p className="flex justify-between"><span className="text-ash">Txn ID</span><b className="font-mono text-xs">{o.transactionId}</b></p>}
              <p className="flex justify-between"><span className="text-ash">Packaging</span><b>{o.discreetPackaging ? 'Discreet (plain)' : 'Standard'}</b></p>
            </div>
          </div>
        </div>
      </div>

      <PremiumInvoice o={o} />
    </AdminLayout>
  );
}

/* ===== Premium printable invoice — original VÉLOURA design (screen-hidden, print-only) ===== */
function PremiumInvoice({ o }) {
  const c = o.customerInfo;
  return (
    <div id="invoice" className="invoice-sheet" aria-hidden="true">
      <div className="inv-page">
        <header className="inv-header">
          <div>
            <p className="inv-brand">V É L O U R A</p>
            <p className="inv-tag">Second Skin, First Choice.</p>
          </div>
          <div className="inv-title-block">
            <p className="inv-title">INVOICE</p>
            <p className="inv-meta"><span>Invoice No</span> {o.orderNumber}</p>
            <p className="inv-meta"><span>Issue Date</span> {fmtDate(o.createdAt)}</p>
          </div>
        </header>
        <hr className="inv-rule" />

        <section className="inv-bill">
          <div>
            <p className="inv-label">Billed to</p>
            <p className="inv-strong">{c.name}</p>
            <p>{c.phone}</p>
            {c.email && <p>{c.email}</p>}
            <p>{c.address}</p>
            <p>{c.city}, {c.province}{c.postalCode ? ` — ${c.postalCode}` : ''}</p>
          </div>
          <div className="inv-bill-right">
            <p className="inv-label">Payment</p>
            <p className="inv-strong">{o.paymentMethod === 'COD' ? 'Cash on Delivery' : o.paymentMethod}</p>
            <p>{o.paymentStatus}</p>
            {o.discreetPackaging && <p>Plain discreet packaging</p>}
          </div>
        </section>

        <div className="inv-table-wrap">
          <span className="inv-watermark">V É L O U R A</span>
          <table className="inv-table">
            <thead>
              <tr><th>Description</th><th>Price</th><th>Qty</th><th className="r">Total</th></tr>
            </thead>
            <tbody>
              {o.items.map((it, i) => (
                <tr key={i}>
                  <td>
                    <div className="inv-item">
                      {it.image && <img src={it.image} alt="" />}
                      <div>
                        <p className="inv-item-name">{it.name}</p>
                        <p className="inv-item-sub">{it.size}{it.color ? ` · ${it.color}` : ''}</p>
                      </div>
                    </div>
                  </td>
                  <td>{pkr(it.price)}</td>
                  <td>{it.quantity}</td>
                  <td className="r">{pkr(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="inv-totals-wrap">
          <div className="inv-totals">
            <p><span>Subtotal</span><span>{pkr(o.subtotal)}</span></p>
            {!!o.discount && <p><span>Discount{o.couponCode ? ` (${o.couponCode})` : ''}</span><span>− {pkr(o.discount)}</span></p>}
            <p><span>Shipping</span><span>{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></p>
            <p className="inv-grand"><span>Total</span><span>{pkr(o.total)}</span></p>
          </div>
        </section>

        <footer className="inv-footer">
          <p className="inv-thanks">Thank you for shopping with VÉLOURA.</p>
          <p className="inv-foot">{o.paymentMethod === 'COD' && o.paymentStatus !== 'Paid'
            ? 'Payment due on delivery — please keep the total amount ready.'
            : 'Payment received with thanks.'}</p>
          <p className="inv-foot">veloura-jade.vercel.app  ·  {o.orderNumber}</p>
        </footer>
      </div>
    </div>
  );
}
