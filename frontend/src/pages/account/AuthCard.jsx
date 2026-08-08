import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Lock, Mail } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { normalizePhone, validEmail, phoneTypingError } from '../../lib/validators';
import { passwordError } from '../../lib/accountConfig';
import FloatField from '../checkout/FloatField';
import PasswordField from './PasswordField';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Sign in · Register · Forgot password
 *
 * Rebuilt from a measured baseline of: 0 associated labels, 0 autocomplete
 * attributes, 0 aria-invalid, 0 aria-describedby, 0 aria-live regions, no
 * password toggle, and tabs that were plain buttons with no tablist semantics.
 *
 * The tabs are now a real WCAG tab pattern (roles, aria-selected, arrow keys),
 * every field carries autocomplete so password managers work, and every error
 * is both announced and tied to its input.
 *
 * "Forgot password" is only offered when the SERVER says it can actually send
 * mail (/auth/policy → emailFeatures). Showing it while SMTP is unconfigured
 * would mean telling customers "check your inbox" for an email that was never
 * sent.
 * ========================================================================== */
export default function AuthCard({ cfg, policyLoaded }) {
  const { login, register, toast } = useApp();
  const nav = useNavigate();

  const [mode, setMode] = useState('login');          // login | register | forgot
  const [f, setF] = useState({ name: '', email: '', password: '', phone: '' });
  const [remember, setRemember] = useState(true);
  const [errs, setErrs] = useState({});
  const [topErr, setTopErr] = useState('');
  const [sent, setSent] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const tabRefs = useRef([]);

  /* ---- phone OTP (only when a provider is connected) ---- */
  const [otpEnabled, setOtpEnabled] = useState(false);
  useEffect(() => { api('/otp/status').then((r) => setOtpEnabled(!!r?.enabled)).catch(() => {}); }, []);
  const blankOtp = { sent: false, demo: false, demoCode: '', via: '', code: '', sending: false, verifying: false, verified: false, phoneToken: '', resendIn: 0, error: '' };
  const [otp, setOtp] = useState(blankOtp);

  useEffect(() => {
    if (otp.resendIn <= 0) return undefined;
    const t = setInterval(() => setOtp((o) => ({ ...o, resendIn: Math.max(0, o.resendIn - 1) })), 1000);
    return () => clearInterval(t);
  }, [otp.resendIn]);

  const set = (k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    setErrs((e) => (e[k] ? { ...e, [k]: '' } : e));
    if (k === 'phone') setOtp(blankOtp);
  };

  const phoneOK = normalizePhone(f.phone);
  const isReg = mode === 'register';

  const switchMode = (m) => { setMode(m); setErrs({}); setTopErr(''); setSent(''); setOtp(blankOtp); };

  /* ---- WCAG tab pattern: arrow keys move between tabs ---- */
  const onTabKey = (e, i) => {
    const order = ['login', 'register'];
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % order.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + order.length) % order.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    if (next === null) return;
    e.preventDefault();
    switchMode(order[next]);
    tabRefs.current[next]?.focus();
  };

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

  const focusFirstError = () => requestAnimationFrame(() => {
    const el = formRef.current?.querySelector('[aria-invalid="true"]');
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });

  const submit = async (e) => {
    e.preventDefault();
    setTopErr(''); setSent('');

    /* ---------- forgot ---------- */
    if (mode === 'forgot') {
      if (!validEmail(f.email)) { setErrs({ email: 'Enter the email you signed up with' }); focusFirstError(); return; }
      setBusy(true);
      try {
        const r = await api('/auth/forgot-password', { method: 'POST', body: { email: f.email.trim() } });
        setSent(r.message || 'If that email has an account, a reset link is on its way.');
      } catch (ex) {
        setTopErr(ex.message || 'Could not send the reset link right now.');
      }
      setBusy(false);
      return;
    }

    /* ---------- register validation ---------- */
    if (isReg) {
      const e2 = {};
      if (f.name.trim().length < 3) e2.name = 'Enter your full name';
      if (cfg.phoneRequired && !phoneOK) e2.phone = 'Enter a Pakistani mobile, e.g. 0300 1234567';
      else if (f.phone && !phoneOK) e2.phone = 'Enter a Pakistani mobile, e.g. 0300 1234567';
      if (!validEmail(f.email)) e2.email = 'Enter a valid email address';
      const pe = passwordError(f.password, cfg);
      if (pe) e2.password = pe;
      if (Object.keys(e2).length) { setErrs(e2); focusFirstError(); return; }
      if (otpEnabled && !otp.verified) {
        setErrs({ phone: 'Tap “Send code” and confirm your number first' });
        focusFirstError();
        return;
      }
    } else if (!f.email || !f.password) {
      const e2 = {};
      if (!f.email) e2.email = 'Enter your email';
      if (!f.password) e2.password = 'Enter your password';
      setErrs(e2); focusFirstError(); return;
    }

    setBusy(true);
    try {
      const d = isReg
        ? await register({ ...f, phone: phoneOK || '', phoneToken: otp.phoneToken, remember })
        : await login(f.email, f.password, remember);
      toast(isReg ? 'Account created' : cfg.welcomeGreeting);
      if (d?.user?.role === 'admin') nav('/admin');
    } catch (ex) {
      // The API returns { field, message } for anything it can pin down.
      if (ex?.raw?.field) { setErrs({ [ex.raw.field]: ex.message }); focusFirstError(); }
      else setTopErr(ex.message || 'Could not sign you in. Please try again.');
    }
    setBusy(false);
  };

  /* ---------------- forgot-password view ---------------- */
  if (mode === 'forgot') {
    return (
      <div className="mx-auto mt-8 w-full max-w-md rounded-panel border border-line bg-white/70 p-6 shadow-e-1 sm:p-8">
        <button
          type="button" onClick={() => switchMode('login')}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-body-sm text-ash underline-offset-4 transition hover:text-obsidian hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" /> Back to sign in
        </button>

        <h2 className="mt-2 font-display text-h4">Reset your password</h2>
        <p className="mt-2 text-body-sm text-ash">
          Enter the email you signed up with and we will send you a link to choose a new password.
        </p>

        {sent ? (
          <div role="status" className="mt-6 flex items-start gap-2.5 rounded-control border border-sage/50 bg-sage/10 px-4 py-3.5">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-sagedeep" aria-hidden="true" />
            <p className="text-body-sm text-sagedark">{sent}</p>
          </div>
        ) : (
          <form ref={formRef} onSubmit={submit} className="mt-6 space-y-4" noValidate>
            {topErr && (
              <p role="alert" className="flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800">
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{topErr}
              </p>
            )}
            <FloatField
              label="Email" type="email" autoComplete="email" inputMode="email" required
              value={f.email} onChange={(v) => set('email', v)} error={errs.email}
            />
            <button type="submit" disabled={busy} className="btn-primary w-full gap-2 disabled:opacity-50">
              {busy ? <><Spinner label="Sending" /> Sending…</> : <><Mail size={14} aria-hidden="true" /> Send reset link</>}
            </button>
          </form>
        )}
      </div>
    );
  }

  /* ---------------- sign in / register ---------------- */
  const tabs = [['login', 'Sign in'], ['register', 'Register']];
  const canRegister = cfg.registrationEnabled;

  return (
    <div className="mx-auto mt-8 w-full max-w-md rounded-panel border border-line bg-white/70 p-6 shadow-e-1 sm:p-8">
      {canRegister ? (
        <div role="tablist" aria-label="Sign in or register" className="mb-6 grid grid-cols-2 rounded-full bg-satin/60 p-1">
          {tabs.map(([m, label], i) => (
            <button
              key={m}
              ref={(el) => { tabRefs.current[i] = el; }}
              role="tab"
              id={`tab-${m}`}
              aria-selected={mode === m}
              aria-controls="auth-panel"
              tabIndex={mode === m ? 0 : -1}
              onClick={() => switchMode(m)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={`min-h-[44px] rounded-full text-label uppercase tracking-widest transition-colors duration-fast ${
                mode === m ? 'bg-obsidian text-alabaster' : 'text-ash hover:text-obsidian'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <h2 className="mb-6 font-display text-h4">Sign in</h2>
      )}

      <div id="auth-panel" role={canRegister ? 'tabpanel' : undefined} aria-labelledby={canRegister ? `tab-${mode}` : undefined}>
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
          {topErr && (
            <p role="alert" className="flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{topErr}
            </p>
          )}

          {isReg && (
            <>
              <FloatField
                label="Full name" autoComplete="name" required
                value={f.name} onChange={(v) => set('name', v)} error={errs.name}
              />
              <div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FloatField
                      label="Mobile number" autoComplete="tel" inputMode="tel"
                      required={cfg.phoneRequired}
                      value={f.phone} onChange={(v) => set('phone', v)}
                      error={errs.phone || (!errs.phone && phoneTypingError(f.phone) ? 'That does not look like a Pakistani mobile' : '')}
                      valid={phoneOK && !otpEnabled ? `Valid — ${phoneOK}` : ''}
                    />
                  </div>
                  {otpEnabled && !otp.verified && (
                    <button
                      type="button" onClick={sendCode} disabled={!phoneOK || otp.sending || otp.resendIn > 0}
                      className="btn btn-sm h-14 shrink-0 border border-bronze bg-white px-3 text-graphite disabled:opacity-40"
                    >
                      {otp.sending ? '…' : otp.resendIn > 0 ? `${otp.resendIn}s` : otp.sent ? 'Resend' : 'Send code'}
                    </button>
                  )}
                </div>

                {otpEnabled && otp.sent && !otp.verified && (
                  <div className="mt-3 rounded-control border border-line bg-cream/50 p-3">
                    <div className="flex gap-2">
                      <label className="sr-only" htmlFor="otp-code">6-digit code</label>
                      <input
                        id="otp-code" className="input min-h-[44px] flex-1 text-center font-bold tracking-[0.4em]"
                        value={otp.code} inputMode="numeric" maxLength={6} autoComplete="one-time-code"
                        onChange={(e) => setOtp((o) => ({ ...o, code: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))}
                        placeholder="000000"
                      />
                      <button
                        type="button" onClick={verifyCode} disabled={otp.code.length !== 6 || otp.verifying}
                        className="btn btn-sm shrink-0 bg-obsidian text-alabaster disabled:opacity-40"
                      >
                        {otp.verifying ? '…' : 'Verify'}
                      </button>
                    </div>
                    {otp.demo && otp.demoCode && (
                      <p className="mt-2 rounded-control bg-amber-50 px-3 py-2 text-caption font-bold text-amber-800">
                        Demo mode (SMS not connected) — your code: {otp.demoCode}
                      </p>
                    )}
                  </div>
                )}
                {otpEnabled && otp.verified && (
                  <p role="status" className="mt-1.5 text-caption font-semibold text-sagedark">Number confirmed</p>
                )}
                {otp.error && <p role="alert" className="mt-1.5 text-caption text-red-700">{otp.error}</p>}
              </div>
            </>
          )}

          <FloatField
            label="Email" type="email" autoComplete="email" inputMode="email" required
            value={f.email} onChange={(v) => set('email', v)} error={errs.email}
          />

          <PasswordField
            label="Password"
            value={f.password}
            onChange={(v) => set('password', v)}
            error={errs.password}
            required
            autoComplete={isReg ? 'new-password' : 'current-password'}
            showMeter={isReg}
            hint={isReg && !errs.password ? `At least ${cfg.passwordMinLength} characters${cfg.passwordRequireLetter ? ', including a letter' : ''}` : ''}
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5">
              <input
                type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                className="h-[18px] w-[18px] shrink-0 accent-[#111111]"
              />
              <span className="text-body-sm text-ash">
                Keep me signed in{cfg.rememberMeDays ? ` for ${cfg.rememberMeDays} days` : ''}
              </span>
            </label>

            {/* The slot is always in the layout; only its CONTENTS wait for the
                server. Mounting the link late pushed the footer 55px and cost
                0.0031 CLS — measured. */}
            {!isReg && (
              <span className="flex min-h-[44px] items-center">
                {policyLoaded && cfg.emailFeatures && (
                  <button
                    type="button" onClick={() => switchMode('forgot')}
                    className="text-body-sm text-ash underline-offset-4 transition hover:text-obsidian hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={busy || (isReg && otpEnabled && !otp.verified)}
            className="btn-primary w-full gap-2 disabled:opacity-50"
          >
            {busy ? <><Spinner label="Working" /> One moment…</>
              : <><Lock size={14} aria-hidden="true" /> {isReg ? 'Create account' : 'Sign in'}</>}
          </button>
        </form>
      </div>

      {!cfg.registrationEnabled && (
        <p className="mt-4 rounded-control bg-cream/60 px-4 py-3 text-caption leading-relaxed text-ash">
          New accounts are not being accepted at the moment. You can still check out as a guest.
        </p>
      )}

      <p className="mt-4 text-center text-caption leading-relaxed text-ash">{cfg.guestNote}</p>
    </div>
  );
}
