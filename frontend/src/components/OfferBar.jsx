import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className="flex items-center justify-center gap-3 bg-[#111111] px-4 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-white/90">
        <span className="truncate">{offer.messageEn}</span>
        <Link to={offer.link || '/sale'} className="inline-flex items-center gap-1 border-b border-white/50 font-medium text-white transition hover:gap-1.5">
          {offer.ctaEn || 'Shop now'}
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] py-2 text-center text-[11px] uppercase tracking-[0.16em] text-white/90">
      Free shipping over PKR 4,999 · Discreet packaging on every order
    </div>
  );
}
