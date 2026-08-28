import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Ban, Check, ChevronDown, Copy, Loader2, MoreHorizontal,
} from 'lucide-react';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { CANCEL_REASONS, PRINT_DOCS } from './orderConstants';
import { paymentLabel, fulfillmentLabel } from './orderUi';

/* ============================================================================
 * One order — reference-style table row (orders_balanced_polished design).
 * Colored dot badges for status / payment / fulfillment, SLA chip on the
 * date cell, one-tap Advance + overflow menu. All actions preserved.
 * ========================================================================== */

const stageBadge = (stage) => {
  if (['Delivered', 'Completed'].includes(stage)) return 'od-b-green';
  if (['Cancelled', 'Failed Delivery'].includes(stage)) return 'od-b-red';
  if (['Refunded', 'Returned'].includes(stage)) return 'od-b-purple';
  if (['Shipped', 'In Transit', 'Out for Delivery'].includes(stage)) return 'od-b-blue';
  if (['Packed', 'Manifested', 'To Handover'].includes(stage)) return 'od-b-purple';
  if (['To Pack', 'To Arrange Shipment', 'Picked'].includes(stage)) return 'od-b-yellow';
  return 'od-b-blue'; // New
};

const payBadge = (state) => {
  if (state === 'PAID' || state === 'CONFIRMED') return 'od-b-green';
  if (state === 'FAILED' || state === 'EXPIRED') return 'od-b-red';
  if (state === 'VERIFIED') return 'od-b-blue';
  return 'od-b-yellow';
};

const fulBadge = (label) => {
  const l = String(label || '').toLowerCase();
  if (l.includes('fulfilled') && !l.includes('un')) return 'od-b-green';
  if (l.includes('unfulfilled') || l.includes('none')) return 'od-b-gray';
  return 'od-b-yellow';
};

