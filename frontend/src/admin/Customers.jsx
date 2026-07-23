import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Users as UsersIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

export default function Customers() {
  const { auth } = useApp();
  const [list, setList] = useState(null);
  const [open, setOpen] = useState(null);
  const [orders, setOrders] = useState({});

  useEffect(() => { api('/admin/customers', { token: auth.token }).then((d) => setList(d.customers)).catch(() => setList([])); }, [auth]);

  const toggle = async (id) => {
    const next = open === id ? null : id;
    setOpen(next);
    if (next && !orders[id]) {
      const d = await api(`/orders/admin?customer=${id}`, { token: auth.token }).catch(() => ({ orders: [] }));
      setOrders((o) => ({ ...o, [id]: d.orders }));
    }
  };

  return (
    <AdminLayout title="Customers">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr className="border-b border-line bg-satin/30">{['Customer', 'Contact', 'Joined', 'Orders', 'Spent', ''].map((h) => <th key={h} className="table-head">{h}</th>)}</tr></thead>
          <tbody>
            {(list || []).map((c) => (
              <Fragment key={c.id}>
                <tr className="cursor-pointer border-b border-line/60 hover:bg-satin/20" onClick={() => toggle(c.id)}>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-satin text-xs font-bold uppercase">{c.name.slice(0, 2)}</span>
                      <b className="text-[13px]">{c.name}</b>
                    </div>
                  </td>
                  <td className="table-cell"><p className="text-xs">{c.email}</p><p className="text-xs text-ash">{c.phone || '—'}</p></td>
                  <td className="table-cell text-xs text-ash">{fmtDate(c.createdAt)}</td>
                  <td className="table-cell font-semibold">{c.orders}</td>
                  <td className="table-cell text-ash">{c.spent ? pkr(c.spent) : '—'}</td>
                  <td className="table-cell"><ChevronDown size={15} className={`text-ash transition ${open === c.id ? 'rotate-180' : ''}`} /></td>
                </tr>
                {open === c.id && (
                  <tr className="border-b border-line/60 bg-satin/20">
                    <td colSpan={6} className="px-6 py-4">
                      {(orders[c.id] || []).length === 0 ? (
                        <p className="text-xs text-ash">{orders[c.id] ? 'No orders yet.' : 'Loading…'}</p>
                      ) : (
                        <div className="space-y-2">
                          {orders[c.id].map((o) => (
                            <Link key={o._id} to={`/admin/orders/${o._id}`} className="flex items-center justify-between rounded-xl bg-white/70 px-4 py-2.5 text-xs shadow-sm hover:shadow">
                              <span className="font-mono">{o.orderNumber}</span>
                              <span className="text-ash">{fmtDate(o.createdAt)}</span>
                              <span className="pill bg-satin">{o.status}</span>
                              <b>{pkr(o.total)}</b>
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {list === null && <div className="p-6"><div className="skeleton h-40 w-full" /></div>}
        {list?.length === 0 && (
          <div className="grid place-items-center py-16 text-center">
            <UsersIcon size={22} className="text-ash" />
            <p className="mt-3 text-sm text-ash">No registered customers yet — guest orders do not create accounts.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
