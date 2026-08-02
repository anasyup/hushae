import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Mobile sticky checkout bar.
 *
 * Two rules learned the hard way on the product page and re-applied here:
 *
 *  1. MobileNav is docked at bottom-0 z-40. A bar at the same offset renders
 *     UNDERNEATH it and is invisible. This one sits at bottom-[53px] z-[41],
 *     directly above the nav, so the two stack instead of colliding.
 *
 *  2. Watch the real checkout button, not the whole summary column. An
 *     observer on a tall element fires when its top edge scrolls past, which
 *     on a long bag is thousands of pixels too late.
 *
 * The bar is hidden (not unmounted) so its height never enters layout — it is
 * `fixed`, so it costs no CLS either way, but keeping it mounted means the
 * slide animation has something to animate.
 * ========================================================================== */
export default function StickyCheckoutBar({ watchRef, pricing, cfg, blocked }) {
  const [show, setShow] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    // Show the bar whenever the real CTA is NOT on screen.
    const io = new IntersectionObserver(
      ([e]) => setShow(!e.isIntersecting),
      { rootMargin: '0px 0px -60px 0px', threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  const hidden = !show || pricing.count === 0;

  return (
    <div
      ref={barRef}
      className={`fixed inset-x-0 border-t border-line bg-alabaster/97 backdrop-blur transition-transform duration-base ease-standard motion-reduce:transition-none md:hidden
                  bottom-[calc(53px+env(safe-area-inset-bottom))]
                  ${hidden ? 'pointer-events-none translate-y-full' : 'translate-y-0'}`}
      style={{ zIndex: 'var(--z-stickybar)' }}
      aria-hidden={hidden}
      inert={hidden ? '' : undefined}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1">
          <p className="text-caption uppercase tracking-wider text-ash">
            {pricing.count} {pricing.count === 1 ? 'item' : 'items'}
            {pricing.freeShip && pricing.count > 0 ? ' · free shipping' : ''}
          </p>
          <p className="font-display text-h6 leading-tight tabular-nums">{pkr(pricing.total)}</p>
        </div>
        {blocked ? (
          <span className="btn btn-sm shrink-0 cursor-not-allowed bg-red-50 px-5 text-red-700">Fix items</span>
        ) : (
          <Link to="/checkout" className="btn btn-sm shrink-0 bg-obsidian px-6 text-alabaster">
            {cfg.checkoutLabel.length > 12 ? 'Checkout' : cfg.checkoutLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
