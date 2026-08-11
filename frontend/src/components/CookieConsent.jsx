import { useState } from 'react';
import { motion } from 'framer-motion';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import Tx from './Tx';

const KEY = 'hushae.consent';

const setStored = (analytics, marketing) => {
  localStorage.setItem(KEY, JSON.stringify({ essential: true, analytics, marketing, ts: Date.now() }));
  // Notify Analytics.jsx to load/unload tracking scripts based on new consent
  try { window.dispatchEvent(new Event('hushae:consent')); } catch { /* noop */ }
};

/**
 * Cookie consent — slim bottom bar (CK reference: no modals, nothing that
 * covers the page). The wrapper is pointer-events-none so the store stays
 * fully interactive; only the card itself receives clicks. Consent toggles
 * (essential / analytics / marketing) expand in place via Manage.
 */
export default function CookieConsent() {
  const { settings } = useApp();
  const cfg = settings?.cookiePopup;
  const [consented, setConsented] = useState(() => !!localStorage.getItem(KEY));
  const [manage, setManage] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  if (consented || cfg?.enabled === false) return null;

  const done = (a, m) => { setStored(a, m); setConsented(true); };

  const Row = ({ title, text, checked, onChange, locked }) => (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-line/70 px-4 py-3">
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-ash">{text}</p>
      </div>
      {locked ? (
        <span className="mt-0.5 shrink-0 rounded-full bg-sage/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sagedeep"><Tx k="alwaysOn" /></span>
      ) : (
        <button type="button" onClick={() => onChange(!checked)} aria-pressed={checked}
          className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition ${checked ? 'bg-obsidian' : 'bg-line'}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
        </button>
      )}
    </div>
  );

  const btn = 'inline-flex h-9 items-center justify-center rounded-full border px-4 text-[12px] font-medium uppercase tracking-wide transition-colors duration-200';
  const btnDark = `${btn} border-obsidian bg-obsidian text-alabaster hover:bg-sagedeep`;
  const btnLine = `${btn} border-obsidian/30 text-obsidian hover:border-obsidian hover:bg-obsidian hover:text-alabaster`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center px-3 pb-3 sm:px-6 sm:pb-5">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
        className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-line bg-alabaster p-4 shadow-[0_10px_40px_rgba(0,0,0,0.14)] sm:p-5"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-obsidian text-alabaster"><Cookie size={15} /></span>
            <div className="min-w-0">
              <p className="font-display text-[13px] uppercase tracking-widest2">{cfg?.title || 'Cookies on HUSHAE'}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ash">
                {cfg?.text || 'We use cookies to keep you signed in and remember your bag. With your permission, we also use a few cookies to understand traffic and improve the store.'}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-sagedeep"><ShieldCheck size={12} /> <Tx k="cookiePromise" /></p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {manage ? (
              <>
                <button onClick={() => setManage(false)} className={btnLine}><Tx k="back" /></button>
                <button onClick={() => done(analytics, marketing)} className={btnDark}><Tx k="cookieSave" /></button>
              </>
            ) : (
              <>
                <button onClick={() => setManage(true)} className={btnLine}><Tx k="cookieManage" /></button>
                <button onClick={() => done(false, false)} className={btnLine}><Tx k="cookieRefuse" /></button>
                <button onClick={() => done(true, true)} className={btnDark}><Tx k="cookieAccept" /></button>
              </>
            )}
          </div>
        </div>

        {manage && (
          <div className="mt-4 space-y-2.5 border-t border-line pt-4">
            <Row title={<Tx k="cookieEssential" />} text={<Tx k="cookieEssentialTxt" />} locked />
            <Row title={<Tx k="cookieAnalytics" />} text={<Tx k="cookieAnalyticsTxt" />} checked={analytics} onChange={setAnalytics} />
            <Row title={<Tx k="cookieMarketing" />} text={<Tx k="cookieMarketingTxt" />} checked={marketing} onChange={setMarketing} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
