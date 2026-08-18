import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* Announcement bar — BLACK, slim, uppercase tracking-widest, underlined CTA.
 *
 * Merchant request (2026-08): less height + black instead of white.
 * A single compact line — py-1.5 keeps it slim; the CTA stays tappable.
 */
const BAR =
  'w-full border-none bg-black py-1.5 text-center text-[11px] font-medium uppercase leading-none tracking-[0.2em] text-white !m-0';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className={BAR}>
        {offer.messageEn}{' '}
        <Link
          to={offer.link || '/sale'}
          className="ml-1 inline-block cursor-pointer py-1 font-bold text-white underline decoration-1 underline-offset-2 hover:no-underline"
        >
          {offer.ctaEn || 'SHOP'}
        </Link>
      </div>
    );
  }

  return (
    <div className={BAR}>
      Free shipping over PKR 4,999 · Discreet packaging on every order
    </div>
  );
}
