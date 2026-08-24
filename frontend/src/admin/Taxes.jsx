import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdText, EdNum, EdConfirm, EditorialEmpty, TableSkeleton,
  MonoStatus, ctl, btnGhost, btnSolid,
} from './settings/chrome';

export default function Taxes() {
  const { auth, toast } = useApp();
  const [cart, setCart] = useState(null);
  const [zones, setZones] = useState([]);
  const [busy, setBusy] = useState(false);
  const [savingTax, setSavingTax] = useState(false);
  const [form, setForm] = useState({ name: '', region: '', rate: '', inclusive: false, appliesToShipping: false });
  const [dialog, setDialog] = useState(null);

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
    if (!form.name.trim() || form.rate === '') { toast('Zone name and rate are required'); return; }
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
    try {
      await api(`/ops/tax-zones/${z._id}`, { method: 'DELETE', token: auth.token });
      load();
      toast('Tax zone deleted');
    } catch (e) { toast(e?.message || 'Could not delete zone'); }
    setDialog(null);
  };

  const c = cart || {};

  return (
    <AdminLayout title="Taxes">
      <PageHeader
        title="Taxes"
        description="Pakistan tax configuration — global rate and zone rates."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Taxes' }]}
      />

      <EdSection
        index={1}
        title="Global tax"
        action={
          <button type="button" onClick={saveGlobal} disabled={savingTax || cart === null} className={btnSolid}>
            {savingTax ? 'Saving…' : 'Save tax settings'}
          </button>
        }
      >
        {cart === null ? (
          <TableSkeleton rows={3} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <EdNum label="Tax percentage (%)" hint="Leave at 0 if prices already include tax." min="0" max="100" step="0.5" value={c.taxPercent ?? 0} onChange={(v) => setCart({ ...c, taxPercent: v })} />
            <EdText label="What to call it" value={c.taxLabel || ''} placeholder="Estimated tax" onChange={(v) => setCart({ ...c, taxLabel: v })} />
          </div>
        )}
        <p className="mt-4 text-[12px] text-[#AAAAAA]">Invoice numbering and billing rules live under Settings → Store Details.</p>
      </EdSection>

      <EdSection index={2} title="Tax zones" description={`${zones.filter((z) => z.isActive).length} active / ${zones.length} total`}>
        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_100px_auto]">
          <input placeholder="Zone name (e.g. Punjab)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={ctl} />
          <input placeholder="Region (optional)" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} className={ctl} />
          <input placeholder="Rate %" type="number" min="0" max="100" step="0.5" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} className={ctl} />
          <button type="button" onClick={createZone} disabled={busy} className={btnGhost}>{busy ? 'Adding…' : 'Add zone'}</button>
          <label className="flex flex-wrap items-center gap-4 text-[12px] text-[#555555] sm:col-span-4">
            <span className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.inclusive} onChange={(e) => setForm({ ...form, inclusive: e.target.checked })} className="h-4 w-4 accent-white" />
              Tax-inclusive prices in this zone
            </span>
            <span className="inline-flex items-center gap-2">
              <input type="checkbox" checked={form.appliesToShipping} onChange={(e) => setForm({ ...form, appliesToShipping: e.target.checked })} className="h-4 w-4 accent-white" />
              Also applies to shipping
            </span>
          </label>
        </div>

        {zones.length === 0 ? (
          <EditorialEmpty title="No tax zones" description="No tax zones yet. Add your first zone above." />
        ) : (
          <>
            <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[1.2fr_1fr_0.5fr_0.7fr_0.7fr_0.6fr] md:gap-3">
              {['Name', 'Region', 'Rate', 'Inclusive', 'Status', 'Action'].map((h) => <p key={h} className="adm-label">{h}</p>)}
            </div>
            {zones.map((z) => (
              <div key={z._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[1.2fr_1fr_0.5fr_0.7fr_0.7fr_0.6fr] md:items-center md:gap-3">
                <span className="text-[13px] text-black">{z.name}</span>
                <span className="text-[12px] text-[#999999]">{z.region || '—'}</span>
                <span className="tabular-nums text-[13px] text-[#333333]">{z.rate}%</span>
                <span className="text-[12px] text-[#999999]">{z.inclusive ? 'Yes' : 'No'}</span>
                <button type="button" onClick={() => toggleZone(z)}>
                  <MonoStatus label={z.isActive ? 'ACTIVE' : 'INACTIVE'} dim={!z.isActive} />
                </button>
                <div>
                  <button type="button" onClick={() => setDialog({ z })} className={btnGhost}>Delete</button>
                </div>
              </div>
            ))}
          </>
        )}
      </EdSection>

      <EdConfirm
        open={!!dialog}
        title="Delete tax zone"
        body={`Delete tax zone "${dialog?.z?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onCancel={() => setDialog(null)}
        onConfirm={() => removeZone(dialog.z)}
      />
    </AdminLayout>
  );
}
