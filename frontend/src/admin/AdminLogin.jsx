import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';
import { api } from '../api/client';
import './admin-login.css';

const STAFF_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

export default function AdminLogin() {
  const { auth, setAuth } = useApp();
  const emailRef = useRef(null);
  const otpRef = useRef(null);

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
  const [showPw, setShowPw] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    if (!step2) emailRef.current?.focus();
    else otpRef.current?.focus();
  }, [step2]);

  if (auth && STAFF_ROLES.includes(auth.user?.role)) return <Navigate to="/admin" replace />;

  const onCaps = (e) => {
    if (typeof e.getModifierState === 'function') setCaps(e.getModifierState('CapsLock'));
  };

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
    e?.preventDefault?.();
    if (codeBusy) return;
    setErr(''); setCodeBusy(true);
    try {
      const d = await api('/auth/2fa/verify', { method: 'POST', body: { email: pendingEmail, code } });
      if (!STAFF_ROLES.includes(d.user?.role)) { setErr('This account does not have staff access.'); setCodeBusy(false); return; }
      setAuth(d);
      nav('/admin', { replace: true });
    } catch (ex) { setErr(ex.message); setCodeBusy(false); }
  };

  const onCode = (v) => {
    const next = v.replace(/\D/g, '').slice(0, 6);
    setCode(next);
    if (next.length === 6) setTimeout(() => submitCode({ preventDefault() {} }), 0);
  };

  return (
    <div className="al-page">
      <aside className="al-brand">
        <p className="al-mark al-rise al-d1">HUSHAE</p>
        <div className="al-rise al-d2">
          <h1>The quiet room behind the store.</h1>
          <p className="lead">Orders, inventory, and the people who keep HUSHAE running — one considered surface.</p>
        </div>
        <p className="al-brand-foot al-rise al-d3">Second Skin, First Choice.</p>
      </aside>

      <main className="al-panel">
        <div className="al-card">
          <p className="al-kicker">{step2 ? 'Verification' : 'Admin console'}</p>
          <h2 className="al-title">{step2 ? 'Check your email' : 'Sign in'}</h2>
          <p className="al-sub">
            {step2
              ? <>A 6-digit code was sent to <b>{pendingEmail}</b>. It expires in 5 minutes.</>
              : 'Authorised staff only. Use the email you were given for this store.'}
          </p>

          {!step2 ? (
            <form onSubmit={submit} className="al-form" autoComplete="username">
              <div>
                <label htmlFor="admin-email" className="al-label">Email</label>
                <input
                  ref={emailRef}
                  id="admin-email"
                  className="al-input"
                  type="email"
                  required
                  autoComplete="username"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="al-label">Password</label>
                <div className="al-input-wrap">
                  <input
                    id="admin-password"
                    className="al-input"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={f.password}
                    onChange={(e) => setF({ ...f, password: e.target.value })}
                    onKeyUp={onCaps}
                    onKeyDown={onCaps}
                  />
                  <button
                    type="button"
                    className="al-eye"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {caps && <p className="al-hint">Caps Lock is on</p>}
              {err && <p role="alert" className="al-err">{err}</p>}
              <button type="submit" disabled={busy} className={`al-btn${busy ? ' is-busy' : ''}`} aria-busy={busy}>
                Sign in
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="al-form" autoComplete="off">
              <div>
                <label htmlFor="admin-otp" className="al-label">6-digit code</label>
                <input
                  ref={otpRef}
                  id="admin-otp"
                  className="al-input otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => onCode(e.target.value)}
                />
              </div>
              {err && <p role="alert" className="al-err">{err}</p>}
              <button type="submit" disabled={codeBusy} className={`al-btn${codeBusy ? ' is-busy' : ''}`} aria-busy={codeBusy}>
                Verify &amp; sign in
              </button>
              <button
                type="button"
                className="al-ghost"
                onClick={() => { setStep2(false); setCode(''); setErr(''); }}
              >
                Back to sign in
              </button>
            </form>
          )}

          <div className="al-meta">
            <span className="al-dot"><i aria-hidden /> Store online</span>
            <Link to="/">View storefront</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
