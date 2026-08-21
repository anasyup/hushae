import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';

const STAFF_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

export default function AdminLogin() {
  const { auth, setAuth } = useApp();
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
    <div className="grid min-h-screen place-items-center bg-neutral-900 px-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-md">
        <p className="text-center font-sans text-lg tracking-widest">HUSHAE</p>
        <p className="mt-1 text-center text-[12px] uppercase tracking-wider text-neutral-500">
          {step2 ? 'Two-factor verification' : 'Private access — staff only'}
        </p>

        {!step2 ? (
          <form onSubmit={submit} className="mt-8 space-y-4" autoComplete="off">
            <div><label htmlFor="admin-email" className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Email</label><input id="admin-email" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900" type="email" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div><label htmlFor="admin-password" className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Password</label><input id="admin-password" className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13px] outline-none transition focus:border-neutral-900" type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
            {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{err}</p>}
            <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black w-full"><Lock size={14} /> {busy ? 'Verifying…' : 'Sign In'}</button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-8 space-y-4" autoComplete="off">
            <p className="text-[12px] leading-relaxed text-neutral-600">We emailed a 6-digit sign-in code to <b className="text-neutral-900">{pendingEmail}</b>. Enter it below — it expires in 5 minutes.</p>
            <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">6-digit code</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[18px] tracking-[8px] outline-none transition focus:border-neutral-900" type="text" inputMode="numeric" maxLength={6} required autoComplete="off" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></div>
            {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{err}</p>}
            <button disabled={codeBusy} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black w-full"><ShieldCheck size={14} /> {codeBusy ? 'Verifying…' : 'Verify & Sign In'}</button>
            <button type="button" onClick={() => { setStep2(false); setCode(''); setErr(''); }} className="inline-flex items-center gap-1 text-[12px] text-neutral-500 hover:text-neutral-900"><ArrowLeft size={12} /> Back to sign in</button>
          </form>
        )}

        <p className="mt-5 text-center text-[12px] leading-relaxed text-neutral-500">Authorised staff only</p>
      </div>
    </div>
  );
}
