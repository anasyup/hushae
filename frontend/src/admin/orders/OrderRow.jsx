import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ban, Check, ChevronDown, Copy, Loader2, MoreHorizontal, X } from 'lucide-react';
import { pkr } from '../../lib/format';
import { CANCEL_REASONS, PRINT_DOCS } from './orderConstants';
import QualityBadge from './QualityBadge';
import { fulfillmentLabel, paymentLabel } from './orderUi';
import s from './adesk.module.css';

/* ===========================================================================
 * One order — reference-faithful row (orders_balanced_polished.html).
 *
 * Column order, sizes and cell anatomy follow the reference 1:1:
 * [ ] · ORDER (14%) · CUSTOMER (22%) · DATE (16%) · STATUS (12%)
 * · PAYMENT (12%) · FULFILLMENT (10%) · TOTAL (10%) · ACTIONS.
 * Two-line cells are bold primary + 10px muted secondary, exactly as the
 * design does it. Table layout is fixed, so nothing can ever push a
 * horizontal scrollbar; under 900px the row becomes a card.
 * =========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join('');

const STATUS_TONE = {
  Pending: 'bAmber', Confirmed: 'bBlue', Processing: 'bAmber', 'Ready to Ship': 'bBlue',
  Shipped: 'bBlue', 'Out for Delivery': 'bBlue', Delivered: 'bGreen',
  Cancelled: 'bRed', Refunded: 'bPurple',
};
const FULFIL_TONE = {
  'New': 'bAmber', 'To Pack': 'bPurple', 'To Arrange Shipment': 'bPurple', 'Picked': 'bPurple',
  'Packed': 'bBlue', 'Manifested': 'bBlue', 'To Handover': 'bBlue',
  'Shipped': 'bBlue', 'In Transit': 'bBlue', 'Out for Delivery': 'bBlue',
  'Delivered': 'bGreen', 'Completed': 'bGreen',
  'Cancelled': 'bRed', 'Failed Delivery': 'bRed', 'Refunded': 'bPurple', 'Returned': 'bPurple',
};
const PAY_TONE = {
  PAID: 'bGreen', CONFIRMED: 'bGreen', VERIFIED: 'bGreen', PENDING: 'bBlue',
  FAILED: 'bRed', EXPIRED: 'bRed', REFUNDED: 'bPurple',
};
const toneOf = (map, key, fallback = 'bGray') => map[key] || fallback;
const title = (v) => String(v || '').toLowerCase().replace(/(^^|\s)\w/g, (m) => m.toUpperCase()).trim();

const dayOf = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const timeOf = (d) => new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

function Bdg({ tone, children }) {
  return (
    <span className={cx(s.bdg, s[tone])}>
      <span className={s.bdgDot} aria-hidden />
      <span className={s.cellEllip}>{children}</span>
    </span>
  );
}

export default function OrderRow({
  order: o, selected, onSelect, busy, onStage, onVerify, onPrint, onOpenService, onOpenCustomer, mobile = false,
}) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [cancelMenu, setCancelMenu] = useState(false);

  const stage = o.stage || 'New';
  const pState = paymentLabel(o);   // 'PAID' | 'PENDING' | 'VERIFIED' … (orderUi.paymentLabel)
  const fulfill = fulfillmentLabel(o);
  const status = o.status || 'Pending';
  const next = (o.allowedNext || []).find((st) => !['Cancelled', 'Refunded', 'Returned', 'Failed Delivery'].includes(st));
  const itemCount = (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0);
  const bins = [...new Set((o.items || []).map((i) => i.warehouseLocation).filter(Boolean))];
  const atRisk = (o.items || []).some((i) => ['out_of_stock', 'insufficient', 'low_stock'].includes(i.stockStatus));
  const invoicePrinted = o.printStatus?.invoice?.printed;
  const ref = String(o.orderNumber || '').startsWith('#') ? o.orderNumber : `#${o.orderNumber}`;
  const secondary = o.customerInfo?.email || o.customerInfo?.phone || o.customerInfo?.city || '—';

  const copyRef = () => { navigator.clipboard?.writeText(o.orderNumber); };

  const menuPanel = menu && (
    <>
      <div className={s.menuScrim} onClick={() => setMenu(false)} />
      <div className={cx(s.menu, s.menuRight, s.menuWide, s.show)} style={{ top: 28, zIndex: 300 }}>
        <Link to={`/admin/orders/${o._id}`} className={s.menuItem} onClick={() => setMenu(false)}>View full details</Link>
        {PRINT_DOCS.map((d) => (
          <button key={d.key} type="button" onClick={() => { onPrint(o, d.key); setMenu(false); }} className={s.menuItem}>
            Print {d.label.toLowerCase()}
          </button>
        ))}
        <div className={s.menuDiv} />
        {pState !== 'PAID' && (
          <button type="button" onClick={() => { onVerify(o._id, 'Confirmed'); setMenu(false); }} className={s.menuItem}>
            <Check size={12} style={{ color: 'var(--muted)' }} /> Mark payment confirmed
          </button>
        )}
        {(o.paymentState || o.paymentStatus) === 'Pending' && (
          <button type="button" onClick={() => { onVerify(o._id, 'Verified'); setMenu(false); }} className={s.menuItem}>Mark payment verified</button>
        )}
        <a href={`https://wa.me/${String(o.customerInfo?.phone || '').replace(/\D/g, '').replace(/^0/, '92')}`}
          target="_blank" rel="noreferrer" className={s.menuItem}>WhatsApp customer</a>
        <button type="button" onClick={() => { onOpenService(o); setMenu(false); }} className={s.menuItem}>Log an issue</button>
        <div className={s.menuDiv} />
        <button type="button" onClick={() => setCancelMenu((v) => !v)} className={s.menuItem}>
          <Ban size={12} style={{ color: 'var(--muted)' }} /> Cancel order
          <ChevronDown size={11} style={{ marginLeft: 'auto', transform: cancelMenu ? 'rotate(180deg)' : 'none', transition: '.15s' }} />
        </button>
        {cancelMenu && (
          <div style={{ padding: '0 4px 4px' }}>
            <p className={s.ctlLabel} style={{ padding: '4px 2px 2px' }}>Reason (required)</p>
            {CANCEL_REASONS.map((r) => (
              <button key={r} type="button"
                onClick={() => { onStage(o._id, 'Cancelled', r, r); setMenu(false); setCancelMenu(false); }}
                className={s.menuItem} style={{ fontSize: 11, color: 'var(--muted)' }}>
                {r}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );

  const actions = (
    <div className={s.acts} style={{ zIndex: 40 }} onClick={(e) => e.stopPropagation()}>
      {next && (
        <button type="button" disabled={busy} onClick={() => onStage(o._id, next)} title={`Move to ${next}`}
          className={cx(s.actBtn, s.actGhost)}>
          {busy ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={12} />}
        </button>
      )}
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        <button type="button" onClick={() => setMenu((v) => !v)} aria-label="More actions" aria-expanded={menu} className={s.actBtn}>
          <MoreHorizontal size={13} />
        </button>
        {menuPanel}
      </div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Toggle items" aria-expanded={open}
        className={cx(s.actBtn, s.actGhost, open && s.actSeen)}>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.18s' }} />
      </button>
    </div>
  );

  const tray = (
    <>
      {(o.items || [])
        .slice().sort((a, b) => (a.pickPriority || 3) - (b.pickPriority || 3))
        .map((it, i) => (
          <div key={i} className={s.itemRow}>
            {it.image ? <img src={it.image} alt="" loading="lazy" /> : <span className={s.itemPh} />}
            <span className={s.itemName}>{it.name}</span>
            {(it.warehouseLocation || it.sku) && (
              <span className={s.itemMeta}>{[it.warehouseLocation, it.sku].filter(Boolean).join(' · ')}</span>
            )}
            {it.stockStatus && it.stockStatus !== 'in_stock' && (
              <span className={s.itemWarn}>
                {it.stockStatus === 'out_of_stock' ? 'Out of stock'
                  : it.stockStatus === 'insufficient' ? `Only ${it.stockAvailable} left`
                    : `Low — ${it.stockAvailable} left`}
              </span>
            )}
            {[it.size, it.color].filter(Boolean).length > 0 && (
              <span className={s.itemMeta}>{[it.size, it.color].filter(Boolean).join(' · ')}</span>
            )}
            <span className={s.itemQty}>×{it.quantity}</span>
            <span className={s.itemAmt}>{pkr(it.lineTotal)}</span>
          </div>
        ))}
      <div className={s.trayFoot}>
        <span><b>Address</b> {o.customerInfo?.address || '—'}</span>
        {o.trackingNumber && <span><b>Tracking</b> {o.trackingNumber}</span>}
        {o.courierName && <span><b>Courier</b> {o.courierName}</span>}
        <span><b>Items</b> {itemCount}</span>
        {bins.length > 0 && <span><b>Bins</b> {bins.join(', ')}</span>}
      </div>
    </>
  );

  /* ── mobile card ───────────────────────────────────────────────────── */
  if (mobile) {
    return (
      <div className={s.mCard} style={selected ? { borderColor: '#111', boxShadow: '0 0 0 2px rgba(17,17,17,.12)' } : undefined}>
        <div className={s.mTop}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', minWidth: 0 }}>
            <input type="checkbox" className={s.chk} checked={selected} onChange={() => onSelect(o._id)}
              aria-label={`Select order ${o.orderNumber}`} style={{ marginTop: 3 }} />
            <div style={{ minWidth: 0 }}>
              <Link to={`/admin/orders/${o._id}`} style={{ fontSize: 12.5, fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>{ref}</Link>
              <p className={s.oSub}>{dayOf(o.createdAt)} · {timeOf(o.createdAt)}</p>
            </div>
          </div>
          <span className={s.oTotal}>{pkr(o.total)}</span>
        </div>
        <button type="button" className={s.oName} onClick={() => onOpenCustomer?.(o.customerInfo?.phone)} style={{ fontWeight: 600 }}>
          {o.customerInfo?.name}
        </button>
        <div className={s.mGrid}>
          <span>Status<b style={{ marginTop: 3 }}><Bdg tone={toneOf(STATUS_TONE, status)}>{status}</Bdg></b></span>
          <span>Payment<b style={{ marginTop: 3 }}><Bdg tone={toneOf(PAY_TONE, pState)}>{pState}</Bdg></b></span>
          <span>Fulfillment<b style={{ marginTop: 3 }}><Bdg tone={toneOf(FULFIL_TONE, stage)}>{fulfill}</Bdg></b></span>
          <span>Total<b>{pkr(o.total)}</b></span>
        </div>
        <div className={s.mActs}>
          {actions}
          <QualityBadge quality={o.quality} compact />
          {atRisk && <span className={s.itemWarn}>Stock risk</span>}
          {open && <div style={{ width: '100%', marginTop: 6 }}>{tray}</div>}
        </div>
      </div>
    );
  }

  /* ── desktop row ───────────────────────────────────────────────────── */
  return (
    <>
      <tr className={cx(selected && s.trSel)} onClick={() => setOpen((v) => !v)}>
        <td onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className={s.chk} checked={selected} onChange={() => onSelect(o._id)}
            aria-label={`Select order ${o.orderNumber}`} />
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Link to={`/admin/orders/${o._id}`} onClick={(e) => e.stopPropagation()}
              className={s.cellEllip} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, fontSize: 11.5 }}>
              {ref}
            </Link>
            <button type="button" className={s.searchBtn} aria-label="Copy order number" onClick={(e) => { e.stopPropagation(); copyRef(); }}>
              <Copy size={10} />
            </button>
          </div>
        </td>
        <td>
          <button type="button" className={s.oName} style={{ fontWeight: 700 }}
            onClick={(e) => { e.stopPropagation(); onOpenCustomer?.(o.customerInfo?.phone); }}>
            {o.customerInfo?.name}
          </button>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={s.cellEllip}>{secondary}</span>
            <QualityBadge quality={o.quality} compact />
          </div>
        </td>
        <td>
          <div style={{ fontWeight: 700, fontSize: 11 }}>{dayOf(o.createdAt)}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{timeOf(o.createdAt)}</div>
        </td>
        <td><Bdg tone={toneOf(STATUS_TONE, status)}>{status}</Bdg></td>
        <td><Bdg tone={toneOf(PAY_TONE, pState)}>{title(pState)}</Bdg></td>
        <td><Bdg tone={toneOf(FULFIL_TONE, stage)}>{fulfill}</Bdg></td>
        <td><span className={s.oTotal}>{pkr(o.total)}</span></td>
        <td className={cx(s.colAct, s.cellRel, (selected || open) && s.actSel)} onClick={(e) => e.stopPropagation()}>{actions}</td>
      </tr>
      {open && (
        <tr className={s.tray}>
          <td colSpan={9}>
            <div className={s.trayInner}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span className={s.ctlLabel} style={{ margin: 0 }}>Items ({(o.items || []).length})</span>
                <button type="button" className={s.btnSm} onClick={() => setOpen(false)}><X size={11} /> Close</button>
              </div>
              {tray}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
