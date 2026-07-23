import { useEffect, useState } from 'react';
import { Banknote, BarChart3, Mail, Receipt, UserPlus } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export default function Analytics() {
  const { auth } = useApp();
  const [a, setA] = useState(null);

  useEffect(() => { api('/admin/analytics', { token: auth.token }).then(setA).catch(() => {}); }, [auth]);

  if (!a) return <AdminLayout title="Analytics"><div className="skeleton h-64 w-full" /></AdminLayout>;

  const maxRev = Math.max(...a.series.map((s) => s.revenue), 1);
  const cards = [
    [Banknote, 'Total Revenue', pkr(a.revenue)],
    [Receipt, 'Total Orders', a.orders],
    [BarChart3, 'Avg Order Value', pkr(a.aov)],
    [UserPlus, 'New Customers (30d)', a.newCustomers30],
    [Mail, 'Email Subscribers', a.subscriberCount],
  ];
  const statusOrder = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

  return (
    <AdminLayout title="Analytics">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map(([Icon, label, v]) => (
          <div key={label} className="card p-4">
            <Icon size={18} className="text-ash" />
            <p className="mt-3 font-display text-xl">{v}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-ash">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="card p-6 lg:col-span-3">
          <h2 className="font-display text-lg">Revenue — last 14 days</h2>
          <div className="mt-5 flex h-44 items-end gap-1.5">
            {a.series.map((s) => (
              <div key={s.date} className="group flex flex-1 cursor-default flex-col items-center justify-end self-stretch" title={`${dayLabel(s.date)} — ${pkr(s.revenue)} (${s.orders} orders)`}>
                <div className={`w-full rounded-t-md transition ${s.revenue ? 'bg-obsidian group-hover:bg-obsidian/80' : 'bg-satin'}`} style={{ height: `${Math.max(3, Math.round((s.revenue / maxRev) * 100))}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            {a.series.map((s, i) => (
              <p key={s.date} className="flex-1 text-center text-[9px] text-ash">{i % 2 === 0 ? dayLabel(s.date) : ''}</p>
            ))}
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg">Orders by status</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusOrder.filter((s) => a.byStatus[s]).map((s) => (
              <span key={s} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${s === 'Delivered' ? 'bg-sage/25 text-sagedeep' : s === 'Cancelled' || s === 'Refunded' ? 'bg-red-100 text-red-800' : 'bg-satin text-obsidian'}`}>
                {s} · {a.byStatus[s]}
              </span>
            ))}
            {!Object.keys(a.byStatus).length && <p className="text-sm text-ash">No orders yet</p>}
          </div>
          <h2 className="mt-7 font-display text-lg">Top products (by revenue)</h2>
          <div className="mt-4 space-y-3">
            {a.topProducts.length === 0 && <p className="text-sm text-ash">Sales aain gi to yahan top products dikhenge.</p>}
            {a.topProducts.map((p) => {
              const maxTop = Math.max(...a.topProducts.map((t) => t.revenue), 1);
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-sm"><span className="line-clamp-1 font-medium">{p.name}</span><span className="ml-3 shrink-0 text-ash">{pkr(p.revenue)} · {p.qty} pcs</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-satin"><div className="h-full rounded-full bg-obsidian" style={{ width: `${Math.round((p.revenue / maxTop) * 100)}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
