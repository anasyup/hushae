import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Ban, Box, CheckCircle2, ChevronRight, Clock, CreditCard, Layers,
  Package, PackageCheck, Phone, Printer, RefreshCcw, Search, Send, ShoppingBag,
  Truck, TruckIcon, XCircle, Copy, MapPin, MessageCircle, Filter,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ============================================================================
 * ORDER MANAGEMENT — workflow-driven design (original, not a copy).
 *
 * Design choices we did NOT copy from Shopee:
 *  - Compact ORDER CARDS instead of a wide table — mobile-first, human-scannable
 *  - Each stage has its OWN action row (contextual buttons) — no "generic dropdown"
 *  - COD gets a dedicated verification workflow ("Confirm by Call" button)
 *  - Auto-confirm rule: when payment is marked Paid, order jumps to "To Pack"
 *  - "To Ship" stage exposes an inline TRACKING form (courier + tracking #)
 *  - Print Invoice appears only when it makes sense (Confirmed onwards)
 * ============================================================================ */

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];

// Top-level "stage" tabs — each is a bucket the admin thinks in.
const STAGES = [
  { key: 'all',        label: 'All',            icon: Layers,        color: 'neutral' },
  { key: 'new',        label: 'New',            icon: Clock,         color: 'amber',   hint: 'Fresh orders — awaiting payment confirmation or COD call' },
  { key: 'to-ship',    label: 'To Ship',        icon: Box,           color: 'blue',    hint: 'Confirmed — pack, arrange courier, hand over' },
  { key: 'shipping',   label: 'In Transit',     icon: Truck,         color: 'purple',  hint: 'On the way to the customer' },
  { key: 'delivered',  label: 'Delivered',      icon: CheckCircle2,  color: 'green' },
  { key: 'issues',     label: 'Issues',         icon: AlertTriangle, color: 'red',     hint: 'Failed delivery, cancellations, refunds' },
];

// Sub-buckets shown INSIDE "New" — split by payment type
const NEW_SUB = [
  { key: 'cod-verify', label: 'COD · Verify by Call', icon: Phone,     match: (o) => o.paymentMethod === 'COD' && o.status === 'Pending' && !o.verifiedByCall, hint: 'Call the customer to confirm — then click "Confirm by Call"' },
  { key: 'awaiting-payment', label: 'Awaiting Payment', icon: CreditCard, match: (o) => o.paymentMethod !== 'COD' && o.paymentStatus === 'Pending' && o.status === 'Pending', hint: 'Customer promised online payment — verify txn ID then mark Paid' },
];

// Sub-buckets shown INSIDE "To Ship" — the fulfillment flow
const TO_SHIP_SUB = [
  { key: 'to-pack',     label: 'To Pack',           icon: Box,          status: 'Confirmed',      hint: 'Pack the items securely with discreet packaging' },
  { key: 'to-arrange',  label: 'To Arrange Courier',icon: Send,         status: 'Processing',     hint: 'Book pickup with your courier (TCS, Leopards, etc.)' },
  { key: 'to-handover', label: 'To Handover',       icon: PackageCheck, status: 'Ready to Ship',  hint: 'Waiting for courier to pick up' },
];

// Which orders fall into each STAGE
function bucketOf(o) {
  if (o.status === 'Cancelled' || o.status === 'Refunded') return 'issues';
  if (o.status === 'Delivered') return 'delivered';
  if (['Shipped', 'Out for Delivery'].includes(o.status)) {
    const ageDays = (Date.now() - new Date(o.createdAt).getTime()) / 86400000;
    return ageDays > 10 ? 'issues' : 'shipping';
  }
  if (['Confirmed', 'Processing', 'Ready to Ship'].includes(o.status)) return 'to-ship';
  return 'new'; // Pending
}

