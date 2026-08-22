import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, EditorialEmpty, TableSkeleton, MonoStatus } from './orders/orderUi';

export default function BannerSlots() {
  const { auth, toast } = useApp();
  const [slots, setSlots] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ key: '', name: '', type: 'banner', width: 1200, height: 400, description: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api('/banners/admin/slots', { token: auth?.token }); setSlots(d.slots || []); }
    catch { setSlots([]); toast('Could not load slots'); }
  }, [auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const startNew = () => { setEditing({ isNew: true }); setForm({ key: '', name: '', type: 'banner', width: 1200, height: 400, description: '' }); };
  const startEdit = (s) => { setEditing(s); setForm({ key: s.key, name: s.name, type: s.type, width: s.width, height: s.height, description: s.description || '' }); };
  const cancel = () => setEditing(null);

  const save = async () => {
    if (!form.name.trim()) { toast('Name is required'); return; }
    setBusy(true);
    try {
      if (editing.isNew) await api('/banners/admin/slots', { method: 'POST', token: auth?.token, body: form });
      else await api(`/banners/admin/slots/${editing._id}`, { method: 'PUT', token: auth?.token, body: form });
      toast('Slot saved'); cancel(); load();
    } catch (ex) { toast(ex.message || 'Could not save'); }
    setBusy(false);
  };

  const remove = async (s) => {
    if (!window.confirm(`Archive slot "${s.name}"? Banners stay but this slot stops rendering.`)) return;
    try { await api(`/banners/admin/slots/${s._id}`, { method: 'DELETE', token: auth?.token }); toast('Slot archived'); load(); }
    catch { toast('Could not archive'); }
  };

  return (
    <AdminLayout title="Banner slots">
      <PageHeader
        title="Banner slots"
        description="Fixed positions on the website. Schedule and priority decide which banner shows."
        actions={!editing && <button type="button" onClick={startNew} className={btnSolid}><Plus size={12} /> New slot</button>}
      />

      {editing ? (
        <section>
          <p className="adm-index">{editing.isNew ? 'New slot' : 'Edit slot'}</p>
          <div className="grid gap-4 border-y border-white/10 py-6 sm:grid-cols-2">
            <div>
              <label className="adm-label mb-1.5 block">Key</label>
              <input className={ctl} value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="homepage-hero" disabled={!editing.isNew} />
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Name</label>
              <input className={ctl} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Homepage Hero" />
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Type</label>
              <select className={ctl} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="hero">Hero</option><option value="banner">Banner</option><option value="sidebar">Sidebar</option><option value="inline">Inline</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="adm-label mb-1.5 block">Width</label><input type="number" className={ctl} value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: Number(e.target.value) || 0 }))} /></div>
              <div><label className="adm-label mb-1.5 block">Height</label><input type="number" className={ctl} value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: Number(e.target.value) || 0 }))} /></div>
            </div>
            <div className="sm:col-span-2">
              <label className="adm-label mb-1.5 block">Description</label>
              <input className={ctl} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={cancel} className={btnGhost}>Cancel</button>
            <button type="button" onClick={save} disabled={busy} className={btnSolid}>{busy ? 'Saving…' : 'Save slot'}</button>
          </div>
        </section>
      ) : !slots ? (
        <TableSkeleton rows={5} />
      ) : slots.length === 0 ? (
        <EditorialEmpty title="No slots" description="Create a slot, then assign banners to it." action={<button type="button" onClick={startNew} className={btnSolid}>New slot</button>} />
      ) : (
        <section>
          <p className="adm-index">Slots</p>
          <div className="hidden border-b border-white/10 px-1 py-2.5 md:grid md:grid-cols-[minmax(0,1.4fr)_0.6fr_0.8fr_0.5fr_auto] md:gap-3">
            {['Slot', 'Type', 'Dimensions', 'Banners', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
          </div>
          {slots.map((s) => (
            <div key={s._id} className="border-b border-white/10 adm-row-hover">
              <div className="hidden md:grid md:grid-cols-[minmax(0,1.4fr)_0.6fr_0.8fr_0.5fr_auto] md:items-center md:gap-3 md:px-1 md:py-3.5">
                <div>
                  <p className="text-[13px] font-medium text-white">{s.name}</p>
                  <p className="font-mono text-[11px] text-white/30">{s.key}</p>
                </div>
                <MonoStatus label={String(s.type || '').toUpperCase()} />
                <p className="text-[12px] text-white/45">{s.width}×{s.height}</p>
                <p className="text-[12px] tabular-nums text-white/70">{s.bannerCount}</p>
                <div className="flex justify-end gap-1">
                  <button type="button" onClick={() => startEdit(s)} className="grid h-7 w-7 place-items-center text-white/35 hover:text-white"><Pencil size={13} /></button>
                  <button type="button" onClick={() => remove(s)} className="grid h-7 w-7 place-items-center text-white/30 hover:text-white"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="px-1 py-4 md:hidden">
                <p className="text-[13px] text-white">{s.name}</p>
                <p className="mt-0.5 text-[11px] text-white/35">{s.type} · {s.width}×{s.height} · {s.bannerCount} banners</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => startEdit(s)} className={btnGhost}>Edit</button>
                  <button type="button" onClick={() => remove(s)} className={btnGhost}>Archive</button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </AdminLayout>
  );
}
