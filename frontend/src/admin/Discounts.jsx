import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgePercent, Calendar, Plus, Search, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

const EMPTY = { code: '', type: 'percent', value: '', minSubtotal: '', maxUses: '', active: true, expiresAt: '' };

export default function Discounts() {
  const { auth } = useApp();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const load = () => api('/discounts', { token: auth.token }).then((d) => setList(d.discounts)).catch(() => setList([]));
  useEffect(() => { load(); }, [auth?.token]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(EMPTY); setEditing(null); setErr(''); setShowForm(true); };
  const openEdit = (d) => { setForm({ code: d.code, type: d.type, value: d.value, minSubtotal: d.minSubtotal || '', maxUses: d.maxUses || '', active: d.active, expiresAt: d.expiresAt ? String(d.expiresAt).slice(0, 10) : '' }); setEditing(d._id); setErr(''); setShowForm(true); };
  const save = async (e) => { e.preventDefault(); setBusy(true); setErr(''); try { const body = { ...form, value: Number(form.value), minSubtotal: Number(form.minSubtotal) || 0, maxUses: Number(form.maxUses) || 0, expiresAt: form.expiresAt || null }; if (editing) await api(`/discounts/${editing}`, { method: 'PUT', token: auth.token, body }); else await api('/discounts', { method: 'POST', token: auth.token, body }); setShowForm(false); load(); } catch (ex) { setErr(ex.message || 'Could not save'); } setBusy(false); };
  const toggle = async (d) => { try { await api(`/discounts/${d._id}`, { method: 'PUT', token: auth.token, body: { active: !d.active } }); load(); } catch {} };
  const remove = async (d) => { if (!window.confirm(`Delete code ${d.code}?`)) return; try { await api(`/discounts/${d._id}`, { method: 'DELETE', token: auth.token }); load(); } catch {} };

  const filtered = (list || []).filter((d) => !q.trim() || d.code.toLowerCase().includes(q.toLowerCase()));
  const stats = { total: (list || []).length, active: (list || []).filter((d) => d.active).length, used: (list || []).reduce((s, d) => s + (d.usedCount || 0), 0) };

  return (
    <AdminLayout title="Discounts">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white"><BadgePercent size={20} /></span>
          <div><h2 className="font-sans text-2xl text-neutral-900">Discounts</h2><p className="mt-1 text-[10px] text-neutral-600">Coupon codes customers enter at checkout. Track usage per code.</p></div>
        </div>
        <button onClick={openNew} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-[9px] font-semibold text-white transition hover:bg-neutral-800"><Plus size={13} /> New code</button>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[{ label: 'Total codes', value: stats.total, tone: '' }, { label: 'Active', value: stats.active, tone: 'text-emerald-700' }, { label: 'Total uses', value: stats.used, tone: '' }].map((s) => <div key={s.label} className="rounded-2xl border border-neutral-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{s.label}</p><p className={`mt-1 font-sans text-[7px] font-semibold ${s.tone || 'text-neutral-900'}`}>{s.value}</p></div>)}
      </div>
      {showForm && (
        <form onSubmit={save} className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4"><h3 className="font-sans text-[7px] font-semibold text-neutral-900">{editing ? `Edit ${form.code}` : 'New discount code'}</h3><button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"><X size={16} /></button></div>
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
            <div><label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-500">Code</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900 uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => set('code', e.target.value)} required /></div>
            <div><label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-500">Type</label><select className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" value={form.type} onChange={(e) => set('type', e.target.value)}><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (PKR)</option></select></div>
            <div><label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-500">{form.type === 'percent' ? 'Percent off' : 'Amount off (PKR)'}</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" type="number" min="1" max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => set('value', e.target.value)} required /></div>
            <div><label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-500">Min order (optional)</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" type="number" min="0" placeholder="0" value={form.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} /></div>
            <div><label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-500">Max uses (0 = unlimited)</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" type="number" min="0" placeholder="0" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} /></div>
            <div><label className="mb-1 block text-[9px] font-bold uppercase tracking-widest text-neutral-500">Expiry date</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900" type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-4 border-t border-neutral-100 bg-neutral-50 px-6 py-4">
            <label className="flex cursor-pointer items-center gap-2 text-[10px] font-medium text-neutral-700"><input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-neutral-900" />Active</label>
            {err && <p className="rounded-lg bg-red-50 px-3 py-1.5 text-[9px] text-red-700">{err}</p>}
            <div className="ml-auto flex gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-[9px] font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button><button disabled={busy} className="rounded-full bg-neutral-900 px-4 py-2 text-[9px] font-semibold text-white hover:bg-black disabled:opacity-50">{busy ? 'Saving…' : editing ? 'Save changes' : 'Create code'}</button></div>
          </div>
        </form>
      )}
      {list && list.length > 0 && <div className="mb-4"><div className="relative max-w-sm"><Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search codes…" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[9px] outline-none transition focus:border-neutral-900 !w-full !py-2.5 !pl-9 !text-[10px]" /></div></div>}
      {!list ? <div className="animate-pulse rounded-xl bg-neutral-100 h-40 rounded-2xl" /> : list.length === 0 ? <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center"><BadgePercent size={32} className="mb-3 text-neutral-300" /><p className="text-[9px] font-medium text-neutral-700">No discount codes yet</p><p className="mt-1 text-[9px] text-neutral-500">Create your first code, e.g. WELCOME10.</p><button onClick={openNew} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[9px] font-semibold text-white hover:bg-black"><Plus size={13} /> Create code</button></div> : filtered.length === 0 ? <div className="grid place-items-center rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center"><Search size={28} className="mb-3 text-neutral-300" /><p className="text-[9px] font-medium text-neutral-700">No codes match "{q}"</p></div> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <div key={d._id} className={`group rounded-2xl border bg-white p-5 transition hover:shadow-sm ${d.active ? 'border-neutral-200' : 'border-neutral-200 bg-neutral-50/50'}`}>
              <div className="flex items-start justify-between">
                <span className={`rounded-xl px-3 py-1.5 font-mono text-[10px] font-bold tracking-wide ${d.active ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-600'}`}>{d.code}</span>
                <button onClick={() => toggle(d)} title={d.active ? 'Deactivate' : 'Activate'} className={`grid h-8 w-8 place-items-center rounded-lg transition ${d.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-neutral-400 hover:bg-neutral-100'}`}>{d.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}</button>
              </div>
              <div className="mt-3">
                <p className="text-[9px] font-semibold text-neutral-900">{d.type === 'percent' ? `${d.value}% off` : `${pkr(d.value)} off`}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[9px]">
                  {d.minSubtotal > 0 && <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">Min order {pkr(d.minSubtotal)}</span>}
                  {d.expiresAt && <span className={`rounded-full px-2 py-0.5 font-medium ${new Date(d.expiresAt) < new Date() ? 'bg-red-50 text-red-700' : 'bg-neutral-100 text-neutral-600'}`}><Calendar size={10} className="mr-1 inline" />{fmtDate(d.expiresAt)}</span>}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[9px]"><span className="font-medium text-neutral-600">{d.usedCount || 0} use{(d.usedCount || 0) === 1 ? '' : 's'}</span>{d.maxUses > 0 && <span className="text-neutral-500">/{d.maxUses} max</span>}</div>
                {d.maxUses > 0 && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${Math.min(100, ((d.usedCount || 0) / d.maxUses) * 100)}%` }} /></div>}
              </div>
              <div className="mt-4 flex items-center gap-1 border-t border-neutral-100 pt-3">
                <button onClick={() => openEdit(d)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-neutral-600 transition hover:bg-neutral-100"><Plus size={11} className="rotate-45" /> Edit</button>
                <button onClick={() => remove(d)} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-neutral-600 transition hover:bg-red-50 hover:text-red-600"><X size={11} /> Delete</button>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${d.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-200 text-neutral-600'}`}>{d.active ? 'Active' : 'Off'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
