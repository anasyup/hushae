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
  order: o, selected, onSelect, busy, onStage, onVerify, onPrint, onOpenService, onOpenCustomer, onOpenTracking,
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
      <div className="absolute right-0 top-9 z-20 w-52 border border-white/15 bg-[#0D0D0D] py-1">
        <Link to={`/admin/orders/${o._id}`} className="block px-3 py-2 text-[12px] text-white/75 hover:bg-white/5 hover:text-white">
          View full details
        </Link>
        {PRINT_DOCS.map((d) => (
          <button key={d.key} onClick={() => { onPrint(o, d.key); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-white/5 hover:text-white">
            Print {d.label.toLowerCase()}
          </button>
        ))}
        <div className="my-1 border-t border-white/10" />
        {pState !== 'PAID' && (
          <button onClick={() => { onVerify(o._id, 'Confirmed'); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-white/5 hover:text-white">
            <Check size={12} className="text-white/40" /> Mark payment confirmed
          </button>
        )}
        {(o.paymentState || o.paymentStatus) === 'Pending' && (
          <button onClick={() => { onVerify(o._id, 'Verified'); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-white/5 hover:text-white">
            Mark payment verified
          </button>
        )}
        {!o.trackingNumber && ['Packed', 'Manifested', 'To Handover', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'].includes(stage) && onOpenTracking && (
          <button onClick={() => { onOpenTracking(o); setMenu(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-white/5 hover:text-white">
            Add tracking number
          </button>
        )}
        <a href={`https://wa.me/${String(o.customerInfo?.phone || '').replace(/\D/g, '').replace(/^0/, '92')}`}
          target="_blank" rel="noreferrer"
          className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-white/75 hover:bg-white/5 hover:text-white">
          WhatsApp customer
        </a>
        <button onClick={() => { onOpenService(o); setMenu(false); }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-white/75 hover:bg-white/5 hover:text-white">
          Log an issue
        </button>
        <div className="my-1 border-t border-white/10" />
        <button onClick={() => { setCancelMenu((v) => !v); }}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[12px] text-white/55 hover:bg-white/5 hover:text-white">
          <span className="inline-flex items-center gap-2"><Ban size={12} /> Cancel order</span>
          <ChevronDown size={11} />
        </button>
        {cancelMenu && (
          <div className="px-2 pb-1">
            <p className="adm-label px-1 pb-1 pt-1">Reason (required)</p>
            {CANCEL_REASONS.map((r) => (
              <button key={r}
                onClick={() => { onStage(o._id, 'Cancelled', r, r); setMenu(false); setCancelMenu(false); }}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-[12px] text-white/70 hover:bg-white/5 hover:text-white">
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
          className="inline-flex h-7 items-center gap-1 px-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
          <span className="hidden xl:inline">{next}</span>
        </button>
      )}
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} aria-label="More actions"
          className="grid h-7 w-7 place-items-center text-white/40 hover:text-white">
          <MoreHorizontal size={14} />
        </button>
        {menuPanel}
      </div>
      <button onClick={() => setOpen((v) => !v)} aria-label="Toggle items" aria-expanded={open}
        className="grid h-7 w-7 place-items-center text-white/40 hover:text-white">
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );

  const expanded = open && (
    <div className="border-t border-white/5 bg-white/[0.02] px-3 py-3 lg:px-2">
      <div className="space-y-2">
        {(o.items || [])
          .slice().sort((a, b) => (a.pickPriority || 3) - (b.pickPriority || 3))
          .map((it, i) => (
            <div key={i} className="flex items-center gap-3 text-[12px]">
              {it.image
                ? <img src={it.image} alt="" className="h-9 w-7 object-cover" />
                : <span className="h-9 w-7 bg-white/10" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-white/85">{it.name}</span>
                {(it.warehouseLocation || it.sku || (it.stockStatus && it.stockStatus !== 'in_stock')) && (
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-white/35">
                    {it.warehouseLocation && <span className="font-mono">{it.warehouseLocation}</span>}
                    {it.sku && <span className="font-mono">{it.sku}</span>}
                    {it.stockStatus && it.stockStatus !== 'in_stock' && (
                      <span className="text-white/55">
                        {it.stockStatus === 'out_of_stock' ? 'Out of stock'
                          : it.stockStatus === 'insufficient' ? `Only ${it.stockAvailable} left`
                            : `Low — ${it.stockAvailable} left`}
                      </span>
                    )}
                  </span>
                )}
              </span>
              <span className="hidden text-white/35 sm:inline">{[it.size, it.color].filter(Boolean).join(' · ')}</span>
              <span className="w-8 text-right tabular-nums text-white/40">×{it.quantity}</span>
              <span className="w-24 text-right tabular-nums text-white">{pkr(it.lineTotal)}</span>
            </div>
          ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-white/10 pt-2 text-[11px] text-white/35">
        <span>Address <span className="text-white/70">{o.customerInfo?.address}</span></span>
        {o.trackingNumber && <span>Tracking <span className="font-mono text-white/70">{o.trackingNumber}</span></span>}
        {o.courierName && <span>Courier <span className="text-white/70">{o.courierName}</span></span>}
      </div>
    </div>
  );

  return (
    <div className={`border-b border-white/10 ${selected ? 'bg-white/[0.03]' : ''} adm-row-hover`}>
      {/* Desktop table row */}
      <div className="hidden lg:grid lg:grid-cols-[32px_minmax(0,1.2fr)_minmax(0,1.15fr)_0.5fr_0.9fr_0.85fr_0.95fr_auto] lg:items-center lg:gap-3 lg:px-1 lg:py-3.5 xl:grid-cols-[32px_minmax(0,1.15fr)_minmax(0,1.1fr)_0.85fr_0.55fr_0.85fr_0.85fr_0.95fr_0.7fr_auto]">
        <input
          type="checkbox" checked={selected} onChange={() => onSelect(o._id)}
          aria-label={`Select order ${o.orderNumber}`}
          className="h-3.5 w-3.5 cursor-pointer rounded-none border-white/30 bg-transparent accent-white"
        />

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/admin/orders/${o._id}`} className="truncate font-mono text-[13px] font-medium text-white hover:text-white/70">
              {o.orderNumber}
            </Link>
            <button onClick={copyRef} aria-label="Copy order number" className="text-white/20 hover:text-white/70">
              <Copy size={10} />
            </button>
            <QualityBadge quality={o.quality} compact />
          </div>
          <p className="mt-0.5 text-[11px] text-white/30">{fmtDate(o.createdAt)}</p>
        </div>

        <div className="min-w-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenCustomer?.(o.customerInfo?.phone); }}
            className="block truncate text-left text-[13px] text-white/90 hover:text-white"
          >
            {o.customerInfo?.name}
          </button>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/35">
            {o.customerInfo?.city}
            <ReliabilityBadge reliability={o.reliability} compact />
          </p>
        </div>

        <p className="hidden items-center text-[12px] text-white/45 xl:flex">{fmtDate(o.createdAt)}</p>
        <p className={`${COL} text-[12px] tabular-nums text-white/70`}>
          {itemCount}
          {atRisk && <span className="ml-1 text-white/40">!</span>}
        </p>
        <p className={`${COL} adm-metric text-[13px] text-white`}>{pkr(o.total)}</p>
        <div className={COL}><MonoStatus label={pState} /></div>
        <div className={COL}><MonoStatus label={fulfill} /></div>
        <div className="hidden flex-col items-start gap-1 xl:flex">
          <MonoStatus label={String(o.status || '').toUpperCase()} dim={['Cancelled', 'Refunded', 'Pending'].includes(o.status)} />
          {o.priorityFlag === 'rush' && <span className="text-[9px] uppercase tracking-[0.16em] text-white">Rush</span>}
          {o.customerService?.hasIssue && <span className="text-[9px] uppercase tracking-[0.14em] text-white/45">Issue</span>}
          {invoicePrinted && <span className="text-[9px] uppercase tracking-[0.14em] text-white/30">Printed</span>}
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
              <Link to={`/admin/orders/${o._id}`} className="font-mono text-[13px] font-medium text-white">
                {o.orderNumber}
              </Link>
              <p className="mt-0.5 text-[11px] text-white/35">{fmtDate(o.createdAt)}</p>
            </div>
            <p className="adm-metric shrink-0 text-[14px] text-white">{pkr(o.total)}</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenCustomer?.(o.customerInfo?.phone)}
            className="mt-2 block text-left text-[13px] text-white/85"
          >
            {o.customerInfo?.name}
          </button>
          <p className="mt-0.5 text-[11px] text-white/35">
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {o.customerInfo?.city ? ` · ${o.customerInfo.city}` : ''}
            {bins.length > 0 ? ` · ${bins.slice(0, 2).join(', ')}` : ''}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <MonoStatus label={pState} />
            <MonoStatus label={fulfill} />
            {o.priorityFlag === 'rush' && <span className="text-[9px] uppercase tracking-[0.16em] text-white">Rush</span>}
            {o.customerService?.hasIssue && <span className="text-[9px] uppercase tracking-[0.14em] text-white/45">Issue</span>}
            <QualityBadge quality={o.quality} compact />
          </div>
          <div className="mt-3">{actions}</div>
        </div>
      </div>

      {expanded}
    </div>
  );
}
