import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* ═══════════════════════════════════════════════════════════════════════════
 * OFFER BAR — Ultra-thin editorial strip. CK Malaysia style.
 * 24px mobile, 28px desktop. Clean typography, no icons.
 * ═════════════════════════════════════════════════════════════════════════ */

const SHELL = 'flex h-6 items-center justify-center bg-[#0E0E0E] px-4 text-center '
  + 'text-[10px] font-light uppercase tracking-[0.14em] text-white/80 sm:h-[28px] sm:text-[11px] sm:tracking-[0.16em]';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    const link = offer.link || '/sale';
    return (
      <div className={SHELL}>
        <span className="truncate">{offer.messageEn}</span>
        <span className="mx-2 text-white/30">·</span>
        <Link to={link} className="shrink-0 font-medium text-white hover:text-white/70 transition-colors">
          {offer.ctaEn || 'Shop'}
        </Link>
      </div>
    );
  }

  return (
    <div className={SHELL}>
      <span className="truncate">Free shipping over PKR 4,999</span>
      <span className="mx-2 text-white/30">·</span>
      <span className="truncate">Discreet packaging on every order</span>
    </div>
  );
}
