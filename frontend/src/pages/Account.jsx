import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Lock, LogOut, Mail, User as UserIcon } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import { fmtDate, pkr } from '../lib/format';
import { normalizePhone, validEmail, phoneTypingError } from '../lib/validators';

function AuthCard() {
  const { login, register, toast } = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '' });
  const [ferrs, setFerrs] = useState({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setFerrs((x) => ({ ...x, [k]: '' })); };

  const phoneOK = normalizePhone(f.phone);
  const emailOK = validEmail(f.email);
  // Only flag email once it looks fully typed (dot after @ + chars after the dot) — no premature errors
  const emailTypedWrong = (() => {
    const em = f.email.trim();
    const at = em.indexOf('@');
    const dot = em.lastIndexOf('.');
    return dot > at && dot < em.length - 2 && !validEmail(em);
  })();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (mode === 'register') {
      const fe = {};
      if (f.name.trim().length < 3) fe.name = 'Enter your full name';
      if (!phoneOK) fe.phone = 'Incorrect number — Pakistani mobile required (03XX-XXXXXXX)';
      if (!emailOK) fe.email = 'Incorrect email address';
      if (f.password.length < 6) fe.password = 'Minimum 6 characters';
      if (Object.keys(fe).length) { setFerrs(fe); return; }
    }
    setBusy(true);
    try {
      const d = mode === 'login' ? await login(f.email, f.password) : await register(f);
      if (d.user.role === 'admin') nav('/admin');
      toast(mode === 'login' ? 'Welcome back' : 'Account created');
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  const ring = (bad) => (bad ? '!border-red-400 !ring-red-50' : '');

  return (
    <div className="mx-auto mt-10 max-w-md rounded-[2rem] border border-line bg-white/70 p-8 shadow-card">
      <div className="mb-6 grid grid-cols-2 rounded-full bg-satin/60 p-1">
        {[['login', 'Sign In'], ['register', 'Register']].map(([m, l]) => (
          <button key={m} onClick={() => { setMode(m); setErr(''); setFerrs({}); }}
            className={`rounded-full py-2.5 text-[12px] font-bold uppercase tracking-widest transition ${mode === m ? 'bg-obsidian text-alabaster' : 'text-ash'}`}>{l}</button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label className="label">Full name</label>
              <input className={`input ${ring(ferrs.name)}`} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Ayesha Khan" />
              {ferrs.name && <p className="mt-1 text-[11px] text-red-700">{ferrs.name}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input className={`input ${ring(ferrs.phone || phoneTypingError(f.phone))}`}
                value={f.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
              {ferrs.phone ? <p className="mt-1 text-[11px] text-red-700">{ferrs.phone}</p>
                : phoneOK ? <p className="mt-1 text-[11px] font-semibold text-emerald-700">✓ Valid mobile number</p>
                : phoneTypingError(f.phone) ? <p className="mt-1 text-[11px] font-medium text-red-700">Incorrect number</p> : null}
            </div>
          </>
        )}
        <div>
          <label className="label">Email</label>
          <input className={`input ${ring(ferrs.email || (mode === 'register' && emailTypedWrong))}`}
            type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.com" />
          {ferrs.email ? <p className="mt-1 text-[11px] text-red-700">{ferrs.email}</p>
            : mode === 'register' && emailTypedWrong && <p className="mt-1 text-[11px] font-medium text-red-700">Incorrect email address</p>}
        </div>
        <div>
          <label className="label">Password</label>
          <input className={`input ${ring(ferrs.password)}`} type="password" required minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Minimum 6 characters" />
          {ferrs.password && <p className="mt-1 text-[11px] text-red-700">{ferrs.password}</p>}
        </div>
        {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{err}</p>}
        <button disabled={busy} className="btn-primary w-full"><Lock size={14} /> {busy ? 'One moment…' : mode === 'login' ? 'Sign In' : 'Create Account'}</button>
      </form>
      <p className="mt-4 text-center text-xs leading-relaxed text-ash">Accounts are optional — guest checkout always works.</p>
    </div>
  );
}

export default function Account() {
  const { auth, logout, toast } = useApp();
  const [tab, setTab] = useState('orders');
  const [orders, setOrders] = useState(null);
  const [profile, setProfile] = useState(null);
  const [addr, setAddr] = useState({ name: '', phone: '', address: '', city: '', province: 'Punjab' });

  useEffect(() => {
    if (!auth) return;
    api('/customer/orders', { token: auth.token }).then((d) => setOrders(d.orders)).catch(() => setOrders([]));
    api('/customer/profile', { token: auth.token }).then((d) => {
      setProfile(d.user);
      if (d.user.addresses?.[0]) setAddr({ ...addr, ...d.user.addresses[0] });
    }).catch(() => {});
  }, [auth]); // eslint-disable-line

  if (!auth) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 text-center md:px-8">
        <h1 className="font-display text-4xl">Your account</h1>
        <p className="mt-2 text-sm text-ash">Sign in for order history, saved addresses and faster checkout.</p>
        <AuthCard />
      </div>
    );
  }

  const saveProfile = async () => {
    try {
      await api('/customer/profile', { method: 'PUT', token: auth.token, body: { name: profile.name, phone: profile.phone, addresses: addr.address ? [addr] : [] } });
      toast('Profile saved');
    } catch (ex) { toast(ex.message); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-sagedeep">Account</p>
          <h1 className="mt-1 font-display text-4xl">{auth.user.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ash"><Mail size={13} /> {auth.user.email}</p>
        </div>
        <button onClick={logout} className="btn-outline !px-5 !py-2.5 !text-[11px]"><LogOut size={14} /> Sign out</button>
      </div>

      <div className="mt-8 flex gap-2 border-b border-line">
        {[['orders', 'Orders'], ['profile', 'Profile & Address']].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-3 text-[12px] font-bold uppercase tracking-widest transition ${tab === id ? 'border-b-2 border-obsidian text-obsidian' : 'text-ash hover:text-obsidian'}`}>{l}</button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="mt-6 space-y-4">
          {orders === null ? <div className="skeleton h-24 w-full" /> : orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line py-16 text-center">
              <p className="font-display text-xl">No orders yet</p>
              <Link to="/shop" className="btn-primary mt-6">Start Shopping</Link>
            </div>
          ) : orders.map((o) => (
            <Link key={o._id} to={`/track?orderNumber=${o.orderNumber}&phone=${encodeURIComponent(o.customerInfo.phone)}`}
              className="card group flex flex-wrap items-center gap-4 p-5 transition hover:shadow-card">
              <div className="flex-1">
                <p className="font-mono text-sm tracking-wide">{o.orderNumber}</p>
                <p className="mt-1 text-xs text-ash">{fmtDate(o.createdAt)} · {o.items.length} item{o.items.length > 1 ? 's' : ''}</p>
              </div>
              <span className={`pill ${o.status === 'Delivered' ? 'bg-sage/25 text-sagedeep' : 'bg-satin text-obsidian'}`}>{o.status}</span>
              <p className="text-sm font-semibold">{pkr(o.total)}</p>
              <ChevronRight size={16} className="text-ash transition group-hover:translate-x-0.5 group-hover:text-obsidian" />
            </Link>
          ))}
        </div>
      )}

      {tab === 'profile' && profile && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-ash">Profile</p>
            <div className="space-y-4">
              <div><label className="label">Name</label><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></div>
              <div><label className="label">Phone</label><input className="input" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
              <div><label className="label">Email</label><input className="input bg-satin/30" value={profile.email} disabled /></div>
            </div>
          </div>
          <div className="card p-6">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-ash">Default address</p>
            <div className="space-y-4">
              <div><label className="label">Street address</label><input className="input" value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} placeholder="House, street, area" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label">City</label><input className="input" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} /></div>
                <div><label className="label">Province</label>
                  <select className="input" value={addr.province} onChange={(e) => setAddr({ ...addr, province: e.target.value })}>
                    {['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'Azad Kashmir', 'Islamabad (ICT)'].map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="md:col-span-2"><button onClick={saveProfile} className="btn-primary"><UserIcon size={14} /> Save changes</button></div>
        </div>
      )}
    </div>
  );
}
