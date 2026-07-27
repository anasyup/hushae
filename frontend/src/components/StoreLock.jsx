import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { useApp } from '../store/AppContext';
import Tx from './Tx';

export default function StoreLock({ children }) {
  const { settings, t } = useApp();
  const loc = useLocation();
  const [pw, setPw] = useState('');
  const [entered, setEntered] = useState(localStorage.getItem('hushae.lockpw') || '');
  const [wrong, setWrong] = useState(false);

  const lock = settings?.storefrontLock;
  const isAdmin = loc.pathname.startsWith('/admin');
  // No gate: admin pages, feature off, or no password set
  if (isAdmin || !lock?.enabled || !lock.password) return children;
  // Already unlocked with the CURRENT password (changing password re-locks everyone)
  if (entered === lock.password) return children;

  const submit = (e) => {
    e.preventDefault();
    if (pw === lock.password) {
      localStorage.setItem('hushae.lockpw', pw);
      setEntered(pw);
      setWrong(false);
    } else {
      setWrong(true);
    }
  };

  return (
    <>
      {children}
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
