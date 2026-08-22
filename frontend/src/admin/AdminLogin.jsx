import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';
import { api } from '../api/client';

const STAFF_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

export default function AdminLogin() {
  const { auth, setAuth } = useApp();
  // Login is the admin entry — apply the admin design system (dark-first).
  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);

  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // 2FA step
  const [step2, setStep2] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  // Already signed in as admin → straight to the console
  if (auth && STAFF_ROLES.includes(auth.user?.role)) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email: f.email, password: f.password } });
      if (d.twoFactorRequired) {
        setPendingEmail(d.email);
        setStep2(true);
        setBusy(false);
        return;
      }
      if (!STAFF_ROLES.includes(d.user?.role)) { setErr('This account does not have staff access.'); setBusy(false); return; }
      setAuth(d);
      nav('/admin', { replace: true });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  const submitCode = async (e) => {
    e.preventDefault();
    setErr(''); setCodeBusy(true);
    try {
      const d = await api('/auth/2fa/verify', { method: 'POST', body: { email: pendingEmail, code } });
      if (!STAFF_ROLES.includes(d.user?.role)) { setErr('This account does not have staff access.'); setCodeBusy(false); return; }
      setAuth(d);
      nav('/admin', { replace: true });
    } catch (ex) { setErr(ex.message); setCodeBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-admin-bg px-4">
      <div className="w-full max-w-sm rounded-xl border border-admin-border bg-admin-surface p-8 shadow-md">
        <p className="text-center font-sans text-lg tracking-widest">HUSHAE</p>
        <p className="mt-1 text-center text-[12px] uppercase tracking-wider text-admin-text-muted">
          {step2 ? 'Two-factor verification' : 'Private access — staff only'}
        </p>

        {!step2 ? (
          <form onSubmit={submit} className="mt-8 space-y-4" autoComplete="off">
            <div><label htmlFor="admin-email" className="mb-1.5 block text-[12px] font-medium text-admin-text-2">Email</label><input id="admin-email" className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-[13px] text-admin-text outline-none transition placeholder:text-admin-text-muted focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--admin-accent-soft)]" type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><label htmlFor="admin-password" className="mb-1.5 block text-[12px] font-medium text-admin-text-2">Password</label><input id="admin-password" className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-[13px] text-admin-text outline-none transition placeholder:text-admin-text-muted focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--admin-accent-soft)]" type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            {err && <p role="alert" className="rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-4 py-3 text-xs text-admin-danger">{err}</p>}
            <button disabled={busy} className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-admin-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-admin-accent-hover disabled:opacity-60"><Lock size={14} /> {busy ? 'Verifying…' : 'Sign In'}</button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-8 space-y-4" autoComplete="off">
            <p className="text-[12px] leading-relaxed text-admin-text-2">We emailed a 6-digit sign-in code to <b className="text-admin-text">{pendingEmail}</b>. Enter it below — it expires in 5 minutes.</p>
            <div><label className="mb-1.5 block text-[12px] font-medium text-admin-text-2">6-digit code</label><input className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-[18px] tracking-[8px] text-admin-text outline-none transition focus:border-admin-accent focus:shadow-[0_0_0_3px_var(--admin-accent-soft)]" type="text" inputMode="numeric" maxLength={6} required autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>
            {err && <p role="alert" className="rounded-lg border border-admin-danger/30 bg-admin-danger/10 px-4 py-3 text-xs text-admin-danger">{err}</p>}
            <button disabled={codeBusy} className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg bg-admin-accent px-4 py-2 text-[13px] font-medium text-white transition hover:bg-admin-accent-hover disabled:opacity-60"><ShieldCheck size={14} /> {codeBusy ? 'Verifying…' : 'Verify & Sign In'}</button>
            <button type="button" onClick={() => { setStep2(false); setCode(''); setErr(''); }} className="inline-flex items-center gap-1 text-[12px] text-admin-text-muted transition hover:text-admin-text"><ArrowLeft size={12} /> Back to sign in</button>
          </form>
        )}

        <p className="mt-5 text-center text-[12px] leading-relaxed text-admin-text-muted">Authorised staff only</p>
      </div>
    </div>
  );
}
