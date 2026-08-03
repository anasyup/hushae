import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import FilterPanel from './FilterPanel';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, [tabindex]:not([tabindex="-1"])';

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
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-[#0E0E0E]/30"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog" aria-modal="true" aria-label="Filter products"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 flex max-h-[90svh] flex-col bg-white"
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-[#E3E2DF] px-5 py-4">
              <p className="text-[14px] font-light uppercase tracking-[0.14em] text-[#0E0E0E]">
                Filter &amp; Sort
              </p>
              <button type="button" onClick={onClose} aria-label="Close filters"
                className="flex h-8 w-8 items-center justify-center text-[#6E6E6B] hover:text-[#0E0E0E] transition-colors">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable filter content */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
              <FilterPanel catList={catList} f={f} touch />
            </div>

            {/* Bottom */}
            <div className="shrink-0 border-t border-[#E3E2DF] px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 flex items-center gap-3">
              <button type="button" onClick={onReset}
                disabled={f.activeCount === 0}
                className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6E6E6B] hover:text-[#0E0E0E] disabled:opacity-30 transition-colors">
                Clear all
              </button>
              <button type="button" onClick={onClose}
                className="flex-1 inline-flex min-h-[44px] items-center justify-center bg-[#0E0E0E] text-[12px] font-medium uppercase tracking-[0.10em] text-white transition-opacity hover:opacity-80">
                Show {resultCount ?? ''} result{resultCount === 1 ? '' : 's'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
