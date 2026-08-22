import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import Img from '../components/Img';
import { btnGhost, btnSolid, ctl, MonoStatus, TableSkeleton } from './orders/orderUi';

const EMPTY = { name: '', gender: 'women', description: '', image: '', sortOrder: 0, isActive: true };

export default function Categories() {
  const { auth, toast } = useApp();
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api('/categories?all=1').then((d) => setCats(d.categories)).catch(() => setCats([]));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    try {
      if (editing._id) await api(`/categories/${editing._id}`, { method: 'PUT', token: auth.token, body: editing });
      else await api('/categories', { method: 'POST', token: auth.token, body: editing });
      toast('Category saved'); setEditing(null); load();
    } catch (ex) { toast(ex.message); }
    setBusy(false);
  };

  const disable = async (c) => {
    try { await api(`/categories/${c._id}`, { method: 'DELETE', token: auth.token }); toast('Category disabled'); load(); }
    catch (ex) { toast(ex.message); }
  };

  return (
    <AdminLayout title="Categories">
      <PageHeader
        title="Categories"
        description="Organize the catalog."
        actions={(
          <button type="button" onClick={() => setEditing({ ...EMPTY })} className={btnSolid}>
            <Plus size={12} /> Add category
          </button>
        )}
      />

      <section>
        <p className="adm-index">Categories</p>
        {cats === null && <TableSkeleton rows={5} />}
        {cats && (
          <div className="min-w-0">
            <div className="hidden border-b border-white/10 px-1 py-2.5 md:grid md:grid-cols-[48px_minmax(0,1.4fr)_0.7fr_0.5fr_0.8fr_auto] md:items-center md:gap-3">
              <span />
              <p className="adm-label">Category</p>
              <p className="adm-label">Gender</p>
              <p className="adm-label">Order</p>
              <p className="adm-label">Status</p>
              <p className="adm-label" />
            </div>
            {cats.map((c) => (
              <div key={c._id} className={`border-b border-white/10 adm-row-hover ${!c.isActive ? 'opacity-45' : ''}`}>
                <div className="hidden md:grid md:grid-cols-[48px_minmax(0,1.4fr)_0.7fr_0.5fr_0.8fr_auto] md:items-center md:gap-3 md:px-1 md:py-3">
                  <Img src={c.image} alt="" className="h-12 w-12 border border-white/10 object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-white">{c.name}</p>
                    <p className="font-mono text-[11px] text-white/30">{c.slug}</p>
                  </div>
                  <p className="capitalize text-[12px] text-white/50">{c.gender}</p>
                  <p className="text-[12px] tabular-nums text-white/50">{c.sortOrder}</p>
                  <MonoStatus label={c.isActive ? 'ACTIVE' : 'DISABLED'} dim={!c.isActive} />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing({ ...c })} className={btnGhost}>Edit</button>
                    {c.isActive && <button type="button" onClick={() => disable(c)} className={btnGhost}>Disable</button>}
                  </div>
                </div>
                <div className="flex items-start gap-3 px-1 py-4 md:hidden">
                  <Img src={c.image} alt="" className="h-14 w-14 border border-white/10 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-white">{c.name}</p>
                    <p className="mt-0.5 text-[11px] text-white/35">{c.gender} · {c.slug}</p>
                    <div className="mt-2"><MonoStatus label={c.isActive ? 'ACTIVE' : 'DISABLED'} dim={!c.isActive} /></div>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => setEditing({ ...c })} className={btnGhost}>Edit</button>
                      {c.isActive && <button type="button" onClick={() => disable(c)} className={btnGhost}>Disable</button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md border border-white/15 bg-[#0D0D0D] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[15px] font-medium text-white">{editing._id ? 'Edit category' : 'New category'}</p>
              <button type="button" onClick={() => setEditing(null)} aria-label="Close" className="text-white/35 hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="adm-label mb-1.5 block">Name *</label>
                <input className={ctl} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Gender *</label>
                <select className={ctl} value={editing.gender} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}>
                  <option value="women">Women</option><option value="men">Men</option>
                </select>
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Description</label>
                <textarea className={`${ctl} min-h-20 !h-auto py-2`} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <label className="adm-label mb-1.5 block">Image URL</label>
                <input className={`${ctl} font-mono`} value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="adm-label mb-1.5 block">Sort order</label>
                  <input className={ctl} type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-[13px] text-white/70">
                  <input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="h-3.5 w-3.5 rounded-none accent-white" /> Active
                </label>
              </div>
              <button type="button" onClick={save} disabled={busy || !editing.name} className={`${btnSolid} w-full`}>
                <Save size={12} /> {busy ? 'Saving…' : 'Save category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
