import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { fmtDate, pkr } from '../../lib/format';

/* ============================================================================
 * Printable warehouse documents.
 *
 *   /admin/orders/:id/print/packing_slip  — goes inside the parcel
 *   /admin/orders/:id/print/pick_list     — what to pull off the shelf
 *
 * Both share the invoice's A4 print styling so the paperwork looks like one set.
 * ========================================================================== */

const TITLES = {
  packing_slip: { title: 'Packing Slip', sub: 'Check every line before sealing the parcel' },
  pick_list: { title: 'Pick List', sub: 'Pull these items from the shelves' },
};

export default function OrderPrintDoc() {
  const { id, doc } = useParams();
  const { auth } = useApp();
  const [order, setOrder] = useState(null);
  const [err, setErr] = useState('');

  const kind = TITLES[doc] ? doc : 'packing_slip';
  const meta = TITLES[kind];

  useEffect(() => {
    if (!auth?.token) { setErr('Please log in as admin'); return; }
    api(`/orders/manage/${id}`, { token: auth.token })
      .then((d) => setOrder(d.order))
      .catch((e) => setErr(e.message || 'Failed to load'));
  }, [id, auth?.token]);

  useEffect(() => {
    if (!order) return undefined;
    const t = setTimeout(() => window.print(), 450);
    return () => clearTimeout(t);
  }, [order]);

  if (err) return <div className="p-10 text-red-600">{err}</div>;
  if (!order) return <div className="p-10 text-neutral-500">Loading {meta.title.toLowerCase()}…</div>;

  const c = order.customerInfo || {};
  const units = (order.items || []).reduce((a, i) => a + (i.quantity || 0), 0);

  return (
    <div className="mx-auto max-w-3xl bg-white p-10 text-neutral-900 print:p-6">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-end">
        <button onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          <Printer size={15} /> Print
        </button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
        <div>
          <p className="font-display text-2xl tracking-[0.28em]">HUSHAE</p>
          <p className="mt-1 text-[11px] italic text-neutral-500">Second Skin, First Choice.</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tracking-wide">{meta.title}</p>
          <p className="mt-1 font-mono text-[12px] text-neutral-600">{order.orderNumber}</p>
          <p className="text-[11px] text-neutral-500">{fmtDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Ship-to + summary */}
      <div className="mt-6 flex justify-between gap-8 text-[13px] leading-relaxed">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Ship to</p>
          <p className="text-[12px] font-bold">{c.name}</p>
          <p>{c.address}</p>
          <p>{c.city}, {c.province} {c.postalCode}</p>
          <p className="mt-1">{c.phone}</p>
        </div>
        <div className="text-right">
          <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Summary</p>
          <p>{order.items?.length || 0} line{(order.items?.length || 0) === 1 ? '' : 's'} · {units} unit{units === 1 ? '' : 's'}</p>
          <p>Payment: <span className="font-semibold">{order.paymentMethod}</span></p>
          {kind === 'packing_slip' && <p>Order total: <span className="font-semibold">{pkr(order.total)}</span></p>}
          {order.discreetPackaging && <p className="mt-1 font-semibold">Discreet packaging</p>}
        </div>
      </div>

      {/* Lines */}
      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr>
            {kind === 'pick_list' && <th className="w-10 border-b-2 border-neutral-900 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-neutral-500">✓</th>}
            <th className="border-b-2 border-neutral-900 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-neutral-500">Item</th>
            <th className="border-b-2 border-neutral-900 py-2 text-left text-[10px] uppercase tracking-[0.2em] text-neutral-500">Variant</th>
            <th className="border-b-2 border-neutral-900 py-2 text-right text-[10px] uppercase tracking-[0.2em] text-neutral-500">Qty</th>
            {kind === 'packing_slip' && <th className="border-b-2 border-neutral-900 py-2 text-right text-[10px] uppercase tracking-[0.2em] text-neutral-500">Amount</th>}
          </tr>
        </thead>
        <tbody>
          {(order.items || []).map((it, i) => (
            <tr key={i}>
              {kind === 'pick_list' && (
                <td className="border-b border-neutral-200 py-3">
                  <span className="inline-block h-4 w-4 border-2 border-neutral-400" />
                </td>
              )}
              <td className="border-b border-neutral-200 py-3">
                <div className="flex items-center gap-3">
                  {it.image ? <img src={it.image} alt="" className="h-12 w-10 border border-neutral-200 object-cover" /> : null}
                  <div>
                    <p className="font-bold">{it.name}</p>
                    {it.slug && <p className="font-mono text-[10px] text-neutral-500">{it.slug}</p>}
                  </div>
                </div>
              </td>
              <td className="border-b border-neutral-200 py-3 text-[12px]">
                {[it.size, it.color].filter(Boolean).join(' · ') || '—'}
              </td>
              <td className="border-b border-neutral-200 py-3 text-right text-[12px] font-bold tabular-nums">{it.quantity}</td>
              {kind === 'packing_slip' && (
                <td className="border-b border-neutral-200 py-3 text-right tabular-nums">{pkr(it.lineTotal)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {c.notes && (
        <div className="mt-5 border border-neutral-300 p-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Customer note</p>
          <p className="mt-1 text-[13px]">{c.notes}</p>
        </div>
      )}

      {/* Sign-off */}
      <div className="mt-10 flex justify-between gap-8 text-[11px] text-neutral-500">
        <div className="flex-1">
          <p className="border-t border-neutral-400 pt-1">Packed by</p>
        </div>
        <div className="flex-1">
          <p className="border-t border-neutral-400 pt-1">Checked by</p>
        </div>
        <div className="flex-1">
          <p className="border-t border-neutral-400 pt-1">Date</p>
        </div>
      </div>

      <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-400">
        {meta.sub}
      </p>
    </div>
  );
}
