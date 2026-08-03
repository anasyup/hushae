import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, MailCheck, ShieldAlert } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { passwordError } from '../../lib/accountConfig';
import PasswordField from './PasswordField';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Security: change password · confirm email · close account.
 *
 * The change-password endpoint already existed on the server but had no UI at
 * all — customers simply could not change their password.
 *
 * Closing an account is a SOFT delete server-side, because a hard delete would
 * orphan the merchant's order records. The copy says so plainly rather than
 * implying everything is erased.
 * ========================================================================== */
export default function SecurityPanel({ cfg, user, onUpdated }) {
  const { auth, logout, toast } = useApp();

  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [verifyErr, setVerifyErr] = useState('');

  const [delOpen, setDelOpen] = useState(false);
  const [delPw, setDelPw] = useState('');
  const [delErr, setDelErr] = useState('');
  const [delBusy, setDelBusy] = useState(false);

  const changePw = async (e) => {
    e.preventDefault();
    setErrs({}); setDone('');
    const e2 = {};
    if (!cur) e2.cur = 'Enter your current password';
    const pe = passwordError(next, cfg);
    if (pe) e2.next = pe;
    else if (next === cur) e2.next = 'Choose a password different from the current one';
    setErrs(e2);
    if (Object.keys(e2).length) return;

    setBusy(true);
    try {
      await api('/auth/change-password', {
        method: 'POST', token: auth.token,
        body: { currentPassword: cur, newPassword: next },
      });
      setCur(''); setNext('');
      setDone('Your password has been changed.');
      toast('Password changed');
    } catch (ex) {
      setErrs({ cur: /current|incorrect|wrong/i.test(ex.message || '') ? ex.message : '', next: /current|incorrect|wrong/i.test(ex.message || '') ? '' : ex.message });
    }
    setBusy(false);
  };

  const resendVerify = async () => {
    setVerifyBusy(true); setVerifyMsg(''); setVerifyErr('');
    try {
      const r = await api('/auth/send-verification', { method: 'POST', token: auth.token });
      setVerifyMsg(r.already ? 'Your email is already confirmed.' : 'Confirmation link sent — please check your inbox.');
    } catch (ex) { setVerifyErr(ex.message || 'Could not send the confirmation email.'); }
    setVerifyBusy(false);
  };

  const closeAccount = async (e) => {
    e.preventDefault();
    setDelErr('');
    if (!delPw) { setDelErr('Enter your password to confirm'); return; }
    setDelBusy(true);
    try {
      const r = await api('/customer/delete-account', { method: 'POST', token: auth.token, body: { password: delPw } });
      toast(r.message || 'Your account has been closed');
      logout();
    } catch (ex) { setDelErr(ex.message || 'Could not close the account'); }
    setDelBusy(false);
  };

  return (
    <div className="space-y-6">
      {/* ---- Email confirmation ---- */}
      {cfg.emailFeatures && !user.emailVerified && (
        <section className="card-content" aria-labelledby="sec-verify">
          <h2 id="sec-verify" className="text-label uppercase tracking-widest text-ash">Email confirmation</h2>
          <p className="mt-3 text-body-sm text-ash">
            Your email address has not been confirmed yet. Confirming it lets us send order updates reliably.
          </p>
          <button type="button" onClick={resendVerify} disabled={verifyBusy} className="btn btn-sm mt-4 gap-2 border border-stone bg-white text-graphite hover:bg-satin/60 disabled:opacity-50">
            {verifyBusy ? <><Spinner label="Sending" /> Sending…</> : <><MailCheck size={14} aria-hidden="true" /> Send confirmation link</>}
          </button>
          {verifyMsg && <p role="status" className="mt-2 flex items-center gap-1.5 text-caption font-medium text-sagedark"><CheckCircle2 size={12} aria-hidden="true" />{verifyMsg}</p>}
          {verifyErr && <p role="alert" className="mt-2 flex items-start gap-1.5 text-caption text-red-700"><AlertCircle size={12} className="mt-0.5" aria-hidden="true" />{verifyErr}</p>}
        </section>
      )}

      {/* ---- Change password ---- */}
      <section className="card-content" aria-labelledby="sec-pw">
        <h2 id="sec-pw" className="text-label uppercase tracking-widest text-ash">Change password</h2>
        <form onSubmit={changePw} className="mt-4 max-w-md space-y-4" noValidate>
          <PasswordField
            label="Current password" value={cur} onChange={(v) => { setCur(v); setErrs({ ...errs, cur: '' }); }}
            error={errs.cur} autoComplete="current-password" required
          />
          <PasswordField
            label="New password" value={next} onChange={(v) => { setNext(v); setErrs({ ...errs, next: '' }); }}
            error={errs.next} autoComplete="new-password" showMeter required
            hint={!errs.next ? `At least ${cfg.passwordMinLength} characters${cfg.passwordRequireLetter ? ', including a letter' : ''}` : ''}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={busy} className="btn-primary gap-2 disabled:opacity-50">
              {busy ? <><Spinner label="Saving" /> Saving…</> : <><KeyRound size={14} aria-hidden="true" /> Change password</>}
            </button>
            {done && <p role="status" className="flex items-center gap-1.5 text-caption font-medium text-sagedark"><CheckCircle2 size={13} aria-hidden="true" />{done}</p>}
          </div>
        </form>
      </section>

      {/* ---- Close account ---- */}
      {cfg.allowDeleteAccount && (
        <section className="rounded-card border border-red-200 bg-red-50/40 p-5 md:p-6" aria-labelledby="sec-del">
          <h2 id="sec-del" className="flex items-center gap-2 text-label uppercase tracking-widest text-red-800">
            <ShieldAlert size={14} aria-hidden="true" /> Close account
          </h2>
          <p className="mt-3 text-body-sm leading-relaxed text-red-900/80">
            Your profile, saved addresses and wishlist will be removed and you will be signed out.
            Orders you have already placed stay with the store as part of its business records.
            This cannot be undone.
          </p>

          {!delOpen ? (
            <button type="button" onClick={() => setDelOpen(true)} className="btn btn-sm mt-4 border border-red-300 bg-white text-red-700 hover:bg-red-50">
              Close my account
            </button>
          ) : (
            <form onSubmit={closeAccount} className="mt-4 max-w-md space-y-3" noValidate>
              <PasswordField
                label="Confirm your password" value={delPw}
                onChange={(v) => { setDelPw(v); setDelErr(''); }}
                error={delErr} autoComplete="current-password" required
              />
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={delBusy} className="btn btn-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
                  {delBusy ? <><Spinner label="Closing" /> Closing…</> : 'Yes, close my account'}
                </button>
                <button type="button" onClick={() => { setDelOpen(false); setDelPw(''); setDelErr(''); }} className="btn btn-sm border border-stone bg-white text-graphite">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
