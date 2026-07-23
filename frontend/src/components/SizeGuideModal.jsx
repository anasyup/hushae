import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

const MEN = [['S', '28–30', '36–38'], ['M', '32–34', '38–40'], ['L', '36–38', '40–42'], ['XL', '40–42', '42–44'], ['XXL', '44–46', '44–46']];
const WOMEN = [['S', '32–34', '25–27'], ['M', '34–36', '28–30'], ['L', '36–38', '31–33'], ['XL', '38–40', '34–36']];
const BRA = [['32', 'B–C'], ['34', 'B–C'], ['36', 'B–D'], ['38', 'C–D']];

export default function SizeGuideModal({ open, onClose, gender = 'women', isBra = false }) {
  const rows = isBra ? BRA : gender === 'men' ? MEN : WOMEN;
  const heads = isBra ? ['Band', 'Best for cup'] : gender === 'men' ? ['Size', 'Waist (in)', 'Chest (in)'] : ['Size', 'Bust (in)', 'Waist (in)'];
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-obsidian/40 p-4" onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, y: 8 }}
            className="w-full max-w-md rounded-3xl bg-alabaster p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-xl">Size Guide</p>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-1.5 hover:bg-satin/60"><X size={18} /></button>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-line">{heads.map((h) => <th key={h} className="table-head !px-2">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r[0]} className="border-b border-line/60">
                    {r.map((c, i) => <td key={i} className={`table-cell !px-2 ${i === 0 ? 'font-semibold' : 'text-ash'}`}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs leading-relaxed text-ash">
              Between sizes? Take the smaller size for a snug, supportive fit and the larger for a relaxed feel. Our Fit Finder can recommend your size in under a minute.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
