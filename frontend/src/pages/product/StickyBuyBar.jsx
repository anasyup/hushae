import { useEffect, useRef, useState } from 'react';
import { pkr } from '../../lib/format';

/* ============================================================================
 * Mobile add-to-bag bar.
 *
 * Measured on an iPhone 13: the Add to bag button sat 1263px down a 664px
 * viewport — the shopper had to scroll roughly two screens past the price
 * before they could buy. This docks the action once the real button leaves
 * view, and gets out of the way when it is on screen.
 *
 * It reserves nothing in the layout (fixed, and it fades rather than
 * expanding), so it cannot contribute layout shift.
 * ========================================================================== */
export default function StickyBuyBar({ product, watchRef, size, needsSize, onAdd, disabled }) {
  const [show, setShow] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    const el = watchRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    // Show the bar once the real buy block has scrolled ABOVE the viewport.
    // The earlier test also required boundingClientRect.top < 0, but that reads
    // the rect at observation time — when the block sits below the fold on
    // first paint it is negative-free and the bar stayed hidden even after
    // scrolling past. Comparing against the observed root bounds is stable.
    const io = new IntersectionObserver(
      ([entry]) => {
        const past = entry.boundingClientRect.bottom < (entry.rootBounds?.top ?? 0) + 80;
        setShow(!entry.isIntersecting && past);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [watchRef]);

  /* Publish this bar's real height so anything else docked at the bottom can
     stack on top of it instead of guessing.
     MEASURED: the bar is 72px at 390px wide but 94px at 320px, because the
     product name and price wrap. The compare tray had hard-coded 125px and
     still overlapped by 21px on the narrowest phone — the exact device least
     able to lose a button. A ResizeObserver keeps the number honest through
     rotation, font loading and long product names. */
  useEffect(() => {
    const el = barRef.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const publish = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) root.style.setProperty('--buy-bar-h', `${h}px`);
    };
    publish();
    let ro;
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(publish); ro.observe(el); }
    window.addEventListener('resize', publish);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', publish);
      // Leaving a stale height behind would push the tray up on every other
      // page, so the variable is removed when the product page unmounts.
      root.style.removeProperty('--buy-bar-h');
    };
  }, []);

  const onSale = product.compareAtPrice > product.price;

  return (
    <div
      ref={barRef}
      /* aria-hidden alone is not enough: the button inside stays focusable and
         axe flags aria-hidden-focus. `inert` removes it from the tab order too;
         the attribute is ignored by engines that do not support it, and the
         pointer-events-none class already blocks clicks there. */
      aria-hidden={!show}
      inert={!show ? '' : undefined}
      /* MobileNav is a 53px bar already docked at bottom-0 with z-40. Sitting
         at the same offset hid this one completely — measured. This stacks
         directly above it and takes a higher layer so the shadow reads. */
      className={`fixed inset-x-0 bottom-[53px] z-[41] border-y border-line bg-alabaster/95 shadow-e-3 backdrop-blur-xl transition-transform duration-base ease-standard md:bottom-0 lg:hidden ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-[150%]'
      }`}
      style={{ paddingBottom: '0.75rem' }}
    >
      <div className="flex items-center gap-3 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-caption text-ash">{product.name}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-body font-semibold tabular-nums text-obsidian">{pkr(product.price)}</span>
            {onSale && (
              <span className="text-caption tabular-nums text-ash line-through">{pkr(product.compareAtPrice)}</span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="btn btn-primary min-h-[46px] shrink-0 disabled:opacity-40"
        >
          {disabled ? 'Sold out' : needsSize && !size ? 'Select a size' : 'Add to bag'}
        </button>
      </div>
    </div>
  );
}
