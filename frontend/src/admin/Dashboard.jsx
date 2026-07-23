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
  const { auth } = useApp();
  const [d, setD] = useState(null);

  useEffect(() => { api('/admin/dashboard', { token: auth.token }).then(setD).catch(() => {}); }, [auth]);

  if (!d) return <AdminLayout title="Dashboard"><div className="skeleton h-64 w-full" /></AdminLayout>;

  const cards = [
    [Gauge, 'Total Orders', d.stats.totalOrders],
    [Clock, 'Pending', d.stats.pending],
    [ShoppingBag, 'Processing', d.stats.processing],
    [Package, 'Ready to Ship', d.stats.readyToShip],
    [Truck, 'Delivered', d.stats.delivered],
    [Banknote, 'Revenue', pkr(d.stats.revenue)],
    [Package, 'Products', d.stats.totalProducts],
    [Users, 'Customers', d.stats.totalCustomers],
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([Icon, label, value]) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ash">{label}</p>
              <Icon size={16} className="text-sagedeep" />
            </div>
            <p className="mt-2 font-display text-2xl">{value}</p>
          </div>
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
                    <td className="table-cell font-mono text-xs"><Link to={`/admin/orders/${o._id}`} className="hover:underline">{o.orderNumber}</Link><p className="text-[10px] text-ash">{fmtDate(o.createdAt)}</p></td>
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
