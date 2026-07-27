import { useEffect, useState } from 'react';
import { BadgePercent, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import AdminLayout from './AdminLayout';

const EMPTY = { code: '', type: 'percent', value: '', minSubtotal: '', maxUses: '', active: true, expiresAt: '' };

// Module-level wrapper (stable identity — inputs keep focus while typing)
function Field({ label, children }) {
  return (
    <div><label className="label">{label}</label>{children}</div>
  );
}

export default function Discounts() {
  const { auth } = useApp();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api('/discounts', { token: auth.token }).then((d) => setList(d.discounts)).catch(() => setList([]));
  useEffect(load, [auth]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const openNew = () => { setForm(EMPTY); setEditing(null); setErr(''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openEdit = (d) => {
    setForm({ code: d.code, type: d.type, value: d.value, minSubtotal: d.minSubtotal || '', maxUses: d.maxUses || '', active: d.active, expiresAt: d.expiresAt ? String(d.expiresAt).slice(0, 10) : '' });
    setEditing(d._id); setErr(''); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <AdminLayout title="Discounts">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-ash">Coupon codes customers can enter at checkout to get a discount.</p>
        <button onClick={openNew} className="btn-primary"><Plus size={15} /> New Code</button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card mb-6 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-sans text-lg">{editing ? `Edit ${form.code}` : 'New Discount Code'}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-ash hover:bg-satin"><X size={16} /></button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Code"><input className="input uppercase" placeholder="WELCOME10" value={form.code} onChange={(e) => set('code', e.target.value)} required /></Field>
            <Field label="Type">
              <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed amount (PKR)</option>
              </select>
            </Field>
            <Field label={form.type === 'percent' ? 'Percent off' : 'Amount off (PKR)'}><input className="input" type="number" min="1" max={form.type === 'percent' ? 100 : undefined} value={form.value} onChange={(e) => set('value', e.target.value)} required /></Field>
            <Field label="Minimum order (PKR) — optional"><input className="input" type="number" min="0" placeholder="0" value={form.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} /></Field>
            <Field label="Max uses (0 = unlimited)"><input className="input" type="number" min="0" placeholder="0" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} /></Field>
            <Field label="Expiry date — optional"><input className="input" type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} /></Field>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4 accent-obsidian" /> Code is active (customers can use it)
          </label>
          {err && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>}
          <div className="mt-5 flex gap-3">
            <button disabled={busy} className="btn-primary">{busy ? 'Saving…' : editing ? 'Save Changes' : 'Create Code'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-x-auto">
        {!list ? <div className="skeleton m-6 h-40" /> : list.length === 0 ? (
          <div className="p-14 text-center">
            <BadgePercent size={36} className="mx-auto text-ash" />
            <p className="mt-3 text-sm text-ash">No discount codes yet — create your first one, e.g. WELCOME10.</p>
          </div>
        ) : (
          <table className="w-full min-w-[860px]">
            <thead><tr className="border-b border-line bg-satin/30">
              {['Code', 'Discount', 'Min Order', 'Used', 'Expiry', 'Status', 'Actions'].map((h) => <th key={h} className="table-head">{h}</th>)}
            </tr></thead>
            <tbody>
              {list.map((d) => (
                <tr key={d._id} className="border-b border-line/60 transition hover:bg-satin/20">
                  <td className="table-cell"><span className="rounded-lg bg-obsidian px-2.5 py-1 font-mono text-xs font-semibold text-alabaster">{d.code}</span></td>
                  <td className="table-cell font-semibold">{d.type === 'percent' ? `${d.value}% off` : `${pkr(d.value)} off`}</td>
                  <td className="table-cell text-ash">{d.minSubtotal > 0 ? pkr(d.minSubtotal) : '—'}</td>
                  <td className="table-cell text-ash">{d.usedCount}{d.maxUses > 0 ? ` / ${d.maxUses}` : ''}</td>
                  <td className="table-cell text-ash">{d.expiresAt ? fmtDate(d.expiresAt) : '—'}</td>
                  <td className="table-cell">
                    <button onClick={() => toggle(d)} className={`rounded-full px-3 py-1 text-[11px] font-semibold ${d.active ? 'bg-sage/25 text-sagedeep' : 'bg-satin text-ash'}`}>
                      {d.active ? 'Active' : 'Off'}
                    </button>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(d)} className="rounded-lg p-2 text-ash hover:bg-satin hover:text-obsidian"><Pencil size={15} /></button>
                      <button onClick={() => remove(d)} className="rounded-lg p-2 text-ash hover:bg-red-50 hover:text-red-700"><Trash2 size={15} /></button>
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
