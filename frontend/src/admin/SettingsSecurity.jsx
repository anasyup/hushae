import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Check, AlertTriangle, Eye, EyeOff, FileText, Lock, LogOut, Monitor, Plus, RefreshCw, Save, ShieldCheck, Smartphone, Trash2, Users, Key, ShieldAlert, Play, Search, X
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import AdminLayout from './AdminLayout';

function BackToSettings() {
  return (
    <Link to="/admin/settings" className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition hover:text-neutral-900">
      <ArrowLeft size={13} /> Settings
    </Link>
  );
}

function PageIntro({ icon: Icon, title, description }) {
  return (
    <div className="mb-6 flex items-start gap-4 border-b border-neutral-200 pb-6">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-neutral-900 text-white">
        <Icon size={20} strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="font-sans text-2xl leading-tight text-neutral-900">{title}</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{description}</p>
      </div>
    </div>
  );
}

function Section({ title, description, children, action }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-neutral-900">{title}</p>
          {description && <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </section>
  );
}

const ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

export default function SettingsSecurity() {
  const { auth, setAuth, toast } = useApp();
  const [activeTab, setActiveTab] = useState('personal');
  const [sessions, setSessions] = useState(null);
  const [sessBusy, setSessBusy] = useState(false);
  // 2FA
  const [twoFa, setTwoFa] = useState({ enabled: !!auth?.user?.twoFactorEnabled, step: 'idle', code: '', pass: '' });
  const [twoFaBusy, setTwoFaBusy] = useState(false);

  // Personal password change
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState({ c: false, n: false, x: false });
  const [busy, setBusy] = useState(false);

  // Personal username change
  const [uCurrent, setUCurrent] = useState('');
  const [uNew, setUNew] = useState('');
  const [uShow, setUShow] = useState(false);
  const [uBusy, setUBusy] = useState(false);

  // User management (Roles)
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'Staff' });
  const [userBusy, setUserBusy] = useState(false);
  const [userEditId, setUserEditId] = useState(null);

  // Audit logs
  const [logs, setLogs] = useState([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logQuery, setLogQuery] = useState('');
  const [logsBusy, setLogsBusy] = useState(false);

  // Fraud Filter
  const [fraudOrders, setFraudOrders] = useState([]);
  const [fraudBusy, setFraudBusy] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'fraud') {
      loadFraudOrders();
    } else if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab, logPage]);

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
    if (!window.confirm('Sign out every other device? You will stay signed in here.')) return;
    setSessBusy(true);
    try {
      const d = await api('/customer/sessions/revoke-others', { method: 'POST', token: auth.token });
      toast(`Signed out ${d.revoked || 0} other device(s)`);
      loadSessions();
    } catch (ex) { toast(ex.message); }
    setSessBusy(false);
  };

  // Loaders
  const loadUsers = () => {
    api('/security/users', { token: auth.token })
      .then((d) => setUsers(d.users || []))
      .catch(() => toast('Could not load users list. Please check your role permissions.'));
  };

  const loadLogs = () => {
    setLogsBusy(true);
    api(`/security/audit-logs?page=${logPage}&limit=15&q=${encodeURIComponent(logQuery)}`, { token: auth.token })
      .then((d) => {
        setLogs(d.logs || []);
        setLogTotal(d.total || 0);
      })
      .catch(() => toast('Could not load audit logs. Owners only.'))
      .finally(() => setLogsBusy(false));
  };

  const loadFraudOrders = () => {
    setFraudBusy(true);
    api('/security/fraud-orders', { token: auth.token })
      .then((d) => setFraudOrders(d.orders || []))
      .catch(() => toast('Could not load flagged fraud orders.'))
      .finally(() => setFraudBusy(false));
  };

  // Submission helpers
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
        body: { currentPassword: current, newPassword: next }
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
        body: { currentPassword: uCurrent, newUsername: uNew.trim() }
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
      await api('/security/users', {
        method: 'POST',
        token: auth.token,
        body: userForm,
      });
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
    if (!window.confirm('Are you sure you want to update this user account settings?')) return;
    try {
      await api(`/security/users/${id}`, {
        method: 'PUT',
        token: auth.token,
        body: { isActive, role }
      });
      toast('User updated successfully.');
      loadUsers();
    } catch (ex) {
      toast(ex?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this admin user permanently? This action cannot be undone.')) return;
    try {
      await api(`/security/users/${id}`, {
        method: 'DELETE',
        token: auth.token
      });
      toast('User deleted successfully.');
      loadUsers();
    } catch (ex) {
      toast(ex?.message || 'Failed to delete user');
    }
  };

  const handleRotateSecret = async () => {
    if (!window.confirm('⚠️ WARNING: Rotating the secret key will immediately invalidate every active session. You and all other admins will need to sign back in. Proceed?')) return;
    try {
      await api('/security/rotate-jwt', { method: 'POST', token: auth.token });
      toast('JWT secret rotated! Signing you out...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (ex) {
      toast(ex?.message || 'Failed to rotate secret.');
    }
  };

  const handleFraudAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to mark this order as ${action}?`)) return;
    try {
      await api(`/security/fraud-orders/${id}/action`, {
        method: 'POST',
        token: auth.token,
        body: { action }
      });
      toast(`Order successfully marked as ${action}.`);
      loadFraudOrders();
    } catch (ex) {
      toast(ex?.message || 'Failed to apply fraud action.');
    }
  };

  const strength = (() => {
    if (!next) return { label: '', color: 'transparent', pct: 0 };
    let score = 0;
    if (next.length >= 8) score++;
    if (next.length >= 12) score++;
    if (/[A-Z]/.test(next) && /[a-z]/.test(next)) score++;
    if (/[0-9]/.test(next)) score++;
    if (/[^A-Za-z0-9]/.test(next)) score++;
    const map = [
      { label: 'Very weak', color: '#ECECEF', pct: 20 },
      { label: 'Weak',      color: '#ea580c', pct: 40 },
      { label: 'Fair',      color: '#A3A3AB', pct: 60 },
      { label: 'Good',      color: '#65a30d', pct: 80 },
      { label: 'Strong',    color: '#D6D6DA', pct: 100 },
    ];
    return map[Math.min(score, 4)] || map[0];
  })();

  const eyeBtn = (which) => (
    <button
      type="button"
      onClick={() => setShow((s) => ({ ...s, [which]: !s[which] }))}
      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-neutral-400 hover:text-neutral-900"
      aria-label="Toggle visibility"
    >
      {show[which] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <AdminLayout title="Security & Access Control">
      <div className="mx-auto max-w-6xl">
        <BackToSettings />
        <PageIntro
          icon={ShieldCheck}
          title="Security & Access Control"
          description="Manage administrative roles, multi-user accounts, inspect detailed immutable audit logs, regulate JWT keys, and manual review automated fraud indicators."
        />

        {/* Tab Selection */}
        <div className="mb-6 flex gap-1.5 overflow-x-auto border-b border-neutral-200 pb-1">
          {[
            { id: 'personal', label: 'My Login', icon: Lock },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'sessions', label: 'Devices', icon: Monitor },
            { id: 'logs', label: 'Audit Logs', icon: FileText },
            { id: 'fraud', label: 'Fraud Filters', icon: ShieldAlert },
            { id: 'advanced', label: 'JWT Rotation', icon: Key }
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTab(t.id); setLogPage(1); }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${
                  active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content Tabs */}
        {activeTab === 'personal' && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Username card */}
            <Section
              title="Change Username / Email"
              description="Configure your unique identifier used for authentication."
            >
              <form onSubmit={handleUsernameChange} className="space-y-4">
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-[12px] text-neutral-600">
                  <span className="font-semibold text-neutral-500">Current Username:</span>{' '}
                  <span className="font-mono text-neutral-900">{auth?.user?.email || '—'}</span>
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">New Username (Email)</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                    value={uNew}
                    onChange={(e) => setUNew(e.target.value)}
                    placeholder="e.g. admin@hushae.pk"
                    required
                  />
                </div>
                <div className="relative">
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Confirm with Current Password</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 pr-10"
                    type={uShow ? 'text' : 'password'}
                    value={uCurrent}
                    onChange={(e) => setUCurrent(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setUShow(!uShow)}
                    className="absolute right-3 top-[42px] text-neutral-400 hover:text-neutral-700"
                  >
                    {uShow ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={uBusy || !uCurrent || !uNew}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                >
                  {uBusy ? 'Updating…' : 'Update Username'}
                </button>
              </form>
            </Section>

            {/* Password card */}
            <Section
              title="Change Password"
              description="A strong password prevents unauthorized backend actions."
            >
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="relative">
                  <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Current Password</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 pr-10"
                    type={show.c ? 'text' : 'password'}
                    value={current}
                    onChange={(e) => setCurrent(e.target.value)}
                    required
                  />
                  {eyeBtn('c')}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">New Password</label>
                    <input
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 pr-10"
                      type={show.n ? 'text' : 'password'}
                      value={next}
                      onChange={(e) => setNext(e.target.value)}
                      required
                    />
                    {eyeBtn('n')}
                  </div>
                  <div className="relative">
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Confirm New Password</label>
                    <input
                      className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 pr-10"
                      type={show.x ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                    {eyeBtn('x')}
                  </div>
                </div>

                {next && (
                  <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-neutral-700">
                      <span>Strength</span>
                      <span style={{ color: strength.color }}>{strength.label}</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                      <div className="h-full transition-all duration-300" style={{ width: `${strength.pct}%`, backgroundColor: strength.color }} />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy || !current || !next || next !== confirm}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-40"
                >
                  {busy ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </Section>

            {/* Two-factor authentication card */}
            <Section
              title="Two-Factor Authentication (2FA)"
              description="Add an extra security layer: after your password, you'll need a 6-digit code emailed to you to sign in."
            >
              <div className="space-y-4">
                <div className={`flex items-center justify-between rounded-xl border p-4 ${twoFa.enabled ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-neutral-50'}`}>
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-900">{twoFa.enabled ? '2FA is ON' : '2FA is OFF'}</p>
                    <p className="mt-0.5 text-[11px] text-neutral-500">{twoFa.enabled ? 'Every sign-in needs a code from your inbox.' : 'Sign-in currently needs only your password.'}</p>
                  </div>
                  <button
                    onClick={() => setTwoFa({ ...twoFa, step: 'start' })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${twoFa.enabled ? 'bg-white border border-neutral-200 text-neutral-600 hover:border-red-300 hover:text-red-600' : 'bg-neutral-900 text-white hover:bg-neutral-800'}`}
                  >
                    {twoFa.enabled ? 'Turn off' : 'Turn on'}
                  </button>
                </div>

                {twoFa.step !== 'idle' && (
                  <div className="rounded-xl border border-neutral-200 bg-white p-4">
                    {twoFa.enabled ? (
                      <p className="mb-3 text-[12px] text-neutral-600">Enter your current password to disable 2FA.</p>
                    ) : twoFa.step === 'start' ? (
                      <p className="mb-3 text-[12px] text-neutral-600">Enter your current password, then we'll email a verification code to <b className="text-neutral-900">{auth?.user?.email}</b>.</p>
                    ) : (
                      <p className="mb-3 text-[12px] text-neutral-600">We emailed a 6-digit code to <b className="text-neutral-900">{auth?.user?.email}</b>. Enter it to finish enabling 2FA.</p>
                    )}
                    {twoFa.step !== 'code' && (
                      <div className="flex gap-2">
                        <input type="password" placeholder="Current password" className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none focus:border-neutral-900" value={twoFa.pass} onChange={(e) => setTwoFa({ ...twoFa, pass: e.target.value })} />
                        <button
                          disabled={twoFaBusy || !twoFa.pass}
                          onClick={async () => {
                            setTwoFaBusy(true); setErr('');
                            try {
                              const d = await api('/auth/2fa/toggle', { method: 'POST', token: auth.token, body: { enable: !twoFa.enabled, password: twoFa.pass } });
                              if (d.step === 'code-sent') { setTwoFa({ ...twoFa, step: 'code', pass: '' }); toast('Verification code sent to your email'); }
                              else if (d.ok) { setTwoFa({ enabled: d.twoFactorEnabled, step: 'idle', code: '', pass: '' }); toast(d.twoFactorEnabled ? '2FA enabled' : '2FA disabled'); }
                            } catch (ex) { setErr(ex.message); }
                            setTwoFaBusy(false);
                          }}
                          className="inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
                        >
                          {twoFaBusy ? '…' : 'Continue'}
                        </button>
                      </div>
                    )}
                    {twoFa.step === 'code' && (
                      <div className="flex gap-2">
                        <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[16px] tracking-[6px] outline-none focus:border-neutral-900" value={twoFa.code} onChange={(e) => setTwoFa({ ...twoFa, code: e.target.value.replace(/\D/g, '') })} />
                        <button
                          disabled={twoFaBusy || twoFa.code.length !== 6}
                          onClick={async () => {
                            setTwoFaBusy(true); setErr('');
                            try {
                              const d = await api('/auth/2fa/toggle', { method: 'POST', token: auth.token, body: { enable: true, password: twoFa.pass, code: twoFa.code } });
                              if (d.ok) { setTwoFa({ enabled: true, step: 'idle', code: '', pass: '' }); toast('2FA enabled — you will need a code at next sign-in'); }
                            } catch (ex) { setErr(ex.message); }
                            setTwoFaBusy(false);
                          }}
                          className="inline-flex items-center rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
                        >
                          {twoFaBusy ? '…' : 'Verify'}
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={() => setTwoFa({ ...twoFa, step: 'idle', code: '', pass: '' })} className="mt-3 text-[12px] text-neutral-400 hover:text-neutral-700">Cancel</button>
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Create Sub-user form */}
            <div className="lg:col-span-4">
              <Section
                title="Create Sub-User / Admin Account"
                description="Assign administrative roles to your support, support staff, or warehouse team."
              >
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Full Name</label>
                    <input
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="e.g. Bilal Khan"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Email Address (Username)</label>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      placeholder="e.g. bilal@hushae.pk"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Initial Password</label>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Administrative Role</label>
                    <select
                      className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900"
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    >
                      <option value="Owner">Owner (Full access)</option>
                      <option value="Manager">Manager (No security/advanced settings)</option>
                      <option value="Staff">Staff (Orders & Reviews only)</option>
                      <option value="Warehouse">Warehouse (Inventory & Order updates — no pricing)</option>
                      <option value="Support">Support (Orders, Customers, Reviews — no discounts)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={userBusy}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
                  >
                    <Plus size={13} /> {userBusy ? 'Creating…' : 'Create Account'}
                  </button>
                </form>
              </Section>
            </div>

            {/* Active admins list */}
            <div className="lg:col-span-8">
              <Section
                title="Active Administrative Accounts"
                description="List of administrative users authorized with granular backend permissions."
              >
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-[12px] uppercase tracking-wider text-neutral-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-[13px]">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-neutral-900">{u.name}</p>
                            <p className="text-[12px] text-neutral-500 font-mono">{u.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateUserStatus(u._id, u.isActive, e.target.value)}
                              className="bg-neutral-100 hover:bg-neutral-200 border-0 rounded px-2 py-1 text-xs font-medium"
                              disabled={String(u._id) === String(auth?.user?._id)}
                            >
                              {ROLES.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleUpdateUserStatus(u._id, !u.isActive, u.role)}
                              disabled={String(u._id) === String(auth?.user?._id)}
                              className={`rounded-full px-2 py-0.5 text-[13px] font-bold uppercase ${
                                u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {u.isActive ? 'Active' : 'Suspended'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(u._id)}
                              disabled={String(u._id) === String(auth?.user?._id)}
                              className="p-1 text-neutral-400 hover:text-red-600 transition"
                              title="Delete Account"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </div>
          </div>
        )}

        {activeTab === 'sessions' && (
          <Section
            title="Active Devices / Sessions"
            description="Every device that is signed in to your admin account. Revoke any device you do not recognise."
            action={
              <button
                onClick={revokeOthers}
                disabled={sessBusy || !sessions?.length}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-neutral-600 transition hover:border-neutral-400"
              >
                <LogOut size={12} /> Sign out other devices
              </button>
            }
          >
            {!sessions ? (
              <p className="text-[13px] text-neutral-400">Loading devices…</p>
            ) : sessions.length === 0 ? (
              <p className="text-[13px] text-neutral-400">No active sessions found.</p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {sessions.map((s) => (
                  <div key={s.jti} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-neutral-100 text-neutral-500">
                        {/iPhone|Android|phone/i.test(s.device || '') ? <Smartphone size={15} /> : <Monitor size={15} />}
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900">
                          {s.device || 'Unknown device'}{s.browser ? ` · ${s.browser}` : ''}
                          {s.current && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase text-emerald-700">This device</span>}
                        </p>
                        <p className="mt-0.5 text-[11px] text-neutral-500">
                          {s.ipHint ? `Network ${s.ipHint} · ` : ''}
                          Last seen {s.lastSeen ? new Date(s.lastSeen).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>
                    {!s.current && (
                      <button
                        onClick={() => revokeSession(s.jti)}
                        disabled={sessBusy}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500 transition hover:border-red-300 hover:text-red-600"
                      >
                        <X size={11} /> Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'logs' && (
          <Section
            title="Immutable Audit Logs"
            description="Complete tamper-proof track log of every sensitive administrative action performed."
          >
            {/* Filter Log Bar */}
            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-[12px] outline-none transition focus:border-neutral-900 !pl-9 !py-2"
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  placeholder="Search logs by email, action, target..."
                />
              </div>
              <button
                onClick={() => { setLogPage(1); loadLogs(); }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-neutral-800"
              >
                Search
              </button>
            </div>

            {logsBusy ? (
              <div className="animate-pulse rounded-xl bg-neutral-100 h-64 w-full" />
            ) : logs.length === 0 ? (
              <div className="text-center py-12 bg-neutral-50 rounded-xl border border-dashed text-neutral-500 text-sm">
                No audit logs found matching the query.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 text-[12px] uppercase tracking-wider text-neutral-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">User</th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                        <th className="px-4 py-3 font-semibold">Target</th>
                        <th className="px-4 py-3 font-semibold">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-xs font-mono">
                      {logs.map((l) => (
                        <tr key={l._id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 text-neutral-900">{l.user}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase text-[12px] ${
                              l.action === 'create' ? 'bg-blue-100 text-blue-800' :
                              l.action === 'update' ? 'bg-amber-100 text-amber-800' :
                              l.action === 'delete' ? 'bg-red-100 text-red-800' : 'bg-neutral-100 text-neutral-800'
                            }`}>{l.action}</span>
                          </td>
                          <td className="px-4 py-3 text-neutral-700">
                            {l.target} {l.targetId ? `(${l.targetId.slice(-6)})` : ''}
                          </td>
                          <td className="px-4 py-3 text-neutral-500">
                            {new Date(l.createdAt).toLocaleString('en-PK')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center px-2 py-3 border-t">
                  <span className="text-xs text-neutral-500">Total logs: {logTotal}</span>
                  <div className="flex gap-2">
                    <button
                      disabled={logPage === 1}
                      onClick={() => setLogPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1.5 text-xs bg-white border rounded disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-xs self-center px-2">Page {logPage}</span>
                    <button
                      disabled={logPage * 15 >= logTotal}
                      onClick={() => setLogPage(p => p + 1)}
                      className="px-3 py-1.5 text-xs bg-white border rounded disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Section>
        )}

        {activeTab === 'fraud' && (
          <Section
            title="Auto-Flagged Suspicious Orders (Fraud Filter)"
            description="System flags indicators like double-submissions, new customers placing orders over 10K PKR, matching phone numbers with separate names, or duplicate addresses."
          >
            {fraudBusy ? (
              <div className="animate-pulse rounded-xl bg-neutral-100 h-64 w-full" />
            ) : fraudOrders.length === 0 ? (
              <div className="text-center py-16 bg-neutral-50 border border-dashed rounded-2xl text-neutral-500">
                <Check className="mx-auto text-emerald-500 mb-2" size={24} />
                <p className="font-semibold text-neutral-900">Zero suspicious orders pending review</p>
                <p className="text-xs mt-1">Excellent! All recent orders look clean and pass validation checks.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {fraudOrders.map((o) => (
                  <div key={o._id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm">{o.orderNumber}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[12px] font-bold uppercase ${
                            o.fraudFilter?.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            o.fraudFilter?.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>{o.fraudFilter?.status || 'pending'}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">
                          Placed by <span className="font-semibold text-neutral-700">{o.customerInfo?.name}</span> ({o.customerInfo?.city}) · Total: <span className="font-bold text-neutral-900">PKR {o.total?.toLocaleString()}</span>
                        </p>
                      </div>
                      {o.fraudFilter?.status === 'pending' && (
                        <div className="flex gap-2 mt-3 md:mt-0">
                          <button
                            onClick={() => handleFraudAction(o._id, 'approved')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Approve Order
                          </button>
                          <button
                            onClick={() => handleFraudAction(o._id, 'rejected')}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
                          >
                            Reject & Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Reasons */}
                    <div className="space-y-2">
                      <p className="text-[12px] font-bold text-red-700 uppercase tracking-wider">Flagged Suspicious Indicators:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {(o.fraudFilter?.reasons || []).map((r, i) => (
                          <li key={i} className="text-xs text-neutral-700 font-medium">{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {activeTab === 'advanced' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Section
              title="System Cryptographic Key Rotation"
              description="Instantly regenerate high-entropy database authorization keys."
            >
              <div className="space-y-4">
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Secret key rotation will render all current state tokens immediately expired. For safety, this forces all administrative dashboards to instantly require a fresh login from zero. Use this only when a token leak or audit credential incident is suspected.
                </p>
                <button
                  type="button"
                  onClick={handleRotateSecret}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-red-600 text-white px-4 py-2 text-xs font-semibold transition hover:bg-red-700"
                >
                  <RefreshCw size={13} /> Rotate All Access Keys Now
                </button>
              </div>
            </Section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
