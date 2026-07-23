import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];

export const statusPill = (s) =>
  s === 'Delivered' ? 'bg-sage/25 text-sagedeep'
    : s === 'Cancelled' || s === 'Refunded' ? 'bg-red-100 text-red-800'
    : s === 'Shipped' || s === 'Out for Delivery' ? 'bg-obsidian/85 text-alabaster'
    : 'bg-satin text-obsidian';

export default function Orders() {
  const { auth, toast } = useApp();
  const [orders, setOrders] = useState(null);
  const [q, setQ] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const setStatus = (s) => { const p = new URLSearchParams(searchParams); if (s) p.set('status', s); else p.delete('status'); setSearchParams(p, { replace: true }); };

  const load = () => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (status) sp.set('status', status);
    api(`/orders/admin?${sp}`, { token: auth.token }).then((d) => setOrders(d.orders)).catch(() => setOrders([]));
  };
  useEffect(load, [status]); // eslint-disable-line

  const quickStatus = async (id, s) => {
    try {
      await api(`/orders/admin/${id}/status`, { method: 'PATCH', token: auth.token, body: { status: s } });
      toast(`Marked ${s}`);
      load();
    } catch (ex) { toast(ex.message); }
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
          <thead><tr className="border-b border-line bg-satin/30">{['Order', 'Customer', 'City', 'Date', 'Total', 'Payment', 'Status'].map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
          <tbody>
            {(orders || []).map((o) => (
              <tr key={o._id} className="border-b border-line/60 transition hover:bg-satin/20">
                <td className="table-cell"><Link to={`/admin/orders/${o._id}`} className="font-mono text-xs font-semibold hover:underline">{o.orderNumber}</Link>{o.discreetPackaging && <p className="mt-0.5 text-[10px] uppercase tracking-wider text-sagedeep">Discreet</p>}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
        {orders?.length === 0 && <p className="py-14 text-center text-sm text-ash">No orders match.</p>}
        {orders === null && <div className="p-6"><div className="skeleton h-40 w-full" /></div>}
      </div>
    </AdminLayout>
  );
}
