import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';

/* ============================================================================
 * Alerts — a single quiet style: rgba(255,255,255,0.02) bg + border-subtle,
 * small status dot, secondary text with the key figure in 600 weight, and a
 * right-aligned accent-soft-text action link (no button chrome).
 * ========================================================================== */

const DOT = { danger: '#F87171', warning: '#F0B429', info: '#8A8A93' };

const KEY = 'hushae_alerts_dismissed';
const readDismissed = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; }
};

/* "12 orders pending…" → the number is emphasized, the rest stays secondary. */
function emphasis(title) {
  const m = String(title || '').match(/^(\d+)\s+(.+)$/);
  if (!m) return { before: title, strong: '', after: '' };
  return { before: m[1], strong: m[2] };
}

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
      <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--fs-text-muted)' }}>
        <Check size={13} strokeWidth={1.5} style={{ color: 'var(--fs-success)' }} aria-hidden="true" />
        All caught up — nothing needs your attention right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {visible.map((a) => {
          const e = emphasis(a.title);
          return (
            <motion.div
              key={a.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, overflow: 'hidden', marginBottom: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 rounded-[10px] border px-4 py-[11px]"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--fs-border-subtle)' }}
            >
              <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: DOT[a.severity] || DOT.info }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="text-[12px]" style={{ color: 'var(--fs-text-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--fs-text-primary)' }}>{e.before}</span>{e.before ? ' ' : ''}{e.strong}
                </span>
                {a.detail && <span className="ml-2 text-[12px]" style={{ color: 'var(--fs-text-muted)' }}>{a.detail}</span>}
              </div>
              <Link to={a.link} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold transition-opacity hover:opacity-70" style={{ color: 'var(--fs-accent-soft-text)' }}>
                {a.cta || 'Open'} <ArrowRight size={11} />
              </Link>
              <button
                onClick={() => setDismissed((dd) => [...dd, a.id])}
                className="shrink-0 transition-opacity hover:opacity-60"
                aria-label="Dismiss alert"
                style={{ color: 'var(--fs-text-muted)' }}
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
