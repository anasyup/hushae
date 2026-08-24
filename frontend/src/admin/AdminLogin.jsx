import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';
import { api } from '../api/client';

/* ============================================================================
 * ADMIN LOGIN — Phase 5 Premium Rebuild
 * Clean, editorial, luxury sign-in experience.
 * ========================================================================== */

const STAFF_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

export default function AdminLogin() {
  const { auth, setAuth } = useApp();
  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);

  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [step2, setStep2] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

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
    <div className="grid min-h-screen place-items-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center">
          <p className="text-[18px] font-semibold tracking-[0.4em] text-black">HUSHAE</p>
          <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.22em] text-[#AAAAAA]">
            {step2 ? 'Two-Factor Verification' : 'Admin Console'}
          </p>
        </div>

        {!step2 ? (
          <form onSubmit={submit} className="mt-12 space-y-6" autoComplete="off">
            <div>
              <label htmlFor="admin-email" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Email</label>
              <input
                id="admin-email"
                className="h-11 w-full rounded-md border border-[#EAEAEA] bg-white px-4 text-[14px] text-black outline-none transition-all duration-150 placeholder:text-[#AAAAAA] hover:border-[#DCDCDC] focus:border-black"
                type="email"
                required
                autoComplete="username"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">Password</label>
              <input
                id="admin-password"
                className="h-11 w-full rounded-md border border-[#EAEAEA] bg-white px-4 text-[14px] text-black outline-none transition-all duration-150 placeholder:text-[#AAAAAA] hover:border-[#DCDCDC] focus:border-black"
                type="password"
                required
                autoComplete="current-password"
                value={f.password}
                onChange={(e) => setF({ ...f, password: e.target.value })}
              />
            </div>
            {err && (
              <p role="alert" className="rounded-md border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3 text-[13px] leading-relaxed text-[#555555]">{err}</p>
            )}
            <button
              disabled={busy}
              className="h-11 w-full rounded-md bg-black text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-150 hover:bg-[#1a1a1a] disabled:opacity-40"
            >
              {busy ? 'Verifying…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-12 space-y-6" autoComplete="off">
            <p className="text-[13px] leading-relaxed text-[#777777]">
              A 6-digit sign-in code was emailed to <span className="font-medium text-black">{pendingEmail}</span>. It expires in 5 minutes.
            </p>
            <div>
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999999]">6-Digit Code</label>
              <input
                className="h-11 w-full rounded-md border border-[#EAEAEA] bg-white px-4 text-[16px] tracking-[0.5em] text-black outline-none transition-all duration-150 focus:border-black"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {err && (
              <p role="alert" className="rounded-md border border-[#EAEAEA] bg-[#FAFAFA] px-4 py-3 text-[13px] leading-relaxed text-[#555555]">{err}</p>
            )}
            <button
              disabled={codeBusy}
              className="h-11 w-full rounded-md bg-black text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-150 hover:bg-[#1a1a1a] disabled:opacity-40"
            >
              {codeBusy ? 'Verifying…' : 'Verify & Sign In'}
            </button>
            <button
              type="button"
              onClick={() => { setStep2(false); setCode(''); setErr(''); }}
              className="block w-full text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[#AAAAAA] transition-colors hover:text-black"
            >
              Back to Sign In
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#DCDCDC]">Authorised Staff Only</p>
      </div>
    </div>
  );
}
