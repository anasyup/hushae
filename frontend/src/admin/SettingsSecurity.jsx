import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';
import {
  PageHeader, EdSection, EdConfirm, EdText,
  EditorialEmpty, EditorialError, TableSkeleton, MonoStatus, EditorialPagination,
  ctl, btnGhost, btnSolid, passwordStrength, StrengthBar,
} from './settings/chrome';

const ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];
const TABS = [
  ['personal', 'My Login'],
  ['users', 'Staff'],
  ['sessions', 'Sessions'],
  ['logs', 'Audit Logs'],
  ['fraud', 'Fraud'],
  ['advanced', 'JWT'],
];

export default function SettingsSecurity() {
  const { auth, setAuth, toast } = useApp();
  const [activeTab, setActiveTab] = useState('personal');
  const [sessions, setSessions] = useState(null);
  const [sessBusy, setSessBusy] = useState(false);
  const [twoFa, setTwoFa] = useState({ enabled: !!auth?.user?.twoFactorEnabled, step: 'idle', code: '', pass: '' });
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ c: false, n: false, x: false });
  const [busy, setBusy] = useState(false);

  const [uCurrent, setUCurrent] = useState('');
  const [uNew, setUNew] = useState('');
  const [uShow, setUShow] = useState(false);
  const [uBusy, setUBusy] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersErr, setUsersErr] = useState('');
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'Staff' });
  const [userBusy, setUserBusy] = useState(false);

  const [logs, setLogs] = useState([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logQuery, setLogQuery] = useState('');
  const [logsBusy, setLogsBusy] = useState(false);
  const [logsErr, setLogsErr] = useState('');

  const [fraudOrders, setFraudOrders] = useState([]);
  const [fraudBusy, setFraudBusy] = useState(false);
  const [fraudErr, setFraudErr] = useState('');

  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    else if (activeTab === 'logs') loadLogs();
    else if (activeTab === 'fraud') loadFraudOrders();
    else if (activeTab === 'sessions') loadSessions();
  }, [activeTab, logPage]); // eslint-disable-line

  const loadSessions = () => {
    api('/customer/sessions', { token: auth.token })
      .then((d) => setSessions(d.sessions || []))
      .catch(() => setSessions([]));
  };

  const revokeSession = async (jti) => {
    setSessBusy(true);
    try {
      await api(`/customer/sessions/${jti}`, { method: 'DELETE', token: auth.token });
      toast('Device signed out');
      loadSessions();
    } catch (ex) { toast(ex.message); }
    setSessBusy(false);
  };

  const revokeOthers = async () => {
    setSessBusy(true);
    try {
      const d = await api('/customer/sessions/revoke-others', { method: 'POST', token: auth.token });
      toast(`Signed out ${d.revoked || 0} other device(s)`);
      loadSessions();
    } catch (ex) { toast(ex.message); }
    setSessBusy(false);
    setDialog(null);
  };

  const loadUsers = () => {
    setUsersErr('');
    api('/security/users', { token: auth.token })
      .then((d) => setUsers(d.users || []))
      .catch(() => { setUsersErr('Could not load users list. Please check your role permissions.'); toast('Could not load users list. Please check your role permissions.'); });
  };

  const loadLogs = () => {
    setLogsBusy(true);
    setLogsErr('');
    api(`/security/audit-logs?page=${logPage}&limit=15&q=${encodeURIComponent(logQuery)}`, { token: auth.token })
      .then((d) => { setLogs(d.logs || []); setLogTotal(d.total || 0); })
      .catch(() => { setLogsErr('Could not load audit logs. Owners only.'); toast('Could not load audit logs. Owners only.'); })
      .finally(() => setLogsBusy(false));
  };

  const loadFraudOrders = () => {
    setFraudBusy(true);
    setFraudErr('');
    api('/security/fraud-orders', { token: auth.token })
      .then((d) => setFraudOrders(d.orders || []))
      .catch(() => { setFraudErr('Could not load flagged fraud orders.'); toast('Could not load flagged fraud orders.'); })
      .finally(() => setFraudBusy(false));
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!current || !next) return toast('Fill both current and new password');
    if (next.length < 8) return toast('New password must be at least 8 characters');
    if (!/[a-zA-Z]/.test(next) || !/[0-9]/.test(next)) return toast('Include letters and numbers');
    if (next !== confirm) return toast('Passwords do not match');
    setBusy(true);
    try {
      const res = await api('/auth/change-password', {
        method: 'POST',
        token: auth.token,
        body: { currentPassword: current, newPassword: next },
      });
      if (res?.token && setAuth) setAuth({ token: res.token, user: res.user });
      toast('Password changed successfully.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (ex) {
      toast(ex?.message || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  const handleUsernameChange = async (e) => {
    e.preventDefault();
    if (!uCurrent || !uNew) return toast('Enter current password and new username');
    setUBusy(true);
    try {
      const res = await api('/auth/change-username', {
        method: 'POST',
        token: auth.token,
        body: { currentPassword: uCurrent, newUsername: uNew.trim() },
      });
      if (res?.token && setAuth) setAuth({ token: res.token, user: res.user });
      toast('Username changed successfully.');
      setUCurrent(''); setUNew('');
    } catch (ex) {
      toast(ex?.message || 'Failed to change username');
    } finally {
      setUBusy(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.role) {
      return toast('All fields are required.');
    }
    setUserBusy(true);
    try {
      await api('/security/users', { method: 'POST', token: auth.token, body: userForm });
      toast('New sub-user account created successfully.');
      setUserForm({ name: '', email: '', password: '', role: 'Staff' });
      loadUsers();
    } catch (ex) {
      toast(ex?.message || 'Failed to create user');
    } finally {
      setUserBusy(false);
    }
  };

  const handleUpdateUserStatus = async (id, isActive, role) => {
    try {
      await api(`/security/users/${id}`, { method: 'PUT', token: auth.token, body: { isActive, role } });
      toast('User updated successfully.');
      loadUsers();
    } catch (ex) {
      toast(ex?.message || 'Failed to update user status');
    }
    setDialog(null);
  };

  const handleDeleteUser = async (id) => {
    try {
      await api(`/security/users/${id}`, { method: 'DELETE', token: auth.token });
      toast('User deleted successfully.');
      loadUsers();
    } catch (ex) {
      toast(ex?.message || 'Failed to delete user');
    }
    setDialog(null);
  };

  const handleRotateSecret = async () => {
    try {
      await api('/security/rotate-jwt', { method: 'POST', token: auth.token });
      toast('JWT secret rotated! Signing you out...');
      setTimeout(() => { window.location.reload(); }, 1500);
    } catch (ex) {
      toast(ex?.message || 'Failed to rotate secret.');
    }
    setDialog(null);
  };

  const handleFraudAction = async (id, action) => {
    try {
      await api(`/security/fraud-orders/${id}/action`, { method: 'POST', token: auth.token, body: { action } });
      toast(`Order successfully marked as ${action}.`);
      loadFraudOrders();
    } catch (ex) {
      toast(ex?.message || 'Failed to apply fraud action.');
    }
    setDialog(null);
  };

  const strength = passwordStrength(next);

  const eyeBtn = (which) => (
    <button
      type="button"
      onClick={() => setShow((s) => ({ ...s, [which]: !s[which] }))}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-black"
      aria-label="Toggle visibility"
    >
      {show[which] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  const logPages = Math.max(1, Math.ceil((logTotal || 0) / 15));

  return (
    <AdminLayout title="Security">
      <PageHeader
        title="Security"
        description="Staff access, sessions, audit history and fraud review. Authentication logic is unchanged."
        breadcrumbs={[{ label: 'Settings', to: '/admin/settings' }, { label: 'Security' }]}
      />

      <div className="mb-8 flex flex-wrap gap-1.5">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => { setActiveTab(id); setLogPage(1); }}
            className={activeTab === id ? btnSolid : btnGhost}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'personal' && (
        <div className="grid gap-10 lg:grid-cols-2">
          <EdSection index={1} title="Username">
            <form onSubmit={handleUsernameChange} className="space-y-4">
              <p className="text-[12px] text-[#999999]">Current: <span className="font-mono text-[#333333]">{auth?.user?.email || '—'}</span></p>
              <EdText label="New username" value={uNew} onChange={setUNew} placeholder="e.g. admin@hushae.pk" />
              <div className="relative">
                <label className="adm-label mb-1.5 block">Confirm with current password</label>
                <input className={`${ctl} pr-10`} type={uShow ? 'text' : 'password'} value={uCurrent} onChange={(e) => setUCurrent(e.target.value)} required />
                <button type="button" onClick={() => setUShow(!uShow)} className="absolute right-2.5 top-[34px] text-[#AAAAAA] hover:text-black" aria-label="Toggle visibility">
                  {uShow ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button type="submit" disabled={uBusy || !uCurrent || !uNew} className={btnSolid}>
                {uBusy ? 'Updating…' : 'Update username'}
              </button>
            </form>
          </EdSection>

          <EdSection index={2} title="Password">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="relative">
                <label className="adm-label mb-1.5 block">Current password</label>
                <input className={`${ctl} pr-10`} type={show.c ? 'text' : 'password'} value={current} onChange={(e) => setCurrent(e.target.value)} required />
                {eyeBtn('c')}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="relative">
                  <label className="adm-label mb-1.5 block">New password</label>
                  <input className={`${ctl} pr-10`} type={show.n ? 'text' : 'password'} value={next} onChange={(e) => setNext(e.target.value)} required />
                  {eyeBtn('n')}
                </div>
                <div className="relative">
                  <label className="adm-label mb-1.5 block">Confirm new password</label>
                  <input className={`${ctl} pr-10`} type={show.x ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                  {eyeBtn('x')}
                </div>
              </div>
              <StrengthBar pct={strength.pct} label={strength.label} />
              {confirm && next && confirm !== next && <p className="text-[12px] text-[#999999]">Passwords do not match</p>}
              <button type="submit" disabled={busy || !current || !next || next !== confirm} className={btnSolid}>
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </EdSection>

          <div className="lg:col-span-2">
            <EdSection index={3} title="Two-factor authentication" description="After your password, a 6-digit code is emailed to you to sign in.">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0F0F0] pb-4">
                <div>
                  <p className="text-[13px] text-black">{twoFa.enabled ? '2FA is on' : '2FA is off'}</p>
                  <p className="mt-0.5 text-[12px] text-[#AAAAAA]">{twoFa.enabled ? 'Every sign-in needs a code from your inbox.' : 'Sign-in currently needs only your password.'}</p>
                </div>
                <button type="button" onClick={() => setTwoFa({ ...twoFa, step: 'start' })} className={btnGhost}>
                  {twoFa.enabled ? 'Turn off' : 'Turn on'}
                </button>
              </div>

              {twoFa.step !== 'idle' && (
                <div className="mt-4 space-y-3">
                  {twoFa.enabled ? (
                    <p className="text-[12px] text-[#999999]">Enter your current password to disable 2FA.</p>
                  ) : twoFa.step === 'start' ? (
                    <p className="text-[12px] text-[#999999]">Enter your current password, then a verification code is emailed to <span className="text-black">{auth?.user?.email}</span>.</p>
                  ) : (
                    <p className="text-[12px] text-[#999999]">Enter the 6-digit code sent to <span className="text-black">{auth?.user?.email}</span>.</p>
                  )}
                  {twoFa.step !== 'code' && (
                    <div className="flex flex-wrap gap-2">
                      <input type="password" placeholder="Current password" className={`${ctl} flex-1`} value={twoFa.pass} onChange={(e) => setTwoFa({ ...twoFa, pass: e.target.value })} />
                      <button
                        type="button"
                        disabled={twoFaBusy || !twoFa.pass}
                        onClick={async () => {
                          setTwoFaBusy(true);
                          try {
                            const d = await api('/auth/2fa/toggle', { method: 'POST', token: auth.token, body: { enable: !twoFa.enabled, password: twoFa.pass } });
                            if (d.step === 'code-sent') { setTwoFa({ ...twoFa, step: 'code', pass: '' }); toast('Verification code sent to your email'); }
                            else if (d.ok) { setTwoFa({ enabled: d.twoFactorEnabled, step: 'idle', code: '', pass: '' }); toast(d.twoFactorEnabled ? '2FA enabled' : '2FA disabled'); }
                          } catch (ex) { toast(ex.message); }
                          setTwoFaBusy(false);
                        }}
                        className={btnSolid}
                      >
                        {twoFaBusy ? '…' : 'Continue'}
                      </button>
                    </div>
                  )}
                  {twoFa.step === 'code' && (
                    <div className="flex flex-wrap gap-2">
                      <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" className={`${ctl} flex-1 tracking-[6px]`} value={twoFa.code} onChange={(e) => setTwoFa({ ...twoFa, code: e.target.value.replace(/\D/g, '') })} />
                      <button
                        type="button"
                        disabled={twoFaBusy || twoFa.code.length !== 6}
                        onClick={async () => {
                          setTwoFaBusy(true);
                          try {
                            const d = await api('/auth/2fa/toggle', { method: 'POST', token: auth.token, body: { enable: true, password: twoFa.pass, code: twoFa.code } });
                            if (d.ok) { setTwoFa({ enabled: true, step: 'idle', code: '', pass: '' }); toast('2FA enabled — you will need a code at next sign-in'); }
                          } catch (ex) { toast(ex.message); }
                          setTwoFaBusy(false);
                        }}
                        className={btnSolid}
                      >
                        {twoFaBusy ? '…' : 'Verify'}
                      </button>
                    </div>
                  )}
                  <button type="button" onClick={() => setTwoFa({ ...twoFa, step: 'idle', code: '', pass: '' })} className="text-[11px] uppercase tracking-[0.16em] text-[#AAAAAA] hover:text-black">Cancel</button>
                </div>
              )}
            </EdSection>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <EdSection index={1} title="Create staff" description="Assign an administrative role.">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <EdText label="Full name" value={userForm.name} onChange={(v) => setUserForm({ ...userForm, name: v })} placeholder="e.g. Bilal Khan" />
                <EdText label="Email (username)" type="email" value={userForm.email} onChange={(v) => setUserForm({ ...userForm, email: v })} placeholder="e.g. bilal@hushae.pk" />
                <EdText label="Initial password" type="password" value={userForm.password} onChange={(v) => setUserForm({ ...userForm, password: v })} placeholder="••••••••" />
                <div>
                  <label className="adm-label mb-1.5 block">Role</label>
                  <select className={ctl} value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                    <option value="Owner">Owner (Full access)</option>
                    <option value="Manager">Manager (No security/advanced settings)</option>
                    <option value="Staff">Staff (Orders & Reviews only)</option>
                    <option value="Warehouse">Warehouse (Inventory & Order updates — no pricing)</option>
                    <option value="Support">Support (Orders, Customers, Reviews — no discounts)</option>
                  </select>
                </div>
                <button type="submit" disabled={userBusy} className={btnSolid}>{userBusy ? 'Creating…' : 'Create account'}</button>
              </form>
            </EdSection>
          </div>
          <div className="lg:col-span-8">
            <EdSection index={2} title="Staff">
              {usersErr ? (
                <EditorialError title="Unable to load staff" description={usersErr} onRetry={loadUsers} />
              ) : users.length === 0 ? (
                <EditorialEmpty title="No staff users" description="No additional staff accounts have been created." />
              ) : (
                <>
                  <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.6fr)_0.8fr_0.7fr_0.5fr] md:gap-3">
                    {['User', 'Role', 'Status', 'Action'].map((h) => <p key={h} className="adm-label">{h}</p>)}
                  </div>
                  {users.map((u) => (
                    <div key={u._id} className="grid grid-cols-1 gap-2 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.6fr)_0.8fr_0.7fr_0.5fr] md:items-center md:gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-black">{u.name}</p>
                        <p className="truncate font-mono text-[11px] text-[#AAAAAA]">{u.email}</p>
                      </div>
                      <select
                        value={u.role}
                        onChange={(e) => setDialog({ kind: 'update', id: u._id, isActive: u.isActive, role: e.target.value, name: u.name })}
                        className={ctl}
                        disabled={String(u._id) === String(auth?.user?._id)}
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'update', id: u._id, isActive: !u.isActive, role: u.role, name: u.name })}
                        disabled={String(u._id) === String(auth?.user?._id)}
                        className="text-left"
                      >
                        <MonoStatus label={u.isActive ? 'ACTIVE' : 'SUSPENDED'} dim={!u.isActive} />
                      </button>
                      <div>
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'delete', id: u._id, name: u.name })}
                          disabled={String(u._id) === String(auth?.user?._id)}
                          className={btnGhost}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </EdSection>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <EdSection
          index={1}
          title="Sessions"
          description="Every device signed in to this account. Revoke any device you do not recognise."
          action={
            <button type="button" onClick={() => setDialog({ kind: 'revoke-others' })} disabled={sessBusy || !sessions?.length} className={btnGhost}>
              Sign out other devices
            </button>
          }
        >
          {!sessions ? (
            <TableSkeleton rows={4} />
          ) : sessions.length === 0 ? (
            <EditorialEmpty title="No active sessions" description="No devices are currently signed in." />
          ) : (
            <>
              <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_0.6fr] md:gap-3">
                {['Session', 'Network', 'Last active', 'Action'].map((h) => <p key={h} className="adm-label">{h}</p>)}
              </div>
              {sessions.map((s) => (
                <div key={s.jti} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_0.6fr] md:items-center md:gap-3">
                  <div>
                    <p className="text-[13px] text-black">{s.device || 'Unknown device'}{s.browser ? ` · ${s.browser}` : ''}</p>
                    {s.current && <div className="mt-1"><MonoStatus label="THIS DEVICE" /></div>}
                  </div>
                  <p className="text-[12px] text-[#999999]">{s.ipHint ? `Network ${s.ipHint}` : '—'}</p>
                  <p className="text-[12px] text-[#AAAAAA]">{s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '—'}</p>
                  <div>
                    {!s.current && (
                      <button type="button" onClick={() => setDialog({ kind: 'revoke', jti: s.jti, device: s.device })} disabled={sessBusy} className={btnGhost}>
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </EdSection>
      )}

      {activeTab === 'logs' && (
        <EdSection index={1} title="Audit logs" description="Tamper-proof record of sensitive administrative actions.">
          <div className="mb-4 flex flex-wrap gap-2">
            <input className={`${ctl} min-w-[180px] flex-1`} value={logQuery} onChange={(e) => setLogQuery(e.target.value)} placeholder="Search by email, action, target…" />
            <button type="button" onClick={() => { setLogPage(1); loadLogs(); }} className={btnSolid}>Search</button>
          </div>
          {logsBusy ? (
            <TableSkeleton rows={8} />
          ) : logsErr ? (
            <EditorialError title="Unable to load audit logs" description={logsErr} onRetry={loadLogs} />
          ) : logs.length === 0 ? (
            <EditorialEmpty title="No audit logs" description="No audit logs found matching the query." />
          ) : (
            <>
              <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.9fr_0.6fr_1fr_0.9fr] md:gap-3">
                {['User', 'Action', 'Resource', 'Time'].map((h) => <p key={h} className="adm-label">{h}</p>)}
              </div>
              {logs.map((l) => (
                <div key={l._id} className="grid grid-cols-1 gap-1 border-b border-[#F0F0F0] py-3 md:grid-cols-[0.9fr_0.6fr_1fr_0.9fr] md:items-center md:gap-3">
                  <span className="truncate font-mono text-[12px] text-black">{l.user}</span>
                  <MonoStatus label={String(l.action || '').toUpperCase()} dim={l.action === 'delete'} />
                  <span className="truncate text-[12px] text-[#777777]">{l.target} {l.targetId ? `(${l.targetId.slice(-6)})` : ''}</span>
                  <span className="text-[12px] text-[#AAAAAA]">{new Date(l.createdAt).toLocaleString('en-PK')}</span>
                </div>
              ))}
              <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[#AAAAAA]">
                <span>Total {logTotal}</span>
              </div>
              <EditorialPagination page={logPage} pages={logPages} onPage={setLogPage} />
            </>
          )}
        </EdSection>
      )}

      {activeTab === 'fraud' && (
        <EdSection index={1} title="Fraud" description="Orders flagged for double-submission, high first-order value, mismatched names or duplicate addresses.">
          {fraudBusy ? (
            <TableSkeleton rows={5} />
          ) : fraudErr ? (
            <EditorialError title="Unable to load fraud orders" description={fraudErr} onRetry={loadFraudOrders} />
          ) : fraudOrders.length === 0 ? (
            <EditorialEmpty title="No flagged orders" description="No suspicious orders are pending review." />
          ) : (
            <>
              <div className="hidden border-b border-[#EAEAEA] py-2 md:grid md:grid-cols-[0.8fr_1.1fr_0.6fr_1.2fr_0.6fr_0.9fr] md:gap-3">
                {['Order', 'Customer', 'Value', 'Signals', 'Status', 'Action'].map((h) => <p key={h} className="adm-label">{h}</p>)}
              </div>
              {fraudOrders.map((o) => (
                <div key={o._id} className="grid grid-cols-1 gap-2 border-b border-[#F0F0F0] py-4 md:grid-cols-[0.8fr_1.1fr_0.6fr_1.2fr_0.6fr_0.9fr] md:items-start md:gap-3">
                  <span className="font-mono text-[13px] text-black">{o.orderNumber}</span>
                  <span className="text-[13px] text-[#333333]">{o.customerInfo?.name} <span className="text-[#AAAAAA]">({o.customerInfo?.city})</span></span>
                  <span className="tabular-nums text-[13px] text-black">PKR {o.total?.toLocaleString()}</span>
                  <ul className="space-y-1 text-[12px] text-[#999999]">
                    {(o.fraudFilter?.reasons || []).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                  <MonoStatus label={String(o.fraudFilter?.status || 'pending').toUpperCase()} dim={o.fraudFilter?.status === 'pending'} />
                  <div className="flex flex-wrap gap-2">
                    {o.fraudFilter?.status === 'pending' && (
                      <>
                        <button type="button" onClick={() => setDialog({ kind: 'fraud', id: o._id, action: 'approved', order: o.orderNumber })} className={btnSolid}>Approve</button>
                        <button type="button" onClick={() => setDialog({ kind: 'fraud', id: o._id, action: 'rejected', order: o.orderNumber })} className={btnGhost}>Reject</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </EdSection>
      )}

      {activeTab === 'advanced' && (
        <EdSection index={1} title="JWT rotation" description="Regenerating the secret immediately invalidates every active session.">
          <p className="mb-4 max-w-xl text-[13px] leading-relaxed text-[#999999]">
            All administrative dashboards will require a fresh login. Use this only when a token leak or credential incident is suspected.
          </p>
          <button type="button" onClick={() => setDialog({ kind: 'rotate' })} className={btnSolid}>Rotate all access keys</button>
        </EdSection>
      )}

      <EdConfirm
        open={!!dialog}
        title={
          dialog?.kind === 'delete' ? 'Delete staff account'
            : dialog?.kind === 'update' ? 'Update staff account'
              : dialog?.kind === 'revoke-others' ? 'Sign out other devices'
                : dialog?.kind === 'revoke' ? 'Revoke session'
                  : dialog?.kind === 'rotate' ? 'Rotate JWT secret'
                    : dialog?.kind === 'fraud' ? `Mark order as ${dialog.action}`
                      : 'Confirm'
        }
        body={
          dialog?.kind === 'delete' ? `Permanently delete ${dialog.name}? This cannot be undone.`
            : dialog?.kind === 'update' ? `Update ${dialog.name}? Role and active status will change immediately.`
              : dialog?.kind === 'revoke-others' ? 'Every other device will be signed out. You will stay signed in here.'
                : dialog?.kind === 'revoke' ? `Revoke the session on ${dialog.device || 'this device'}?`
                  : dialog?.kind === 'rotate' ? 'Every active session will expire immediately. You and all other admins will need to sign back in.'
                    : dialog?.kind === 'fraud' ? `Order ${dialog.order} will be marked as ${dialog.action}.`
                      : ''
        }
        confirmLabel={
          dialog?.kind === 'delete' ? 'Delete'
            : dialog?.kind === 'rotate' ? 'Rotate now'
              : dialog?.kind === 'fraud' && dialog.action === 'rejected' ? 'Reject'
                : 'Confirm'
        }
        busy={sessBusy}
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          if (dialog?.kind === 'delete') handleDeleteUser(dialog.id);
          else if (dialog?.kind === 'update') handleUpdateUserStatus(dialog.id, dialog.isActive, dialog.role);
          else if (dialog?.kind === 'revoke-others') revokeOthers();
          else if (dialog?.kind === 'revoke') { revokeSession(dialog.jti); setDialog(null); }
          else if (dialog?.kind === 'rotate') handleRotateSecret();
          else if (dialog?.kind === 'fraud') handleFraudAction(dialog.id, dialog.action);
        }}
      />
    </AdminLayout>
  );
}
