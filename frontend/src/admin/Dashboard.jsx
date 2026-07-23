import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, Clock, Gauge, Package, ShoppingBag, Truck, Users } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

const statusPill = (s) =>
  s === 'Delivered' ? 'bg-sage/25 text-sagedeep' : s === 'Cancelled' || s === 'Refunded' ? 'bg-red-100 text-red-800' : 'bg-satin text-obsidian';

export default function Dashboard() {
  const { auth, logout } = useApp();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  const load = () => api('/admin/dashboard', { token: auth.token })
    .then(setD)
    .catch((e) => { if (e?.status === 401) { logout(); return; } setErr('Dashboard load nahi hua — dobara try karein.'); });
  useEffect(() => { load(); }, [auth]); // eslint-disable-line

  if (err) return (
    <AdminLayout title="Dashboard"><div className="card mx-auto max-w-md p-10 text-center"><p className="text-sm text-red-700">{err}</p><button onClick={() => { setErr(''); load(); }} className="btn-outline mt-5 !px-5 !py-2 !text-[11px]">Try again</button></div></AdminLayout>
  );
  if (!d) return <AdminLayout title="Dashboard"><div className="skeleton h-64 w-full" /></AdminLayout>;

  const cards = [
    [Gauge, 'Total Orders', d.stats.totalOrders, '/admin/orders'],
    [Clock, 'Pending', d.stats.pending, '/admin/orders?status=Pending'],
    [ShoppingBag, 'Processing', d.stats.processing, '/admin/orders?status=Processing'],
    [Package, 'Ready to Ship', d.stats.readyToShip, '/admin/orders?status=Ready%20to%20Ship'],
    [Truck, 'Delivered', d.stats.delivered, '/admin/orders?status=Delivered'],
    [Banknote, 'Revenue', pkr(d.stats.revenue), '/admin/analytics'],
    [Package, 'Products', d.stats.totalProducts, '/admin/products'],
    [Users, 'Customers', d.stats.totalCustomers, '/admin/customers'],
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([Icon, label, value, to]) => (
          <Link key={label} to={to} title={`Open ${label}`}
            className="card group cursor-pointer p-5 transition hover:-translate-y-0.5 hover:border-obsidian/30 hover:shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ash transition group-hover:text-obsidian">{label}</p>
              <Icon size={16} className="text-sagedeep" />
            </div>
            <div className="mt-2 flex items-end justify-between">
              <p className="font-display text-2xl">{value}</p>
              <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ash/0 transition group-hover:text-sagedeep">Open →</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-widest text-ash">Recent orders</p>
            <Link to="/admin/orders" className="text-xs font-semibold text-sagedeep hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-line">{['Order', 'Customer', 'Total', 'Status'].map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o._id} className="border-b border-line/60 hover:bg-satin/30">
                    <td className="table-cell">
                      <Link to={`/admin/orders/${o._id}`} className="group flex items-start gap-2.5">
                        <span className="relative mt-0.5 shrink-0">
                          <Img src={o.items?.[0]?.image} alt="" className="h-11 w-9 rounded-lg border border-line object-cover" />
                          {o.items?.length > 1 && <span className="absolute -bottom-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-obsidian px-0.5 text-[9px] font-bold text-alabaster">+{o.items.length - 1}</span>}
                        </span>
                        <span className="pt-0.5">
                          <span className="block font-mono text-xs font-semibold leading-tight group-hover:underline">{o.orderNumber}</span>
                          <span className="mt-1 block text-[10px] text-ash">{fmtDate(o.createdAt)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="table-cell">{o.customerInfo?.name}<p className="text-[10px] text-ash">{o.customerInfo?.city}</p></td>
                    <td className="table-cell font-semibold">{pkr(o.total)}</td>
                    <td className="table-cell"><span className={`pill ${statusPill(o.status)}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-ash"><AlertTriangle size={14} className="text-red-700" /> Low stock (≤ 5)</p>
            {d.lowStock.length === 0 ? <p className="text-sm text-ash">All stocked up.</p> : (
              <div className="space-y-3">
                {d.lowStock.map((p) => (
                  <Link to={`/admin/products/${p._id}`} key={p._id} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-satin/40">
                    <Img src={p.images[0]?.url} alt="" className="h-10 w-8 rounded-lg object-cover" />
                    <span className="flex-1 clamp-2 text-xs font-medium">{p.name}</span>
                    <span className={`pill ${p.stock === 0 ? 'bg-red-100 text-red-800' : 'bg-red-50 text-red-700'}`}>{p.stock}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card p-6">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-widest text-ash">Best sellers</p>
            {d.bestSellers.length === 0 ? <p className="text-sm text-ash">Sales data will appear here.</p> : (
              <div className="space-y-3">
                {d.bestSellers.map((b, i) => (
                  <div key={b.name} className="flex items-center gap-3 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-obsidian text-[10px] font-bold text-alabaster">{i + 1}</span>
                    <span className="flex-1 clamp-2 text-xs font-medium">{b.name}</span>
                    <span className="text-xs text-ash">{b.qty} sold</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
