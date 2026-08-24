import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Ban, Check, ChevronDown, Copy, Loader2, MoreHorizontal,
} from 'lucide-react';
import { fmtDate, pkr } from '../../lib/format';
import { CANCEL_REASONS, PRINT_DOCS } from './orderConstants';
import QualityBadge from './QualityBadge';
import ReliabilityBadge from '../ReliabilityBadge';
import { fulfillmentLabel, MonoStatus, paymentLabel } from './orderUi';

/* ===========================================================================
 * One order — editorial table row (desktop) / stacked scan row (mobile).
 * All existing actions preserved. Presentation only.
 * ========================================================================== */

const COL =
  'hidden items-center lg:flex';

export default function OrderRow({
  order: o, selected, onSelect, busy, onStage, onVerify, onPrint, onOpenService, onOpenCustomer,
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [cancelMenu, setCancelMenu] = useState(false);

  const stage = o.stage || 'New';
  const pState = paymentLabel(o);
  const fulfill = fulfillmentLabel(o);
  const next = (o.allowedNext || []).find((s) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(s));
  const itemCount = (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0);
  const bins = [...new Set((o.items || []).map((i) => i.warehouseLocation).filter(Boolean))];
  const atRisk = (o.items || []).some((i) => ['out_of_stock', 'insufficient', 'low_stock'].includes(i.stockStatus));
  const invoicePrinted = o.printStatus?.invoice?.printed;

  const copyRef = () => { navigator.clipboard?.writeText(o.orderNumber); };

  const menuPanel = menu && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
      <div className="absolute right-0 top-9 z-20 w-52 border border-[#EAEAEA] bg-[#0D0D0D] py-1">
        <Link to={`/admin/orders/${o._id}`} className="block px-3 py-2 text-[12px] text-white/75 hover:bg-[#FAFAFA] hover:text-black">
          View full details
        </Link>
        {PRINT_DOCS.map((d) => (
          <button key={d.key} onClick={() => { onPrint(o, d.key); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-[#FAFAFA] hover:text-black">
            Print {d.label.toLowerCase()}
          </button>
        ))}
        <div className="my-1 border-t border-[#EAEAEA]" />
        {pState !== 'PAID' && (
          <button onClick={() => { onVerify(o._id, 'Confirmed'); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-[#FAFAFA] hover:text-black">
            <Check size={12} className="text-[#999999]" /> Mark payment confirmed
          </button>
        )}
        {(o.paymentState || o.paymentStatus) === 'Pending' && (
          <button onClick={() => { onVerify(o._id, 'Verified'); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-[#FAFAFA] hover:text-black">
            Mark payment verified
          </button>
        )}
        <a href={`https://wa.me/${String(o.customerInfo?.phone || '').replace(/\D/g, '').replace(/^0/, '92')}`}
          target="_blank" rel="noreferrer"
          className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-white/75 hover:bg-[#FAFAFA] hover:text-black">
          WhatsApp customer
        </a>
        <button onClick={() => { onOpenService(o); setMenu(false); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-[#FAFAFA] hover:text-black">
          Log an issue
        </button>
        <div className="my-1 border-t border-[#EAEAEA]" />
        <button onClick={() => { setCancelMenu((v) => !v); }}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] text-[#777777] hover:bg-[#FAFAFA] hover:text-black">
          <span className="inline-flex items-center gap-2"><Ban size={12} /> Cancel order</span>
          <ChevronDown size={11} />
        </button>
        {cancelMenu && (
          <div className="px-2 pb-1">
            <p className="adm-label px-1 pb-1 pt-1">Reason (required)</p>
            {CANCEL_REASONS.map((r) => (
              <button key={r}
                onClick={() => { onStage(o._id, 'Cancelled', r, r); setMenu(false); setCancelMenu(false); }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-[#555555] hover:bg-[#FAFAFA] hover:text-black">
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const actions = (
    <div className="flex items-center justify-end gap-1">
      {next && (
        <button
          disabled={busy} onClick={() => onStage(o._id, next)}
          title={`Move to ${next}`}
          className="inline-flex h-7 items-center gap-1 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[#555555] transition-colors hover:text-black disabled:opacity-40"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
          <span className="hidden xl:inline">{next}</span>
        </button>
      )}
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} aria-label="More actions"
          className="grid h-7 w-7 place-items-center text-[#999999] hover:text-black">
          <MoreHorizontal size={14} />
        </button>
        {menuPanel}
      </div>
      <button onClick={() => setOpen((v) => !v)} aria-label="Toggle items" aria-expanded={open}
        className="grid h-7 w-7 place-items-center text-[#999999] hover:text-black">
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );

  const expanded = open && (
    <div className="border-t border-[#F0F0F0] bg-white/[0.02] px-3 py-3 lg:px-2">
      <div className="space-y-2">
        {(o.items || [])
          .slice().sort((a, b) => (a.pickPriority || 3) - (b.pickPriority || 3))
          .map((it, i) => (
            <div key={i} className="flex items-center gap-3 text-[12px]">
              {it.image
                ? <img src={it.image} alt="" className="h-9 w-7 object-cover" />
                : <span className="h-9 w-7 bg-[#F5F5F5]" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-black">{it.name}</span>
                {(it.warehouseLocation || it.sku || (it.stockStatus && it.stockStatus !== 'in_stock')) && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#AAAAAA]">
                    {it.warehouseLocation && <span className="font-mono">{it.warehouseLocation}</span>}
                    {it.sku && <span className="font-mono">{it.sku}</span>}
                    {it.stockStatus && it.stockStatus !== 'in_stock' && (
                      <span className="text-[#777777]">
                        {it.stockStatus === 'out_of_stock' ? 'Out of stock'
                          : it.stockStatus === 'insufficient' ? `Only ${it.stockAvailable} left`
                            : `Low — ${it.stockAvailable} left`}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span className="hidden text-[#AAAAAA] sm:inline">{[it.size, it.color].filter(Boolean).join(' · ')}</span>
              <span className="w-8 text-right tabular-nums text-[#999999]">×{it.quantity}</span>
              <span className="w-24 text-right tabular-nums text-black">{pkr(it.lineTotal)}</span>
            </div>
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-[#EAEAEA] pt-2 text-[11px] text-[#AAAAAA]">
        <span>Address <span className="text-[#555555]">{o.customerInfo?.address}</span></span>
        {o.trackingNumber && <span>Tracking <span className="font-mono text-[#555555]">{o.trackingNumber}</span></span>}
        {o.courierName && <span>Courier <span className="text-[#555555]">{o.courierName}</span></span>}
      </div>
    </div>
  );

  return (
    <div className={`border-b border-[#EAEAEA] ${selected ? 'bg-[#FAFAFA]' : ''} adm-row-hover`}>
      {/* Desktop table row */}
      <div className="hidden lg:grid lg:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1.15fr)_0.5fr_0.9fr_0.85fr_0.95fr_auto] lg:items-center lg:gap-3 lg:px-1 lg:py-3.5 xl:grid-cols-[32px_minmax(0,1.15fr)_minmax(0,1.1fr)_0.85fr_0.55fr_0.85fr_0.85fr_0.95fr_0.7fr_auto]">
        <input
          type="checkbox" checked={selected} onChange={() => onSelect(o._id)}
          aria-label={`Select order ${o.orderNumber}`}
          className="h-3.5 w-3.5 cursor-pointer rounded-none border-white/30 bg-transparent accent-white"
        />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/admin/orders/${o._id}`} className="truncate font-mono text-[13px] font-medium text-black hover:text-[#555555]">
              {o.orderNumber}
            </Link>
            <button onClick={copyRef} aria-label="Copy order number" className="text-white/20 hover:text-[#555555]">
              <Copy size={10} />
            </button>
            <QualityBadge quality={o.quality} compact />
          </div>
          <p className="mt-0.5 text-[11px] text-[#AAAAAA]">{fmtDate(o.createdAt)}</p>
        </div>

        <div className="min-w-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenCustomer?.(o.customerInfo?.phone); }}
            className="block truncate text-left text-[13px] text-black hover:text-black"
          >
            {o.customerInfo?.name}
          </button>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-[#AAAAAA]">
            {o.customerInfo?.city}
            <ReliabilityBadge reliability={o.reliability} compact />
          </p>
        </div>

        <p className="hidden items-center text-[12px] text-[#999999] xl:flex">{fmtDate(o.createdAt)}</p>
        <p className={`${COL} text-[12px] tabular-nums text-[#555555]`}>
          {itemCount}
          {atRisk && <span className="ml-1 text-[#999999]">!</span>}
        </p>
        <p className={`${COL} adm-metric text-[13px] text-black`}>{pkr(o.total)}</p>
        <div className={COL}><MonoStatus label={pState} /></div>
        <div className={COL}><MonoStatus label={fulfill} /></div>
        <div className="hidden flex-col items-start gap-1 xl:flex">
          <MonoStatus label={String(o.status || '').toUpperCase()} dim={['Cancelled', 'Refunded', 'Pending'].includes(o.status)} />
          {o.priorityFlag === 'rush' && <span className="text-[9px] uppercase tracking-[0.16em] text-black">Rush</span>}
          {o.customerService?.hasIssue && <span className="text-[9px] uppercase tracking-[0.14em] text-[#999999]">Issue</span>}
          {invoicePrinted && <span className="text-[9px] uppercase tracking-[0.14em] text-[#AAAAAA]">Printed</span>}
        </div>
        <div className="hidden lg:block">{actions}</div>
      </div>

      {/* Mobile / tablet stacked row */}
      <div className="flex items-start gap-3 px-1 py-4 lg:hidden">
        <input
          type="checkbox" checked={selected} onChange={() => onSelect(o._id)}
          aria-label={`Select order ${o.orderNumber}`}
          className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer rounded-none border-white/30 bg-transparent accent-white"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/admin/orders/${o._id}`} className="font-mono text-[13px] font-medium text-black">
                {o.orderNumber}
              </Link>
              <p className="mt-0.5 text-[11px] text-[#AAAAAA]">{fmtDate(o.createdAt)}</p>
            </div>
            <p className="adm-metric shrink-0 text-[14px] text-black">{pkr(o.total)}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCustomer?.(o.customerInfo?.phone)}
            className="mt-2 block text-left text-[13px] text-black"
          >
            {o.customerInfo?.name}
          </button>
          <p className="mt-0.5 text-[11px] text-[#AAAAAA]">
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {o.customerInfo?.city ? ` · ${o.customerInfo.city}` : ''}
            {bins.length > 0 ? ` · ${bins.slice(0, 2).join(', ')}` : ''}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <MonoStatus label={pState} />
            <MonoStatus label={fulfill} />
            {o.priorityFlag === 'rush' && <span className="text-[9px] uppercase tracking-[0.16em] text-black">Rush</span>}
            {o.customerService?.hasIssue && <span className="text-[9px] uppercase tracking-[0.14em] text-[#999999]">Issue</span>}
            <QualityBadge quality={o.quality} compact />
          </div>
          <div className="mt-3">{actions}</div>
        </div>
      </div>

      {expanded}
    </div>
  );
}
