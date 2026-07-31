import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import Tx from './Tx';

export default function StoreLock({ children }) {
  const { settings, t } = useApp();
  const loc = useLocation();
  const [pw, setPw] = useState('');
  const [entered, setEntered] = useState(localStorage.getItem('hushae.lockpw') || '');
  const [wrong, setWrong] = useState(false);

  /* MEASURED, Sprint 2M security audit. This component used to compare the
     typed password against settings.storefrontLock.password IN THE BROWSER,
     and that value was served by the PUBLIC /api/settings. The gate was
     therefore decorative: anyone could read the password out of the API and
     walk straight in.

     The password is now redacted server-side, so the client is given only
     `hasPassword` and the comparison happens at POST /api/settings/unlock,
     which is rate limited to 10 attempts per 10 minutes per IP. */
  const lock = settings?.storefrontLock;
  const isAdmin = loc.pathname.startsWith('/admin');
  const [busy, setBusy] = useState(false);

  // No gate: admin pages, feature off, or no password configured.
  if (isAdmin || !lock?.enabled || !lock.hasPassword) return children;
  if (entered === 'ok') return children;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await api('/settings/unlock', { method: 'POST', body: { password: pw } });
      if (r.ok) {
        /* Store a flag, not the password. The old code kept the real password
           in localStorage, which survived long after the gate was lifted. */
        localStorage.setItem('hushae.lockpw', 'ok');
        setEntered('ok');
        setWrong(false);
      } else {
        setWrong(true);
      }
    } catch {
      setWrong(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    /* `children` is NOT rendered behind the overlay any more. It used to be,
       which meant the entire shop was in the DOM and readable with dev tools
       or a screen reader while the gate was still up. */
    <>
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-obsidian px-4 text-alabaster">
        <p className="font-display text-xl tracking-widest2">HUSHAE</p>
        <h1 className="mt-6 text-center font-display text-2xl md:text-3xl">{lock.heading || 'Opening soon'}</h1>
        {!!lock.message && <p className="mt-2 max-w-md text-center text-sm text-alabaster/60">{lock.message}</p>}
        <form onSubmit={submit} className="mt-8 w-full max-w-xs">
          <div className="flex overflow-hidden rounded-full border border-alabaster/20 bg-alabaster/5 focus-within:border-alabaster/50">
            <span className="flex items-center pl-4 text-alabaster/40"><Lock size={14} /></span>
            <input
              type="password" value={pw} autoFocus
              onChange={(e) => { setPw(e.target.value); setWrong(false); }}
              placeholder={t('lockPlaceholder')}
              className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-alabaster/30"
            />
            <button className="flex items-center gap-1.5 bg-alabaster px-5 text-sm font-semibold text-obsidian transition hover:bg-alabaster/90">
              <Tx k="lockEnter" /> <ArrowRight size={14} />
            </button>
          </div>
          {wrong && <p className="mt-3 text-center text-xs text-red-300"><Tx k="lockWrong" /></p>}
        </form>
        <p className="absolute bottom-6 text-[10px] uppercase tracking-widest text-alabaster/30">HUSHAE · Pakistan</p>
      </div>
    </>
  );
}
