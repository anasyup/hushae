import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* Announcement bar — exact header reference: black, 11px uppercase
   tracking-widest, white underlined CTA. */
export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className="w-full bg-[#000000] px-4 py-2 text-center text-[11px] font-normal uppercase tracking-widest leading-[1.2] text-[#ffffff] font-klein">
        {offer.messageEn}
        <Link to={offer.link || '/sale'} className="ml-1 font-semibold text-[#ffffff] underline underline-offset-2">
          {offer.ctaEn || 'Shop now'}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#000000] px-4 py-2 text-center text-[11px] font-normal uppercase tracking-widest leading-[1.2] text-[#ffffff] font-klein">
      Free shipping over PKR 4,999 · Discreet packaging on every order
    </div>
  );
}
