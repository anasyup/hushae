import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function AdminLogin() {
  const { login } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

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
    <div className="grid min-h-screen place-items-center bg-obsidian px-4">
      <div className="w-full max-w-sm rounded-[2rem] bg-alabaster p-8 shadow-soft">
        <p className="text-center font-display text-xl tracking-widest2">V É L O U R A</p>
        <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-ash">Admin Console — staff only</p>
        <form onSubmit={submit} className="mt-8 space-y-4" autoComplete="off">
          <div><label className="label">Username</label><input className="input" type="text" required autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="underadmin" /></div>
          <div><label className="label">Password</label><input className="input" type="password" required autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} placeholder="••••••••" /></div>
          {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{err}</p>}
          <button disabled={busy} className="btn-primary w-full"><Lock size={14} /> {busy ? 'Verifying…' : 'Sign In'}</button>
        </form>
        <p className="mt-5 text-center text-[11px] leading-relaxed text-ash">VÉLOURA staff login</p>
      </div>
    </div>
  );
}
