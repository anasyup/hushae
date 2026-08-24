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
 * ORDER MANAGEMENT — Phase 5 Premium Rebuild
 * Professional operations workspace. White + Jet Black.
 * ========================================================================== */

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];

const STAGES = [
  { key: 'all',        label: 'All',            icon: Layers,        color: 'neutral' },
  { key: 'new',        label: 'New',            icon: Clock,         color: 'amber',   hint: 'Fresh orders — awaiting payment confirmation or COD call' },
  { key: 'to-ship',    label: 'To Ship',        icon: Box,           color: 'blue',    hint: 'Confirmed — pack, arrange courier, hand over' },
  { key: 'shipping',   label: 'In Transit',     icon: Truck,         color: 'purple',  hint: 'On the way to the customer' },
  { key: 'delivered',  label: 'Delivered',      icon: CheckCircle2,  color: 'green' },
  { key: 'issues',     label: 'Issues',         icon: AlertTriangle, color: 'red',     hint: 'Failed delivery, cancellations, refunds' },
];

const NEW_SUB = [
  { key: 'cod-verify', label: 'COD · Verify by Call', icon: Phone,     match: (o) => o.paymentMethod === 'COD' && o.status === 'Pending' && !o.verifiedByCall, hint: 'Call the customer to confirm — then click "Confirm by Call"' },
  { key: 'awaiting-payment', label: 'Awaiting Payment', icon: CreditCard, match: (o) => o.paymentMethod !== 'COD' && o.paymentStatus === 'Pending' && o.status === 'Pending', hint: 'Customer promised online payment — verify txn ID then mark Paid' },
];

const TO_SHIP_SUB = [
  { key: 'to-pack',     label: 'To Pack',           icon: Box,          status: 'Confirmed',      hint: 'Pack the items securely with discreet packaging' },
  { key: 'to-arrange',  label: 'To Arrange Courier',icon: Send,         status: 'Processing',     hint: 'Book pickup with your courier (TCS, Leopards, etc.)' },
  { key: 'to-handover', label: 'To Handover',       icon: PackageCheck, status: 'Ready to Ship',  hint: 'Waiting for courier to pick up' },
];

function bucketOf(o) {
  if (o.status === 'Cancelled' || o.status === 'Refunded') return 'issues';
  if (o.status === 'Delivered') return 'delivered';
  if (['Shipped', 'Out for Delivery'].includes(o.status)) {
    const ageDays = (Date.now() - new Date(o.createdAt).getTime()) / 86400000;
    return ageDays > 10 ? 'issues' : 'shipping';
  }
  if (['Confirmed', 'Processing', 'Ready to Ship'].includes(o.status)) return 'to-ship';
  return 'new';
}

/* V2 status pill — monochrome */
const statusPillV2 = (s) => {
  const base = 'inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider';
  if (s === 'Delivered') return `${base} bg-black text-white`;
  if (s === 'Cancelled' || s === 'Refunded') return `${base} bg-[#F5F5F5] text-[#777777]`;
  if (s === 'Shipped' || s === 'Out for Delivery') return `${base} bg-[#F5F5F5] text-black`;
  if (s === 'Ready to Ship') return `${base} bg-[#F5F5F5] text-[#555555]`;
  if (s === 'Processing') return `${base} bg-[#FAFAFA] text-[#555555]`;
  if (s === 'Confirmed') return `${base} bg-[#FAFAFA] text-[#555555]`;
  return `${base} bg-[#FAFAFA] text-[#777777]`;
};

