import { Banknote, PackageCheck, RotateCcw, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../store/AppContext';

const ICONS = [PackageCheck, Banknote, RotateCcw, ShieldCheck];

export default function TrustBadges() {
  const { settings } = useApp();
  const badges = settings?.trustBadges?.length ? settings.trustBadges : [
    { title: 'Discreet Packaging', text: 'Plain, unmarked parcels — always.' },
    { title: 'COD Available', text: 'Pay at your doorstep, Pakistan-wide.' },
    { title: 'Easy Exchange', text: '14-day size exchange, no questions.' },
    { title: 'Made in Pakistan', text: 'Crafted locally, finished internationally.' },
  ];
  return (
    <div className="mx-auto max-w-7xl px-4 md:px-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {badges.slice(0, 4).map((b, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <motion.div key={b.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="card flex items-start gap-3.5 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-satin text-obsidian"><Icon size={18} strokeWidth={1.8} /></span>
              <span>
                <span className="block text-[13px] font-semibold tracking-wide">{b.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ash">{b.text}</span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
