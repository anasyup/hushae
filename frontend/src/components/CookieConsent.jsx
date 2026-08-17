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
 * Cookie consent — slim full-bleed bottom bar.
 *
 * V2. MEASURED: the previous build was a centered max-w-3xl floating card with
 * a 2xl radius and a 40px shadow. On the PDP it sat directly on top of the
 * product image and the buy box; on / and /shop it covered the hero and the
 * first product row. A consent notice must never occlude the merchandise.
 *
 * It is now a bar docked to the bottom edge: full width, square (tokens say
 * card:0 / control:2px — a pill here was drift), hairline top rule instead of
 * a drop shadow, and it reserves its own space rather than floating over the
 * page. Buttons route through the shared .btn-sm / .btn-outline primitives so
 * they inherit the 44px minimum tap target instead of the local 36px pills.
 *
 * The wrapper stays pointer-events-none so the store remains interactive;
 * only the bar itself receives clicks. Consent toggles (essential / analytics
 * / marketing) still expand in place via Manage.
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
    <div className="flex items-start justify-between gap-4 rounded-control border border-line/70 px-4 py-3">
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

  // Shared primitives — same scale, radius and 44px tap target as the rest of
  // the store. No bespoke button geometry lives in this component.
  const btnDark = 'btn btn-sm bg-obsidian text-alabaster hover:bg-sagedeep';
  const btnLine = 'btn btn-sm btn-outline';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90]" role="region" aria-label="Cookie consent">
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}
        className="pointer-events-auto w-full border-t border-line bg-alabaster px-4 py-4 sm:px-6 sm:py-4"
      >
        <div className="mx-auto flex max-w-shell flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="flex min-w-0 items-start gap-3 sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-obsidian text-alabaster"><Cookie size={15} /></span>
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
          <div className="mx-auto mt-4 max-w-shell space-y-2.5 border-t border-line pt-4">
            <Row title={<Tx k="cookieEssential" />} text={<Tx k="cookieEssentialTxt" />} locked />
            <Row title={<Tx k="cookieAnalytics" />} text={<Tx k="cookieAnalyticsTxt" />} checked={analytics} onChange={setAnalytics} />
            <Row title={<Tx k="cookieMarketing" />} text={<Tx k="cookieMarketingTxt" />} checked={marketing} onChange={setMarketing} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
