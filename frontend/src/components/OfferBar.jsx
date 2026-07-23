import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent } from 'lucide-react';
import { useApp } from '../store/AppContext';

// Top-most strip on every page — admin-controlled offer message (Settings → Sale & offer bar).
// Falls back to the default shipping line when the offer bar is switched off.
export default function OfferBar() {
  const { settings, lang } = useApp();
  const offer = settings?.offerBar;
  const urdu = lang === 'ur';

  if (offer?.enabled) {
    const message = urdu && offer.messageUr ? offer.messageUr : offer.messageEn;
    const cta = urdu && offer.ctaUr ? offer.ctaUr : offer.ctaEn;
    const link = offer.link || '/sale';
    return (
      <div className="flex items-center justify-center gap-3 bg-obsidian px-4 py-2 text-center text-[11px] uppercase tracking-widest text-alabaster/90">
        <BadgePercent size={13} className="shrink-0 text-sage" />
        <span className={urdu ? 'font-urdu normal-case !text-[13px] tracking-normal' : ''}>{message}</span>
        <Link to={link} className={`inline-flex items-center gap-1 border-b border-sage font-semibold text-sage transition hover:gap-1.5 ${urdu ? 'font-urdu flex-row-reverse' : ''}`}>
          {cta} <ArrowRight size={12} className={urdu ? 'rotate-180' : ''} />
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
