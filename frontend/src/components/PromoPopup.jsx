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
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed bottom-5 right-5 z-[95] w-[calc(100vw-2.5rem)] max-w-sm border border-neutral-200 bg-white p-6 shadow-2xl md:bottom-8 md:right-8"
      >
        <button
          onClick={() => close('dismissed')}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 p-1.5 text-neutral-400 transition hover:text-black"
        >
          <X size={16} strokeWidth={1.5} />
        </button>

        {state === 'done' ? (
          <div className="text-center py-2">
            <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-black">
              <Check size={18} strokeWidth={1.8} />
            </span>
            <p className="mt-3 font-sans text-base font-medium tracking-tight text-black"><Tx k="promoThanks" /></p>
            {cfg?.couponCode ? (
              <>
                <p className="mt-1 text-xs text-neutral-500"><Tx k="promoCodeHint" /></p>
                <button
                  onClick={copyCode}
                  className="mt-3 inline-flex items-center gap-2 border border-black px-5 py-2 font-mono text-xs font-bold uppercase tracking-widest transition hover:bg-black hover:text-white"
                >
                  {cfg.couponCode} {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </>
            ) : <p className="mt-1 text-xs text-neutral-500"><Tx k="promoThanksSub" /></p>}
            <button
              onClick={() => setOpen(false)}
              className="mt-4 inline-flex min-h-[42px] w-full items-center justify-center bg-black text-xs font-medium uppercase tracking-[0.18em] text-white hover:bg-neutral-800 transition-colors"
            >
              <Tx k="promoContinue" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex h-9 w-9 items-center justify-center bg-black text-white">
              <Gift size={16} strokeWidth={1.5} />
            </span>
            <p className="mt-3 font-sans text-[15px] font-medium uppercase tracking-wider text-black leading-snug">
              {cfg?.title || 'Join the HUSHAE Circle'}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
              {cfg?.text || 'First access to drops, private sales and member-only previews. No spam — ever.'}
            </p>
            {cfg?.couponCode && (
              <p className="mt-2 text-[10.5px] font-medium uppercase tracking-wider text-black">
                🎁 {t('promoHasCode')}
              </p>
            )}
            <form onSubmit={subscribe} className="mt-4 flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('newsPlaceholder')}
                className="w-full border-0 border-b border-black/30 bg-transparent px-0 py-2 text-xs text-black placeholder:text-neutral-400 focus:border-black focus:outline-none transition-colors"
              />
              <button
                disabled={state === 'busy'}
                className="shrink-0 border-b border-black pb-1 text-xs font-medium uppercase tracking-widest text-black hover:opacity-60 transition-opacity disabled:opacity-40"
              >
                {state === 'busy' ? '…' : 'Join'}
              </button>
            </form>
            {state === 'err' && <p className="mt-2 text-[11px] text-red-600"><Tx k="newsErr" /></p>}
            <button
              onClick={() => close('dismissed')}
              className="mt-3.5 w-full text-center text-[10.5px] uppercase tracking-wider text-neutral-400 hover:text-black transition-colors"
            >
              <Tx k="promoNoThanks" />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