/* Colour classes per stage — sober palette, not loud */
const STAGE_TONE = {
  neutral: { text: 'text-neutral-700', bg: 'bg-neutral-100',   ring: 'ring-neutral-200',   pill: 'bg-neutral-900 text-white' },
  amber:   { text: 'text-amber-700',   bg: 'bg-amber-50',      ring: 'ring-amber-200',     pill: 'bg-amber-500 text-white' },
  blue:    { text: 'text-blue-700',    bg: 'bg-blue-50',       ring: 'ring-blue-200',      pill: 'bg-blue-600 text-white' },
  purple:  { text: 'text-purple-700',  bg: 'bg-purple-50',     ring: 'ring-purple-200',    pill: 'bg-purple-600 text-white' },
  green:   { text: 'text-emerald-700', bg: 'bg-emerald-50',    ring: 'ring-emerald-200',   pill: 'bg-emerald-600 text-white' },
  red:     { text: 'text-red-700',     bg: 'bg-red-50',        ring: 'ring-red-200',       pill: 'bg-red-600 text-white' },
};

export const statusPill = (s) =>
  s === 'Delivered' ? 'bg-emerald-100 text-emerald-800'
    : s === 'Cancelled' ? 'bg-red-100 text-red-800'
    : s === 'Refunded' ? 'bg-orange-100 text-orange-800'
    : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-purple-100 text-purple-800'
    : s === 'Ready to Ship' ? 'bg-blue-100 text-blue-800'
    : s === 'Processing' ? 'bg-blue-50 text-blue-700'
    : s === 'Confirmed' ? 'bg-cyan-100 text-cyan-800'
    : 'bg-amber-100 text-amber-800';

/* ============================================================================
 * OrderCard — the atomic card unit that shows one order and its actions.
 * Actions rendered depend on the current stage.
 * ========================================================================== */
