import { useCallback, useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * CUSTOM FIELDS (metafields) — merchant-defined product attributes.
 * Definitions live in Settings.metafields; values per product in product.meta
 * (edited in ProductForm, shown on the product page when showOnPDP).
 * ========================================================================== */

const TYPES = [
  { key: 'text', label: 'Text' },
  { key: 'number', label: 'Number' },
  { key: 'select', label: 'Dropdown' },
  { key: 'boolean', label: 'Yes / No' },
];

const input = {
  height: 34, border: '1px solid var(--admin-border)', borderRadius: 8,
  background: 'var(--admin-surface)', color: 'var(--admin-text)',
  padding: '0 10px', fontSize: 12.5, width: '100%', outline: 'none',
};

const blank = () => ({
  id: `mf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  name: '', type: 'text', options: '', showOnPDP: true,
});

export default function SettingsMetafields() {
  const { auth, toast } = useApp();
  const [fields, setFields] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api('/settings', { token: auth?.token });
      setFields(d.settings?.metafields || []);
    } catch (e) {
      toast?.(e.message || 'Could not load settings');
      setFields([]);
    }
  }, [auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const set = (id, patch) => {
    setFields((fs) => fs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    setDirty(true);
  };

  const save = async () => {
    const clean = fields
      .filter((f) => f.name && f.name.trim())
      .map((f) => ({
        id: f.id,
        name: f.name.trim(),
        type: f.type,
        options: f.type === 'select' ? String(f.options || '').split(',').map((o) => o.trim()).filter(Boolean) : undefined,
        showOnPDP: f.showOnPDP !== false,
      }));
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth.token, body: { metafields: clean } });
      setFields(clean);
      setDirty(false);
      toast?.('Custom fields saved — Product form ab ye fields dikhaye ga');
    } catch (e) {
      toast?.(e.message || 'Could not save');
    }
    setBusy(false);
  };

  return (
    <AdminLayout title="Custom Fields">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Settings</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Custom Fields</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Define product attributes Shopify-style (metafields). Values are edited per
            product in the Product form and can appear on the product page.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="adm-chip" onClick={() => { setFields((fs) => [...fs, blank()]); setDirty(true); }}>
            <Plus size={13} /> Add field
          </button>
          <button type="button" className="adm-chip solid" disabled={!dirty || busy} onClick={save}>
            <Save size={13} /> {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {fields === null && <p className="py-8 text-center text-[12px]" style={{ color: 'var(--adm-label)' }}>Loading…</p>}
      {fields && fields.length === 0 && (
        <div className="border p-8 text-center" style={{ borderColor: 'var(--admin-border)', borderRadius: 10 }}>
          <p className="text-[13px] font-semibold">No custom fields yet</p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Examples: “Skin feel” (dropdown), “Pack size” (number), “Gift wrap” (yes/no).
          </p>
        </div>
      )}

      {fields && fields.length > 0 && (
        <div className="grid gap-3">
          {fields.map((f) => (
            <div key={f.id} className="grid gap-3 border p-4 sm:grid-cols-[1.2fr_0.8fr_1.2fr_auto_auto]"
              style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)' }}>
              <input style={input} placeholder="Field name (e.g. Skin feel)" value={f.name} onChange={(e) => set(f.id, { name: e.target.value })} />
              <select style={input} value={f.type} onChange={(e) => set(f.id, { type: e.target.value })} aria-label="Type">
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              {f.type === 'select' ? (
                <input style={input} placeholder="Options, comma separated" value={f.options || ''} onChange={(e) => set(f.id, { options: e.target.value })} />
              ) : (
                <span className="flex items-center text-[11px]" style={{ color: 'var(--adm-label)' }}>
                  {f.type === 'boolean' ? 'Shows a Yes/No toggle' : f.type === 'number' ? 'Numeric input' : 'Free text input'}
                </span>
              )}
              <label className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--adm-label)' }}>
                <input type="checkbox" checked={f.showOnPDP !== false} onChange={(e) => set(f.id, { showOnPDP: e.target.checked })} />
                Show on product page
              </label>
              <button type="button" className="od-act" aria-label={`Delete ${f.name || 'field'}`}
                onClick={() => { setFields((fs) => fs.filter((x) => x.id !== f.id)); setDirty(true); }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px]" style={{ color: 'var(--adm-label)' }}>
        Save ke baad: Product form me “Custom fields” section appear hota hai, aur product page pe
        “Show on product page” wali values customers ko dikhti hain.
      </p>
    </AdminLayout>
  );
}
