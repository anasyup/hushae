import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];

export const statusPill = (s) =>
  s === 'Delivered' ? 'bg-sage/25 text-sagedeep'
    : s === 'Cancelled' || s === 'Refunded' ? 'bg-red-100 text-red-800'
    : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-obsidian/85 text-alabaster'
    : 'bg-satin text-obsidian';

export default function Orders() {
  const { auth, toast, logout } = useApp();
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const setStatus = (s) => { const p = new URLSearchParams(searchParams); if (s) p.set('status', s); else p.delete('status'); setSearchParams(p, { replace: true }); };

  const load = () => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    api(`/orders/admin?${sp}`, { token: auth.token })
      .then((d) => { setOrders(d.orders); setErr(''); })
      .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Orders load nahi hue — dobara try karein.'); setOrders([]); });
  };
  useEffect(load, [status]); // eslint-disable-line

  const quickStatus = async (id, s) => {
    try {
      await api(`/orders/admin/${id}/status`, { method: 'PATCH', token: auth.token, body: { status: s } });
      toast(`Marked ${s}`);
      load();
    } catch (ex) { toast(ex.message); }
  };

  const remove = async (o) => {
    if (!window.confirm(`Delete order ${o.orderNumber} permanently?\n\nYe record hamesha ke liye delete ho jayega.`)) return;
    try { await api(`/orders/admin/${o._id}`, { method: 'DELETE', token: auth.token }); toast('Order deleted'); load(); }
    catch (ex) { toast(ex.message); }
  };

  return (
    <AdminLayout title="Orders">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-ash" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order #, name or phone…" className="input !w-72 !pl-10" />
        </form>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input !w-48">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <p className="text-xs text-ash">{orders ? `${orders.length} orders` : ''}</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead><tr className="border-b border-line bg-satin/30">{['#', 'Order', 'Customer', 'City', 'Date', 'Total', 'Payment', 'Status', ''].map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
          <tbody>
            {(orders || []).map((o, i) => (
              <tr key={o._id} className="border-b border-line/60 transition hover:bg-satin/20">
                <td className="table-cell w-10 text-xs font-bold text-ash">{i + 1}</td>
                <td className="table-cell">
                  <Link to={`/admin/orders/${o._id}`} className="group flex items-start gap-2.5">
                    <span className="relative mt-0.5 shrink-0">
                      <Img src={o.items?.[0]?.image} alt="" className="h-11 w-9 rounded-lg border border-line object-cover" />
                      {o.items?.length > 1 && <span className="absolute -bottom-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-obsidian px-0.5 text-[9px] font-bold text-alabaster">+{o.items.length - 1}</span>}
                    </span>
                    <span className="pt-0.5">
                      <span className="block font-mono text-xs font-semibold leading-tight group-hover:underline">{o.orderNumber}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-ash">
                        {o.items?.length || 0} item{(o.items?.length || 0) === 1 ? '' : 's'}{o.discreetPackaging && <span className="text-sagedeep"> · Discreet</span>}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="table-cell">
                  <Link to={`/admin/orders/${o._id}`} className="block hover:underline">
                    <p className="text-[13px] font-semibold leading-tight">{o.customerInfo.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-ash">{o.customerInfo.phone}</p>
                    {o.customerInfo.email && <p className="mt-0.5 max-w-44 truncate text-[10px] text-ash">{o.customerInfo.email}</p>}
                  </Link>
                </td>
                <td className="table-cell"><p className="text-[13px]">{o.customerInfo.city}</p><p className="text-[10px] text-ash">{o.customerInfo.province}{o.customerInfo.postalCode ? ` · ${o.customerInfo.postalCode}` : ''}</p></td>
                <td className="table-cell text-ash">{fmtDate(o.createdAt)}</td>
                <td className="table-cell font-semibold">{pkr(o.total)}</td>
                <td className="table-cell">
                  <span className={`pill ${o.paymentStatus === 'Paid' ? 'bg-sage/25 text-sagedeep' : 'bg-satin/70 text-ash'}`}>{o.paymentStatus}</span>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-ash">{o.paymentMethod}</p>
                </td>
                <td className="table-cell">
                  <select value={o.status} onChange={(e) => quickStatus(o._id, e.target.value)}
                    className={`pill cursor-pointer border-0 outline-none ${statusPill(o.status)}`}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="table-cell">
                  <button onClick={() => remove(o)} className="rounded-full border border-line p-2 text-ash transition hover:border-red-300 hover:bg-red-50 hover:text-red-700" aria-label="Delete order" title="Delete order"><Trash2 size={13} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders?.length === 0 && !err && <p className="py-14 text-center text-sm text-ash">No orders match.</p>}
        {err && <div className="py-14 text-center"><p className="text-sm text-red-700">{err}</p><button onClick={load} className="btn-outline mt-4 !px-5 !py-2 !text-[11px]">Try again</button></div>}
        {orders === null && !err && <div className="p-6"><div className="skeleton h-40 w-full" /></div>}
      </div>
    </AdminLayout>
  );
}
