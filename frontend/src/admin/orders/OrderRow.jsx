import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, Ban, Check, ChevronDown, Copy, Loader2, MapPin,
  MessageCircle, MoreHorizontal, Phone, Printer, Wallet,
} from 'lucide-react';
import { fmtDate, pkr } from '../../lib/format';
import { paymentTone, PRINT_DOCS, stageTone, STAGE_MAP } from './orderConstants';
import QualityBadge from './QualityBadge';

/** Stock states that deserve a warning colour in the warehouse strip. */
const STOCK_TONE = {
  out_of_stock: 'text-red-600',
  insufficient: 'text-red-600',
  low_stock: 'text-amber-600',
};

/* ============================================================================
 * One order row. Compact by default, expands to show items and quick actions.
 * ========================================================================== */

export default function OrderRow({
  order: o, selected, onSelect, busy, onStage, onVerify, onPrint, onOpenService, onOpenCustomer,
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  const stage = o.stage || 'New';
  const tone = stageTone(stage);
  const Icon = STAGE_MAP[stage]?.icon;
  const pState = o.paymentState || (o.paymentStatus === 'Paid' ? 'Confirmed' : 'Pending');
  const pTone = paymentTone(pState);
  const next = (o.allowedNext || []).find((s) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(s));
  const invoicePrinted = o.printStatus?.invoice?.printed;
  const itemCount = (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0);
  // Distinct bins the picker has to visit, and whether any line is short.
  const bins = [...new Set((o.items || []).map((i) => i.warehouseLocation).filter(Boolean))];
  const atRisk = (o.items || []).some((i) => ['out_of_stock', 'insufficient', 'low_stock'].includes(i.stockStatus));

  const copyRef = () => { navigator.clipboard?.writeText(o.orderNumber); };

  return (
    <div className={`rounded-xl border bg-white transition ${selected ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200 hover:border-neutral-300'}`}>
      <div className="flex items-start gap-3 p-3">
        <input
          type="checkbox" checked={selected} onChange={() => onSelect(o._id)}
          aria-label={`Select order ${o.orderNumber}`}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-neutral-300 accent-neutral-900"
        />

        <div className="min-w-0 flex-1">
          {/* Line 1 — identity + badges */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link to={`/admin/orders/${o._id}`} className="font-mono text-[10px] font-semibold text-neutral-900 hover:underline">
              {o.orderNumber}
            </Link>
            <button onClick={copyRef} aria-label="Copy order number" className="text-neutral-300 hover:text-neutral-700">
              <Copy size={11} />
            </button>

            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 ${tone.pill}`}>
              {Icon ? <Icon size={10} /> : null} {STAGE_MAP[stage]?.label || stage}
            </span>

            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ${pTone.pill}`}>
              <Wallet size={10} /> {o.paymentMethod} · {pState}
            </span>

            {invoicePrinted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold text-neutral-600 ring-1 ring-neutral-200">
                <Printer size={10} /> Printed
              </span>
            )}
            <QualityBadge quality={o.quality} compact />

            {o.priorityFlag === 'rush' && (
              <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Rush</span>
            )}
            {o.qcStatus === 'passed' && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 ring-1 ring-emerald-200">QC ✓</span>
            )}
            {o.customerService?.hasIssue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-700 ring-1 ring-red-200">
                <AlertTriangle size={10} /> {o.customerService.issueType || 'Issue'}
              </span>
            )}
          </div>

          {/* Line 2 — customer */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] text-neutral-600">
            <button
              onClick={(e) => { e.stopPropagation(); onOpenCustomer?.(o.customerInfo?.phone); }}
              title="Open customer history"
              className="font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-900">
              {o.customerInfo?.name}
            </button>
            <span className="inline-flex items-center gap-1"><Phone size={11} />{o.customerInfo?.phone}</span>
            <span className="inline-flex items-center gap-1"><MapPin size={11} />{o.customerInfo?.city}</span>
            <span className="text-neutral-400">{fmtDate(o.createdAt)}</span>
          </div>
        </div>

        {/* Right — money + actions */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-[9px] font-semibold tabular-nums text-neutral-900">{pkr(o.total)}</p>
          <p className="text-[9px] text-neutral-400">
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {bins.length > 0 && (
              <>
                {' · '}
                <span className={atRisk ? 'font-semibold text-amber-600' : ''}>
                  {bins.slice(0, 3).join(', ')}{bins.length > 3 ? ` +${bins.length - 3}` : ''}
                </span>
              </>
            )}
          </p>

          <div className="mt-0.5 flex items-center gap-1">
            {next && (
              <button
                disabled={busy} onClick={() => onStage(o._id, next)}
                title={`Move to ${next}`}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-900 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-black disabled:opacity-50">
                {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />} {next}
              </button>
            )}
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-label="More actions"
                className="grid h-7 w-7 place-items-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50">
                <MoreHorizontal size={14} />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 top-8 z-20 w-52 rounded-lg border border-neutral-200 bg-white py-1 shadow-xl">
                    <Link to={`/admin/orders/${o._id}`} className="block px-3 py-1.5 text-[9px] hover:bg-neutral-100">
                      View full details
                    </Link>
                    {PRINT_DOCS.map((d) => (
                      <button key={d.key} onClick={() => { onPrint(o, d.key); setMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[9px] hover:bg-neutral-100">
                        <d.icon size={12} className="text-neutral-500" /> Print {d.label.toLowerCase()}
                      </button>
                    ))}
                    <div className="my-1 border-t border-neutral-100" />
                    {pState !== 'Confirmed' && (
                      <button onClick={() => { onVerify(o._id, 'Confirmed'); setMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[9px] hover:bg-neutral-100">
                        <Check size={12} className="text-emerald-600" /> Mark payment confirmed
                      </button>
                    )}
                    {pState === 'Pending' && (
                      <button onClick={() => { onVerify(o._id, 'Verified'); setMenu(false); }}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[9px] hover:bg-neutral-100">
                        <Wallet size={12} className="text-blue-600" /> Mark payment verified
                      </button>
                    )}
                    <a href={`https://wa.me/${String(o.customerInfo?.phone || '').replace(/\D/g, '').replace(/^0/, '92')}`}
                      target="_blank" rel="noreferrer"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-[9px] hover:bg-neutral-100">
                      <MessageCircle size={12} className="text-emerald-600" /> WhatsApp customer
                    </a>
                    <button onClick={() => { onOpenService(o); setMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[9px] hover:bg-neutral-100">
                      <AlertTriangle size={12} className="text-amber-600" /> Log an issue
                    </button>
                    <div className="my-1 border-t border-neutral-100" />
                    <button onClick={() => { onStage(o._id, 'Cancelled', 'Cancelled from order desk'); setMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[9px] text-red-600 hover:bg-red-50">
                      <Ban size={12} /> Cancel order
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setOpen((v) => !v)} aria-label="Toggle items" aria-expanded={open}
              className="grid h-7 w-7 place-items-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50">
              <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 px-3 py-2.5">
          <div className="space-y-1.5">
            {(o.items || [])
              // Pick priority first: anything short or low gets pulled before it vanishes.
              .slice().sort((a, b) => (a.pickPriority || 3) - (b.pickPriority || 3))
              .map((it, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[9px]">
                  {it.image ? <img src={it.image} alt="" className="h-9 w-9 rounded object-cover" /> : <span className="h-9 w-9 rounded bg-neutral-200" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-neutral-800">{it.name}</span>
                    {(it.warehouseLocation || it.sku) && (
                      <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-neutral-400">
                        {it.warehouseLocation && (
                          <span className="inline-flex items-center gap-1 rounded bg-neutral-200/70 px-1.5 py-0.5 font-mono font-semibold text-neutral-600">
                            <MapPin size={9} /> {it.warehouseLocation}
                          </span>
                        )}
                        {it.sku && <span className="font-mono">{it.sku}</span>}
                        {it.stockStatus && it.stockStatus !== 'in_stock' && (
                          <span className={`inline-flex items-center gap-0.5 font-semibold ${STOCK_TONE[it.stockStatus] || ''}`}>
                            <AlertTriangle size={9} />
                            {it.stockStatus === 'out_of_stock' ? 'Out of stock'
                              : it.stockStatus === 'insufficient' ? `Only ${it.stockAvailable} left`
                                : `Low — ${it.stockAvailable} left`}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="hidden text-neutral-500 sm:inline">{[it.size, it.color].filter(Boolean).join(' · ')}</span>
                  <span className="w-10 text-right tabular-nums text-neutral-500">×{it.quantity}</span>
                  <span className="w-24 text-right tabular-nums font-medium">{pkr(it.lineTotal)}</span>
                </div>
              ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-neutral-200 pt-2 text-[10px] text-neutral-500">
            <span>Address: <span className="text-neutral-800">{o.customerInfo?.address}</span></span>
            {o.trackingNumber && <span>Tracking: <span className="font-mono text-neutral-800">{o.trackingNumber}</span></span>}
            {o.courierName && <span>Courier: <span className="text-neutral-800">{o.courierName}</span></span>}
          </div>
        </div>
      )}
    </div>
  );
}
