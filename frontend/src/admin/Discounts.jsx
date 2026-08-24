import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, EditorialEmpty, TableSkeleton, MonoStatus } from './orders/orderUi';

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
  useEffect(() => { load(); }, [auth?.token]); // eslint-disable-line

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(EMPTY); setEditing(null); setErr(''); setShowForm(true); };
  const openEdit = (d) => {
    setForm({ code: d.code, type: d.type, value: d.value, minSubtotal: d.minSubtotal || '', maxUses: d.maxUses || '', active: d.active, expiresAt: d.expiresAt ? String(d.expiresAt).slice(0, 10) : '' });
    setEditing(d._id); setErr(''); setShowForm(true);
  };
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const body = { ...form, value: Number(form.value), minSubtotal: Number(form.minSubtotal) || 0, maxUses: Number(form.maxUses) || 0, expiresAt: form.expiresAt || null };
      if (editing) await api(`/discounts/${editing}`, { method: 'PUT', token: auth.token, body });
      else await api('/discounts', { method: 'POST', token: auth.token, body });
      setShowForm(false); load();
    } catch (ex) { setErr(ex.message || 'Could not save'); }
    setBusy(false);
  };
  const toggle = async (d) => { try { await api(`/discounts/${d._id}`, { method: 'PUT', token: auth.token, body: { active: !d.active } }); load(); } catch {} };
  const remove = async (d) => { if (!window.confirm(`Delete code ${d.code}?`)) return; try { await api(`/discounts/${d._id}`, { method: 'DELETE', token: auth.token }); load(); } catch {} };

  const filtered = (list || []).filter((d) => !q.trim() || d.code.toLowerCase().includes(q.toLowerCase()));
  const stats = { total: (list || []).length, active: (list || []).filter((d) => d.active).length, used: (list || []).reduce((s, d) => s + (d.usedCount || 0), 0) };

  return (
    <AdminLayout title="Discounts">
      <PageHeader
        title="Discounts"
        description="Coupon codes customers enter at checkout."
        actions={<button type="button" onClick={openNew} className={btnSolid}><Plus size={12} /> New code</button>}
      />

      <section className="mb-10">
        <p className="adm-index">01 — Overview</p>
        <div className="adm-divide-x grid grid-cols-3 border-y border-[#EAEAEA]">
          {[
            { label: 'Total codes', value: stats.total },
            { label: 'Active', value: stats.active },
            { label: 'Total uses', value: stats.used },
          ].map((s) => (
            <div key={s.label} className="px-5 py-6">
              <p className="adm-label">{s.label}</p>
              <p className="adm-metric mt-3 text-[28px] text-black">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {showForm && (
        <form onSubmit={save} className="mb-10">
          <p className="adm-index">{editing ? 'Edit code' : 'New code'}</p>
          <div className="grid gap-4 border-y border-[#EAEAEA] py-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="adm-label mb-1.5 block">Code</label>
              <input className={`${ctl} uppercase`} placeholder="WELCOME10" value={form.code} onChange={(e) => set('code', e.target.value)} required />
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Type</label>
              <select className={ctl} value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount (PKR)</option>
              </select>
            </div>
            <div>
              <label className="adm-label mb-1.5 block">{form.type === 'percent' ? 'Percent off' : 'Amount off (PKR)'}</label>
              <input className={ctl} type="number" min="1" max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => set('value', e.target.value)} required />
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Min order</label>
              <input className={ctl} type="number" min="0" placeholder="0" value={form.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} />
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Max uses (0 = unlimited)</label>
              <input className={ctl} type="number" min="0" placeholder="0" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} />
            </div>
            <div>
              <label className="adm-label mb-1.5 block">Expiry</label>
              <input className={ctl} type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#555555]">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="h-3.5 w-3.5 rounded-none accent-white" /> Active
            </label>
            {err && <p className="text-[12px] text-[#555555]">{err}</p>}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => setShowForm(false)} className={btnGhost}>Cancel</button>
              <button disabled={busy} className={btnSolid}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create code'}</button>
            </div>
          </div>
        </form>
      )}

      <section>
        <p className="adm-index">02 — Discounts</p>
        {list && list.length > 0 && (
          <div className="mb-4">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search codes…" aria-label="Search codes" className={`${ctl} max-w-sm`} />
          </div>
        )}
        {!list && <TableSkeleton rows={5} />}
        {list && list.length === 0 && (
          <EditorialEmpty title="No discount codes" description="Create your first code, e.g. WELCOME10." action={<button type="button" onClick={openNew} className={btnSolid}>Create code</button>} />
        )}
        {list && list.length > 0 && filtered.length === 0 && (
          <EditorialEmpty title="No matches" description={`No codes match “${q}”.`} />
        )}
        {filtered.length > 0 && (
          <div className="min-w-0 overflow-x-hidden">
            <div className="hidden border-b border-[#EAEAEA] px-1 py-2.5 md:grid md:grid-cols-[minmax(0,1fr)_0.7fr_0.7fr_0.6fr_0.8fr_0.6fr_auto] md:items-center md:gap-3">
              {['Code', 'Type', 'Value', 'Usage', 'Expiry', 'Status', ''].map((h) => <p key={h || 'a'} className="adm-label">{h}</p>)}
            </div>
            {filtered.map((d) => {
              const expired = d.expiresAt && new Date(d.expiresAt) < new Date();
              return (
                <div key={d._id} className="border-b border-[#EAEAEA] adm-row-hover">
                  <div className="hidden md:grid md:grid-cols-[minmax(0,1fr)_0.7fr_0.7fr_0.6fr_0.8fr_0.6fr_auto] md:items-center md:gap-3 md:px-1 md:py-3.5">
                    <p className="font-mono text-[13px] font-medium tracking-wide text-black">{d.code}</p>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#999999]">{d.type === 'percent' ? 'Percent' : 'Fixed'}</p>
                    <p className="text-[13px] text-black">{d.type === 'percent' ? `${d.value}%` : pkr(d.value)}</p>
                    <p className="text-[12px] tabular-nums text-[#555555]">{d.usedCount || 0}{d.maxUses > 0 ? ` / ${d.maxUses}` : ''}</p>
                    <p className="text-[12px] text-[#999999]">{d.expiresAt ? fmtDate(d.expiresAt) : '—'}</p>
                    <MonoStatus label={expired ? 'EXPIRED' : d.active ? 'ACTIVE' : 'OFF'} dim={!d.active || expired} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(d)} className="text-[10px] uppercase tracking-[0.12em] text-[#999999] hover:text-black">Edit</button>
                      <button type="button" onClick={() => toggle(d)} className="text-[10px] uppercase tracking-[0.12em] text-[#999999] hover:text-black">{d.active ? 'Off' : 'On'}</button>
                      <button type="button" onClick={() => remove(d)} className="text-[10px] uppercase tracking-[0.12em] text-[#AAAAAA] hover:text-black">Delete</button>
                    </div>
                  </div>
                  <div className="px-1 py-4 md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-mono text-[13px] text-black">{d.code}</p>
                      <MonoStatus label={expired ? 'EXPIRED' : d.active ? 'ACTIVE' : 'OFF'} dim={!d.active || expired} />
                    </div>
                    <p className="mt-1 text-[12px] text-[#777777]">{d.type === 'percent' ? `${d.value}% off` : `${pkr(d.value)} off`} · {d.usedCount || 0} uses</p>
                    <div className="mt-3 flex gap-3">
                      <button type="button" onClick={() => openEdit(d)} className={btnGhost}>Edit</button>
                      <button type="button" onClick={() => toggle(d)} className={btnGhost}>{d.active ? 'Turn off' : 'Turn on'}</button>
                      <button type="button" onClick={() => remove(d)} className={btnGhost}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AdminLayout>
  );
}
