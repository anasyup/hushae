import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';
import { api } from '../api/client';

const STAFF_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

const field =
  'h-10 w-full border border-[#DCDCDC] bg-white px-3 text-[13px] text-black outline-none placeholder:text-[#777777] hover:border-[#999999] focus:border-black';
const solid =
  'inline-flex h-10 w-full items-center justify-center bg-black text-[10px] font-medium uppercase tracking-[0.18em] text-[#FFFFFF] transition hover:bg-black/80 disabled:opacity-35';

export default function AdminLogin() {
  const { auth, setAuth } = useApp();
  useEffect(() => {
    applyAdminTheme();
    document.title = 'HUSHAE Admin · Sign in';
    return () => clearAdminTheme();
  }, []);

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
    <div className="grid min-h-screen place-items-center bg-white px-4 text-black">
      <div className="w-full max-w-sm">
        <p className="text-center text-[11px] font-medium uppercase tracking-[0.42em] text-black">HUSHAE</p>
        <p className="mt-3 text-center text-[10px] font-medium uppercase tracking-[0.22em] text-[#777777]">
          {step2 ? 'Two-factor verification' : 'Private access'}
        </p>

        {!step2 ? (
          <form onSubmit={submit} className="mt-10 space-y-5 border-y border-[#EAEAEA] py-8" autoComplete="off">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-[#777777]">Email</label>
              <input id="admin-email" className={field} type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-[#777777]">Password</label>
              <input id="admin-password" className={field} type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </div>
            {err && <p role="alert" className="border border-[#EAEAEA] px-3 py-2 text-[12px] leading-relaxed text-[#555555]">{err}</p>}
            <button disabled={busy} className={solid}>{busy ? 'Verifying…' : 'Sign in'}</button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-10 space-y-5 border-y border-[#EAEAEA] py-8" autoComplete="off">
            <p className="text-[12px] leading-relaxed text-[#555555]">
              A 6-digit sign-in code was emailed to <span className="text-black">{pendingEmail}</span>. It expires in 5 minutes.
            </p>
            <div>
              <label className="mb-1.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-[#777777]">6-digit code</label>
              <input className={`${field} tracking-[0.4em]`} type="text" inputMode="numeric" maxLength={6} required autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </div>
            {err && <p role="alert" className="border border-[#EAEAEA] px-3 py-2 text-[12px] leading-relaxed text-[#555555]">{err}</p>}
            <button disabled={codeBusy} className={solid}>{codeBusy ? 'Verifying…' : 'Verify & sign in'}</button>
            <button type="button" onClick={() => { setStep2(false); setCode(''); setErr(''); }} className="block w-full text-center text-[10px] uppercase tracking-[0.16em] text-[#777777] hover:text-black">
              Back to sign in
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] text-[#999999]">Authorised staff only</p>
      </div>
    </div>
  );
}
