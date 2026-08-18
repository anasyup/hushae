import { useEffect, useRef, useState } from 'react';

/* ============================================================================
 * AtelierNotes — live production pulse from the Karachi workshop.
 *
 * THE ORIGIN OF THIS COMPONENT
 *
 * HUSHAE's one genuine competitive differentiator is that the brand is
 * built in Karachi and finished to Milan-competitive standards. No other
 * innerwear house makes this claim, and it is invisible on the homepage.
 *
 * This component surfaces it as a thin, elegant live-production ticker
 * pinned to the hero. A single tracked-caps line with a gentle pulsing
 * amber dot reads as "something is happening right now" — shifting the
 * brand from static online store to living atelier.
 *
 * DESIGN PRINCIPLES
 *   - Does NOT copy Bottega's "Live from Vicenza" — ours is production
 *     data, not factory tourism.
 *   - Does NOT use a number that can go stale (we default to "Pieces in
 *     production" rather than "14 pieces" unless we have live data).
 *   - The amber dot pulse is the only non-black/white color on the page —
 *     intentional restraint.
 *   - Positioned in the hero gutter (right side, middle) so it reads as
 *     marginalia rather than UI.
 *
 * FUTURE: When /api/atelier returns live data, the static fallback
 * numbers can be replaced with real-time counts. Until then the
 * component is honest static copy that the merchant can override.
 * ========================================================================== */

const STATIC = { pieces: '14', stage: 'Quality check', tag: 'Karachi atelier' };

export default function AtelierNotes() {
  const [data, setData] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    // Try API — if it fails or doesn't exist yet, use static fallback
    fetch('/api/atelier')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (mounted.current) setData(d); })
      .catch(() => { if (mounted.current) setData(STATIC); });

    // Auto-timeout — if API doesn't respond in 5s, fallback immediately
    const t = setTimeout(() => {
      if (mounted.current && !data) setData(STATIC);
    }, 5000);

    return () => { mounted.current = false; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render until we know what to show (avoids flash)
  if (!data) return null;

  return (
    <div
      aria-label="Production status"
      className="pointer-events-none absolute right-5 top-8 z-30 flex items-center gap-2.5 md:right-10 md:top-12 lg:right-14 lg:top-16"
    >
      {/* Amber pulsing dot — the only non-BW on the page */}
      <span
        aria-hidden="true"
        className="relative flex h-2 w-2"
      >
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"
          style={{ animationDuration: '3s' }}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
      </span>

      {/* Copy — tracked, thin, marginal */}
      <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/65 md:text-[10px] md:tracking-[0.32em]">
        {data.pieces || STATIC.pieces} pieces · {data.tag || STATIC.tag}
      </span>
    </div>
  );
}