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

  // Phone verification (SMS/WhatsApp code) — only active once a provider is connected on the server
  const [otpEnabled, setOtpEnabled] = useState(false);
  useEffect(() => { api('/otp/status').then((r) => setOtpEnabled(!!r?.enabled)).catch(() => {}); }, []);
  const blank = { sent: false, demo: false, demoCode: '', via: '', code: '', sending: false, verifying: false, verified: false, phoneToken: '', resendIn: 0, error: '' };
  const [otp, setOtp] = useState(blank);
  const resetOtp = () => setOtp(blank);

  const set = (k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    setFerrs((x) => ({ ...x, [k]: '' }));
    if (k === 'phone') resetOtp(); // number changed → must verify the new one
  };

  useEffect(() => {
    if (otp.resendIn <= 0) return undefined;
    const t = setInterval(() => setOtp((o) => ({ ...o, resendIn: Math.max(0, o.resendIn - 1) })), 1000);
    return () => clearInterval(t);
  }, [otp.resendIn]);

  const phoneOK = normalizePhone(f.phone);
  const emailOK = validEmail(f.email);
  const passAllDigits = f.password.length > 0 && !/[a-zA-Z]/.test(f.password);
  // Only flag email once it looks fully typed (dot after @ + chars after the dot) — no premature errors
  const emailTypedWrong = (() => {
    const em = f.email.trim();
    const at = em.indexOf('@');
    const dot = em.lastIndexOf('.');
    return dot > at && dot < em.length - 2 && !validEmail(em);
  })();

  const sendCode = async () => {
    if (!phoneOK || otp.sending || otp.resendIn > 0) return;
    setOtp((o) => ({ ...o, sending: true, error: '' }));
    try {
      const r = await api('/otp/send', { method: 'POST', body: { phone: phoneOK } });
      setOtp((o) => ({ ...o, sending: false, sent: true, demo: !!r.demo, demoCode: r.demoCode || '', via: r.via || '', code: '', resendIn: 60 }));
    } catch (ex) { setOtp((o) => ({ ...o, sending: false, error: ex.message })); }
  };

  const verifyCode = async () => {
    if (otp.code.length !== 6 || otp.verifying) return;
    setOtp((o) => ({ ...o, verifying: true, error: '' }));
    try {
      const r = await api('/otp/verify', { method: 'POST', body: { phone: phoneOK, code: otp.code } });
      setOtp((o) => ({ ...o, verifying: false, verified: true, phoneToken: r.phoneToken, error: '' }));
    } catch (ex) { setOtp((o) => ({ ...o, verifying: false, error: ex.message })); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (mode === 'register') {
      const fe = {};
      if (f.name.trim().length < 3) fe.name = 'Enter your full name';
      if (!phoneOK) fe.phone = 'Incorrect number';
      if (!emailOK) fe.email = 'Incorrect email address';
      if (f.password.length < 6) fe.password = 'Minimum 6 characters';
      else if (!/[a-zA-Z]/.test(f.password)) fe.password = 'Add at least one letter — not only numbers';
      if (Object.keys(fe).length) { setFerrs(fe); return; }
      if (otpEnabled && !otp.verified) { setFerrs({ phone: 'Tap "Send code" and verify your number first' }); return; }
    }
    setBusy(true);
    try {
      const payload = { ...f, phone: phoneOK, phoneToken: otp.phoneToken };
      const d = mode === 'login' ? await login(f.email, f.password) : await register(payload);
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
          <button key={m} onClick={() => { setMode(m); setErr(''); setFerrs({}); resetOtp(); }}
            className={`rounded-full py-2.5 text-[12px] font-bold uppercase tracking-widest transition ${mode === m ? 'bg-obsidian text-alabaster' : 'text-ash'}`}>{l}</button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <>
            <div>
              <label className="label">Full name</label>
              <input className={`input ${ring(ferrs.name)}`} value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter name" />
              {ferrs.name && <p className="mt-1 text-[11px] text-red-700">{ferrs.name}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <div className="flex gap-2">
                <input className={`input flex-1 ${ring(ferrs.phone || phoneTypingError(f.phone))}`}
                  value={f.phone} inputMode="tel" onChange={(e) => set('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                {otpEnabled && !otp.verified && (
                  <button type="button" onClick={sendCode} disabled={!phoneOK || otp.sending || otp.resendIn > 0}
                    className="btn-outline shrink-0 !px-3 !py-2 text-[11px] font-bold disabled:opacity-40">
                    {otp.sending ? 'Sending…' : otp.resendIn > 0 ? `${otp.resendIn}s` : otp.sent ? 'Resend' : 'Send code'}
                  </button>
                )}
              </div>
              {ferrs.phone ? <p className="mt-1 text-[11px] text-red-700">{ferrs.phone}</p>
                : phoneTypingError(f.phone) ? <p className="mt-1 text-[11px] font-medium text-red-700">Incorrect number</p> : null}

              {/* SMS code entry */}
              {otpEnabled && otp.sent && !otp.verified && (
                <div className="mt-3 rounded-xl border border-line bg-satin/40 p-3">
                  <div className="flex gap-2">
                    <input className="input flex-1 text-center !tracking-[0.4em] font-bold" value={otp.code} inputMode="numeric" maxLength={6}
                      onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))}
                      placeholder="6-digit code" />
                    <button type="button" onClick={verifyCode} disabled={otp.code.length !== 6 || otp.verifying}
                      className="btn-primary shrink-0 !px-4 !py-2 text-[11px] disabled:opacity-40">
                      {otp.verifying ? 'Checking…' : 'Verify'}
                    </button>
                  </div>
                  {otp.demo && otp.demoCode && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200">
                      Demo mode (SMS not connected yet) — your code: <span className="tracking-[0.2em]">{otp.demoCode}</span>
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-ash">
                    {otp.demo ? 'Demo code (SMS not connected yet)' : otp.via === 'whatsapp' ? `Code sent to your WhatsApp (${phoneOK})` : `Code sent by SMS to ${phoneOK}`} · valid for 5 minutes
                  </p>
                </div>
              )}
              {otpEnabled && otp.verified && <p className="mt-1 text-[11px] font-semibold text-emerald-700">✓ Number verified</p>}
              {otp.error && <p className="mt-1 text-[11px] font-medium text-red-700">{otp.error}</p>}
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
          <input className={`input ${ring(ferrs.password || passAllDigits)}`} type="password" required minLength={6} value={f.password} onChange={(e) => set('password', e.target.value)} placeholder="Minimum 6 characters, include a letter" />
          {ferrs.password ? <p className="mt-1 text-[11px] text-red-700">{ferrs.password}</p>
            : passAllDigits && <p className="mt-1 text-[11px] font-medium text-red-700">Add at least one letter — not only numbers</p>}
        </div>
        {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-800">{err}</p>}
        <button disabled={busy || (mode === 'register' && otpEnabled && !otp.verified)} className="btn-primary w-full disabled:opacity-40">
          <Lock size={14} /> {busy ? 'One moment…' : mode === 'login' ? 'Sign In' : (!otpEnabled || otp.verified) ? 'Create Account' : 'Verify number to continue'}
        </button>
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
