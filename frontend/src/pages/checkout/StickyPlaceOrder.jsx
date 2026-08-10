import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Mobile sticky place-order bar.
 *
 * Same two rules the bag's bar had to learn:
 *   1. MobileNav is docked at bottom-0 z-40 — a bar at the same offset renders
 *      underneath it. This sits at bottom-[53px] z-[41].
 *   2. Watch the REAL submit button, not the summary card that contains it.
 *      An observer on a tall card fires hundreds of pixels late.
 *
 * Measured before this existed: the place-order button sat 2172px down a
 * 664px viewport, so a phone customer had to scroll three screens to pay.
 * ========================================================================== */
export default function StickyPlaceOrder({ watchRef, total, label, onClick, busy, disabled }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(
      ([e]) => setShow(!e.isIntersecting),
      { rootMargin: '0px 0px -60px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  const hidden = !show;

  return (
    <div
      className={`fixed inset-x-0 bottom-[53px] z-[41] border-t border-clay bg-pearl/97 backdrop-blur
        transition-transform duration-base ease-standard motion-reduce:transition-none md:hidden
        ${hidden ? 'pointer-events-none translate-y-full' : 'translate-y-0'}`}
      aria-hidden={hidden}
      inert={hidden ? '' : undefined}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-smoke">Total to pay</p>
          <p className="text-[16px] font-medium leading-tight tabular-nums text-charcoal">{pkr(total)}</p>
        </div>
        <button
          type="button"
          onClick={onClick}
          disabled={busy || disabled}
          className="min-h-[44px] shrink-0 bg-gold px-6 text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors duration-300 hover:bg-bronze disabled:pointer-events-none disabled:opacity-50"
        >
          <Lock size={13} aria-hidden="true" />
          {busy ? 'Placing…' : label}
        </button>
      </div>
    </div>
  );
}
