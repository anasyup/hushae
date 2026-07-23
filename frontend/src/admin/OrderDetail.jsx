import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, MapPin, Package, Printer, ReceiptText, User } from 'lucide-react';
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
  const { auth, toast } = useApp();
  const [o, setO] = useState(null);

  const load = () => api(`/orders/admin/${id}`, { token: auth.token }).then((d) => setO(d.order)).catch(() => {});
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const patch = async (path, body, msg) => {
    try { await api(`/orders/admin/${id}${path}`, { method: 'PATCH', token: auth.token, body }); await load(); toast(msg); }
    catch (ex) { toast(ex.message); }
  };

  if (!o) return <AdminLayout title="Order"><div className="skeleton h-96 w-full" /></AdminLayout>;
  const c = o.customerInfo;
  const pcs = o.items.reduce((a, it) => a + (it.quantity || 1), 0);

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
            <div className="border-b border-line bg-satin/30 px-6 py-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Ordered items</p>
            </div>
            <div className="divide-y divide-line/60 px-6">
              {o.items.map((it, i) => (
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
            </div>
            <div className="space-y-1.5 border-t border-line bg-satin/20 px-6 py-5 text-sm">
              <p className="flex justify-between"><span className="text-ash">Subtotal</span><span>{pkr(o.subtotal)}</span></p>
              {!!o.discount && <p className="flex justify-between font-medium text-sagedeep"><span>Discount {o.couponCode ? `(${o.couponCode})` : ''}</span><span>− {pkr(o.discount)}</span></p>}
              <p className="flex justify-between"><span className="text-ash">Shipping</span><span>{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></p>
              <p className="flex justify-between pt-1 font-display text-xl"><span>Total</span><span>{pkr(o.total)}</span></p>
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
