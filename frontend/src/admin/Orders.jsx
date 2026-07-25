import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Ban, Box, CheckCircle2, Clock, CreditCard, Layers, PackageCheck,
  RefreshCcw, Search, Send, ShoppingBag, Trash2, Truck, XCircle,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

/* ----------------------------------------------------------------------------
 * Order-status taxonomy — grouped like Shopee/Lazada seller centers so admins
 * can act on orders in the exact stage of the fulfilment flow.
 *
 * DB statuses (unchanged, backend enum):
 *   Pending → Confirmed → Processing → Ready to Ship → Shipped →
 *   Out for Delivery → Delivered   [+ Cancelled, Refunded]
 *
 * UI grouping (buckets that map DB status → visible tab):
 *   All              — everything
 *   Unpaid           — paymentStatus = "Pending" (any online method) OR COD not yet confirmed
 *   To Ship          — Confirmed / Processing / Ready to Ship  (has 3 sub-buckets)
 *     ├─ To Pack           = Confirmed        (freshly confirmed, needs packing)
 *     ├─ To Arrange Ship   = Processing       (packed, arranging courier)
 *     └─ To Handover       = Ready to Ship    (waiting for pickup)
 *   Shipping         — Shipped / Out for Delivery
 *   Delivered        — Delivered
 *   Failed Delivery  — heuristic: Shipped/Out for Delivery older than 10 days & not delivered
 *   Cancellation     — Cancelled
 *   Return or Refund — Refunded
 * -------------------------------------------------------------------------- */

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];

const TABS = [
  { key: 'all',           label: 'All',               icon: Layers,        match: () => true },
  { key: 'unpaid',        label: 'Unpaid',            icon: CreditCard,    match: (o) => o.paymentStatus === 'Pending' && !['Delivered', 'Cancelled', 'Refunded'].includes(o.status) },
  { key: 'to-ship',       label: 'To Ship',           icon: Box,           match: (o) => ['Confirmed', 'Processing', 'Ready to Ship'].includes(o.status) },
  { key: 'shipping',      label: 'Shipping',          icon: Truck,         match: (o) => ['Shipped', 'Out for Delivery'].includes(o.status) },
  { key: 'delivered',     label: 'Delivered',         icon: CheckCircle2,  match: (o) => o.status === 'Delivered' },
  { key: 'failed',        label: 'Failed Delivery',   icon: AlertTriangle, match: (o) => {
      if (!['Shipped', 'Out for Delivery'].includes(o.status)) return false;
      const ageDays = (Date.now() - new Date(o.createdAt).getTime()) / 86400000;
      return ageDays > 10;
    } },
  { key: 'cancelled',     label: 'Cancellation',      icon: Ban,           match: (o) => o.status === 'Cancelled' },
  { key: 'refund',        label: 'Return or Refund',  icon: RefreshCcw,    match: (o) => o.status === 'Refunded' },
];

const TO_SHIP_SUB = [
  { key: 'to-pack',     label: 'To Pack',           icon: Box,           status: 'Confirmed',
    hint: 'Order confirmed — pack the items' },
  { key: 'to-arrange',  label: 'To Arrange Shipment', icon: Send,        status: 'Processing',
    hint: 'Items packed — arrange courier' },
  { key: 'to-handover', label: 'To Handover',       icon: PackageCheck,  status: 'Ready to Ship',
    hint: 'Ready — waiting for courier pickup' },
];

/* Colour pills reused by parent components (OrderDetail imports statusPill) */
export const statusPill = (s) =>
  s === 'Delivered' ? 'bg-sage/25 text-sagedeep'
    : s === 'Cancelled' ? 'bg-red-100 text-red-800'
    : s === 'Refunded' ? 'bg-orange-100 text-orange-800'
    : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-blue-100 text-blue-800'
    : s === 'Ready to Ship' ? 'bg-purple-100 text-purple-800'
    : s === 'Processing' ? 'bg-yellow-100 text-yellow-800'
    : s === 'Confirmed' ? 'bg-cyan-100 text-cyan-800'
    : 'bg-neutral-100 text-neutral-700';

