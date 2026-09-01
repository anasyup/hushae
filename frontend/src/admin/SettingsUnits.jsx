import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdSelect, EdNotice, EdSaveBar, TableSkeleton, EditorialError,
} from './settings/chrome';

/* ============================================================================
 * UNITS — how weights and dimensions are displayed and entered.
 *
 * Display/input only. Product.weightGrams stays grams in the database no matter
 * what is chosen here, so switching units can never rescale existing products
 * or corrupt data. The editor converts for the merchant's eyes and converts
 * back before saving.
 * ========================================================================== */

const WEIGHTS = [
  { value: 'g', label: 'Grams (g)', perGram: 1 },
  { value: 'kg', label: 'Kilograms (kg)', perGram: 1 / 1000 },
  { value: 'oz', label: 'Ounces (oz)', perGram: 0.03527396 },
  { value: 'lb', label: 'Pounds (lb)', perGram: 0.00220462 },
];
const DIMENSIONS = [
  { value: 'cm', label: 'Centimetres (cm)' },
  { value: 'in', label: 'Inches (in)' },
];

export default function SettingsUnits() {
  const { auth, toast } = useApp();
  const [s, setS] = useState(null);
  const [original, setOriginal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings/admin', { token: auth?.token })
      .then((d) => {
        const st = d.settings || {};
        setS({
          weight: st.units?.weight || 'g',
          dimension: st.units?.dimension || 'cm',
        });
        setOriginal(JSON.stringify(st.units || {}));
      })
      .catch((e) => setErr(e.message || 'Could not load settings'));
  }, [auth?.token]);

  const save = async () => {
    setBusy(true);
    try {
      await api('/settings', {
        method: 'PUT', token: auth?.token,
        body: { units: { weight: s.weight, dimension: s.dimension } },
      });
      setOriginal(JSON.stringify({ weight: s.weight, dimension: s.dimension }));
      toast('Units saved');
    } catch (e) { toast(e.message || 'Save failed'); }
    setBusy(false);
  };

  if (err) {
    return (
      <AdminLayout title="Units">
        <PageHeader title="Units" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Units' }]} />
        <EditorialError title="Could not load units" description={err} />
      </AdminLayout>
    );
  }
  if (!s) {
    return (
      <AdminLayout title="Units">
        <PageHeader title="Units" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Units' }]} />
        <TableSkeleton rows={4} />
      </AdminLayout>
    );
  }

  const dirty = JSON.stringify({ weight: s.weight, dimension: s.dimension }) !== original;

  return (
    <AdminLayout title="Units">
      <PageHeader
        title="Units"
        description="How weights and dimensions are shown and entered across the admin."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Units' }]}
      />

      <EdNotice>
        Changing units never rescales your products. Weights stay stored in grams in the
        database — this only changes how they are displayed and entered, so nothing existing
        is altered.
      </EdNotice>

      <EdSection index={1} title="Weight" description="Used on the product form and in shipping calculations.">
        <EdSelect
          label="Weight unit"
          value={s.weight}
          onChange={(v) => setS({ ...s, weight: v })}
          options={WEIGHTS}
          hint="Products remain stored in grams regardless of this choice."
        />
        <p style={{ marginTop: 12, fontSize: 12, color: '#777', lineHeight: 1.6 }}>
          A product stored as <b>250 g</b> will read as{' '}
          <b>{(250 * (WEIGHTS.find((w) => w.value === s.weight)?.perGram ?? 1)).toFixed(2)}{' '}
            {s.weight}</b> with the current setting.
        </p>
      </EdSection>

      <EdSection index={2} title="Dimensions" description="Used for product size fields.">
        <EdSelect
          label="Dimension unit"
          value={s.dimension}
          onChange={(v) => setS({ ...s, dimension: v })}
          options={DIMENSIONS}
          hint="Applies to length, width and height fields."
        />
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => {
        const o = JSON.parse(original || '{}');
        setS({ weight: o.weight || 'g', dimension: o.dimension || 'cm' });
      }} />
    </AdminLayout>
  );
}
