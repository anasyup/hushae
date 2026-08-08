import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';

/* ============================================================================
 * ANNOUNCEMENT BAR — CDLP ultra-thin style.
 * 28px, 11px light text, off-black bg. Rotates 3 quiet messages — no urgency,
 * no exclamation, no discount talk. Each message is a link to its destination.
 * ========================================================================== */

const ROTATE_MS = 4000;

const FALLBACK = [
  { text: 'Free Shipping Over PKR 4,999', href: '/shipping-policy' },
  { text: 'Delivery in 48–72h Nationwide', href: '/faq' },
  { text: 'New Arrivals', href: '/new' },
];

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;
  const [idx, setIdx] = useState(0);

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

  if (offer?.enabled === false) return null;

  const active = messages[Math.min(idx, messages.length - 1)];

  return (
    <div className="flex h-7 items-center justify-center overflow-hidden bg-[#111111] px-3 text-center">
      <Link
        key={`${active.text}-${idx}`}
        to={active.href || '/shop'}
        className="truncate text-[11px] font-light uppercase tracking-[0.18em] text-white/80 transition-opacity duration-300 hover:text-white"
      >
        {active.text}
      </Link>
    </div>
  );
}
