import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function AdminLogin() {
  const { auth, login } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Already signed in as admin → straight to the console
  if (auth && auth.user.role === 'admin') return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await login(f.email, f.password);
      if (d.user.role !== 'admin') { setErr('This account is not an admin.'); setBusy(false); return; }
      nav('/admin', { replace: true });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-neutral-900 px-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-md">
        <p className="text-center font-sans text-lg tracking-widest">HUSHAE</p>
        <p className="mt-1 text-center text-[12px] uppercase tracking-wider text-neutral-500">Private access — staff only</p>
        <form onSubmit={submit} className="mt-8 space-y-4" autoComplete="off">
          <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Username</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="text" required autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="mb-1 block text-[13px] font-bold uppercase tracking-wider text-neutral-500">Password</label><input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-neutral-900" type="password" required autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
          {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{err}</p>}
          <button disabled={busy} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-[12px] font-semibold text-white hover:bg-black w-full"><Lock size={14} /> {busy ? 'Verifying…' : 'Sign In'}</button>
        </form>
        <p className="mt-5 text-center text-[12px] leading-relaxed text-neutral-500">Authorised staff only</p>
      </div>
    </div>
  );
}
