import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { storefrontConfig } from '../lib/storefrontConfig';
import Tx from './Tx';

const KEY = 'hushae.consent';

const setStored = (analytics, marketing) => {
  localStorage.setItem(KEY, JSON.stringify({
    essential: true, analytics, marketing, ts: Date.now(),
  }));
  try { window.dispatchEvent(new Event('hushae:consent')); } catch { /* noop */ }
};

export default function CookieConsent() {
  const { settings } = useApp();
  const cfg = storefrontConfig(settings).cookie;
  const dialogRef = useRef(null);
  const firstBtnRef = useRef(null);

  const [consented, setConsented] = useState(() => !!localStorage.getItem(KEY));
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  // Lock scroll while the modal-style manage view is open (like a real dialog);
  // the compact "toast" view does not lock scroll — just a bottom banner.
  useEffect(() => {
    if (!consented && manage) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [consented, manage]);

  // Focus the first action whenever the panel mounts.
  useEffect(() => {
    if (!consented) {
      const t = setTimeout(() => firstBtnRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [consented, manage]);

  // Escape closes the dialog (back to the compact view; does NOT accept or
  // refuse — that must remain an explicit choice).
  useEffect(() => {
    if (consented) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      if (manage) setManage(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [consented, manage]);

  if (consented || !cfg.enabled) return null;

  const done = (a, m) => { setStored(a, m); setConsented(true); };

  const Row = ({ id, title, text, checked, onChange, locked }) => (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-line/70 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ash">{text}</p>
      </div>
      {locked ? (
        <span
          className="mt-0.5 shrink-0 rounded-full bg-sage/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sagedeep"
        >
          <Tx k="alwaysOn" />
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          id={id}
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-base ${checked ? 'bg-obsidian' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all duration-base ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      <div
        className={`fixed inset-x-0 bottom-0 flex justify-center px-3 pt-3 sm:inset-0 sm:items-center sm:p-4 ${
          manage ? 'bg-obsidian/40 backdrop-blur-[2px]' : 'sm:bg-obsidian/15 sm:backdrop-blur-[2px]'
        }`}
        style={{ zIndex: 'var(--z-cookie)' }}
        role={manage ? 'dialog' : 'region'}
        aria-label="Cookie consent"
        aria-modal={manage ? 'true' : undefined}
      >
        <motion.div
          ref={dialogRef}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-panel border border-line bg-alabaster p-4 shadow-e-4 motion-reduce:transition-none
            mb-[calc(env(safe-area-inset-bottom)+88px)] sm:max-h-none sm:p-7 md:p-9 sm:mb-0`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-obsidian text-alabaster sm:h-10 sm:w-10 sm:rounded-xl">
              <Cookie size={16} aria-hidden="true" />
            </span>
            <p className="font-display text-[15px] uppercase tracking-widest2 sm:text-lg">{cfg.title}</p>
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ash sm:mt-4 sm:hidden">
            We use cookies to remember your bag and improve the store.
          </p>
          <p className="mt-4 hidden text-[13px] leading-relaxed text-ash sm:block">{cfg.text}</p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-sagedeep sm:mt-3">
            <ShieldCheck size={13} aria-hidden="true" /> <Tx k="cookiePromise" />
          </p>

          {manage && (
            <div className="mt-4 space-y-2.5">
              <Row id="ck-essential" title={<Tx k="cookieEssential" />} text={<Tx k="cookieEssentialTxt" />} locked />
              <Row id="ck-analytics" title={<Tx k="cookieAnalytics" />} text={<Tx k="cookieAnalyticsTxt" />} checked={analytics} onChange={setAnalytics} />
              <Row id="ck-marketing" title={<Tx k="cookieMarketing" />} text={<Tx k="cookieMarketingTxt" />} checked={marketing} onChange={setMarketing} />
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-3 [&_button]:min-h-[44px]">
            {manage ? (
              <>
                <button
                  ref={firstBtnRef}
                  type="button"
                  onClick={() => setManage(false)}
                  className="btn-outline order-2 sm:order-1"
                >
                  <Tx k="back" />
                </button>
                <button
                  type="button"
                  onClick={() => done(analytics, marketing)}
                  className="btn-primary order-1 sm:order-2 sm:col-span-2"
                >
                  <Tx k="cookieSave" />
                </button>
              </>
            ) : (
              <>
                <button
                  ref={firstBtnRef}
                  type="button"
                  onClick={() => setManage(true)}
                  className="btn-outline"
                >
                  <Tx k="cookieManage" />
                </button>
                <button
                  type="button"
                  onClick={() => done(false, false)}
                  className="btn-outline"
                >
                  <Tx k="cookieRefuse" />
                </button>
                <button
                  type="button"
                  onClick={() => done(true, true)}
                  className="btn-primary"
                >
                  <Tx k="cookieAccept" />
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
