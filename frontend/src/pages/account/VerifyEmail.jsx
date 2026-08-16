import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';

/* ============================================================================
 * /verify-email?token=…&email=…
 *
 * Runs once on mount. StrictMode double-invokes effects in development, and
 * the token is single-use, so the second call would report "invalid link" for
 * a link that actually worked — hence the ran-once guard.
 * ========================================================================== */
export default function VerifyEmail() {
  const [sp] = useSearchParams();
  const { patchUser } = useApp();
  const [state, setState] = useState('working');   // working | ok | error
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  const token = sp.get('token') || '';
  const email = sp.get('email') || '';

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token || !email) {
      setState('error');
      setMsg('This confirmation link is incomplete. Please request a new one from your account.');
      return;
    }
    api('/auth/verify-email', { method: 'POST', body: { token, email } })
      .then((d) => {
        setState('ok');
        if (d?.user) patchUser(d.user);
      })
      .catch((ex) => {
        setState('error');
        setMsg(ex.message || 'This confirmation link is not valid.');
      });
  }, [token, email, patchUser]);

  return (
    <div className="container-page py-sect-y md:py-sect-y-lg pt-[130px]">
      <div className="mx-auto max-w-md text-center" role="status" aria-live="polite">
        {state === 'working' && (
          <>
            <span className="spinner-lg mx-auto text-ash" aria-hidden="true" />
            <h1 className="mt-5 font-display text-h3">Confirming your email…</h1>
          </>
        )}

        {state === 'ok' && (
          <>
            <CheckCircle2 size={40} className="mx-auto text-sagedeep" aria-hidden="true" />
            <h1 className="mt-5 font-display text-h2">Email confirmed</h1>
            <p className="mt-3 text-body text-ash">Thank you — your email address is now confirmed.</p>
            <Link to="/account" className="btn-primary mt-8">Go to my account</Link>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle size={40} className="mx-auto text-red-500" aria-hidden="true" />
            <h1 className="mt-5 font-display text-h2">We could not confirm that</h1>
            <p className="mt-3 text-body text-ash">{msg}</p>
            <Link to="/account" className="btn-primary mt-8">Go to my account</Link>
          </>
        )}
      </div>
    </div>
  );
}
