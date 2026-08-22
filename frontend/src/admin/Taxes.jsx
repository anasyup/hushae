import { useEffect, useState } from 'react';
import { Calculator, Landmark, Loader2, Plus, Save, Trash2, Info } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * Taxes — Pakistan-first tax configuration (Master Spec §14)
 *   · Global tax: rate %, display label, inclusive/exclusive note.
 *   · Tax zones: per-region rates (e.g. province-level), active toggles.
 *   · Invoice rules are configured under Store Details (order numbering).
 * ========================================================================== */

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-neutral-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-neutral-400">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900';
const btnGhost = 'inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 text-[12px] font-medium text-neutral-600 transition hover:border-neutral-300 hover:text-neutral-900';

export default function Taxes() {
  const { auth, toast } = useApp();
  const [cart, setCart] = useState(null);
  const [zones, setZones] = useState([]);
  const [busy, setBusy] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [form, setForm] = useState({ name: '', region: '', rate: '', inclusive: false, appliesToShipping: false });

  const load = () => {
    api('/settings/admin', { token: auth.token }).then((d) => setCart(d.settings?.cart || {})).catch(() => toast('Could not load tax settings'));
    api('/ops/tax-zones', { token: auth.token }).then((d) => setZones(d.zones || [])).catch(() => toast('Could not load tax zones'));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const saveGlobal = async () => {
    setSavingTax(true);
    try {
      const d = await api('/settings/admin', { token: auth.token });
      const existing = d.settings?.cart || {};
      await api('/settings', { method: 'PUT', token: auth.token, body: { cart: { ...existing, taxPercent: Number(cart.taxPercent || 0), taxLabel: cart.taxLabel || 'Estimated tax' } } });
      toast('Tax settings saved');
    } catch (e) { toast(e?.message || 'Could not save tax settings'); }
    setSavingTax(false);
  };

  const createZone = async () => {
    if (!form.name.trim() || form.rate === '' ) { toast('Zone name and rate are required'); return; }
    setBusy(true);
    try {
      await api('/ops/tax-zones', { method: 'POST', token: auth.token, body: { name: form.name.trim(), country: 'PK', region: form.region.trim(), rate: Number(form.rate), inclusive: form.inclusive, appliesToShipping: form.appliesToShipping } });
      setForm({ name: '', region: '', rate: '', inclusive: false, appliesToShipping: false });
      load();
      toast('Tax zone added');
    } catch (e) { toast(e?.message || 'Could not add zone'); }
    setBusy(false);
  };

  const toggleZone = async (z) => {
    try {
      await api(`/ops/tax-zones/${z._id}`, { method: 'PUT', token: auth.token, body: { isActive: !z.isActive } });
      load();
    } catch (e) { toast(e?.message || 'Could not update zone'); }
  };

  const removeZone = async (z) => {
    if (!window.confirm(`Delete tax zone "${z.name}"?`)) return;
    try {
      await api(`/ops/tax-zones/${z._id}`, { method: 'DELETE', token: auth.token });
      load();
      toast('Tax zone deleted');
    } catch (e) { toast(e?.message || 'Could not delete zone'); }
  };

  const c = cart || {};

  return (
    <AdminLayout title="Taxes">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-neutral-900 text-white"><Calculator size={17} /></span>
          <div>
            <h2 className="text-[15px] font-medium text-neutral-900">Taxes &amp; Invoicing</h2>
            <p className="mt-0.5 text-[12px] text-neutral-500">Pakistan tax configuration — global rate, zone rates and invoice rules.</p>
          </div>
        </div>

        {/* ── Global tax ─────────────────────────────────────────────── */}
        <section className="mb-5 rounded-md border border-neutral-200 bg-white p-5">
          <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Global tax settings</p>
          {cart === null ? (
            <div className="flex items-center gap-2 py-6 text-[13px] text-neutral-400"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tax percentage (%)" hint="Leave at 0 if your prices already include tax — then no tax line is shown.">
                <input type="number" min="0" max="100" step="0.5" value={c.taxPercent ?? 0}
                  onChange={(e) => setCart({ ...c, taxPercent: e.target.value })}
                  className={inputCls} />
              </Field>
              <Field label="What to call it">
                <input type="text" value={c.taxLabel || ''} placeholder="Estimated tax"
                  onChange={(e) => setCart({ ...c, taxLabel: e.target.value })} className={inputCls} />
              </Field>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] text-neutral-400"><Info size={12} /> Invoice numbering &amp; billing rules live under Settings → Store Details.</p>
            <button onClick={saveGlobal} disabled={savingTax || cart === null}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-[12px] font-semibold tracking-wide text-white transition hover:bg-black disabled:opacity-50">
              {savingTax ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save tax settings
            </button>
          </div>
        </section>

        {/* ── Tax zones ─────────────────────────────────────────────── */}
        <section className="rounded-md border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-neutral-500">Tax zones</p>
            <span className="text-[11px] text-neutral-400">{zones.filter((z) => z.isActive).length} active / {zones.length} total</span>
          </div>

          {/* Add form */}
          <div className="mb-4 grid gap-3 rounded-md border border-neutral-200 bg-[#FAFAFA] p-4 sm:grid-cols-[1fr_1fr_100px_auto]">
            <input placeholder="Zone name (e.g. Punjab)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            <input placeholder="Region (optional)" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className={inputCls} />
            <input placeholder="Rate %" type="number" min="0" max="100" step="0.5" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={inputCls} />
            <button onClick={createZone} disabled={busy} className={btnGhost}>
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add zone
            </button>
            <label className="flex items-center gap-2 text-[12px] text-neutral-600 sm:col-span-4">
              <input type="checkbox" checked={form.inclusive} onChange={(e) => setForm({ ...form, inclusive: e.target.checked })} className="h-4 w-4 rounded border-neutral-300 accent-neutral-900" />
              Tax-inclusive prices in this zone
              <input type="checkbox" checked={form.appliesToShipping} onChange={(e) => setForm({ ...form, appliesToShipping: e.target.checked })} className="ml-4 h-4 w-4 rounded border-neutral-300 accent-neutral-900" />
              Also applies to shipping
            </label>
          </div>

          {zones.length === 0 ? (
            <div className="grid place-items-center rounded-md border border-dashed border-neutral-200 py-12 text-center">
              <Landmark size={22} className="mb-2 text-neutral-300" />
              <p className="text-[13px] text-neutral-500">No tax zones yet. Add your first zone above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-neutral-200">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-neutral-200 bg-[#FAFAFA] text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Region</th>
                    <th className="px-4 py-2.5 font-medium">Rate</th>
                    <th className="px-4 py-2.5 font-medium">Inclusive</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z) => (
                    <tr key={z._id} className="border-b border-neutral-100 last:border-0">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">{z.name}</td>
                      <td className="px-4 py-2.5 text-neutral-600">{z.region || '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums text-neutral-900">{z.rate}%</td>
                      <td className="px-4 py-2.5 text-neutral-600">{z.inclusive ? 'Yes' : 'No'}</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => toggleZone(z)}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${z.isActive ? 'bg-[#E9EFEA] text-[#3E5C4B]' : 'bg-neutral-100 text-neutral-500'}`}>
                          {z.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => removeZone(z)} title="Delete zone" className="grid h-7 w-7 place-items-center rounded-md text-neutral-400 transition hover:bg-[#F5EDEB] hover:text-[#9A5548]">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
