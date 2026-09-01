import { useEffect, useState } from 'react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdToggle, EdNum, EdNotice, EdSaveBar, TableSkeleton, EditorialError,
} from './settings/chrome';

/* ============================================================================
 * RETENTION — how long operational data is kept.
 *
 * Nothing is deleted by visiting or saving this screen. `enabled` defaults to
 * false, so a store keeps everything exactly as it does today until the
 * merchant explicitly turns pruning on. Orders, customers and products are
 * never in scope — only logs, abandoned carts and page views.
 * ========================================================================== */

const SCOPES = [
  {
    key: 'auditLogDays',
    label: 'Audit log entries',
    desc: 'Who changed what, and when. Kept for accountability.',
  },
  {
    key: 'abandonedCartDays',
    label: 'Abandoned carts',
    desc: 'Carts that were never completed.',
  },
  {
    key: 'pageViewDays',
    label: 'Page view events',
    desc: 'Storefront analytics events.',
  },
];

export default function SettingsRetention() {
  const { auth, toast } = useApp();
  const [r, setR] = useState(null);
  const [original, setOriginal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/settings/admin', { token: auth?.token })
      .then((d) => {
        const raw = d.settings?.retention || {};
        const next = {
          enabled: !!raw.enabled,
          auditLogDays: Number(raw.auditLogDays) || 180,
          abandonedCartDays: Number(raw.abandonedCartDays) || 90,
          pageViewDays: Number(raw.pageViewDays) || 60,
        };
        setR(next);
        setOriginal(JSON.stringify(next));
      })
      .catch((e) => setErr(e.message || 'Could not load settings'));
  }, [auth?.token]);

  const save = async () => {
    for (const s of SCOPES) {
      if (!Number.isFinite(Number(r[s.key])) || Number(r[s.key]) < 7) {
        return toast(`${s.label} must be at least 7 days.`);
      }
    }
    setBusy(true);
    try {
      await api('/settings', { method: 'PUT', token: auth?.token, body: { retention: r } });
      setOriginal(JSON.stringify(r));
      toast('Retention policy saved');
    } catch (e) { toast(e.message || 'Save failed'); }
    setBusy(false);
  };

  if (err) {
    return (
      <AdminLayout title="Retention">
        <PageHeader title="Retention" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Retention' }]} />
        <EditorialError title="Could not load retention" description={err} />
      </AdminLayout>
    );
  }
  if (!r) {
    return (
      <AdminLayout title="Retention">
        <PageHeader title="Retention" breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Retention' }]} />
        <TableSkeleton rows={4} />
      </AdminLayout>
    );
  }

  const dirty = JSON.stringify(r) !== original;

  return (
    <AdminLayout title="Retention">
      <PageHeader
        title="Retention"
        description="How long operational data is kept before it is pruned."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Retention' }]}
      />

      <EdNotice>
        Pruning is <b>off by default</b> and nothing is deleted until you switch it on.
        Orders, customers and products are <b>never</b> in scope — this only ever touches
        logs, abandoned carts and page-view events.
      </EdNotice>

      <EdSection index={1} title="Pruning">
        <EdToggle
          label="Enable automatic pruning"
          description="When off, everything is kept indefinitely — the current behaviour."
          checked={r.enabled}
          onChange={(v) => setR({ ...r, enabled: v })}
        />
      </EdSection>

      <EdSection
        index={2}
        title="Retention windows"
        description="How many days each type of record is kept. Minimum 7 days."
      >
        <div style={{ display: 'grid', gap: 16, opacity: r.enabled ? 1 : 0.5 }}>
          {SCOPES.map((s) => (
            <EdNum
              key={s.key}
              label={`${s.label} (days)`}
              hint={s.desc}
              value={r[s.key]}
              min={7}
              disabled={!r.enabled}
              onChange={(v) => setR({ ...r, [s.key]: Number(v) || 0 })}
            />
          ))}
        </div>
      </EdSection>

      <EdSaveBar dirty={dirty} busy={busy} onSave={save} onDiscard={() => setR(JSON.parse(original))} />
    </AdminLayout>
  );
}
