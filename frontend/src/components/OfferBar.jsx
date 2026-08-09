import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* ============================================================================
 * ANNOUNCEMENT BAR — Calvin Klein–style single static line.
 * "Free Shipping Over PKR 4,999 | Free Returns"
 * 24px, 10px light text, off-black bg. On the home page (hideOnScroll) the
 * bar tucks away the moment the visitor scrolls.
 * ========================================================================== */

export default function OfferBar({ hideOnScroll = false }) {
  const { settings } = useApp();
  const offer = settings?.offerBar;
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (!hideOnScroll) return undefined;
    const onScroll = () => setGone(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideOnScroll]);

  if (offer?.enabled === false) return null;

  return (
    <div
      className={`flex h-6 items-center justify-center overflow-hidden bg-[#1A1B1C] px-3 text-center transition-transform duration-[400ms] ease-luxury ${
        hideOnScroll && gone ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <Link
        to="/shipping-policy"
        className="truncate text-[10px] font-light uppercase tracking-[0.18em] text-white/80 transition-opacity duration-300 hover:text-white"
      >
        Free Shipping Over PKR 4,999 <span className="mx-2 text-white/40">|</span> Free Returns
      </Link>
    </div>
  );
}
