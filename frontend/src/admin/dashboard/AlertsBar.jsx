import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, X } from 'lucide-react';

/* ============================================================================
 * Alerts — a single quiet line-item list. No coloured banner blocks, no bold
 * buttons. Each item: a small muted dot + title (sans) + detail (muted) + a
 * subtle text-link action. Dismissals collapse smoothly (reduced-motion safe).
 * ========================================================================== */

const INK = '#1A1815';
const MUTED = '#6F6A5E';
const HAIRLINE = 'rgba(26,24,21,0.08)';
const DOT = { danger: '#9C5A52', warning: '#A67C52', info: '#5C6C8A' };

const KEY = 'hushae_alerts_dismissed';
const readDismissed = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; }
};

export default function AlertsBar({ alerts }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const reduce = useReducedMotion();

  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(dismissed)); } catch { /* ignore */ }
  }, [dismissed]);

  const visible = useMemo(
    () => (alerts || []).filter((a) => !dismissed.includes(a.id)),
    [alerts, dismissed],
  );

  if (!alerts) return null;

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-2.5 text-[13px]" style={{ color: MUTED }}>
        <Check size={14} strokeWidth={1.5} style={{ color: '#5F6B45' }} aria-hidden="true" />
        All caught up — nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div>
      <AnimatePresence initial={false}>
        {visible.map((a) => (
          <motion.div
            key={a.id}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-baseline gap-4 border-b py-2.5 last:border-0"
            style={{ borderColor: HAIRLINE }}
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DOT[a.severity] || DOT.info }} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <span className="text-[13px]" style={{ color: INK }}>{a.title}</span>
              {a.detail && <span className="ml-2 text-[13px]" style={{ color: MUTED }}>{a.detail}</span>}
            </div>
            <Link to={a.link} className="shrink-0 text-[12px] font-medium underline underline-offset-4 hover:opacity-60" style={{ color: INK }}>
              {a.cta || 'Open'}
            </Link>
            <button
              onClick={() => setDismissed((dd) => [...dd, a.id])}
              className="shrink-0 transition-opacity hover:opacity-60"
              aria-label="Dismiss alert"
              style={{ color: MUTED }}
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
