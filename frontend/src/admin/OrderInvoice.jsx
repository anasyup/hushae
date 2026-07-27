import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';

/**
 * Printable Invoice — opens in a new tab, styled for A4 print.
 * Route: /admin/orders/:id/invoice (protected)
 * Auto-triggers window.print() on first load.
 */
export default function OrderInvoice() {
  const { id } = useParams();
  const { auth } = useApp();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!auth?.token) { setErr('Please log in as admin'); return; }
    api(`/orders/admin/${id}`, { token: auth.token })
      .then((d) => setOrder(d.order))
      .catch((e) => setErr(e.message || 'Failed to load'));
  }, [id, auth?.token]);

  useEffect(() => {
    if (order) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (err) return <div className="p-10 text-red-600">{err}</div>;
  if (!order) return <div className="p-10 text-neutral-500">Loading invoice…</div>;

  const c = order.customerInfo;

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-neutral-900 print:p-6">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* Print button (hidden when printing) */}
      <div className="no-print mb-6 flex justify-end">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">
          <Printer size={14} /> Print / Save as PDF
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-6">
        <div>
          <p className="font-sans text-3xl font-bold tracking-widest">HUSHAE</p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-neutral-500">Premium innerwear · Made in Pakistan</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Invoice</p>
          <p className="mt-1 font-mono text-lg font-bold">{order.orderNumber}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{fmtDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Bill to / Ship to */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Bill to</p>
          <p className="text-sm font-semibold">{c.name}</p>
          <p className="mt-0.5 text-xs text-neutral-600">{c.phone}</p>
          {c.email && <p className="text-xs text-neutral-600">{c.email}</p>}
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Ship to</p>
          <p className="text-sm">{c.address}</p>
          <p className="mt-0.5 text-xs text-neutral-600">{c.city}, {c.province} {c.postalCode}</p>
        </div>
      </div>

      {/* Items table */}
      <table className="mt-8 w-full">
        <thead>
          <tr className="border-b border-neutral-300">
            <th className="pb-2 text-left text-[10px] font-bold uppercase tracking-widest text-neutral-500">Item</th>
            <th className="pb-2 text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500">Qty</th>
            <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">Price</th>
            <th className="pb-2 text-right text-[10px] font-bold uppercase tracking-widest text-neutral-500">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={i} className="border-b border-neutral-100">
              <td className="py-3 text-sm">
                <p className="font-medium">{it.name}</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {it.color}{it.size ? ` · ${it.size}` : ''}
                </p>
              </td>
              <td className="py-3 text-center text-sm">{it.quantity}</td>
              <td className="py-3 text-right text-sm">{pkr(it.price)}</td>
              <td className="py-3 text-right text-sm font-semibold">{pkr(it.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-6 flex justify-end">
        <div className="w-64 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Subtotal</span>
            <span>{pkr(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Shipping</span>
            <span>{order.shippingCharge > 0 ? pkr(order.shippingCharge) : 'Free'}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Discount {order.couponCode && `(${order.couponCode})`}</span>
              <span>−{pkr(order.discount)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-neutral-300 pt-2 text-base font-bold">
            <span>Total</span>
            <span>{pkr(order.total)}</span>
          </div>
          <div className="mt-2 text-right">
            <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold ${order.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {order.paymentMethod} · {order.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 border-t border-neutral-200 pt-6 text-center">
        <p className="text-[11px] text-neutral-500">Thank you for shopping with HUSHAE</p>
        <p className="mt-1 text-[10px] text-neutral-400">Questions? Contact us via /track on our website.</p>
      </div>
    </div>
  );
}
