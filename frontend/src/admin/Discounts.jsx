import { useEffect, useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { pkr } from '../lib/format';
import AdminLayout from './AdminLayout';
import PageHeader from './components/PageHeader';
import { btnGhost, btnSolid, ctl, ctlInline, EditorialEmpty, TableSkeleton, MonoStatus } from './orders/orderUi';

/* ============================================================================
 * DISCOUNTS / COUPON CODES — Phase 6 Enhanced
 * Extended targeting: products, categories, segments, groups, country,
 * per-customer limits, schedule, max discount cap.
 * ========================================================================== */

const SEGMENTS = ['VIP', 'Repeat', 'New', 'Inactive'];

const EMPTY = {
  code: '', name: '', type: 'percent', value: '', minSubtotal: '', maxUses: '', maxUsesPerPhone: '',
  maxDiscountAmount: '', active: true, expiresAt: '', startsAt: '',
  customerSegments: [], countries: [], stacksWithPromotions: true, note: '',
};

export default function Discounts() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const load = () => api('/discounts', { token: auth.token }).then((d) => setList(d.discounts)).catch(() => setList([]));
  useEffect(() => { load(); }, [auth?.token]); // eslint-disable-line

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSegment = (seg) => {
    setForm(f => ({
      ...f,
      customerSegments: f.customerSegments.includes(seg)
        ? f.customerSegments.filter(s => s !== seg)
        : [...f.customerSegments, seg],
    }));
  };

  const openNew = () => { setForm(EMPTY); setEditing(null); setErr(''); setAdvanced(false); setShowForm(true); };
  const openEdit = (d) => {
    setForm({
      code: d.code, name: d.name || '', type: d.type, value: d.value,
      minSubtotal: d.minSubtotal || '', maxUses: d.maxUses || '',
      maxUsesPerPhone: d.maxUsesPerPhone || '', maxDiscountAmount: d.maxDiscountAmount || '',
      active: d.active, expiresAt: d.expiresAt ? String(d.expiresAt).slice(0, 10) : '',
      startsAt: d.startsAt ? String(d.startsAt).slice(0, 10) : '',
      customerSegments: d.customerSegments || [], countries: d.countries || [],
      stacksWithPromotions: d.stacksWithPromotions !== false, note: d.note || '',
    });
    setEditing(d._id); setErr(''); setAdvanced(true); setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const body = {
        ...form,
        value: Number(form.value), minSubtotal: Number(form.minSubtotal) || 0,
        maxUses: Number(form.maxUses) || 0, maxUsesPerPhone: Number(form.maxUsesPerPhone) || 0,
        maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        expiresAt: form.expiresAt || null, startsAt: form.startsAt || null,
      };
      if (editing) await api(`/discounts/${editing}`, { method: 'PUT', token: auth.token, body });
      else await api('/discounts', { method: 'POST', token: auth.token, body });
      setShowForm(false); toast(editing ? 'Coupon updated' : 'Coupon created'); load();
    } catch (ex) { setErr(ex.message || 'Could not save'); }
    setBusy(false);
  };

  const toggle = async (d) => { try { await api(`/discounts/${d._id}`, { method: 'PUT', token: auth.token, body: { active: !d.active } }); load(); } catch {} };
  const remove = async (d) => { if (!window.confirm(`Delete code ${d.code}?`)) return; try { await api(`/discounts/${d._id}`, { method: 'DELETE', token: auth.token }); toast('Coupon deleted'); load(); } catch {} };

  const filtered = (list || []).filter((d) => !q.trim() || d.code.toLowerCase().includes(q.toLowerCase()) || (d.name || '').toLowerCase().includes(q.toLowerCase()));
  const stats = { total: (list || []).length, active: (list || []).filter((d) => d.active).length, used: (list || []).reduce((s, d) => s + (d.usedCount || 0), 0) };

  return (
    <AdminLayout title="Discounts">
      <PageHeader
        title="Coupon Codes"
        description="Discount codes customers enter at checkout. Backend validates all rules."
        actions={<button type="button" onClick={openNew} className={btnSolid}><Plus size={12} /> New Coupon</button>}
      />

      {/* Overview */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Codes', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Total Redemptions', value: stats.used },
        ].map((s) => (
          <div key={s.label} className="rounded-md border border-[#EAEAEA] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{s.label}</p>
            <p className="mt-3 text-[26px] font-semibold text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={save} className="mb-8 rounded-md border border-[#EAEAEA] bg-white">
          <div className="border-b border-[#EAEAEA] px-6 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#AAAAAA]">{editing ? 'Edit Coupon' : 'New Coupon'}</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Basic fields */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Code *</label>
                <input className={`${ctl} uppercase`} placeholder="WELCOME10" value={form.code} onChange={(e) => set('code', e.target.value)} required />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Internal Name</label>
                <input className={ctl} placeholder="Welcome discount" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Type</label>
                <select className={ctl} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed (PKR)</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Value *</label>
                <input className={ctl} type="number" min="0" placeholder={form.type === 'percent' ? '10' : '500'} value={form.value} onChange={(e) => set('value', e.target.value)} required />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Min. Order Value</label>
                <input className={ctl} type="number" min="0" placeholder="0 = no minimum" value={form.minSubtotal} onChange={(e) => set('minSubtotal', e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Max Discount (PKR)</label>
                <input className={ctl} type="number" min="0" placeholder="0 = no cap" value={form.maxDiscountAmount} onChange={(e) => set('maxDiscountAmount', e.target.value)} />
              </div>
            </div>

            {/* Limits */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Total Uses</label>
                <input className={ctl} type="number" min="0" placeholder="0 = unlimited" value={form.maxUses} onChange={(e) => set('maxUses', e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Per Customer</label>
                <input className={ctl} type="number" min="0" placeholder="0 = unlimited" value={form.maxUsesPerPhone} onChange={(e) => set('maxUsesPerPhone', e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Start Date</label>
                <input className={ctl} type="date" value={form.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Expiry Date</label>
                <input className={ctl} type="date" value={form.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
              </div>
            </div>

            {/* Advanced targeting */}
            <button type="button" onClick={() => setAdvanced(!advanced)} className="inline-flex items-center gap-1 text-[12px] font-medium text-[#777777] hover:text-black">
              {advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Advanced Targeting
            </button>

            {advanced && (
              <div className="space-y-4 rounded-md border border-[#EAEAEA] bg-[#FAFAFA] p-5">
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Customer Segments</label>
                  <div className="flex flex-wrap gap-2">
                    {SEGMENTS.map(seg => (
                      <button key={seg} type="button" onClick={() => toggleSegment(seg)}
                        className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition ${
                          form.customerSegments.includes(seg) ? 'bg-black text-white' : 'border border-[#EAEAEA] bg-white text-[#777777] hover:border-[#DCDCDC]'
                        }`}>
                        {seg}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Countries (ISO codes, comma-separated)</label>
                  <input className={ctl} placeholder="PK, AE, SA" value={(form.countries || []).join(', ')} onChange={(e) => set('countries', e.target.value.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))} />
                </div>
                <label className="flex items-center gap-2 text-[13px] text-[#555555]">
                  <input type="checkbox" checked={form.stacksWithPromotions} onChange={(e) => set('stacksWithPromotions', e.target.checked)} className="h-4 w-4 accent-black" />
                  Stacks with automatic promotions
                </label>
                <div>
                  <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Internal Note</label>
                  <input className={ctl} placeholder="For admin reference only" value={form.note} onChange={(e) => set('note', e.target.value)} />
                </div>
              </div>
            )}

            {err && <p className="rounded-md border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-2 text-[13px] text-[#555555]">{err}</p>}

            <div className="flex items-center gap-2 pt-2">
              <button disabled={busy} className={btnSolid}>{busy ? 'Saving…' : editing ? 'Update Coupon' : 'Create Coupon'}</button>
              <button type="button" onClick={() => setShowForm(false)} className={btnGhost}>Cancel</button>
            </div>
          </div>
        </form>
      )}

      {/* Search */}
      <div className="mb-4">
        <input className={ctl} placeholder="Search coupons…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 300 }} />
      </div>

      {/* List */}
      {!list && <TableSkeleton rows={6} />}
      {list && list.length === 0 && <EditorialEmpty title="No coupon codes" description="Create your first discount code." />}
      {list && list.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-[#EAEAEA]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#EAEAEA] bg-[#FAFAFA]">
                {['Code', 'Type', 'Value', 'Min Order', 'Uses', 'Per Customer', 'Status', 'Expires', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d._id} className="border-b border-[#F0F0F0] last:border-0 hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-black">{d.code}</p>
                    {d.name && <p className="text-[11px] text-[#999999]">{d.name}</p>}
                  </td>
                  <td className="px-4 py-3 text-[#555555]">{d.type === 'percent' ? '%' : 'PKR'}</td>
                  <td className="px-4 py-3 font-medium text-black" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.value}</td>
                  <td className="px-4 py-3 text-[#777777]" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.minSubtotal ? pkr(d.minSubtotal) : '—'}</td>
                  <td className="px-4 py-3" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.usedCount || 0}{d.maxUses ? ` / ${d.maxUses}` : ''}</td>
                  <td className="px-4 py-3 text-[#777777]" style={{ fontVariantNumeric: 'tabular-nums' }}>{d.maxUsesPerPhone || '—'}</td>
                  <td className="px-4 py-3"><MonoStatus label={d.active ? 'ACTIVE' : 'INACTIVE'} dim={!d.active} /></td>
                  <td className="px-4 py-3 text-[12px] text-[#777777]">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(d)} className={btnGhost}>Edit</button>
                      <button onClick={() => toggle(d)} className={btnGhost}>{d.active ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => remove(d)} className={btnGhost}><X size={11} /></button>
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
