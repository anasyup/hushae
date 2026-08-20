import { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import Img from '../components/Img';

const EMPTY = { name: '', gender: 'women', description: '', image: '', sortOrder: 0, isActive: true };

export default function Categories() {
  const { auth, toast } = useApp();
  const [cats, setCats] = useState(null);
  const [editing, setEditing] = useState(null); // null | {…} | 'new'
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
      <div className="mb-5 flex justify-end">
        <button onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black !px-5 !py-2.5 !text-[12px]"><Plus size={14} /> Add Category</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-neutral-200 bg-white overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-neutral-200 bg-neutral-100">{['Category', 'Gender', 'Order', 'Status', ''].map((h) => <th key={h} className="px-3 py-2 text-left text-[13px] font-bold uppercase text-neutral-400">{h}</th>)}</tr></thead>
            <tbody>
              {(cats || []).map((c) => (
                <tr key={c._id} className={`border-b border-neutral-200/60 hover:bg-neutral-100/20 ${!c.isActive ? 'opacity-45' : ''}`}>
                  <td className="px-3 py-2 text-[12px]">
                    <div className="flex items-center gap-3">
                      <Img src={c.image} alt="" className="h-11 w-9 rounded-lg object-cover" />
                      <div><p className="text-sm font-medium">{c.name}</p><p className="font-mono text-[13px] text-neutral-500">{c.slug}</p></div>
                    </div>
                  </td>
                  <td className="table-cell capitalize text-neutral-500">{c.gender}</td>
                  <td className="table-cell text-neutral-500">{c.sortOrder}</td>
                  <td className="px-3 py-2 text-[12px]"><span className={`pill ${c.isActive ? 'bg-[#F0F4F1] text-[#3E5C4B]' : 'bg-[#F5EDEB] text-[#8A4B3F]'}`}>{c.isActive ? 'Active' : 'Disabled'}</span></td>
                  <td className="px-3 py-2 text-[12px]">
                    <div className="flex gap-2">
                      <button onClick={() => setEditing({ ...c })} className="rounded-full border border-neutral-200 px-3.5 py-2 text-[13px] font-bold uppercase text-neutral-500 transition hover:border-obsidian hover:text-neutral-900">Edit</button>
                      {c.isActive && <button onClick={() => disable(c)} className="rounded-full border border-neutral-200 px-3.5 py-2 text-[13px] font-bold uppercase text-neutral-500 transition hover:border-[#D0ABA0] hover:text-[#8A4B3F]">Disable</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {cats === null && <div className="p-6"><div className="animate-pulse rounded-xl bg-neutral-100 h-40 w-full" /></div>}
        </div>

        {editing && (
          <div className="rounded-2xl border border-neutral-200 bg-white h-fit p-6 lg:sticky lg:top-8">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-sans text-lg">{editing._id ? 'Edit category' : 'New category'}</p>
              <button onClick={() => setEditing(null)} aria-label="Close" className="rounded-full p-1.5 hover:bg-neutral-100"><X size={17} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Name *</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Gender *</label>
                <select className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" value={editing.gender} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}>
                  <option value="women">Women</option><option value="men">Men</option>
                </select>
              </div>
              <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Description</label><textarea className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 min-h-20" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Image URL</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900 font-mono text-xs" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Sort order</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></div>
                <label className="flex cursor-pointer items-center gap-2 pb-3 text-sm"><input type="checkbox" checked={editing.isActive} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="h-4 w-4 accent-[#0D0D0D]" /> Active</label>
              </div>
              <button onClick={save} disabled={busy || !editing.name} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black w-full"><Save size={14} /> {busy ? 'Saving…' : 'Save category'}</button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
