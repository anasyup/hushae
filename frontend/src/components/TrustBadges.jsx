import { motion } from 'framer-motion';
import { Package, ShieldCheck, Truck } from 'lucide-react';
import { useMemo } from 'react';
import { useApp } from '../store/AppContext';
import { shippingFromSettings } from '../lib/publicConfig';

const ICONS = {
  Truck, ShieldCheck, Package,
};

/* Approved trust set — hygiene-safe messaging, no exchange promises.
 * Merchant-supplied `settings.trustBadges` is ignored if it contains copy
 * that contradicts the approved policy; only the house set renders so
 * customers never see conflicting return promises on the home page. */
const HOUSE_BADGES = [
  { icon: 'Package',     title: 'Discreet packaging', text: 'Plain, unmarked parcels \u2014 always.' },
  { icon: 'Truck',       title: 'COD nationwide',     text: 'Pay the rider on delivery, Pakistan-wide.' },
  { icon: 'ShieldCheck', title: 'Quality checked',    text: 'Every piece inspected before dispatch.' },
];

export default function TrustBadges() {
  const { settings } = useApp();
  const ship = useMemo(() => shippingFromSettings(settings), [settings]);
  const badges = useMemo(() => HOUSE_BADGES.map((b) => b.icon === 'Truck'
    ? { ...b, text: `${ship.range} delivery \u00b7 COD Pakistan-wide.` }
    : b), [ship]);

  return (
    <div className="container-page">
      <div className="grid grid-cols-3 gap-3 md:grid-cols-3 md:gap-5">
        {badges.map((b, i) => {
          const Icon = ICONS[b.icon] || ShieldCheck;
          return (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-2.5 border-t border-line pt-4 sm:gap-3.5"
            >
              <Icon size={18} strokeWidth={1.25} className="mt-0.5 shrink-0 text-obsidian" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-label-lg font-medium uppercase tracking-[0.16em] text-obsidian">{b.title}</span>
                <span className="mt-1.5 block text-body-sm leading-relaxed text-ash">{b.text}</span>
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
