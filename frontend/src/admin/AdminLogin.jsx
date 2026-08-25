import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2, Shield } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';
import { api } from '../api/client';

/* ============================================================================
 * ADMIN LOGIN — Video Pages Rebuild
 * Focused premium authentication. Split layout desktop, centered mobile.
 * ========================================================================== */

const STAFF_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

export default function AdminLogin() {
  const { auth, setAuth } = useApp();
  useEffect(() => { applyAdminTheme(); return () => clearAdminTheme(); }, []);

  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [step2, setStep2] = useState(false);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [focused, setFocused] = useState('');

  if (auth && STAFF_ROLES.includes(auth.user?.role)) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const d = await api('/auth/login', { method: 'POST', body: { email: f.email, password: f.password, remember } });
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

  const inputCls = (name) =>
    `h-11 w-full rounded-[5px] border bg-white px-4 text-[14px] text-[#111] outline-none transition-all duration-150 placeholder:text-[#9CA3AF] ${
      focused === name ? 'border-[#111] shadow-[0_0_0_1px_#111]' : err ? 'border-[#DC2626]' : 'border-[#E5E7EB] hover:border-[#D1D5DB]'
    }`;

  return (
    <div className="min-h-screen bg-white flex">
      {/* ── LEFT: Brand panel (desktop only) ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between bg-[#FAFBFC] border-r border-[#E5E7EB] p-12 xl:p-16">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[5px] bg-[#111] flex items-center justify-center">
              <span className="text-[12px] font-bold text-white tracking-wider">H</span>
            </div>
            <span className="text-[14px] font-bold tracking-[0.3em] text-[#111] uppercase">Hushae</span>
          </div>
          <div className="mt-16">
            <h1 className="text-[28px] font-bold text-[#111] tracking-tight leading-[1.2]">
              Commerce<br />Operations<br />Console
            </h1>
            <p className="mt-4 text-[14px] text-[#6B7280] leading-relaxed max-w-[320px]">
              Manage orders, products, customers, marketing and finance from one premium workspace.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: 'Orders & Fulfillment', desc: 'Process, track and manage every order' },
            { label: 'Customer 360', desc: 'Complete customer profiles and segments' },
            { label: 'Finance & Analytics', desc: 'Revenue, profit and business intelligence' },
          ].map(item => (
            <div key={item.label} className="flex items-start gap-3 py-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#111] mt-2 flex-shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-[#111]">{item.label}</p>
                <p className="text-[12px] text-[#9CA3AF]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Auth form ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-center justify-center gap-2.5">
              <div className="w-7 h-7 rounded-[4px] bg-[#111] flex items-center justify-center">
                <span className="text-[11px] font-bold text-white tracking-wider">H</span>
              </div>
              <span className="text-[13px] font-bold tracking-[0.3em] text-[#111] uppercase">Hushae</span>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[22px] font-bold text-[#111] tracking-tight">
              {step2 ? 'Verify your identity' : 'Sign in'}
            </h2>
            <p className="mt-1.5 text-[13px] text-[#6B7280]">
              {step2
                ? `We sent a 6-digit code to ${pendingEmail}`
                : 'Enter your credentials to access the admin console.'}
            </p>
          </div>

          {/* Login Form */}
          {!step2 ? (
            <form onSubmit={submit} autoComplete="off" className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">
                  Email address
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="admin@hushae.pk"
                  className={inputCls('email')}
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                />
              </div>

              <div>
                <label htmlFor="admin-password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className={`${inputCls('password')} pr-11`}
                    value={f.password}
                    onChange={(e) => setF({ ...f, password: e.target.value })}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-3.5 h-3.5 rounded-[3px] accent-[#111] border-[#E5E7EB]"
                />
                <span className="text-[12px] text-[#6B7280]">Remember me for 30 days</span>
              </label>

              {err && (
                <div role="alert" className="rounded-[5px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#991B1B] leading-relaxed">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="h-11 w-full rounded-[5px] bg-[#111] text-white text-[13px] font-semibold tracking-wide transition-all duration-150 hover:bg-[#222] active:bg-[#000] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {busy ? (
                  <><Loader2 size={14} className="animate-spin" /> Verifying…</>
                ) : (
                  <>Sign in <ArrowRight size={14} /></>
                )}
              </button>
            </form>
          ) : (
            /* 2FA Form */
            <form onSubmit={submitCode} autoComplete="off" className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">
                  Verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoComplete="off"
                  placeholder="000000"
                  className={`${inputCls('code')} text-center text-[20px] tracking-[0.5em] font-mono`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused('')}
                />
              </div>

              {err && (
                <div role="alert" className="rounded-[5px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#991B1B] leading-relaxed">
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={codeBusy || code.length < 6}
                className="h-11 w-full rounded-[5px] bg-[#111] text-white text-[13px] font-semibold tracking-wide transition-all duration-150 hover:bg-[#222] active:bg-[#000] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {codeBusy ? (
                  <><Loader2 size={14} className="animate-spin" /> Verifying…</>
                ) : (
                  <><Shield size={14} /> Verify & Sign in</>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setStep2(false); setCode(''); setErr(''); }}
                className="w-full text-center text-[12px] font-medium text-[#6B7280] hover:text-[#111] transition-colors"
              >
                ← Back to sign in
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-[#E5E7EB]">
            <p className="text-center text-[10px] font-medium uppercase tracking-[0.15em] text-[#D1D5DB]">
              Authorised staff only
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
