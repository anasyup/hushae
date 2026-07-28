import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Loader2, Printer, X } from 'lucide-react';
import { api } from '../../api/client';
import { fmtDate, pkr } from '../../lib/format';
import { CELLS, describeLayout, paginate } from './printLayout';

/* ============================================================================
 * Bulk print preview.
 *
 * Fetches every selected order in one call, lays the documents out on virtual
 * A4 pages, and hands the whole set to a single browser print dialog — so
 * "select all → print" produces one stack of paper, not one tab per order.
 * ========================================================================== */

const DOC_TITLE = {
  packing_slip: 'Packing slips',
  invoice: 'Invoices',
  pick_list: 'Pick lists',
};

export default function PrintPreview({ docType, ids, filters, token, onClose, onPrinted }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    const qs = new URLSearchParams({ doc: docType });
    if (ids?.length) qs.set('ids', ids.join(','));
    else Object.entries(filters || {}).forEach(([k, v]) => { if (v) qs.set(k, v); });

    api(`/orders/manage/print/batch?${qs}`, { token })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setErr(e.message || 'Could not load documents'); });
    return () => { alive = false; };
  }, [docType, ids, filters, token]);

  const layout = useMemo(
    () => (data ? paginate(data.orders, docType) : null),
    [data, docType],
  );

  const doPrint = () => {
    window.print();
    onPrinted?.(data.orders.map((o) => o._id));
  };

  return createPortal((
    <div className="print-root fixed inset-0 z-50 flex flex-col bg-neutral-900/60 print:static print:bg-white">
      {/* Screen-only chrome */}
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 print:hidden">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-neutral-900">
            {DOC_TITLE[docType] || 'Documents'}
          </p>
          <p className="mt-0.5 text-[12.5px] text-neutral-500">
            {layout ? describeLayout(layout) : 'Preparing…'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={doPrint}
            disabled={!layout || !layout.total}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-50"
          >
            <Printer size={14} /> Print
          </button>
          <button onClick={onClose} aria-label="Close preview"
            className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-300 text-neutral-500 hover:bg-neutral-50">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Scrollable preview / printable surface */}
      <div className="flex-1 overflow-y-auto bg-neutral-200 p-6 print:overflow-visible print:bg-white print:p-0">
        {err && (
          <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 print:hidden">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <p className="text-[13px] text-red-800">{err}</p>
          </div>
        )}

        {!data && !err && (
          <div className="grid h-40 place-items-center print:hidden">
            <Loader2 size={20} className="animate-spin text-neutral-500" />
          </div>
        )}

        {layout?.pages.map((page, pi) => (
          <div key={pi} className="print-sheet">
            {page.slips.map(({ order, size }) => (
              <div key={order._id} className={`print-cell print-cell--${size}`}>
                <Slip order={order} docType={docType} store={data.store} size={size} />
              </div>
            ))}
          </div>
        ))}

        {layout && layout.total === 0 && (
          <p className="py-16 text-center text-sm text-neutral-500 print:hidden">Nothing selected to print.</p>
        )}
      </div>

      <PrintStyles />
    </div>
  ), document.body);
}

