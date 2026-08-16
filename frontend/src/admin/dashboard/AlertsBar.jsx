import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';

/* ============================================================================
 * Attention centre — real alerts from GET /api/dashboard/alerts, each with a
 * dot (warning/danger), title + detail, and a REAL action button linking to the
 * feature that resolves it (verification queue, orders, products, reasons).
 * ========================================================================== */

const DOT = { danger: 'var(--px-danger)', warning: 'var(--px-warning)', info: 'var(--px-info)' };

const KEY = 'hushae_alerts_dismissed';
const readDismissed = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); } catch { return []; } };

function emphasis(title) {
  const m = String(title || '').match(/^(\d+)\s+(.+)$/);
  if (!m) return { before: title, strong: '' };
  return { before: m[1], strong: m[2] };
}

export default function AlertsBar({ alerts }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const reduce = useReducedMotion();

  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(dismissed)); } catch { /* ignore */ } }, [dismissed]);

  const visible = useMemo(() => (alerts || []).filter((a) => !dismissed.includes(a.id)), [alerts, dismissed]);

  if (!alerts) return null;

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-[10px] border px-4 py-3 text-[12px]" style={{ background: 'var(--px-bg-card)', borderColor: 'var(--px-border)', color: 'var(--px-muted)' }}>
        <Check size={13} strokeWidth={1.5} style={{ color: 'var(--px-success)' }} aria-hidden="true" />
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
              className="flex items-center gap-3 rounded-[10px] border px-4 py-2.5"
              style={{ background: 'var(--px-bg-card)', borderColor: 'var(--px-border)', boxShadow: 'var(--px-shadow-card)' }}
            >
              <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: DOT[a.severity] || DOT.info }} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="text-[13px]" style={{ color: 'var(--px-secondary)' }}>
                  <span className="font-semibold" style={{ color: 'var(--px-ink)' }}>{e.before}</span>{e.before ? ' ' : ''}{e.strong}
                </span>
                {a.detail && <span className="ml-2 text-[12px]" style={{ color: 'var(--px-muted)' }}>{a.detail}</span>}
              </div>
              <Link to={a.link} className="inline-flex shrink-0 items-center gap-1 rounded-[8px] border px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-[var(--px-bg-hover)]" style={{ borderColor: 'var(--px-border)', color: 'var(--px-accent-soft-text)' }}>
                {a.cta || 'Open'} <ArrowRight size={11} />
              </Link>
              <button onClick={() => setDismissed((dd) => [...dd, a.id])} className="shrink-0 rounded p-1 transition-colors hover:bg-[var(--px-bg-hover)]" aria-label="Dismiss alert" style={{ color: 'var(--px-muted)' }}>
                <X size={13} strokeWidth={1.5} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
