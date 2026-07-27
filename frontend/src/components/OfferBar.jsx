import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent } from 'lucide-react';
import { useApp } from '../store/AppContext';

// Top-most strip on every page — admin-controlled offer message.
// Mobile-optimized: single line, smaller padding, shorter fallback, ellipsis for long text.
export default function OfferBar() {
  const { settings, lang } = useApp();
  const offer = settings?.offerBar;
  const urdu = lang === 'ur';

  if (offer?.enabled) {
    const message = urdu && offer.messageUr ? offer.messageUr : offer.messageEn;
    const cta = urdu && offer.ctaUr ? offer.ctaUr : offer.ctaEn;
    const link = offer.link || '/sale';
    return (
      <div className="flex items-center justify-center gap-2 bg-obsidian px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-alabaster/90 sm:gap-3 sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-widest">
        <BadgePercent size={12} className="shrink-0 text-sage sm:hidden" />
        <BadgePercent size={13} className="hidden shrink-0 text-sage sm:block" />
        <span className={`truncate ${urdu ? 'font-urdu normal-case !text-[12px] tracking-normal sm:!text-[13px]' : ''}`}>{message}</span>
        <Link to={link} className={`inline-flex shrink-0 items-center gap-1 border-b border-sage font-semibold text-sage transition hover:gap-1.5 ${urdu ? 'font-urdu flex-row-reverse' : ''}`}>
          {cta} <ArrowRight size={11} className={urdu ? 'rotate-180' : ''} />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-obsidian px-3 py-1.5 text-center text-[10px] uppercase tracking-wider text-alabaster/90 sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-widest">
      <span className="sm:hidden">Free shipping over PKR 4,999 · Discreet packaging</span>
      <span className="hidden sm:inline">Free nationwide shipping over PKR 4,999 · Discreet packaging on every order</span>
    </div>
  );
}
