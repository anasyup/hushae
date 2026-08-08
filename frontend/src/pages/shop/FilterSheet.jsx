import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import FilterPanel from './FilterPanel';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])';

/* ============================================================================
 * Mobile filter sheet.
 *
 * Rises from the bottom rather than sliding from the side: on a phone the
 * thumb sits at the bottom of the screen, and Apply/Reset need to be within
 * reach without a stretch.
 *
 * The previous drawer was a bare div — no role, no focus trap, Escape did
 * nothing, the page behind kept scrolling, and all 38 controls were under
 * 44px. Every one of those is fixed here.
 * ========================================================================== */
export default function FilterSheet({ open, onClose, onReset, catList, f, resultCount, returnFocusTo }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const nodes = [...(panelRef.current?.querySelectorAll(FOCUSABLE) || [])].filter((n) => n.offsetParent !== null);
      if (!nodes.length) return;
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    // Lock the page without a jump by swapping the scrollbar for padding.
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;

    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => panelRef.current?.querySelector(FOCUSABLE)?.focus(), 80);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
      returnFocusTo?.current?.focus?.();
    };
  }, [open, onClose, returnFocusTo]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 bg-obsidian/40 backdrop-blur-[2px] "
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog" aria-modal="true" aria-label="Filter products"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col rounded-t-panel bg-alabaster shadow-e-4"
          >
            <div className="shrink-0 border-b border-line px-5 pb-3 pt-3">
              <span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-sand" aria-hidden="true" />
              <div className="flex items-center justify-between">
                <p className="font-display text-h4">Filters</p>
                <button type="button" onClick={onClose} aria-label="Close filters" className="btn-icon -mr-2">
                  <X size={19} strokeWidth={1.7} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
              <FilterPanel catList={catList} f={f} touch />
            </div>

            {/* Both actions stay in the thumb zone, above the home indicator. */}
            <div className="shrink-0 border-t border-line bg-alabaster px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
              <div className="flex gap-3">
                <button
                  type="button" onClick={onReset}
                  disabled={f.activeCount === 0}
                  className="btn btn-outline flex-1 disabled:opacity-40"
                >
                  Reset
                </button>
                <button type="button" onClick={onClose} className="btn btn-primary flex-[1.6]">
                  Show {resultCount ?? ''} result{resultCount === 1 ? '' : 's'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
