import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, LogOut, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { api } from '../../api/client';
import { fmtDateTime } from '../../lib/format';
import Spinner from '../../components/ui/Spinner';

/* ============================================================================
 * Active sessions / devices.
 *
 * These are real server-side records, not a decorative list. Every token
 * carries a `jti` and the API rejects any jti that is no longer stored, so
 * "sign out" here genuinely kills that device's access on its next request.
 *
 * The current device is labelled and cannot be revoked from this list — you
 * sign out with the Sign out button, not by pruning yourself.
 * ========================================================================== */

const ICON = (d = '') => (/iphone|android phone/i.test(d) ? Smartphone : /ipad|tablet/i.test(d) ? Tablet : Monitor);

export default function SessionsPanel() {
  const { auth, toast } = useApp();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api('/customer/sessions', { token: auth.token })
      .then((d) => setList(d.sessions || []))
      .catch((e) => { setErr(e.message || 'Could not load your devices'); setList([]); });
  }, [auth.token]);

  useEffect(load, [load]);

  const revoke = async (jti) => {
    setBusy(jti);
    try {
      await api(`/customer/sessions/${jti}`, { method: 'DELETE', token: auth.token });
      toast('Device signed out');
      load();
    } catch (e) { toast(e.message || 'Could not sign out that device'); }
    setBusy('');
  };

  const revokeOthers = async () => {
    setBusy('all');
    try {
      const r = await api('/customer/sessions/revoke-others', { method: 'POST', token: auth.token });
      toast(r.revoked ? `${r.revoked} device${r.revoked === 1 ? '' : 's'} signed out` : 'No other devices were signed in');
      load();
    } catch (e) { toast(e.message || 'Could not sign out other devices'); }
    setBusy('');
  };

  const others = (list || []).filter((s) => !s.current).length;

  return (
    <section className="card-content" aria-labelledby="sec-sessions">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sec-sessions" className="text-label uppercase tracking-widest text-ash">Signed-in devices</h2>
        {others > 0 && (
          <button
            type="button" onClick={revokeOthers} disabled={busy === 'all'}
            className="btn btn-sm gap-1.5 border border-stone bg-white text-graphite hover:bg-satin/60 disabled:opacity-50"
          >
            {busy === 'all' ? <Spinner label="Signing out" /> : <LogOut size={13} aria-hidden="true" />}
            Sign out other devices
          </button>
        )}
      </div>

      <p className="mt-2 text-caption leading-relaxed text-ash">
        If you see something you do not recognise, sign it out and change your password.
      </p>

      {err && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-caption text-red-700">
          <AlertCircle size={12} className="mt-0.5 shrink-0" aria-hidden="true" />{err}
        </p>
      )}

      {list === null ? (
        <div className="mt-4" role="status" aria-live="polite">
          <span className="sr-only">Loading your devices…</span>
          <div className="skeleton h-16 w-full rounded-card" />
          <div className="skeleton mt-2 h-16 w-full rounded-card" />
        </div>
      ) : list.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-line py-8 text-center text-body-sm text-ash">
          No other devices are signed in.
        </p>
      ) : (
        <ul className="mt-4 space-y-2" aria-live="polite">
          {list.map((s) => {
            const Icon = ICON(s.device);
            return (
              <li
                key={s.jti}
                className={`flex flex-wrap items-center gap-3 rounded-card border p-3.5 ${s.current ? 'border-obsidian/35 bg-obsidian/[0.025]' : 'border-line'}`}
              >
                <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream text-graphite">
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-body-sm font-medium">
                    {s.device}{s.browser ? ` · ${s.browser}` : ''}
                    {s.current && (
                      <span className="rounded-full bg-sage/25 px-2 py-0.5 text-caption font-semibold text-sagedark">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-caption text-ash">
                    Last used {fmtDateTime(s.lastSeen)}{s.ipHint ? ` · ${s.ipHint}` : ''}
                  </p>
                </div>
                {!s.current && (
                  <button
                    type="button" onClick={() => revoke(s.jti)} disabled={busy === s.jti}
                    className="min-h-[44px] shrink-0 rounded-full px-3 text-caption font-semibold text-ash underline-offset-4 transition hover:text-obsidian hover:underline disabled:opacity-40"
                    aria-label={`Sign out ${s.device}${s.browser ? ` ${s.browser}` : ''}`}
                  >
                    {busy === s.jti ? 'Signing out…' : 'Sign out'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
