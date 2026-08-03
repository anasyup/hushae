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
    <div className="container-page">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {badges.slice(0, 4).map((b, i) => {
          const Icon = ICONS[i % ICONS.length];
          return (
            <motion.div key={b.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              /* MEASURED at 320px: this card was the ONLY source of the home
                 page's 4px horizontal overflow (scrollWidth 324 vs body 320),
                 present since Sprint 2J. The deepest offending node was the
                 title span at left=241 w=83 right=324.
                 Cause: p-5 (40px) + a 40px icon + gap-3.5 (14px) = 94px of
                 chrome inside a 2-column grid cell that is only 152px wide at
                 320, leaving 58px for text that will not wrap below 83px.
                 `min-w-0` lets the text column actually shrink (gotcha 16),
                 and the padding/gap tighten below sm only — every breakpoint
                 from 360 up is untouched. */
              /* PHASE 9. Was a bordered `.card` box with a filled circular
                 icon chip — measured as 8 of the 14 pill radii on the home
                 page. Same content, stated as a ruled column: hairline above,
                 icon drawn at line weight, no fill and no enclosure. The
                 min-w-0 and the tightened chrome below sm are UNCHANGED —
                 they are the 320px overflow fix from Sprint 2J. */
              className="flex items-start gap-2.5 border-t border-line pt-4 sm:gap-3.5">
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