export default function OrderRow({
  order: o, selected, onSelect, busy, onStage, onVerify, onPrint, onOpenService, onOpenCustomer, onOpenTracking, onOpen,
}) {
  const [menu, setMenu] = useState(false);
  const [cancelMenu, setCancelMenu] = useState(false);
  const [open, setOpen] = useState(false);

  const stage = o.stage || 'New';
  const pState = paymentLabel(o);
  const fulfill = fulfillmentLabel(o);
  const next = (o.allowedNext || []).find((s) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(s));
  const itemCount = (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0);

  const TERMINAL = ['Delivered', 'Completed', 'Cancelled', 'Refunded', 'Returned', 'Failed Delivery'];
  const hrs = Math.max(0, Math.floor((Date.now() - new Date(o.stageUpdatedAt || o.updatedAt || o.createdAt).getTime()) / 3600000));
  const sla = !TERMINAL.includes(stage) && hrs >= 24 ? { label: `${hrs}h`, color: hrs >= 48 ? '#ef4444' : '#f59e0b' } : null;

  const copyRef = () => { navigator.clipboard?.writeText(o.orderNumber); };

  const row = (
    <tr className={selected ? 'od-selected' : ''} onClick={onOpen}>
      <td>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(o._id)}
          aria-label={`Select ${o.orderNumber}`}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 14, height: 14, cursor: 'pointer', accentColor: 'var(--od-black)' }}
        />
      </td>

      <td>
        <Link to={`/admin/orders/${o._id}`} className="od-strong" style={{ color: 'var(--od-text)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
          {o.orderNumber}
        </Link>
        <button onClick={copyRef} aria-label="Copy order number" className="od-act" style={{ marginLeft: 6, width: 18, height: 18 }}>
          <Copy size={10} />
        </button>
        <div className="od-sub2">{itemCount} item{itemCount === 1 ? '' : 's'}{o.priorityFlag === 'rush' ? ' · RUSH' : ''}</div>
      </td>

      <td>
        <button onClick={() => onOpenCustomer(o)} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontWeight: 700, color: 'var(--od-text)', fontSize: 11.5 }}>
          {o.customerInfo?.name || '—'}
        </button>
        <div className="od-sub2">{o.customerInfo?.phone}{o.customerInfo?.city ? ` · ${o.customerInfo.city}` : ''}</div>
      </td>

      <td>
        <b>{fmtDate(o.createdAt)}</b>
        {sla && <span className="od-sla" title={`${hrs}h in ${stage}`} style={{ color: sla.color }}>{sla.label}</span>}
        <div className="od-sub2">{new Date(o.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
      </td>

      <td><span className={`od-b ${stageBadge(stage)}`}><span className="dot" />{stage}</span></td>
      <td><span className={`od-b ${payBadge(pState)}`}><span className="dot" />{pState}</span><div className="od-sub2">{o.paymentMethod}</div></td>
      <td><span className={`od-b ${fulBadge(fulfill)}`}><span className="dot" />{fulfill}</span></td>
      <td className="od-strong">{`PKR ${Number(o.total || 0).toLocaleString('en-PK')}`}</td>

      <td>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }} onClick={(e) => e.stopPropagation()}>
          {next && (
            <button
              disabled={busy}
              onClick={() => onStage(o._id, next)}
              title={`Move to ${next}`}
              className="od-advance"
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : <ArrowRight size={10} />}
              {next}
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Hide items' : 'Show items'}
            aria-expanded={open}
            className="od-act"
          >
            <ChevronDown size={13} className={open ? 'od-chev-open' : ''} />
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu((m) => !m)} aria-label="More actions" className="od-act">
              <MoreHorizontal size={13} />
            </button>
            {menu && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setMenu(false)} />
                <div className="od-menu">
                  <Link to={`/admin/orders/${o._id}`} onClick={() => setMenu(false)}>View full details</Link>
                  {PRINT_DOCS.map((d) => (
                    <button key={d.key} onClick={() => { onPrint(o, d.key); setMenu(false); }}>
                      Print {d.label.toLowerCase()}
                    </button>
                  ))}
                  <div className="od-menu-sep" />
                  {pState !== 'PAID' && (
                    <button onClick={() => { onVerify(o._id, 'Confirmed'); setMenu(false); }}>
                      <Check size={12} /> Mark payment confirmed
                    </button>
                  )}
                  {(o.paymentState || o.paymentStatus) === 'Pending' && (
                    <button onClick={() => { onVerify(o._id, 'Verified'); setMenu(false); }}>
                      <Check size={12} /> Mark payment verified
                    </button>
                  )}
                  {!o.trackingNumber && ['Packed', 'Manifested', 'To Handover', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'].includes(stage) && onOpenTracking && (
                    <button onClick={() => { onOpenTracking(o); setMenu(false); }}>Add tracking number</button>
                  )}
                  <a href={`https://wa.me/${String(o.customerInfo?.phone || '').replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(
                    `Hi ${o.customerInfo?.name || 'there'}, your HUSHAE order ${o.orderNumber} is ${stage}.` +
                    (o.trackingNumber ? ` Tracking ${o.trackingNumber}${o.courierName ? ` via ${o.courierName}` : ''}.` : '') +
                    ` Track live: https://hushae1.vercel.app/track?order=${encodeURIComponent(o.orderNumber)}`
                  )}`}
                    target="_blank" rel="noreferrer">
                    WhatsApp customer
                  </a>
                  <button onClick={() => { onOpenService(o); setMenu(false); }}>Log an issue</button>
                  <div className="od-menu-sep" />
                  <button onClick={() => setCancelMenu((v) => !v)} style={{ color: 'var(--od-muted)' }}>
                    <Ban size={12} /> Cancel order <ChevronDown size={11} style={{ marginLeft: 'auto' }} />
                  </button>
                  {cancelMenu && (
                    <div style={{ padding: '2px 4px 4px' }}>
                      <p className="od-sub2" style={{ padding: '2px 4px' }}>Reason (required)</p>
                      {CANCEL_REASONS.map((r) => (
                        <button key={r} onClick={() => { onStage(o._id, 'Cancelled', r, r); setMenu(false); setCancelMenu(false); }}>
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      {row}
      {open && (
        <tr className="od-expand-row">
          <td />
          <td colSpan={8}>
            <div className="od-items">
              {(o.items || []).map((it, i) => (
                <div key={i} className="od-item">
                  <span className="od-item-qty">{it.quantity} ×</span>
                  <span className="od-item-name">{it.name || it.slug || it.product}</span>
                  {it.size && <span className="od-item-meta">{it.size}{it.color ? ` / ${it.color}` : ''}</span>}
                  {['out_of_stock', 'insufficient', 'low_stock'].includes(it.stockStatus) && (
                    <span className="od-b od-b-red"><span className="dot" />{it.stockStatus.replace(/_/g, ' ')}</span>
                  )}
                  <span className="od-item-price">{`₨${Number(it.price || 0).toLocaleString('en-PK')}`}</span>
                </div>
              ))}
              {bins.length > 0 && (
                <p className="od-sub2" style={{ marginTop: 6 }}>Warehouse bins: {bins.join(', ')}</p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
