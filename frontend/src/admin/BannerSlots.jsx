import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Pencil, Trash2, LayoutTemplate } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * ADMIN → MARKETING → BANNERS → SLOTS
 * Where banners appear. Five predefined slots + custom slots.
 * ========================================================================== */

const inputCls = 'w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';
const labelCls = 'mb-1 block text-[12px] font-bold uppercase tracking-wider text-neutral-500';
const TYPE_BADGE = {
  hero: 'bg-neutral-900 text-white',
  banner: 'bg-neutral-100 text-neutral-700',
  sidebar: 'bg-neutral-100 text-neutral-700',
  inline: 'bg-neutral-100 text-neutral-700',
};

export default function BannerSlots() {
  const { auth, toast } = useApp();
  const [slots, setSlots] = useState(null);
  const [editing, setEditing] = useState(null); // {isNew} | slot
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
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sans text-lg font-semibold text-neutral-900">Banner slots</h2>
          <p className="mt-0.5 max-w-xl text-[13px] text-neutral-500">
            Slots are fixed positions on the website. Assign banners to a slot — schedule and priority decide which one shows.
          </p>
        </div>
        {!editing && (
          <button onClick={startNew} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black">
            <Plus size={14} /> New slot
          </button>
        )}
      </div>

      {editing ? (
        <div className="max-w-xl rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-neutral-900">{editing.isNew ? 'New slot' : `Edit — ${editing.name}`}</h3>
            <button onClick={cancel} className="text-[12px] font-semibold text-neutral-400 hover:text-neutral-700">Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Key</label>
              <input className={inputCls} value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} placeholder="homepage-hero" disabled={!editing.isNew} />
            </div>
            <div>
              <label className={labelCls}>Name</label>
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Homepage Hero" />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="hero">Hero</option><option value="banner">Banner</option><option value="sidebar">Sidebar</option><option value="inline">Inline</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Width</label><input type="number" className={inputCls} value={form.width} onChange={(e) => setForm((f) => ({ ...f, width: Number(e.target.value) || 0 }))} /></div>
              <div><label className={labelCls}>Height</label><input type="number" className={inputCls} value={form.height} onChange={(e) => setForm((f) => ({ ...f, height: Number(e.target.value) || 0 }))} /></div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Description</label>
              <input className={inputCls} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={cancel} className="rounded-full border border-neutral-200 px-4 py-2 text-[13px] font-semibold text-neutral-600">Cancel</button>
            <button onClick={save} disabled={busy} className="rounded-full bg-neutral-900 px-5 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50">
              {busy ? 'Saving…' : 'Save slot'}
            </button>
          </div>
        </div>
      ) : !slots ? (
        <div className="grid place-items-center py-20"><Loader2 size={22} className="animate-spin text-neutral-300" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-neutral-100 bg-neutral-50/60">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Slot</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Type</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Dimensions</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-neutral-500">Banners</th>
                <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {slots.map((s) => (
                <tr key={s._id} className="hover:bg-neutral-50/60">
                  <td className="px-4 py-3">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-neutral-900"><LayoutTemplate size={13} className="text-neutral-400" /> {s.name}</p>
                    <p className="font-mono text-[11px] text-neutral-400">{s.key}</p>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_BADGE[s.type] || TYPE_BADGE.banner}`}>{s.type}</span></td>
                  <td className="px-4 py-3 text-[12px] text-neutral-500">{s.width}×{s.height}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[12px] font-bold text-neutral-700">{s.bannerCount}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => startEdit(s)} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" title="Edit"><Pencil size={14} /></button>
                      <button onClick={() => remove(s)} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600" title="Archive"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
