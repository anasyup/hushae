import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctlInline, EditorialEmpty, TableSkeleton, MonoStatus } from './orders/orderUi';

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
      <PageHeader
        title="Banners"
        description="Create, schedule and track banners across slots."
        actions={(
          <>
            <Link to="/admin/banners/slots" className={btnGhost}>Slots</Link>
            <Link to="/admin/banners/new" className={btnSolid}><Plus size={12} /> New banner</Link>
          </>
        )}
      />

      <section className="mb-8">
        <p className="adm-index">01 — Workspace</p>
        <div className="flex flex-wrap items-center gap-2">
          <select className={`${ctlInline} max-w-[200px]`} value={slotFilter} onChange={(e) => setSlotFilter(e.target.value)} aria-label="Slot">
            <option value="">All slots</option>
            {slots.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className={`${ctlInline} max-w-[160px]`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
            <option value="">All status</option>
            {['active', 'scheduled', 'draft', 'expired', 'archived'].map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </section>

      <section>
        <p className="adm-index">02 — Banners</p>
        {!rows && <TableSkeleton rows={5} />}
        {rows && rows.length === 0 && (
          <EditorialEmpty title="No banners" description="Create your first banner to power the homepage hero or any slot." action={<Link to="/admin/banners/new" className={btnSolid}>New banner</Link>} />
        )}
        {rows && rows.length > 0 && (
          <div className="min-w-0 overflow-x-hidden">
            <div className="hidden border-b border-[#EAEAEA] px-1 py-2.5 lg:grid lg:grid-cols-[56px_minmax(0,1.3fr)_0.8fr_0.7fr_0.9fr_0.5fr_0.5fr_auto] lg:items-center lg:gap-3">
              <span />
              {['Banner', 'Slot', 'Status', 'Schedule', 'Views', 'CTR', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
            </div>
            {rows.map((b) => (
              <div key={b._id} className="border-b border-[#EAEAEA] adm-row-hover">
                <div className="hidden lg:grid lg:grid-cols-[56px_minmax(0,1.3fr)_0.8fr_0.7fr_0.9fr_0.5fr_0.5fr_auto] lg:items-center lg:gap-3 lg:px-1 lg:py-3">
                  <div className="h-10 w-14 overflow-hidden border border-[#EAEAEA] bg-[#FAFAFA]">
                    {b.mediaUrl ? <img src={b.mediaUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-black">{b.name}</p>
                    <p className="truncate text-[11px] text-[#AAAAAA]">{b.heading || '—'}</p>
                  </div>
                  <p className="truncate text-[12px] text-[#777777]">{b.slotName}</p>
                  <MonoStatus label={String(b.scheduleState || 'draft').toUpperCase()} dim={b.scheduleState !== 'active'} />
                  <p className="text-[11px] text-[#999999]">
                    {b.alwaysActive ? 'Always' : `${b.startAt ? new Date(b.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '…'} → ${b.endAt ? new Date(b.endAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '∞'}`}
                  </p>
                  <p className="text-[12px] tabular-nums text-[#555555]">{b.impressions?.toLocaleString()}</p>
                  <p className="text-[12px] tabular-nums text-[#555555]">{ctr(b)}%</p>
                  <div className="flex justify-end gap-1">
                    <Link to={`/admin/banners/${b._id}`} className="grid h-7 w-7 place-items-center text-[#AAAAAA] hover:text-black" title="Edit"><Pencil size={13} /></Link>
                    <button type="button" onClick={() => remove(b)} className="grid h-7 w-7 place-items-center text-[#AAAAAA] hover:text-black" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="flex items-start gap-3 px-1 py-4 lg:hidden">
                  <div className="h-16 w-16 shrink-0 overflow-hidden border border-[#EAEAEA] bg-[#FAFAFA]">
                    {b.mediaUrl ? <img src={b.mediaUrl} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-black">{b.name}</p>
                    <p className="mt-0.5 text-[11px] text-[#AAAAAA]">{b.slotName}</p>
                    <div className="mt-2"><MonoStatus label={String(b.scheduleState || 'draft').toUpperCase()} dim={b.scheduleState !== 'active'} /></div>
                    <div className="mt-3 flex gap-2">
                      <Link to={`/admin/banners/${b._id}`} className={btnGhost}>Edit</Link>
                      <button type="button" onClick={() => remove(b)} className={btnGhost}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
