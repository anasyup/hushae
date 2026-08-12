import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* Announcement bar — exact header reference: black, 11px uppercase
   tracking-widest, white underlined CTA. */
export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className="w-full border-none bg-black py-2.5 text-center text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-white !m-0 md:text-[11px]">
        {offer.messageEn}{' '}
        <Link to={offer.link || '/sale'} className="ml-1 cursor-pointer font-bold underline">
          {offer.ctaEn || 'SHOP'}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full border-none bg-black py-2.5 text-center text-[10px] font-medium uppercase leading-none tracking-[0.2em] text-white !m-0 md:text-[11px]">
      Free shipping over PKR 4,999 · Discreet packaging on every order
    </div>
  );
}
