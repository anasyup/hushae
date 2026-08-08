import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* ============================================================================
 * ANNOUNCEMENT BAR — Quiet Architecture.
 * 24px (--bar-height), 10px light text, off-black bg. Rotates 3 quiet
 * messages — no urgency, no exclamation, no payment methods. Each message
 * links to its destination.
 * On the home page (hideOnScroll) the bar tucks itself away the moment the
 * visitor scrolls — space is the luxury, the bar is not sticky.
 * ========================================================================== */

const ROTATE_MS = 4000;

const FALLBACK = [
  { text: 'Free Shipping Over PKR 4,999', href: '/shipping-policy' },
  { text: 'Delivery in 48–72h Nationwide', href: '/faq' },
  { text: 'New Arrivals', href: '/new' },
];

export default function OfferBar({ hideOnScroll = false }) {
  const { settings } = useApp();
  const offer = settings?.offerBar;
  const [idx, setIdx] = useState(0);
  const [gone, setGone] = useState(false);

  /* Custom rotating messages can be set via settings.offerBar.rotate, each
     { text, href }. Falls back to the three quiet promises above. */
  const messages = Array.isArray(offer?.rotate) && offer.rotate.length
    ? offer.rotate.map((m) => ({ text: m.text || '', href: m.href || '/shop' }))
    : FALLBACK;

  useEffect(() => {
    if (!offer?.enabled || messages.length < 2) return undefined;
    const t = setInterval(() => setIdx((i) => (i + 1) % messages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [offer?.enabled, messages.length]);

  useEffect(() => {
    if (!hideOnScroll) return undefined;
    const onScroll = () => setGone(window.scrollY > 48);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideOnScroll]);

  if (offer?.enabled === false) return null;

  const active = messages[Math.min(idx, messages.length - 1)];

  return (
    <div
      className={`flex h-6 items-center justify-center overflow-hidden bg-[#111111] px-3 text-center transition-transform duration-[400ms] ease-luxury ${
        hideOnScroll && gone ? '-translate-y-full' : 'translate-y-0'
      }`}
    >
      <Link
        key={`${active.text}-${idx}`}
        to={active.href || '/shop'}
        className="truncate text-[10px] font-light uppercase tracking-[0.18em] text-white/80 transition-opacity duration-300 hover:text-white"
      >
        {active.text}
      </Link>
    </div>
  );
}
