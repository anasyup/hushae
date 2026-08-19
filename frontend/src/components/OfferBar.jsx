import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* Announcement bar — JET BLACK (#000000) with PURE WHITE text (#FFFFFF) */
const BAR =
  'w-full border-none bg-[#000000] py-2 text-center text-[11px] font-medium uppercase leading-none tracking-[0.22em] text-[#FFFFFF] !m-0';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className={BAR}>
        {offer.messageEn}{' '}
        <Link
          to={offer.link || '/sale'}
          className="ml-1.5 inline-block cursor-pointer py-0.5 font-semibold text-[#FFFFFF] underline decoration-1 underline-offset-2 hover:opacity-80"
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