/* ── ORDER CARD ──────────────────────────────────────────────────────────── */
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
  const stage = bucketOf(o);
  const isConfirmed = o.status === 'Confirmed';
  const isProcessing = o.status === 'Processing';
  const isReadyToShip = o.status === 'Ready to Ship';
  const isShipped = ['Shipped', 'Out for Delivery'].includes(o.status);

  const copyOrderNo = () => { try { navigator.clipboard.writeText(o.orderNumber); } catch {} };

  const stageIndicator = {
    'new': 'bg-black',
    'to-ship': 'bg-[#555555]',
    'shipping': 'bg-[#999999]',
    'delivered': 'bg-[#BBBBBB]',
    'issues': 'bg-black',
  };

  return (
    <article className="group relative overflow-hidden rounded-md border border-[#EAEAEA] bg-white transition-all duration-150 hover:border-[#DCDCDC]">
      {/* Left status strip */}
      <div className={`absolute inset-y-0 left-0 w-1 ${stageIndicator[stage] || 'bg-[#DCDCDC]'}`} />

      <div className="grid gap-4 p-5 pl-7 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
        {/* Order + Items */}
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <button onClick={copyOrderNo} className="group/copy inline-flex items-center gap-1.5 text-[13px] font-semibold text-black hover:text-[#555555]" title="Copy order number" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {o.orderNumber} <Copy size={11} className="text-[#DCDCDC] opacity-0 transition-opacity group-hover/copy:opacity-100" />
            </button>
            <span className={statusPillV2(o.status)}>{o.status}</span>
            {o.verifiedByCall && <span className="inline-flex items-center gap-1 rounded-sm bg-[#F5F5F5] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-black"><Phone size={9} /> Verified</span>}
            {o.discreetPackaging && <span className="inline-flex items-center rounded-sm bg-[#FAFAFA] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#777777]">Discreet</span>}
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex -space-x-1.5">
              {(o.items || []).slice(0, 4).map((it, i) => (
                <Img key={i} src={it.image} alt="" className="h-10 w-8 rounded-md border-2 border-white object-cover" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }} />
              ))}
              {o.items?.length > 4 && (
                <span className="grid h-10 w-8 place-items-center rounded-md border-2 border-white bg-[#F5F5F5] text-[12px] font-semibold text-[#555555]">+{o.items.length - 4}</span>
              )}
            </div>
            <p className="text-[12px] text-[#999999]">{o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'} · {fmtDate(o.createdAt)}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-black">{o.customerInfo.name}</p>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] text-[#999999]">
            <Phone size={11} /> <span style={{ fontVariantNumeric: 'tabular-nums' }}>{o.customerInfo.phone}</span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-[#999999]">
            <MapPin size={11} /> {o.customerInfo.city}, {o.customerInfo.province}
          </p>
        </div>

        {/* Money */}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{pkr(o.total)}</p>
          <p className="mt-1 text-[12px] text-[#999999]">
            {o.paymentMethod}
            <span className={`ml-2 inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${o.paymentStatus === 'Paid' ? 'bg-black text-white' : 'bg-[#FAFAFA] text-[#777777]'}`}>
              {o.paymentStatus}
            </span>
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link to={`/admin/orders/${o._id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#EAEAEA] bg-white px-3 text-[12px] font-medium text-[#555555] transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA] hover:text-black">
            View <ChevronRight size={12} />
          </Link>

          {/* Stage-specific primary actions */}
          {codPendingVerify && (
            <button onClick={() => onAction('verify-call', o)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a] disabled:opacity-50">
              <Phone size={12} /> Confirm by Call
            </button>
          )}
          {awaitingPayment && (
            <button onClick={() => onAction('mark-paid', o)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a] disabled:opacity-50">
              <CreditCard size={12} /> Mark Paid
            </button>
          )}
          {isConfirmed && (
            <button onClick={() => onAction('mark-processing', o)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a] disabled:opacity-50">
              <Box size={12} /> Packed
            </button>
          )}
          {isProcessing && (
            <button onClick={() => setExpanded(!expanded)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a]">
              <Send size={12} /> Add Tracking
            </button>
          )}
          {isReadyToShip && (
            <button onClick={() => onAction('mark-shipped', o)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a] disabled:opacity-50">
              <Truck size={12} /> Shipped
            </button>
          )}
          {isShipped && o.status === 'Shipped' && (
            <button onClick={() => onAction('mark-ofd', o)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a] disabled:opacity-50">
              <TruckIcon size={12} /> Out for Delivery
            </button>
          )}
          {isShipped && o.status === 'Out for Delivery' && (
            <button onClick={() => onAction('mark-delivered', o)} disabled={busy} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-black px-3 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a] disabled:opacity-50">
              <CheckCircle2 size={12} /> Delivered
            </button>
          )}
          {isShipped && (
            <button onClick={() => onAction('mark-failed', o)} disabled={busy} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#EAEAEA] text-[#999999] transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA] hover:text-black disabled:opacity-50" title="Mark failed delivery">
              <XCircle size={13} />
            </button>
          )}

          {/* Print invoice (from Confirmed onwards) */}
          {['Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered'].includes(o.status) && (
            <Link to={`/admin/orders/${o._id}/invoice`} target="_blank" className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#EAEAEA] text-[#999999] transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA] hover:text-black" title="Print invoice">
              <Printer size={13} />
            </Link>
          )}

          {/* Cancel */}
          {o.status !== 'Delivered' && o.status !== 'Cancelled' && o.status !== 'Refunded' && (
            <button onClick={() => onAction('cancel', o)} disabled={busy} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#EAEAEA] text-[#999999] transition hover:border-[#DCDCDC] hover:bg-[#FAFAFA] hover:text-black disabled:opacity-50" title="Cancel order">
              <Ban size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded tracking form (Processing stage) */}
      {expanded && isProcessing && (
        <div className="border-t border-[#EAEAEA] bg-[#FAFAFA] px-7 py-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#999999]">Courier</label>
              <input value={trackingDraft.courierName} onChange={(e) => setTrackingDraft((d) => ({ ...d, courierName: e.target.value }))} placeholder="TCS, Leopards, Trax…" className="w-full rounded-md border border-[#DCDCDC] bg-white px-3 py-2 text-[13px] text-black outline-none focus:border-black" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[#999999]">Tracking #</label>
              <input value={trackingDraft.trackingNumber} onChange={(e) => setTrackingDraft((d) => ({ ...d, trackingNumber: e.target.value }))} placeholder="Tracking number…" className="w-full rounded-md border border-[#DCDCDC] bg-white px-3 py-2 text-[13px] text-black outline-none focus:border-black" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={() => onAction('save-tracking', o, trackingDraft)} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#DCDCDC] bg-white px-4 text-[12px] font-medium text-black transition hover:bg-[#F5F5F5] disabled:opacity-50">Save</button>
              <button onClick={() => onAction('mark-ready', o, trackingDraft)} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-black px-4 text-[12px] font-medium text-black transition hover:bg-[#1a1a1a] disabled:opacity-50">Save & Ready to Ship</button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/* ── MAIN ORDERS COMPONENT ──────────────────────────────────────────────── */
export default function Orders() {
  const { auth, toast } = useApp();
  const [sp] = useSearchParams();
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [stage, setStage] = useState(sp.get('group') || 'all');
  const [subTab, setSub] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = async () => {
    try {
      const r = await api('/orders/admin', { token: auth.token });
      setOrders(r.orders || r || []);
      setErr('');
    } catch (e) { setErr(e.message || 'Failed to load orders.'); }
  };
  useEffect(() => { load(); }, [auth]);
  useEffect(() => { setStage(sp.get('group') || 'all'); }, [sp]);

  const handleAction = async (action, o, extra = {}) => {
    setBusyId(o._id);
    try {
      switch (action) {
        case 'verify-call':
          await api(`/orders/admin/${o._id}/verify-call`, { method: 'PATCH', token: auth.token });
          toast('Verified by call');
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
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-[24px] font-semibold tracking-tight text-black">Orders</h1>
        <p className="mt-1.5 text-[13px] text-[#999999]">Manage and process customer orders.</p>
      </div>

      {/* ── STAGE TILES ───────────────────────────────────────────────── */}
      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
        {STAGES.map((s) => {
          const active = stage === s.key;
          const Icon = s.icon;
          const n = counts[s.key] || 0;
          return (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={`group relative overflow-hidden rounded-md border p-4 text-left transition-all duration-150 ${
                active
                  ? 'border-black bg-black text-white'
                  : 'border-[#EAEAEA] bg-white hover:border-[#DCDCDC] hover:bg-[#FAFAFA]'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-md ${active ? 'bg-[#EFEFEF] text-black' : 'bg-[#F5F5F5] text-[#555555]'}`}>
                  <Icon size={16} strokeWidth={active ? 2 : 1.5} />
                </span>
                <span className={`rounded-sm px-2 py-0.5 text-[12px] font-semibold ${active ? 'bg-[#EFEFEF] text-black' : 'bg-[#F5F5F5] text-[#555555]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</span>
              </div>
              <p className={`mt-3 text-[13px] font-semibold ${active ? 'text-black' : 'text-black'}`}>{s.label}</p>
              {s.hint && <p className={`mt-0.5 line-clamp-2 text-[11px] leading-relaxed ${active ? 'text-[#555555]' : 'text-[#AAAAAA]'}`}>{s.hint}</p>}
            </button>
          );
        })}
      </div>

      {/* ── SUB-TABS ──────────────────────────────────────────────────── */}
      {currentSubList.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button onClick={() => setSub('')} className={`rounded-md border px-4 py-2 text-[12px] font-medium transition ${!subTab ? 'border-black bg-black text-white' : 'border-[#EAEAEA] bg-white text-[#555555] hover:border-[#DCDCDC]'}`}>
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
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-[12px] font-medium transition ${
                  active ? 'border-black bg-black text-white' : 'border-[#EAEAEA] bg-white text-[#555555] hover:border-[#DCDCDC]'
                }`}
              >
                <Icon size={13} />
                {s.label}
                <span className={`rounded-sm px-1.5 text-[11px] font-semibold ${active ? 'bg-[#EFEFEF] text-black' : 'bg-[#F5F5F5] text-[#777777]'}`}>{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#777777]">
          Showing <b className="font-semibold text-black">{filtered.length}</b> order{filtered.length === 1 ? '' : 's'}
          {stage !== 'all' && <> in <b className="font-semibold text-black">{currentStage.label}</b></>}
        </p>
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order #, name, phone or email…" className="w-80 rounded-md border border-[#EAEAEA] bg-white py-2.5 pl-10 pr-4 text-[13px] text-black outline-none transition focus:border-black" />
        </div>
      </div>

      {/* ── Sub-tab hint ──────────────────────────────────────────────── */}
      {subTab && currentSubList.find((s) => s.key === subTab)?.hint && (
        <div className="mb-4 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] p-3.5">
          <p className="text-[12px] text-[#555555]">💡 {currentSubList.find((s) => s.key === subTab).hint}</p>
        </div>
      )}

      {/* ── ORDER CARDS ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {orders === null && !err && (
          <>{[1, 2, 3].map((i) => <div key={i} className="h-28 w-full v2-skeleton rounded-md" />)}</>
        )}

        {filtered.map((o) => (
          <OrderCard key={o._id} order={o} onAction={handleAction} actionsBusyId={busyId} />
        ))}

        {orders !== null && filtered.length === 0 && !err && (
          <div className="grid place-items-center rounded-md border border-dashed border-[#EAEAEA] bg-white py-20 text-center">
            <ShoppingBag size={36} className="mb-4 text-[#DCDCDC]" />
            <p className="text-[14px] font-semibold text-black">No orders in this view</p>
            <p className="mt-1.5 text-[13px] text-[#999999]">Try changing the stage or search terms.</p>
          </div>
        )}
        {err && (
          <div className="grid place-items-center rounded-md border border-[#EAEAEA] bg-[#FAFAFA] py-16 text-center">
            <XCircle size={28} className="mb-3 text-[#777777]" />
            <p className="text-[14px] font-medium text-black">{err}</p>
            <button onClick={load} className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-[#DCDCDC] bg-white px-5 py-2 text-[12px] font-medium text-black transition hover:bg-[#F5F5F5]">Try again</button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
