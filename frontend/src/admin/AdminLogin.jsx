import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, MotionConfig, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { applyAdminTheme, clearAdminTheme } from '../lib/adminTheme';
import { api } from '../api/client';
import './admin-login.css';

/* ============================================================================
 * ADMIN LOGIN — modern JS motion pass (Framer Motion): spring entrances,
 * stagger orchestration, AnimatePresence step transitions, motion-value 3D
 * tilt, tactile whileTap. Logic (login + 2FA) unchanged. Reduced-motion is
 * honoured globally via MotionConfig reducedMotion="user".
 * ========================================================================== */

const STAFF_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

const EASE = [0.16, 1, 0.3, 1];
const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
};

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
    <MotionConfig reducedMotion="user">
      <div className="al-page">
        {/* ── brand side ── */}
        <motion.aside
          className="al-brand"
          variants={container}
          initial="hidden"
          animate="show"
        >
          <motion.p className="al-mark al-rise-none" variants={item}>HUSHAE</motion.p>
          <div>
            <motion.h1 variants={item}>The quiet room behind the store.</motion.h1>
            <motion.p className="lead" variants={item}>
              Orders, inventory, and the people who keep HUSHAE running — one considered surface.
            </motion.p>
          </div>
          <motion.p className="al-brand-foot" variants={item}>Second Skin, First Choice.</motion.p>
        </motion.aside>

        {/* ── panel side: motion-value tilt ── */}
        <TiltCard
          step2={step2}
          pendingEmail={pendingEmail}
          f={f}
          setF={setF}
          err={err}
          busy={busy}
          code={code}
          codeBusy={codeBusy}
          showPw={showPw}
          setShowPw={setShowPw}
          caps={caps}
          onCaps={onCaps}
          submit={submit}
          submitCode={submitCode}
          onCode={onCode}
          setStep2={setStep2}
          setCode={setCode}
          setErr={setErr}
          emailRef={emailRef}
          otpRef={otpRef}
        />
      </div>
    </MotionConfig>
  );
}

/* Card with spring-smoothed 3D tilt + staggered form + step transitions. */
function TiltCard(props) {
  const {
    step2, pendingEmail, f, setF, err, busy, code, codeBusy, showPw, setShowPw,
    caps, onCaps, submit, submitCode, onCode, setStep2, setCode, setErr, emailRef, otpRef,
  } = props;

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rY = useSpring(useTransform(mx, [0, 1], [-2.4, 2.4]), { stiffness: 180, damping: 22 });
  const rX = useSpring(useTransform(my, [0, 1], [2.4, -2.4]), { stiffness: 180, damping: 22 });

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => { mx.set(0.5); my.set(0.5); };

  return (
    <main className="al-panel" onMouseMove={onMove} onMouseLeave={onLeave} style={{ perspective: 1100 }}>
      <motion.div
        className="al-card"
        style={{ rotateY: rY, rotateX: rX, transformStyle: 'preserve-3d' }}
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24, delay: 0.15 }}
      >
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.p className="al-kicker" variants={item}>{step2 ? 'Verification' : 'Admin console'}</motion.p>
          <motion.h2 className="al-title" variants={item}>{step2 ? 'Check your email' : 'Sign in'}</motion.h2>
          <motion.p className="al-sub" variants={item}>
            {step2
              ? <>A 6-digit code was sent to <b>{pendingEmail}</b>. It expires in 5 minutes.</>
              : 'Authorised staff only. Use the email you were given for this store.'}
          </motion.p>

          <AnimatePresence mode="wait" initial={false}>
            {!step2 ? (
              <motion.form
                key="login"
                onSubmit={submit}
                className="al-form"
                autoComplete="username"
                variants={item}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
              >
                <motion.div variants={item}>
                  <label htmlFor="admin-email" className="al-label">Email</label>
                  <div className="al-input-wrap">
                    <span className="al-ico" aria-hidden><Mail size={15} /></span>
                    <input
                      ref={emailRef}
                      id="admin-email"
                      className="al-input has-ico"
                      type="email"
                      required
                      autoComplete="username"
                      value={f.email}
                      onChange={(e) => setF({ ...f, email: e.target.value })}
                    />
                  </div>
                </motion.div>
                <motion.div variants={item}>
                  <label htmlFor="admin-password" className="al-label">Password</label>
                  <div className="al-input-wrap">
                    <span className="al-ico" aria-hidden><Lock size={15} /></span>
                    <input
                      id="admin-password"
                      className="al-input has-ico"
                      type={showPw ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={f.password}
                      onChange={(e) => setF({ ...f, password: e.target.value })}
                      onKeyUp={onCaps}
                      onKeyDown={onCaps}
                    />
                    <motion.button
                      type="button"
                      className="al-eye"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </motion.button>
                  </div>
                </motion.div>
                <AnimatePresence>
                  {caps && (
                    <motion.p key="caps" className="al-hint" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      Caps Lock is on
                    </motion.p>
                  )}
                  {err && (
                    <motion.p key="err" role="alert" className="al-err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {err}
                    </motion.p>
                  )}
                </AnimatePresence>
                <motion.button
                  type="submit"
                  disabled={busy}
                  className={`al-btn${busy ? ' is-busy' : ''}`}
                  aria-busy={busy}
                  variants={item}
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sign in
                </motion.button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                onSubmit={submitCode}
                className="al-form"
                autoComplete="off"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
              >
                <motion.div variants={item}>
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
                </motion.div>
                <AnimatePresence>
                  {err && (
                    <motion.p key="err2" role="alert" className="al-err" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      {err}
                    </motion.p>
                  )}
                </AnimatePresence>
                <motion.button
                  type="submit"
                  disabled={codeBusy}
                  className={`al-btn${codeBusy ? ' is-busy' : ''}`}
                  aria-busy={codeBusy}
                  whileHover={{ y: -1.5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Verify &amp; sign in
                </motion.button>
                <motion.button
                  type="button"
                  className="al-ghost"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setStep2(false); setCode(''); setErr(''); }}
                >
                  Back to sign in
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.div className="al-meta" variants={item}>
            <span className="al-dot"><i aria-hidden /> Store online</span>
            <span className="al-trust"><ShieldCheck size={12} /> TLS secured</span>
            <Link to="/">View storefront</Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </main>
  );
}
