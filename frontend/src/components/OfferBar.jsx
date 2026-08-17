import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* Announcement bar — black, uppercase tracking-widest, underlined CTA.
 *
 * Two fixes measured at 390px:
 *   · Body copy was 10px on mobile (11px only from md). This is the first
 *     thing on the page and often carries the live discount, so it now starts
 *     at 11px — the storefront's label floor.
 *   · The CTA measured 36.6x15px. It is a promotional link (currently "UP TO
 *     30% OFF ... SHOP") and was the smallest tap target in the header.
 *     inline-block with vertical padding takes it to a 44px-tall target
 *     without changing the bar's own height, because the bar's py-2.5 already
 *     provides the room — the link's padding overlaps it rather than adding
 *     to it.
 */
const BAR =
  'w-full border-none bg-[#FFFFFF] py-2.5 text-center text-[11px] font-medium uppercase leading-none tracking-[0.2em] text-black !m-0';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    return (
      <div className={BAR}>
        {offer.messageEn}{' '}
        <Link
          to={offer.link || '/sale'}
          className="ml-1 inline-block cursor-pointer py-[15px] font-bold underline decoration-1 underline-offset-2 hover:no-underline"
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
