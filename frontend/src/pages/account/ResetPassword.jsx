import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { accountConfig, passwordError } from '../../lib/accountConfig';
import PasswordField from './PasswordField';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * /reset-password?token=…&email=…
 *
 * Landed on from the reset email. The token is single-use and expires after an
 * hour; the server compares only hashes, in constant time.
 *
 * On success the server returns a fresh session token, so the customer is
 * signed straight in rather than being bounced back to a login form.
 * ========================================================================== */
export default function ResetPassword() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const { settings, setAuth, toast } = useApp();

  const [policy, setPolicy] = useState(null);
  const cfg = useMemo(() => accountConfig(settings, policy), [settings, policy]);

  const token = sp.get('token') || '';
  const email = sp.get('email') || '';

  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [topErr, setTopErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { api('/auth/policy').then(setPolicy).catch(() => setPolicy({})); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setTopErr('');
    const pe = passwordError(pw, cfg);
    if (pe) { setErr(pe); return; }

    setBusy(true);
    try {
      const d = await api('/auth/reset-password', { method: 'POST', body: { token, email, password: pw } });
      if (d?.token) setAuth(d);
      setDone(true);
      toast('Password updated');
      setTimeout(() => nav('/account', { replace: true }), 1400);
    } catch (ex) { setTopErr(ex.message || 'Could not reset your password'); }
    setBusy(false);
  };

  const linkBroken = !token || !email;

  return (
    <div className="container-page py-sect-y md:py-sect-y-lg pt-[190px]">
      <div className="mx-auto w-full max-w-md">
        <h1 className="text-center font-display text-h2">Choose a new password</h1>

        {linkBroken ? (
          <div className="mt-6 rounded-panel border border-line bg-white/70 p-6 text-center">
            <p role="alert" className="text-body-sm text-red-700">
              This reset link is incomplete. Please request a new one from the sign-in page.
            </p>
            <Link to="/account" className="btn-primary mt-6">Back to sign in</Link>
          </div>
        ) : done ? (
          <div role="status" className="mt-6 rounded-panel border border-sage/50 bg-sage/10 p-6 text-center">
            <CheckCircle2 size={28} className="mx-auto text-sagedeep" aria-hidden="true" />
            <p className="mt-3 text-body font-medium text-sagedark">Your password has been changed.</p>
            <p className="mt-1 text-body-sm text-ash">Taking you to your account…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 rounded-panel border border-line bg-white/70 p-6 shadow-e-1 sm:p-8" noValidate>
            <p className="text-body-sm text-ash">Setting a new password for <span className="font-medium text-ink">{email}</span></p>

            {topErr && (
              <p role="alert" className="mt-4 flex items-start gap-2 rounded-control border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-800">
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />{topErr}
              </p>
            )}

            <div className="mt-4">
              <PasswordField
                label="New password" value={pw} onChange={(v) => { setPw(v); setErr(''); }}
                error={err} autoComplete="new-password" showMeter required
                hint={!err ? `At least ${cfg.passwordMinLength} characters${cfg.passwordRequireLetter ? ', including a letter' : ''}` : ''}
              />
            </div>

            <button type="submit" disabled={busy} className="btn-primary mt-5 w-full gap-2 disabled:opacity-50">
              {busy ? <><Spinner label="Saving" /> Saving…</> : <><Lock size={14} aria-hidden="true" /> Set new password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
