import { useEffect, useRef, useState } from 'react';
import { Undo2, X } from 'lucide-react';

/* ============================================================================
 * Undo after remove.
 *
 * Sits above BOTH the mobile nav (bottom-0 z-40) and the sticky checkout bar
 * (bottom-[53px] z-[41]) — hence z-[42] and a bottom offset that clears both
 * on mobile, while on desktop it floats bottom-left where nothing else lives.
 *
 * The countdown is a CSS transform on a hairline, not a re-render per second:
 * a ticking state would re-render the whole bag every 1000ms for 5 seconds.
 *
 * role="status" (not alert) — undoing is offered, not urgent, so it must not
 * interrupt what a screen-reader user is currently reading.
 * ========================================================================== */
export default function UndoBar({ pending, seconds = 5, onUndo, onDismiss }) {
  const [mounted, setMounted] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    if (!pending) { setMounted(false); return undefined; }
    raf.current = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf.current);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-[calc(118px+env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 transition-all duration-base ease-entrance motion-reduce:transition-none md:bottom-8 md:left-8 md:translate-x-0 ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{ zIndex: 'var(--z-toast)' }}
    >
      <div className="overflow-hidden rounded-panel bg-obsidian text-alabaster shadow-e-4">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-body-sm">
            Removed <span className="font-medium">{pending.line.name}</span>
          </p>
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-label uppercase tracking-wider text-alabaster underline-offset-4 transition hover:underline"
          >
            <Undo2 size={14} aria-hidden="true" /> Undo
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-alabaster/60 transition hover:bg-white/10 hover:text-alabaster"
            aria-label="Dismiss"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        {/* Countdown hairline — compositor-only, no per-second re-render. */}
        <div
          key={pending.at}
          className="h-0.5 origin-left bg-alabaster/40 motion-reduce:hidden"
          style={{ animation: `undoTick ${seconds}s linear forwards` }}
        />
      </div>
    </div>
  );
}
