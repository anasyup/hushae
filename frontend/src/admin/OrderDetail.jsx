import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDateTime, pkr } from '../lib/format';
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

  return (
    <AdminLayout title={`Order ${o.orderNumber}`}>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link to="/admin/orders" className="btn-outline !px-4 !py-2 !text-[11px]"><ArrowLeft size={13} /> All orders</Link>
        <select value={o.status} onChange={(e) => patch('/status', { status: e.target.value }, 'Status updated')} className={`pill cursor-pointer !px-4 !py-2.5 ${statusPill(o.status)}`}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={o.paymentStatus} onChange={(e) => patch('/payment', { paymentStatus: e.target.value }, 'Payment updated')} className="pill cursor-pointer bg-obsidian/85 !px-4 !py-2.5 text-alabaster">
          {PAY.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => window.print()} className="btn-outline !px-4 !py-2 !text-[11px]"><Printer size={13} /> Print invoice</button>
      </div>

      <div id="invoice">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card p-6">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ash">Customer</p>
            <p className="font-semibold">{c.name}</p>
            <p className="mt-1 text-sm text-ash">{c.phone}</p>
            {c.email && <p className="text-sm text-ash">{c.email}</p>}
            <p className="mt-4 text-sm leading-relaxed">{c.address}<br />{c.city}, {c.province}{c.postalCode ? ` ${c.postalCode}` : ''}</p>
            {c.notes && <p className="mt-3 rounded-xl bg-satin/40 p-3 text-xs text-ash">"{c.notes}"</p>}
            <div className="mt-4 space-y-1.5 text-xs">
              <p className="flex justify-between"><span className="text-ash">Payment</span><b>{o.paymentMethod} · {o.paymentStatus}</b></p>
              {o.transactionId && <p className="flex justify-between"><span className="text-ash">Txn ID</span><b className="font-mono">{o.transactionId}</b></p>}
              <p className="flex justify-between"><span className="text-ash">Packaging</span><b>{o.discreetPackaging ? 'Discreet (plain)' : 'Standard'}</b></p>
            </div>
          </div>

          <div className="card p-6 lg:col-span-2">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ash">Items</p>
            <div className="space-y-3">
              {o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-line/60 pb-3 last:border-0 last:pb-0">
                  <Img src={it.image} alt="" className="h-14 w-11 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.name}</p>
                    <p className="text-xs text-ash">{it.size}{it.color ? ` · ${it.color}` : ''} · x{it.quantity} @ {pkr(it.price)}</p>
                  </div>
                  <p className="text-sm font-semibold">{pkr(it.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
              <p className="flex justify-between"><span className="text-ash">Subtotal</span><span>{pkr(o.subtotal)}</span></p>
              <p className="flex justify-between"><span className="text-ash">Shipping</span><span>{o.shippingCharge === 0 ? 'Free' : pkr(o.shippingCharge)}</span></p>
              <p className="flex justify-between pt-1 font-display text-xl"><span>Total</span><span>{pkr(o.total)}</span></p>
            </div>
          </div>
        </div>

        <div className="card mt-6 p-6">
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

        <div className="mt-6 hidden rounded-2xl border border-line p-6 print:block">
          <p className="font-display tracking-widest2">V É L O U R A — packing slip</p>
          <p className="mt-1 text-xs text-ash">{o.orderNumber} · {fmtDateTime(o.createdAt)}</p>
        </div>
      </div>
    </AdminLayout>
  );
}
