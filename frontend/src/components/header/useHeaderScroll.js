import { useEffect, useRef, useState } from 'react';

/**
 * Scroll state for the header, resolved in one rAF-throttled listener.
 *
 * Returns four booleans rather than a raw scrollY so the header only
 * re-renders when a state actually flips — scrolling the length of the home
 * page fires hundreds of scroll events but changes these values a handful of
 * times.
 *
 *   atTop    within a few pixels of the top — no hairline, no shadow
 *   past     scrolled beyond `revealAfter` — used to solidify a hero overlay
 *   hidden   moving down, far enough in to tuck the bar away
 *   compact  condensed height once the page is genuinely scrolled
 */
export default function useHeaderScroll({
  revealAfter = 60,
  hideAfter = 220,
  enableHide = true,
} = {}) {
  const [state, setState] = useState({ atTop: true, past: false, hidden: false, compact: false });
  const lastY = useRef(0);
  const ticking = useRef(false);
  // Direction has to survive a few jittery pixels or the bar flickers on a
  // trackpad; we only act once the user has committed to ~8px of travel.
  const anchor = useRef(0);
  const dir = useRef('up');

  useEffect(() => {
    const read = () => {
      ticking.current = false;
      const y = Math.max(0, window.scrollY);
      const prev = lastY.current;
      lastY.current = y;

      if (Math.abs(y - anchor.current) > 8) {
        dir.current = y > anchor.current ? 'down' : 'up';
        anchor.current = y;
      }

      setState((s) => {
        const atTop = y <= 4;
        const past = y > revealAfter;
        const compact = y > revealAfter;
        // Never hide while a menu has focus inside it, while the user is at
        // the very top, or on a short page where hiding would look like a bug.
        const canHide = enableHide
          && y > hideAfter
          && document.documentElement.scrollHeight - window.innerHeight > hideAfter * 2;
        const hidden = canHide && dir.current === 'down' && y > prev;

        if (s.atTop === atTop && s.past === past && s.hidden === hidden && s.compact === compact) return s;
        return { atTop, past, hidden, compact };
      });
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(read);
    };

    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [revealAfter, hideAfter, enableHide]);

  /** Force the bar back into view — used when a menu or search panel opens. */
  const reveal = () => setState((s) => (s.hidden ? { ...s, hidden: false } : s));

  return { ...state, reveal };
}
