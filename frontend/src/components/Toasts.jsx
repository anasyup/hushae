import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[var(--z-toast)] -translate-x-1/2 space-y-2 px-4
                 bottom-[calc(72px+env(safe-area-inset-bottom))]
                 md:bottom-8"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto flex items-center gap-2.5 rounded-panel bg-obsidian px-5 py-3 text-sm text-alabaster shadow-e-4"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-sage/30" aria-hidden="true">
              <Check size={12} strokeWidth={3} />
            </span>
            <span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