export default function Orders() {
  const { auth, toast, logout } = useApp();
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const tab    = searchParams.get('tab')    || 'all';
  const subTab = searchParams.get('sub')    || 'to-pack';
  const status = searchParams.get('status') || '';

  const setTab    = (k) => { const p = new URLSearchParams(searchParams); if (k === 'all') p.delete('tab'); else p.set('tab', k); p.delete('sub'); p.delete('status'); setSearchParams(p, { replace: true }); };
  const setSubTab = (k) => { const p = new URLSearchParams(searchParams); p.set('sub', k); setSearchParams(p, { replace: true }); };

  const load = () => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    api(`/orders/admin?${sp}`, { token: auth.token })
      .then((d) => { setOrders(d.orders); setErr(''); })
      .catch((e) => {
        if (e?.status === 401) { logout(); return; }
        setErr('Failed to load orders — please try again.');
        setOrders([]);
      });
  };
  useEffect(load, []); // eslint-disable-line

  const quickStatus = async (id, s) => {
    try {
      await api(`/orders/admin/${id}/status`, { method: 'PATCH', token: auth.token, body: { status: s } });
      toast(`Marked ${s}`);
      load();
    } catch (ex) { toast(ex.message); }
  };

  const remove = async (o) => {
    if (!window.confirm(`Delete order ${o.orderNumber} permanently?\n\nThis record cannot be recovered.`)) return;
    try { await api(`/orders/admin/${o._id}`, { method: 'DELETE', token: auth.token }); toast('Order deleted'); load(); }
    catch (ex) { toast(ex.message); }
  };

  // Counts per tab — derived from full order list (so counts reflect the whole store)
  const counts = useMemo(() => {
    const out = {};
    for (const t of TABS) out[t.key] = 0;
    for (const t of TO_SHIP_SUB) out[t.key] = 0;
    if (!Array.isArray(orders)) return out;
    for (const o of orders) {
      for (const t of TABS) if (t.match(o)) out[t.key] += 1;
      for (const t of TO_SHIP_SUB) if (o.status === t.status) out[t.key] += 1;
    }
    return out;
  }, [orders]);

  // Filter for the currently visible tab (+ sub-tab if To Ship)
  const filtered = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let list = orders;
    // Search filter first
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter((o) =>
        o.orderNumber?.toLowerCase().includes(needle) ||
        o.customerInfo?.name?.toLowerCase().includes(needle) ||
        o.customerInfo?.phone?.toLowerCase().includes(needle) ||
        o.customerInfo?.email?.toLowerCase().includes(needle)
      );
    }
    // Tab filter
    const activeTab = TABS.find((t) => t.key === tab) || TABS[0];
    list = list.filter(activeTab.match);
    // Sub-tab (only under "To Ship")
    if (tab === 'to-ship') {
      const sub = TO_SHIP_SUB.find((s) => s.key === subTab) || TO_SHIP_SUB[0];
      list = list.filter((o) => o.status === sub.status);
    }
    return list;
  }, [orders, q, tab, subTab]);

  const currentTabMeta = TABS.find((t) => t.key === tab) || TABS[0];
  const currentSub = TO_SHIP_SUB.find((s) => s.key === subTab) || TO_SHIP_SUB[0];

  return (
    <AdminLayout title="Order Management">
      {/* --------------- STATUS TABS (top-level) --------------- */}
      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max items-end gap-1 border-b border-neutral-200">
          {TABS.map((t) => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-2 whitespace-nowrap px-4 py-3 text-[13px] font-medium transition ${
                  active
                    ? 'text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
                {counts[t.key] > 0 && (
                  <span className={`ml-1 min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold ${
                    active ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700'
                  }`}>{counts[t.key]}</span>
                )}
                {active && <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-neutral-900" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* --------------- TO SHIP: sub-tab cards --------------- */}
      {tab === 'to-ship' && (
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {TO_SHIP_SUB.map((s) => {
            const active = subTab === s.key;
            const Icon = s.icon;
            const n = counts[s.key] || 0;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSubTab(s.key)}
                className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-neutral-900 bg-white shadow-sm ring-1 ring-neutral-900/10'
                    : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-white'
                }`}
              >
                {active && <span className="absolute inset-x-0 top-0 h-[3px] bg-neutral-900" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-500 shadow-sm'}`}>
                      <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                    </span>
                    <div>
                      <p className={`text-[13px] font-semibold ${active ? 'text-neutral-900' : 'text-neutral-700'}`}>{s.label}</p>
                      <p className="mt-0.5 text-[10.5px] text-neutral-500">{s.hint}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${active ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-700 shadow-sm'}`}>{n}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* --------------- Toolbar (search + count) --------------- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neutral-900 text-white">
            <currentTabMeta.icon size={15} />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-neutral-900">
              {currentTabMeta.label}{tab === 'to-ship' && ` · ${currentSub.label}`}
            </p>
            <p className="text-[11px] text-neutral-500">{filtered.length} order{filtered.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Order #, name, phone or email…"
            className="input !w-80 !py-2.5 !pl-9 !text-[13px]"
          />
        </div>
      </div>

      {/* --------------- Orders table --------------- */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/60">
              {['#', 'Order', 'Customer', 'Ship to', 'Date', 'Total', 'Payment', 'Status', ''].map((h) => (
                <th key={h} className="table-head">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o._id} className="border-b border-neutral-100 transition hover:bg-neutral-50/70">
                <td className="table-cell w-10 text-xs font-bold text-neutral-400">{i + 1}</td>
                <td className="table-cell">
                  <Link to={`/admin/orders/${o._id}`} className="group flex items-start gap-2.5">
                    <span className="relative mt-0.5 shrink-0">
                      <Img src={o.items?.[0]?.image} alt="" className="h-11 w-9 rounded-lg border border-neutral-200 object-cover" />
                      {o.items?.length > 1 && <span className="absolute -bottom-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-neutral-900 px-0.5 text-[9px] font-bold text-white">+{o.items.length - 1}</span>}
                    </span>
                    <span className="pt-0.5">
                      <span className="block font-mono text-xs font-semibold leading-tight group-hover:underline">{o.orderNumber}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-neutral-500">
                        {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'}
                        {o.discreetPackaging && <span className="text-sagedeep"> · Discreet</span>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/admin/orders/${o._id}`} className="block hover:underline">
                    <p className="text-[13px] font-semibold leading-tight">{o.customerInfo.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{o.customerInfo.phone}</p>
                    {o.customerInfo.email && <p className="mt-0.5 max-w-44 truncate text-[10px] text-neutral-400">{o.customerInfo.email}</p>}
                  </Link>
                </td>
                <td className="table-cell">
                  <p className="text-[13px]">{o.customerInfo.city}</p>
                  <p className="text-[10px] text-neutral-500">{o.customerInfo.province}{o.customerInfo.postalCode ? ` · ${o.customerInfo.postalCode}` : ''}</p>
                </td>
                <td className="table-cell text-neutral-500">{fmtDate(o.createdAt)}</td>
                <td className="table-cell font-semibold">{pkr(o.total)}</td>
                <td className="table-cell">
                  <span className={`pill ${o.paymentStatus === 'Paid' ? 'bg-sage/25 text-sagedeep' : 'bg-neutral-100 text-neutral-600'}`}>{o.paymentStatus}</span>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-neutral-500">{o.paymentMethod}</p>
                </td>
                <td className="table-cell">
                  <select
                    value={o.status}
                    onChange={(e) => quickStatus(o._id, e.target.value)}
                    className={`pill cursor-pointer border-0 outline-none ${statusPill(o.status)}`}
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="table-cell">
                  <button onClick={() => remove(o)} className="rounded-full border border-neutral-200 p-2 text-neutral-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" aria-label="Delete order" title="Delete order">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders !== null && filtered.length === 0 && !err && (
          <div className="grid place-items-center py-16 text-center">
            <ShoppingBag size={30} className="mb-3 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-600">No orders in this tab yet</p>
            <p className="mt-1 text-[11px] text-neutral-400">Orders will appear here as customers move through the flow.</p>
          </div>
        )}
        {err && (
          <div className="py-14 text-center">
            <XCircle size={26} className="mx-auto mb-2 text-red-500" />
            <p className="text-sm text-red-700">{err}</p>
            <button onClick={load} className="btn-outline mt-4 !px-5 !py-2 !text-[11px]">Try again</button>
          </div>
        )}
        {orders === null && !err && <div className="p-6"><div className="skeleton h-40 w-full" /></div>}
      </div>
    </AdminLayout>
  );
}