function OrderCard({ order: o, onAction, actionsBusyId }) {
  const [expanded, setExpanded] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState({
    courierName: o.courierName || '',
    trackingNumber: o.trackingNumber || '',
  });
  const busy = actionsBusyId === o._id;

  const isCOD = o.paymentMethod === 'COD';
  const codPendingVerify = isCOD && o.status === 'Pending' && !o.verifiedByCall;
  const awaitingPayment = !isCOD && o.paymentStatus === 'Pending' && o.status === 'Pending';

  // What actions are relevant at THIS stage?
  const stage = bucketOf(o);
  const isConfirmed = o.status === 'Confirmed';
  const isProcessing = o.status === 'Processing';
  const isReadyToShip = o.status === 'Ready to Ship';
  const isShipped = ['Shipped', 'Out for Delivery'].includes(o.status);

  const copyOrderNo = () => {
    try { navigator.clipboard.writeText(o.orderNumber); } catch {}
  };

  return (
    <article className="group relative rounded-2xl border border-neutral-200 bg-white transition hover:border-neutral-300 hover:shadow-sm">
      {/* Left status indicator strip */}
      <div className={`absolute inset-y-0 left-0 w-1 rounded-l-2xl ${
        stage === 'new'       ? 'bg-amber-400'
        : stage === 'to-ship'  ? 'bg-blue-500'
        : stage === 'shipping' ? 'bg-purple-500'
        : stage === 'delivered'? 'bg-emerald-500'
        : stage === 'issues'   ? 'bg-red-500'
        : 'bg-neutral-300'
      }`} />

      <div className="grid gap-4 p-4 pl-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">

        {/* --- ORDER + ITEMS thumbnail row --- */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={copyOrderNo} className="group/copy inline-flex items-center gap-1 rounded-md font-mono text-[9px] font-semibold text-neutral-900 hover:text-blue-600" title="Copy order number">
              {o.orderNumber} <Copy size={11} className="opacity-0 transition-opacity group-hover/copy:opacity-100" />
            </button>
            <span className={`pill ${statusPill(o.status)}`}>{o.status}</span>
            {o.verifiedByCall && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700"><Phone size={10} /> Verified</span>}
            {o.discreetPackaging && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-neutral-100 text-neutral-600">Discreet</span>}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-2">
              {(o.items || []).slice(0, 4).map((it, i) => (
                <Img key={i} src={it.image} alt="" className="h-10 w-8 rounded-md border-2 border-white object-cover shadow-sm" />
              ))}
              {o.items?.length > 4 && (
                <span className="grid h-10 w-8 place-items-center rounded-md border-2 border-white bg-neutral-100 text-[10px] font-bold text-neutral-600 shadow-sm">+{o.items.length - 4}</span>
              )}
            </div>
            <p className="text-[9px] text-neutral-500">{o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'} · {fmtDate(o.createdAt)}</p>
          </div>
        </div>

        {/* --- CUSTOMER --- */}
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-neutral-900">{o.customerInfo.name}</p>
          <div className="mt-1 flex items-center gap-2 text-[9px] text-neutral-500">
            <Phone size={11} /> <span className="font-mono">{o.customerInfo.phone}</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[9px] text-neutral-500">
            <MapPin size={11} /> {o.customerInfo.city}, {o.customerInfo.province}
          </p>
        </div>

        {/* --- MONEY --- */}
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900">{pkr(o.total)}</p>
          <p className="mt-1 text-[9px] text-neutral-500">
            {o.paymentMethod}
            <span className={`ml-1.5 pill ${o.paymentStatus === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {o.paymentStatus}
            </span>
          </p>
        </div>

        {/* --- QUICK ACTIONS --- */}
        <div className="flex items-center gap-1.5">
          <Link to={`/admin/orders/${o._id}`} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-[9px] font-semibold text-neutral-700 transition hover:bg-neutral-900 hover:text-white">
            Details <ChevronRight size={11} className="inline" />
          </Link>
          <button onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} className="rounded-lg border border-neutral-200 px-2 py-1.5 text-neutral-500 transition hover:bg-neutral-100" title={expanded ? 'Hide actions' : 'Show actions'}>
            <ChevronRight size={13} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* --- EXPANDABLE ACTION ROW — contextual per stage --- */}
      {expanded && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 p-4 pl-5">

          {codPendingVerify && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-[9px] font-semibold text-amber-900">📞 COD verification pending</p>
              <p className="mt-1 text-[9px] text-amber-800">Call the customer to confirm the order before shipping. Fake COD orders cost you courier fees.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`tel:${o.customerInfo.phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-amber-900 shadow-sm ring-1 ring-amber-300 hover:bg-amber-100">
                  <Phone size={12} /> Call {o.customerInfo.phone}
                </a>
                <a href={`https://wa.me/${(o.customerInfo.phone || '').replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(`Hi! This is HUSHAE regarding your order ${o.orderNumber}. Can we confirm the delivery details?`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-green-800 shadow-sm ring-1 ring-green-300 hover:bg-green-50">
                  <MessageCircle size={12} /> WhatsApp
                </a>
                <button disabled={busy} onClick={() => onAction('verify-cod', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 size={12} /> {busy ? 'Confirming…' : 'Confirm by Call'}
                </button>
                <button disabled={busy} onClick={() => onAction('cancel', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50">
                  <XCircle size={12} /> Cancel
                </button>
              </div>
            </div>
          )}

          {awaitingPayment && (
            <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-[9px] font-semibold text-blue-900">💳 Awaiting payment confirmation</p>
              <p className="mt-1 text-[9px] text-blue-800">
                Method: <b>{o.paymentMethod}</b>
                {o.transactionId && <> · Txn ID: <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px]">{o.transactionId}</code></>}
              </p>
              <p className="mt-1 text-[9px] text-blue-800">Verify payment in your account, then click below to confirm.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => onAction('mark-paid', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 size={12} /> {busy ? 'Confirming…' : 'Mark Paid → Auto-Confirm'}
                </button>
                <button disabled={busy} onClick={() => onAction('cancel', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50">
                  <XCircle size={12} /> Cancel
                </button>
              </div>
            </div>
          )}

          {isConfirmed && (
            <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-[9px] font-semibold text-blue-900">📦 Ready to pack</p>
              <p className="mt-1 text-[9px] text-blue-800">Print the invoice, pack the items with discreet packaging, then move to next stage.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a href={`/admin/orders/${o._id}/invoice`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-300 hover:bg-neutral-100">
                  <Printer size={12} /> Print Invoice
                </a>
                <button disabled={busy} onClick={() => onAction('mark-processing', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50">
                  <Send size={12} /> Packed — Arrange Courier
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="mb-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
              <p className="text-[9px] font-semibold text-purple-900">🚚 Arranging courier</p>
              <p className="mt-1 text-[9px] text-purple-800">Book pickup with TCS / Leopards / M&P and enter tracking details.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input value={trackingDraft.courierName} onChange={(e) => setTrackingDraft({ ...trackingDraft, courierName: e.target.value })} placeholder="Courier (e.g. TCS)" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900 !py-2 !text-[9px]" />
                <input value={trackingDraft.trackingNumber} onChange={(e) => setTrackingDraft({ ...trackingDraft, trackingNumber: e.target.value })} placeholder="Tracking number" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900 !py-2 !text-[9px]" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => onAction('save-tracking', o, trackingDraft)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-300 hover:bg-neutral-100 disabled:opacity-50">
                  Save Tracking
                </button>
                <button disabled={busy} onClick={() => onAction('mark-ready', o, trackingDraft)} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50">
                  <PackageCheck size={12} /> Ready — Waiting for Pickup
                </button>
              </div>
            </div>
          )}

          {isReadyToShip && (
            <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-[9px] font-semibold text-blue-900">📮 Waiting for courier pickup</p>
              {o.courierName && (
                <p className="mt-1 text-[9px] text-blue-800">
                  {o.courierName}{o.trackingNumber && <> · <code className="rounded bg-white px-1.5 py-0.5 font-mono">{o.trackingNumber}</code></>}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button disabled={busy} onClick={() => onAction('mark-shipped', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm hover:bg-purple-700 disabled:opacity-50">
                  <TruckIcon size={12} /> Courier Picked Up — Shipped
                </button>
              </div>
            </div>
          )}

          {isShipped && (
            <div className="mb-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
              <p className="text-[9px] font-semibold text-purple-900">🚛 In transit</p>
              {o.trackingNumber && (
                <p className="mt-1 text-[9px] text-purple-800">
                  {o.courierName} · <code className="rounded bg-white px-1.5 py-0.5 font-mono">{o.trackingNumber}</code>
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {o.status === 'Shipped' && (
                  <button disabled={busy} onClick={() => onAction('mark-ofd', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-purple-800 shadow-sm ring-1 ring-purple-300 hover:bg-purple-100 disabled:opacity-50">
                    Out for Delivery
                  </button>
                )}
                <button disabled={busy} onClick={() => onAction('mark-delivered', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[9px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle2 size={12} /> Mark Delivered
                </button>
                <button disabled={busy} onClick={() => onAction('mark-failed', o)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[9px] font-semibold text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50">
                  Failed Delivery
                </button>
              </div>
            </div>
          )}

          {o.status === 'Delivered' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-[9px] font-semibold text-emerald-900">✅ Order delivered</p>
              <p className="mt-1 text-[9px] text-emerald-800">The customer received their order. You can archive or process a return if requested.</p>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* ============================================================================
 * Main Orders page
 * ========================================================================== */
export default function Orders() {
  const { auth, toast, logout } = useApp();
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const stage    = searchParams.get('stage')  || 'all';
  const subTab   = searchParams.get('sub')    || '';

  const setStage = (k) => { const p = new URLSearchParams(); if (k !== 'all') p.set('stage', k); setSearchParams(p, { replace: true }); };
  const setSub   = (k) => { const p = new URLSearchParams(searchParams); if (k) p.set('sub', k); else p.delete('sub'); setSearchParams(p, { replace: true }); };

  const load = async () => {
    try {
      const d = await api('/orders/admin', { token: auth.token });
      setOrders(d.orders);
      setErr('');
    } catch (e) {
      if (e?.status === 401) { logout(); return; }
      setErr('Failed to load orders — please try again.');
      setOrders([]);
    }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const setStatus = async (id, status, note = '') => {
    setBusyId(id);
    try {
      await api(`/orders/admin/${id}/status`, { method: 'PATCH', token: auth.token, body: { status, note } });
      await load();
    } catch (ex) { toast(ex.message || 'Update failed'); }
    setBusyId('');
  };

  const handleAction = async (kind, o, extra = {}) => {
    setBusyId(o._id);
    try {
      switch (kind) {
        case 'verify-cod':
          await api(`/orders/admin/${o._id}/verify-cod`, { method: 'PATCH', token: auth.token, body: {} });
          toast('COD verified — moved to To Pack');
          break;
        case 'mark-paid':
          await api(`/orders/admin/${o._id}/payment`, { method: 'PATCH', token: auth.token, body: { paymentStatus: 'Paid' } });
          toast('Payment confirmed — auto-moved to To Pack');
          break;
        case 'mark-processing':
          await api(`/orders/admin/${o._id}/status`, { method: 'PATCH', token: auth.token, body: { status: 'Processing', note: 'Packed — arranging courier' } });
          toast('Moved to Arrange Courier');
          break;
        case 'save-tracking':
          await api(`/orders/admin/${o._id}/tracking`, { method: 'PATCH', token: auth.token, body: extra });
          toast('Tracking saved');
          break;
        case 'mark-ready':
          if (extra.courierName || extra.trackingNumber) {
            await api(`/orders/admin/${o._id}/tracking`, { method: 'PATCH', token: auth.token, body: extra });
          }
          await api(`/orders/admin/${o._id}/status`, { method: 'PATCH', token: auth.token, body: { status: 'Ready to Ship', note: 'Ready — waiting pickup' } });
          toast('Moved to Waiting for Pickup');
          break;
        case 'mark-shipped':
          await api(`/orders/admin/${o._id}/status`, { method: 'PATCH', token: auth.token, body: { status: 'Shipped', note: 'Courier picked up' } });
          toast('Marked Shipped');
          break;
        case 'mark-ofd':
          await api(`/orders/admin/${o._id}/status`, { method: 'PATCH', token: auth.token, body: { status: 'Out for Delivery' } });
          toast('Out for Delivery');
          break;
        case 'mark-delivered':
          await api(`/orders/admin/${o._id}/status`, { method: 'PATCH', token: auth.token, body: { status: 'Delivered' } });
          toast('Marked Delivered');
          break;
        case 'mark-failed':
          await api(`/orders/admin/${o._id}/status`, { method: 'PATCH', token: auth.token, body: { status: 'Cancelled', note: 'Failed delivery' } });
          toast('Marked as failed delivery');
          break;
        case 'cancel':
          if (!window.confirm(`Cancel order ${o.orderNumber}?`)) { setBusyId(''); return; }
          await api(`/orders/admin/${o._id}/status`, { method: 'PATCH', token: auth.token, body: { status: 'Cancelled', note: 'Cancelled by admin' } });
          toast('Order cancelled');
          break;
      }
      await load();
    } catch (ex) { toast(ex.message || 'Action failed'); }
    setBusyId('');
  };

  // Counts per stage + sub
  const counts = useMemo(() => {
    const out = {};
    STAGES.forEach((s) => (out[s.key] = 0));
    NEW_SUB.forEach((s) => (out[s.key] = 0));
    TO_SHIP_SUB.forEach((s) => (out[s.key] = 0));
    if (!Array.isArray(orders)) return out;
    for (const o of orders) {
      out.all += 1;
      const b = bucketOf(o);
      out[b] = (out[b] || 0) + 1;
      NEW_SUB.forEach((s) => { if (s.match(o)) out[s.key] += 1; });
      TO_SHIP_SUB.forEach((s) => { if (o.status === s.status) out[s.key] += 1; });
    }
    return out;
  }, [orders]);

  // Filter for current view
  const filtered = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let list = orders;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((o) =>
        o.orderNumber?.toLowerCase().includes(needle) ||
        o.customerInfo?.name?.toLowerCase().includes(needle) ||
        o.customerInfo?.phone?.toLowerCase().includes(needle) ||
        o.customerInfo?.email?.toLowerCase().includes(needle)
      );
    }
    if (stage !== 'all') list = list.filter((o) => bucketOf(o) === stage);
    if (stage === 'new' && subTab) {
      const s = NEW_SUB.find((x) => x.key === subTab);
      if (s) list = list.filter(s.match);
    }
    if (stage === 'to-ship' && subTab) {
      const s = TO_SHIP_SUB.find((x) => x.key === subTab);
      if (s) list = list.filter((o) => o.status === s.status);
    }
    return list;
  }, [orders, q, stage, subTab]);

  const currentStage = STAGES.find((s) => s.key === stage) || STAGES[0];
  const currentSubList = stage === 'new' ? NEW_SUB : stage === 'to-ship' ? TO_SHIP_SUB : [];

  return (
    <AdminLayout title="Order Management">

      {/* --------------- STAGE TILES (top summary) --------------- */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {STAGES.map((s) => {
          const active = stage === s.key;
          const tone = STAGE_TONE[s.color] || STAGE_TONE.neutral;
          const Icon = s.icon;
          const n = counts[s.key] || 0;
          return (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                active
                  ? `border-neutral-900 bg-white shadow-sm ring-2 ring-neutral-900/10`
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
              }`}
            >
              {active && <span className={`absolute inset-x-0 top-0 h-[3px] ${tone.pill}`} />}
              <div className="flex items-start justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? tone.pill : `${tone.bg} ${tone.text}`}`}>
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${active ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700'}`}>{n}</span>
              </div>
              <p className={`mt-3 text-[10px] font-semibold ${active ? 'text-neutral-900' : 'text-neutral-700'}`}>{s.label}</p>
              {s.hint && <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-neutral-500">{s.hint}</p>}
            </button>
          );
        })}
      </div>

      {/* --------------- SUB-TABS (for New / To Ship) --------------- */}
      {currentSubList.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={() => setSub('')} className={`rounded-full border px-4 py-1.5 text-[9px] font-semibold transition ${!subTab ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'}`}>
            All in {currentStage.label} · {counts[stage] || 0}
          </button>
          {currentSubList.map((s) => {
            const active = subTab === s.key;
            const Icon = s.icon;
            const n = counts[s.key] || 0;
            return (
              <button
                key={s.key}
                onClick={() => setSub(s.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-[9px] font-semibold transition ${
                  active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                }`}
              >
                <Icon size={13} />
                {s.label}
                <span className={`ml-1 rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* --------------- Toolbar (search) --------------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] text-neutral-600">
          Showing <b className="text-neutral-900">{filtered.length}</b> order{filtered.length === 1 ? '' : 's'}
          {stage !== 'all' && <> in <b className="text-neutral-900">{currentStage.label}</b></>}
          {subTab && currentSubList.find((s) => s.key === subTab) && <> · <b className="text-neutral-900">{currentSubList.find((s) => s.key === subTab).label}</b></>}
        </p>
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order #, name, phone or email…" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900 !w-80 !py-2.5 !pl-9 !text-[10px]" />
        </div>
      </div>

      {/* --------------- Sub-tab hint (contextual help) --------------- */}
      {subTab && currentSubList.find((s) => s.key === subTab)?.hint && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-[9px] text-blue-900">💡 {currentSubList.find((s) => s.key === subTab).hint}</p>
        </div>
      )}

      {/* --------------- Order cards --------------- */}
      <div className="space-y-3">
        {orders === null && !err && (
          <>{[1, 2, 3].map((i) => <div key={i} className="animate-pulse rounded-xl bg-neutral-100 h-24 w-full rounded-2xl" />)}</>
        )}

        {filtered.map((o) => (
          <OrderCard key={o._id} order={o} onAction={handleAction} actionsBusyId={busyId} />
        ))}

        {orders !== null && filtered.length === 0 && !err && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center">
            <ShoppingBag size={32} className="mb-3 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-600">No orders in this view</p>
            <p className="mt-1 text-[9px] text-neutral-400">Try changing the stage or search terms.</p>
          </div>
        )}
        {err && (
          <div className="grid place-items-center rounded-2xl border border-red-200 bg-red-50 py-14 text-center">
            <XCircle size={26} className="mb-2 text-red-500" />
            <p className="text-sm text-red-700">{err}</p>
            <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[9px] font-semibold text-neutral-700 hover:bg-neutral-50 mt-4 !px-5 !py-2 !text-[9px]">Try again</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
