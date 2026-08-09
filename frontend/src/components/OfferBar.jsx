import { Link } from 'react-router-dom';
import { BadgePercent } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className="flex items-center justify-center gap-3 bg-obsidian px-4 py-2 text-center text-[11px] uppercase tracking-widest text-alabaster/90">
        <BadgePercent size={13} className="shrink-0 text-sage" />
        <span className="truncate">{offer.messageEn}</span>
        <Link to={offer.link || '/sale'} className="inline-flex items-center gap-1 border-b border-sage font-semibold text-sage transition hover:gap-1.5">
          {offer.ctaEn || 'Shop now'}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-obsidian py-2 text-center text-[11px] uppercase tracking-widest text-alabaster/90">
      Free nationwide shipping over PKR 4,999 · Discreet packaging on every order
    </div>
  );
}
