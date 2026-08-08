import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 space-y-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex items-center gap-2.5 rounded-full bg-obsidian px-5 py-3 text-sm text-alabaster shadow-soft"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-gold/30">
              <Check size={12} strokeWidth={3} />
            </span>
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
