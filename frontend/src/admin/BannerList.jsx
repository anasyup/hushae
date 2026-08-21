import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Eye, Loader2, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN → MARKETING → BANNERS
 * List all banners with slot, schedule state, priority, analytics + filters.
 * ========================================================================== */

const STATE_STYLE = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  draft: 'bg-amber-50 text-amber-700 ring-amber-200',
  expired: 'bg-neutral-100 text-neutral-500 ring-neutral-200',
  archived: 'bg-neutral-100 text-neutral-500 ring-neutral-200',
};

export default function BannerList() {
  const { auth, toast } = useApp();
  const [rows, setRows] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotFilter, setSlotFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (slotFilter) params.set('slot', slotFilter);
      if (statusFilter) params.set('status', statusFilter);
      const d = await api(`/banners/admin?${params}`, { token: auth?.token });
      setRows(d.banners || []);
    } catch { setRows([]); toast('Could not load banners'); }
  }, [auth?.token, toast, slotFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/banners/admin/slots', { token: auth?.token }).then((d) => setSlots(d.slots || [])).catch(() => {});
  }, [auth?.token]);

  const remove = async (b) => {
    if (!window.confirm(`Delete banner "${b.name}"?`)) return;
    try { await api(`/banners/admin/${b._id}`, { method: 'DELETE', token: auth?.token }); toast('Banner deleted'); load(); }
    catch { toast('Could not delete'); }
  };

  const ctr = (b) => (b.impressions > 0 ? ((b.clicks / b.impressions) * 100).toFixed(1) : '0.0');

  return (
    <AdminLayout title="Banners">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-semibold text-neutral-900">Banners</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">Create, schedule and track banners across slots.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/banners/slots" className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2 text-[13px] font-semibold text-neutral-700 hover:border-neutral-900">Slots</Link>
          <Link to="/admin/banners/new" className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white hover:bg-black"><Plus size={14} /> New banner</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none" value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)}>
          <option value="">All slots</option>
          {slots.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        {['', 'active', 'scheduled', 'draft', 'expired', 'archived'].map((st) => (
          <button key={st || 'all'} onClick={() => setStatusFilter(st)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${statusFilter === st ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-neutral-400'}`}>
            {st ? st.charAt(0).toUpperCase() + st.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        {!rows ? (
          <div className="grid place-items-center py-20"><Loader2 size={22} className="animate-spin text-neutral-300" /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar size={26} className="mx-auto text-neutral-300" />
            <p className="mt-3 text-[14px] font-semibold text-neutral-700">No banners yet</p>
            <p className="mt-1 text-[12px] text-neutral-400">Create your first banner to power the homepage hero or any slot.</p>
          </div>
        ) : (
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-neutral-100 bg-neutral-50/60">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Banner</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Slot</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Schedule</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500">Priority</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500"><Eye size={11} className="inline" /> Views</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500"><MousePointerClick size={11} className="inline" /> Clicks</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-neutral-500">CTR</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((b) => (
                <tr key={b._id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        {b.mediaUrl ? <img src={b.mediaUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[9px] font-bold text-neutral-400">IMG</div>}
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900">{b.name}</p>
                        <p className="truncate text-[11px] text-neutral-400">{b.heading || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-neutral-600">{b.slotName}</td>
                  <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${STATE_STYLE[b.scheduleState] || STATE_STYLE.draft}`}>{b.scheduleState}</span></td>
                  <td className="px-4 py-3 text-[11px] text-neutral-500">
                    {b.alwaysActive ? 'Always' : `${b.startAt ? new Date(b.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '…'} → ${b.endAt ? new Date(b.endAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '∞'}`}
                  </td>
                  <td className="px-4 py-3 text-center text-[12px] font-bold text-neutral-700">{b.priority}</td>
                  <td className="px-4 py-3 text-center text-[12px] tabular-nums text-neutral-600">{b.impressions?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-[12px] tabular-nums text-neutral-600">{b.clicks?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center text-[12px] font-semibold tabular-nums text-neutral-700">{ctr(b)}%</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link to={`/admin/banners/${b._id}`} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" title="Edit"><Pencil size={14} /></Link>
                      <button onClick={() => remove(b)} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminLayout>
  );
}
