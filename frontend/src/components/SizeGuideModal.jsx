import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const MEN = [['S', '28–30', '36–38'], ['M', '32–34', '38–40'], ['L', '36–38', '40–42'], ['XL', '40–42', '42–44'], ['XXL', '44–46', '44–46']];
const WOMEN = [['S', '32–34', '25–27'], ['M', '34–36', '28–30'], ['L', '36–38', '31–33'], ['XL', '38–40', '34–36']];
const BRA = [['32', 'B–C'], ['34', 'B–C'], ['36', 'B–D'], ['38', 'C–D']];

export default function SizeGuideModal({ open, onClose, gender = 'women', isBra = false }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const t = setTimeout(() => {
      closeRef.current?.focus();
      document.body.style.overflow = 'hidden';
    }, 40);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  const rows = isBra ? BRA : gender === 'men' ? MEN : WOMEN;
  const heads = isBra ? ['Band', 'Best for cup'] : gender === 'men' ? ['Size', 'Waist (in)', 'Chest (in)'] : ['Size', 'Bust (in)', 'Waist (in)'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[var(--z-lock)] grid place-items-center bg-obsidian/50 p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Size guide"
        >
          <motion.div
            ref={panelRef}
            initial={{ scale: 0.96, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 8 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="w-full max-w-md rounded-panel bg-alabaster p-6 shadow-soft focus:outline-none"
            onClick={(e) => e.stopPropagation()}
            tabIndex={-1}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">Size Guide</h2>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label="Close size guide"
                className="grid h-10 w-10 place-items-center rounded-full hover:bg-satin/60 focus:outline-none focus:ring-2 focus:ring-obsidian/20"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-line">{heads.map((h) => <th key={h} className="table-head !px-3">{h}</th>)}</tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r[0]} className="border-b border-line/60">
                      {r.map((c, i) => <td key={i} className={`table-cell !px-3 ${i === 0 ? 'font-semibold text-obsidian' : 'text-ash'}`}>{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-ash">
              Between sizes? Size down for a snug, supportive fit or up for a relaxed feel.
              Not sure? Use <a href="/fit-finder" className="underline underline-offset-2 hover:text-obsidian">Fit Finder</a> for a recommendation
              in under a minute.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
