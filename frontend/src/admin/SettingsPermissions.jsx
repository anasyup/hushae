import { useEffect, useState } from 'react';
import { Check, Minus, Shield, Info } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout, { ROLE_ACCESS, getRoleLabel } from './AdminLayout';

/* ============================================================================
 * ROLES & ACCESS — read-only, single-source access matrix.
 *
 * The REAL source of truth for what each role can reach is ROLE_ACCESS (this
 * app's nav gating) / PERMISSIONS (backend middleware). Role grants are set in
 * Settings → Team & Roles (assign a role to each member); this pane only
 * READS that matrix and shows it honestly — it does not pretend to invent new
 * per-role exceptions the backend does not enforce.
 * ========================================================================== */

// Assignable roles (what you can grant to a member). 'admin' = you, top role.
const COLUMNS = ['Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

// Human-facing area labels (key must match ROLE_ACCESS keys).
const AREAS = [
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'customers', label: 'Customers' },
  { key: 'marketing', label: 'Marketing & Discounts' },
  { key: 'storefront', label: 'Storefront & Theme' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'settings', label: 'Settings' },
  { key: 'apps', label: 'Apps & Integrations' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'sync', label: 'Sync' },
];

function has(role, areaKey) {
  const allowed = ROLE_ACCESS[areaKey] || ['admin', 'Owner'];
  return allowed.includes(role);
}

const chip = {
  height: 34, border: '1px solid var(--admin-border)', borderRadius: 8,
  background: 'var(--admin-surface)', color: 'var(--admin-text)',
  padding: '0 12px', fontSize: 12.5, fontWeight: 600, display: 'inline-flex',
  alignItems: 'center', gap: 8, cursor: 'default',
};

export default function SettingsPermissions() {
  const { auth, toast } = useApp();
  const [users, setUsers] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const d = await api('/security/users', { token: auth?.token });
        if (live) setUsers(d.users || []);
      } catch (e) {
        if (live) { toast?.(e.message || 'Could not load team'); setUsers([]); }
      }
    })();
    return () => { live = false; };
  }, [auth?.token, toast]);

  const counts = (users || [])
    .filter((u) => u.isActive !== false)
    .reduce((acc, u) => { const r = u.role === 'admin' ? 'admin' : u.role; acc[r] = (acc[r] || 0) + 1; return acc; }, {});

  return (
    <AdminLayout title="Roles & Access">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Settings</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Roles & Access</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Which areas each role can reach. Read-only — grants are set on each member in Team &amp; Roles.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={chip}><Shield size={13} style={{ color: 'var(--adm-label)' }} /> Access matrix</span>
        </div>
      </div>

      {/* How access works */}
      <div className="mb-6 flex items-start gap-2 border p-4"
        style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)' }}>
        <Info size={15} style={{ color: 'var(--adm-label)', marginTop: 1, flexShrink: 0 }} />
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--adm-label)' }}>
          Roles are fixed by design (no custom per-role exceptions exist in the backend), so this page shows the
          true matrix exactly as the app enforces it. Assign the closest role to each member; the <b>Administrator</b>
          (you) always has full access.
        </p>
      </div>

      {/* Matrix */}
      <div className="border" style={{ borderColor: 'var(--admin-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div className="hidden grid-cols-[1.5fr_repeat(5,1fr)_auto] gap-3 border-b px-4 py-2.5 md:grid"
          style={{ borderColor: 'var(--admin-border)' }}>
          <p className="adm-label">Area</p>
          {COLUMNS.map((r) => (
            <p key={r} className="adm-label" style={{ textAlign: 'center' }}>
              {getRoleLabel(r)}
              {counts[r] ? <span style={{ marginLeft: 4 }} className="adm-label">({counts[r]})</span> : null}
            </p>
          ))}
          <p className="adm-label" style={{ textAlign: 'right' }}>Administrator</p>
        </div>

        {AREAS.map((area) => (
          <div key={area.key} className="grid grid-cols-2 items-center gap-3 border-b px-4 py-3 md:grid-cols-[1.5fr_repeat(5,1fr)_auto]"
            style={{ borderColor: 'var(--admin-border-subtle)' }}>
            <p className="text-[13px] font-semibold">{area.label}</p>
            {COLUMNS.map((r) => (
              <div key={r} style={{ display: 'flex', justifyContent: 'center' }}>
                <AccessMark allowed={has(r, area.key)} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <AccessMark allowed={has('admin', area.key)} />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <span className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--adm-label)' }}>
          <AccessMark allowed /> Granted
        </span>
        <span className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--adm-label)' }}>
          <AccessMark allowed={false} /> Not granted
        </span>
        <span className="text-[11px]" style={{ color: 'var(--adm-label)' }}>
          Members count in brackets = active staff with that role.
        </span>
      </div>

      {/* Role overview */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {COLUMNS.map((r) => {
          const allowed = AREAS.filter((a) => has(r, a.key)).length;
          return (
            <div key={r} className="border p-4" style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)' }}>
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                <Shield size={13} style={{ color: 'var(--adm-label)' }} /> {getRoleLabel(r)}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--adm-label)' }}>
                Access to <b>{allowed}</b> of {AREAS.length} areas
                {counts[r] ? ` · ${counts[r]} active member${counts[r] > 1 ? 's' : ''}` : ' · none assigned yet'}.
              </p>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

function AccessMark({ allowed }) {
  return (
    <span
      title={allowed ? 'Granted' : 'Not granted'}
      style={{
        width: 22, height: 22, borderRadius: 6, display: 'inline-flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, lineHeight: 1,
        background: allowed ? 'var(--admin-accent-soft, rgba(17,17,17,0.06))' : 'transparent',
        border: '1px solid ' + (allowed ? 'var(--admin-border)' : 'var(--admin-border-subtle)'),
        color: allowed ? 'var(--admin-text)' : 'var(--adm-label)',
      }}
    >
      {allowed ? <Check size={12} strokeWidth={2.5} /> : <Minus size={12} />}
    </span>
  );
}
