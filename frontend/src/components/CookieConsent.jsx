import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, ShieldCheck } from 'lucide-react';
import { useApp } from '../store/AppContext';
import Tx from './Tx';

const KEY = 'hushae.consent';

const setStored = (analytics, marketing) => {
  localStorage.setItem(KEY, JSON.stringify({ essential: true, analytics, marketing, ts: Date.now() }));
  // Notify Analytics.jsx to load/unload tracking scripts based on new consent
  try { window.dispatchEvent(new Event('hushae:consent')); } catch { /* noop */ }
};

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
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-line/70 px-4 py-3">
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

  return (
    <AnimatePresence>
      <div className={`fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3 sm:inset-0 sm:items-center sm:p-4 ${
        manage ? 'bg-obsidian/25 backdrop-blur-[2px]' : 'sm:bg-obsidian/15 sm:backdrop-blur-[2px]'
      }`}>
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35 }}
          className="mb-[calc(env(safe-area-inset-bottom)+72px)] max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-alabaster p-4 shadow-card sm:mb-0 sm:max-h-none sm:rounded-[1.8rem] sm:p-7 md:p-9">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-obsidian text-alabaster sm:h-10 sm:w-10 sm:rounded-xl"><Cookie size={16} /></span>
            <p className="font-display text-[15px] uppercase tracking-widest2 sm:text-lg">{cfg?.title || 'Cookies on HUSHAE'}</p>
          </div>
          {/* Short line on phones, the full explanation once there is room. */}
          <p className="mt-2 text-[12.5px] leading-relaxed text-ash sm:mt-4 sm:hidden">
            We use cookies to remember your bag and improve the store.
          </p>
          <p className="mt-4 hidden text-[13px] leading-relaxed text-ash sm:block">
            {cfg?.text || 'We use cookies to keep you signed in and remember your bag. With your permission, we also use a few cookies to understand traffic and improve the store.'}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-sagedeep sm:mt-3"><ShieldCheck size={13} /> <Tx k="cookiePromise" /></p>

          {manage && (
            <div className="mt-4 space-y-2.5">
              <Row title={<Tx k="cookieEssential" />} text={<Tx k="cookieEssentialTxt" />} locked />
              <Row title={<Tx k="cookieAnalytics" />} text={<Tx k="cookieAnalyticsTxt" />} checked={analytics} onChange={setAnalytics} />
              <Row title={<Tx k="cookieMarketing" />} text={<Tx k="cookieMarketingTxt" />} checked={marketing} onChange={setMarketing} />
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:mt-6 sm:grid-cols-3 [&_button]:min-h-[44px]">
            {manage ? (
              <>
                <button onClick={() => setManage(false)} className="btn-outline order-2 sm:order-1"><Tx k="back" /></button>
                <button onClick={() => done(analytics, marketing)} className="btn-primary order-1 sm:order-2 sm:col-span-2"><Tx k="cookieSave" /></button>
              </>
            ) : (
              <>
                <button onClick={() => setManage(true)} className="btn-outline"><Tx k="cookieManage" /></button>
                <button onClick={() => done(false, false)} className="btn-outline"><Tx k="cookieRefuse" /></button>
                <button onClick={() => done(true, true)} className="btn-primary"><Tx k="cookieAccept" /></button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
