import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className="w-full bg-[#000000] px-4 py-2 text-center text-[11px] font-normal leading-[1.2] tracking-[0.5px] text-[#ffffff]">
        {offer.messageEn}
        <Link to={offer.link || '/sale'} className="ml-[5px] font-medium text-[#ffffff] underline underline-offset-2">
          {offer.ctaEn || 'Shop now'}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#000000] px-4 py-2 text-center text-[11px] font-normal leading-[1.2] tracking-[0.5px] text-[#ffffff]">
      Free shipping over PKR 4,999 · Discreet packaging on every order
    </div>
  );
}
