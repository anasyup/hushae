import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, Gift, Send, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { api } from '../api/client';
import Tx from './Tx';

const KEY = 'hushae.promo';
const SNOOZE_DAYS = 30;

export default function PromoPopup() {
  const { settings, t } = useApp();
  const cfg = settings?.promoPopup;
  const enabled = cfg ? cfg.enabled !== false : true;

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState(null); // null | 'busy' | 'done' | 'err'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const seen = localStorage.getItem(KEY);
    if (seen) {
      const ts = parseInt(seen.split(':')[1] || '0', 10);
      if (Date.now() - ts < SNOOZE_DAYS * 864e5) return undefined;
    }
    const id = setTimeout(() => setOpen(true), Math.max(5, cfg?.delaySec || 18) * 1000);
    return () => clearTimeout(id);
  }, [enabled, cfg?.delaySec]);

  if (!open) return null;

  const close = (mark) => { localStorage.setItem(KEY, `${mark}:${Date.now()}`); setOpen(false); };

  const subscribe = async (e) => {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      await api('/subscribers', { method: 'POST', body: { email } });
      localStorage.setItem(KEY, `done:${Date.now()}`);
      setState('done');
    } catch (ex) {
      if (ex.message === 'already') {
        localStorage.setItem(KEY, `done:${Date.now()}`);
        setState('done'); // already on the list — still reveal the code
      } else setState('err');
    }
  };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(cfg?.couponCode || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
        className="fixed bottom-5 right-5 z-[95] w-[calc(100vw-2.5rem)] max-w-sm rounded-[1.6rem] border border-line bg-alabaster p-6 shadow-card md:bottom-8 md:right-8">
        <button onClick={() => close('dismissed')} aria-label="Close" className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-ash transition hover:bg-satin hover:text-obsidian"><X size={15} /></button>

        {state === 'done' ? (
          <div className="text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-sage/25 text-sagedeep"><Check size={20} /></span>
            <p className="mt-3 font-display text-lg"><Tx k="promoThanks" /></p>
            {cfg?.couponCode ? (
              <>
                <p className="mt-1 text-xs text-ash"><Tx k="promoCodeHint" /></p>
                <button onClick={copyCode} className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-dashed border-obsidian/25 px-5 py-2.5 font-mono text-sm font-bold tracking-wider transition hover:border-obsidian">
                  {cfg.couponCode} {copied ? <Check size={14} className="text-sagedeep" /> : <Copy size={14} />}
                </button>
              </>
            ) : <p className="mt-1 text-xs text-ash"><Tx k="promoThanksSub" /></p>}
            <button onClick={() => setOpen(false)} className="btn-primary mt-4 w-full"><Tx k="promoContinue" /></button>
          </div>
        ) : (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-obsidian text-alabaster"><Gift size={17} /></span>
            <p className="mt-3 font-display text-lg leading-snug">{cfg?.title || 'Join the HUSHAE inner circle'}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-ash">{cfg?.text || 'First access to drops, private sales and member-only offers. No spam — ever.'}</p>
            {cfg?.couponCode && <p className="mt-2 text-[11px] font-semibold text-sagedeep">🎁 {t('promoHasCode')}</p>}
            <form onSubmit={subscribe} className="mt-4 flex gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('newsPlaceholder')} className="input flex-1 !py-2.5 text-sm" />
              <button disabled={state === 'busy'} className="btn-primary shrink-0 !px-4 !py-2.5">{state === 'busy' ? '…' : <Send size={14} />}</button>
            </form>
            {state === 'err' && <p className="mt-2 text-[11px] text-red-700"><Tx k="newsErr" /></p>}
            <button onClick={() => close('dismissed')} className="mt-3 w-full text-center text-[11px] text-ash transition hover:text-obsidian"><Tx k="promoNoThanks" /></button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
