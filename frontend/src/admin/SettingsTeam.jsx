import { useCallback, useEffect, useState } from 'react';
import { RefreshCcw, ShieldCheck, Trash2, UserPlus, KeyRound } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

/* ============================================================================
 * TEAM & ROLES — staff management without seat paywalls.
 * Backend: /api/security/users (GET/POST/PUT/DELETE) with audit logging and
 * self-protection guards. Roles mirror ROLE_ACCESS in AdminLayout.jsx.
 * ========================================================================== */

const ROLES = ['Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

const ROLE_SCOPE = {
  Owner: 'Everything, including security & billing',
  Manager: 'Orders, products, customers, marketing, storefront, analytics',
  Staff: 'Orders, products, customers + analytics',
  Warehouse: 'Orders & inventory operations only',
  Support: 'Orders, customers, reviews & questions',
};

const input = {
  height: 34, border: '1px solid var(--admin-border)', borderRadius: 8,
  background: 'var(--admin-surface)', color: 'var(--admin-text)',
  padding: '0 10px', fontSize: 12.5, width: '100%', outline: 'none',
};

export default function SettingsTeam() {
  const { auth, toast } = useApp();
  const [users, setUsers] = useState(null);
  const [busy, setBusy] = useState(null);
  const [invite, setInvite] = useState(null); // { name, email, password, role }

  const load = useCallback(async () => {
    try {
      const d = await api('/security/users', { token: auth?.token });
      setUsers(d.users || []);
    } catch (e) {
      toast?.(e.message || 'Could not load team');
      setUsers([]);
    }
  }, [auth?.token, toast]);

  useEffect(() => { load(); }, [load]);

  const me = String(auth?.user?._id || auth?.user?.id || '');

  const patch = async (u, body, msg) => {
    setBusy(u._id);
    try {
      await api(`/security/users/${u._id}`, { method: 'PUT', token: auth.token, body });
      toast?.(msg);
      await load();
    } catch (e) { toast?.(e.message || 'Could not update'); }
    setBusy(null);
  };

  const remove = async (u) => {
    if (!window.confirm(`Remove ${u.name} (${u.email})? This cannot be undone.`)) return;
    setBusy(u._id);
    try {
      await api(`/security/users/${u._id}`, { method: 'DELETE', token: auth.token });
      toast?.('Team member removed');
      await load();
    } catch (e) { toast?.(e.message || 'Could not remove'); }
    setBusy(null);
  };

  const resetPw = async (u) => {
    const pw = window.prompt(`New temporary password for ${u.email} (min 6 chars):`);
    if (!pw) return;
    if (pw.trim().length < 6) { toast?.('Password too short'); return; }
    patch(u, { password: pw.trim() }, 'Password updated — share it securely');
  };

  const submitInvite = async () => {
    if (!invite?.name || !invite?.email || !invite?.password || !invite?.role) {
      toast?.('Fill all fields'); return;
    }
    setBusy('new');
    try {
      await api('/security/users', { method: 'POST', token: auth.token, body: invite });
      toast?.(`${invite.name} added as ${invite.role}`);
      setInvite(null);
      await load();
    } catch (e) { toast?.(e.message || 'Could not invite'); }
    setBusy(null);
  };

  return (
    <AdminLayout title="Team & Roles">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="adm-eyebrow" style={{ padding: 0 }}>Settings</p>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Team & Roles</h2>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--adm-label)' }}>
            Staff accounts with role-based access — no seat limits, no paywalls.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="adm-chip" onClick={load}>
            <RefreshCcw size={13} /> Refresh
          </button>
          <button type="button" className="adm-chip solid" onClick={() => setInvite({ name: '', email: '', password: '', role: 'Staff' })}>
            <UserPlus size={13} /> Invite member
          </button>
        </div>
      </div>

      {invite && (
        <div className="mb-6 grid gap-3 border p-4 sm:grid-cols-2 lg:grid-cols-5"
          style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)' }}>
          <input style={input} placeholder="Full name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          <input style={input} type="email" placeholder="email@company.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <input style={input} type="text" placeholder="Temporary password" value={invite.password} onChange={(e) => setInvite({ ...invite, password: e.target.value })} />
          <select style={input} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="adm-chip solid" disabled={busy === 'new'} onClick={submitInvite}>
              {busy === 'new' ? 'Adding…' : 'Add member'}
            </button>
            <button type="button" className="adm-chip" onClick={() => setInvite(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* team list */}
      <div className="border" style={{ borderColor: 'var(--admin-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.7fr_auto] gap-3 border-b px-4 py-2 md:grid" style={{ borderColor: 'var(--admin-border)' }}>
          {['Member', 'Email', 'Role', 'Status', ''].map((h) => (
            <p key={h} className="adm-label">{h}</p>
          ))}
        </div>
        {!users && <p className="px-4 py-8 text-center text-[12px]" style={{ color: 'var(--adm-label)' }}>Loading team…</p>}
        {users && users.length === 0 && (
          <p className="px-4 py-8 text-center text-[12px]" style={{ color: 'var(--adm-label)' }}>
            No staff accounts yet — invite your first team member above.
          </p>
        )}
        {users && users.map((u) => {
          const self = String(u._id) === me;
          return (
            <div key={u._id} className="grid grid-cols-2 items-center gap-3 border-b px-4 py-3 md:grid-cols-[1.4fr_1fr_0.8fr_0.7fr_auto]"
              style={{ borderColor: 'var(--admin-border-subtle)', opacity: u.isActive === false ? 0.55 : 1 }}>
              <p className="text-[13px] font-semibold">
                {u.name} {self && <span className="adm-label" style={{ marginLeft: 6 }}>you</span>}
              </p>
              <p className="text-[12px]" style={{ color: 'var(--adm-label)' }}>{u.email}</p>
              <select
                style={{ ...input, width: 'auto' }}
                value={u.role}
                disabled={self || busy === u._id}
                onChange={(e) => patch(u, { role: e.target.value }, `${u.name} is now ${e.target.value}`)}
                aria-label={`Role for ${u.name}`}
              >
                {(u.role === 'admin' ? ['admin', ...ROLES] : ROLES).map((r) => <option key={r}>{r}</option>)}
              </select>
              <button
                type="button"
                disabled={self || busy === u._id}
                onClick={() => patch(u, { isActive: u.isActive === false }, u.isActive === false ? `${u.name} re-activated` : `${u.name} deactivated`)}
                className="adm-chip"
                style={{ width: 'fit-content' }}
              >
                {u.isActive === false ? 'Inactive — enable' : 'Active'}
              </button>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button type="button" className="od-act" title="Reset password" aria-label={`Reset password for ${u.name}`} onClick={() => resetPw(u)}>
                  <KeyRound size={12} />
                </button>
                {!self && (
                  <button type="button" className="od-act" title="Remove" aria-label={`Remove ${u.name}`} onClick={() => remove(u)} disabled={busy === u._id}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* roles reference */}
      <div className="mt-8">
        <p className="adm-eyebrow">What each role can do</p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div key={r} className="border p-4" style={{ borderColor: 'var(--admin-border)', borderRadius: 10, background: 'var(--admin-surface)' }}>
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                <ShieldCheck size={13} style={{ color: 'var(--adm-label)' }} /> {r}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: 'var(--adm-label)' }}>{ROLE_SCOPE[r]}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--adm-label)' }}>
          Admin (you) has full access. Changes are audit-logged; deactivating a member ends their active sessions immediately.
        </p>
      </div>
    </AdminLayout>
  );
}