/* ── One document ───────────────────────────────────────────────────────── */
function Slip({ order: o, docType, store, size }) {
  const c = o.customerInfo || {};
  const paid = o.paymentLabel === 'PAID';
  const compact = size === 'quarter';

  return (
    <div className="flex h-full flex-col text-[9.5pt] leading-snug text-black">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-black pb-1">
        <div className="min-w-0">
          <p className="font-serif text-[13pt] font-semibold tracking-[0.2em]">{store?.name || 'HUSHAE'}</p>
          <p className="truncate text-[7pt] uppercase tracking-wider text-neutral-600">
            {docType === 'invoice' ? 'Invoice' : docType === 'pick_list' ? 'Pick List' : 'Packing Slip'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[8.5pt] font-bold">{o.orderNumber}</p>
          <p className="text-[7pt] text-neutral-600">{fmtDate(o.createdAt)}</p>
          <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[7.5pt] font-bold ${
            paid ? 'bg-black text-white' : 'border border-black'
          }`}>
            {o.paymentLabel}
          </span>
        </div>
      </div>

      {/* Customer */}
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[7pt] uppercase tracking-wider text-neutral-500">Deliver to</p>
          <p className="text-[10pt] font-bold">{c.name}</p>
          <p className="text-[8.5pt]">{c.phone}</p>
          {docType !== 'pick_list' && (
            <p className="text-[8pt] leading-tight">{c.address}, {c.city}{c.postalCode ? ` – ${c.postalCode}` : ''}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[7pt] uppercase tracking-wider text-neutral-500">Units</p>
          <p className="text-[13pt] font-bold leading-none">{o.itemCount}</p>
        </div>
      </div>

      {/* Items */}
      <table className="mt-1.5 w-full border-collapse">
        <thead>
          <tr className="border-y border-neutral-400">
            {docType === 'pick_list' && <th className="w-4 py-0.5 text-left text-[7pt] uppercase text-neutral-500">✓</th>}
            <th className="py-0.5 text-left text-[7pt] uppercase tracking-wider text-neutral-500">Item</th>
            <th className="py-0.5 text-left text-[7pt] uppercase tracking-wider text-neutral-500">Variant</th>
            <th className="py-0.5 text-right text-[7pt] uppercase tracking-wider text-neutral-500">Qty</th>
            {docType === 'invoice' && <th className="py-0.5 text-right text-[7pt] uppercase tracking-wider text-neutral-500">Amount</th>}
          </tr>
        </thead>
        <tbody>
          {(o.items || []).map((it, i) => (
            <tr key={i} className="border-b border-neutral-200">
              {docType === 'pick_list' && (
                <td className="py-0.5"><span className="inline-block h-2.5 w-2.5 border border-neutral-600" /></td>
              )}
              <td className="py-0.5 pr-1">
                <span className="block truncate font-medium">{it.name}</span>
              </td>
              <td className="py-0.5 text-[8pt] text-neutral-600">
                {[it.size, it.color].filter(Boolean).join(' · ') || '—'}
              </td>
              <td className="py-0.5 text-right font-bold tabular-nums">{it.quantity}</td>
              {docType === 'invoice' && (
                <td className="py-0.5 text-right tabular-nums">{pkr(it.lineTotal)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Money — invoices show the full breakdown, slips just the total */}
      {docType === 'invoice' ? (
        <div className="mt-1 ml-auto w-40 text-[8.5pt]">
          <Row label="Subtotal" value={pkr(o.subtotal)} />
          {o.shippingCharge > 0 && <Row label="Shipping" value={pkr(o.shippingCharge)} />}
          {o.discount > 0 && <Row label="Discount" value={`− ${pkr(o.discount)}`} />}
          <div className="mt-0.5 flex justify-between border-t border-black pt-0.5 text-[10.5pt] font-bold">
            <span>Total</span><span className="tabular-nums">{pkr(o.total)}</span>
          </div>
        </div>
      ) : docType === 'packing_slip' ? (
        <div className="mt-1 flex items-center justify-between border-t border-black pt-1">
          <span className="text-[7.5pt] uppercase tracking-wider text-neutral-600">
            {paid ? 'Paid in advance — collect nothing' : 'Collect on delivery'}
          </span>
          <span className="text-[11pt] font-bold tabular-nums">{pkr(o.total)}</span>
        </div>
      ) : null}

      {/* Notes + footer */}
      {c.notes && !compact && (
        <p className="mt-1 border border-neutral-400 p-1 text-[7.5pt]">
          <span className="font-bold">Note: </span>{c.notes}
        </p>
      )}

      <div className="mt-auto flex items-end justify-between pt-1 text-[6.5pt] text-neutral-500">
        <span>{o.discreetPackaging ? 'Discreet packaging' : ''}</span>
        <span>{store?.phone}</span>
      </div>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div className="flex justify-between">
    <span className="text-neutral-600">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/* ── Print CSS ──────────────────────────────────────────────────────────── */
function PrintStyles() {
  return (
    <style>{`
      /* A4 minus a 10mm margin → 190 × 277mm of usable area, as a 2×2 grid. */
      .print-sheet {
        width: 190mm;
        min-height: 277mm;
        margin: 0 auto 18px;
        background: #fff;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-auto-rows: 138.5mm;
        gap: 0;
        box-shadow: 0 6px 24px rgba(0,0,0,.14);
      }
      .print-cell {
        padding: 5mm;
        overflow: hidden;
        border-right: 1px dashed #b9b9b9;
        border-bottom: 1px dashed #b9b9b9;
      }
      /* A half-page slip spans both columns; a full one spans the whole sheet. */
      .print-cell--half { grid-column: span 2; }
      .print-cell--full { grid-column: span 2; grid-row: span 2; }

      @media print {
        @page { size: A4; margin: 10mm; }
        html, body { background: #fff !important; }
        /* Hide the app shell so only the sheets reach the printer. */
        body > *:not(.print-root) { display: none !important; }
        .print-root { position: static !important; inset: auto !important; }
        .print-sheet {
          width: auto;
          min-height: auto;
          height: 277mm;
          margin: 0;
          box-shadow: none;
          break-after: page;
          page-break-after: always;
        }
        .print-sheet:last-child { break-after: auto; page-break-after: auto; }
        .print-cell { border-color: #999; }
      }
    `}</style>
  );
}
