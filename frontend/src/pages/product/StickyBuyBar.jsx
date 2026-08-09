import { useEffect, useRef, useState } from 'react';
import { pkr } from '../../lib/format';
import { titleCase } from '../../lib/productMeta';
import { isOnSale } from '../../lib/sale';
import Img from '../../components/Img';

/* ============================================================================
 * Add-to-bag bar.
 *
 * Measured on an iPhone 13: the Add to bag button sat 1263px down a 664px
 * viewport — the shopper had to scroll roughly two screens past the price
 * before they could buy. This docks the action once the real button leaves
 * view, and gets out of the way when it is on screen.
 *
 * PHASE 2C2 — it now runs on desktop too. MEASURED at 1440x900: scrolled to
 * y=2200 (reviews, recommendations, Q&A — the part of the page where a shopper
 * is deciding) there were ZERO fixed elements and Add to cart was off-screen,
 * so the only way to buy was to scroll back up roughly two screens. The bar
 * was `lg:hidden`, which was correct when it was a phone-only patch and wrong
 * once the page grew to 3,325px on desktop.
 *
 * The desktop treatment is deliberately not the phone one stretched wide: it
 * carries the product thumbnail and the chosen size, is right-weighted to the
 * action, and sits on a hairline rather than a shadow — a quiet dock, not a
 * banner.
 *
 * It reserves nothing in the layout (fixed, and it slides rather than
 * expanding), so it cannot contribute layout shift.
 * ========================================================================== */
export default function StickyBuyBar({ product, watchRef, size, needsSize, onAdd, disabled, thumb }) {
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

  /* v2 — sale windows: the strike-through shows only for products the
     merchant explicitly put on sale. */
  const onSale = isOnSale(product);

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
      className={`fixed inset-x-0 bottom-[53px] z-[41] border-y border-clay bg-pearl/95 shadow-e-3 backdrop-blur-xl transition-transform duration-base ease-standard motion-reduce:transition-none md:bottom-0 lg:border-y-0 lg:border-t lg:bg-pearl/95 lg:shadow-none ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-[150%]'
      }`}
      style={{ paddingBottom: '0.75rem' }}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-3 md:px-8 lg:gap-6 xl:max-w-[1360px] xl:px-10 2xl:max-w-[1560px] 2xl:px-14 3xl:max-w-shell 3xl:px-16">
        {/* Desktop earns the thumbnail: at 1440px the bar is 1,280px of empty
            alabaster otherwise, and the shopper may be four screens away from
            the gallery. Hidden below lg where the space genuinely is not
            there. */}
        {thumb && (
          /* MEASURED in Phase 2F: this was a bare <img src>, which bypasses the
             AVIF/WebP pipeline entirely — it pulled the 224.7 KB ORIGINAL
             cat-panties-hero.jpg to paint a 44x55px thumbnail, on every product
             page, at every viewport. It was the only unoptimised image left on
             the whole storefront.
             Worse, it downloaded on MOBILE too: the element is `lg:block`, so
             it is display:none below lg, but `display:none` does not stop an
             <img src> from being fetched — the bytes were spent on phones that
             never showed the thumbnail.
             Img is the project's one image component and already handles
             <picture>, srcset and lazy loading, so this is a reuse rather than
             a new abstraction. `sizes="44px"` states the real slot; loading is
             lazy by default, which is correct for a bar that is off-screen at
             first paint. */
          <span aria-hidden="true" className="hidden shrink-0 lg:block">
            <Img
              src={thumb}
              alt=""
              sizes="44px"
              width="44"
              height="55"
              className="h-14 w-11 rounded-control object-cover"
            />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-smoke lg:text-[13px] lg:text-charcoal">{titleCase(String(product.name).replace(/^HUSHAE\s+/i, ''))}</p>
          <p className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium tabular-nums text-charcoal">{pkr(product.price)}</span>
            {onSale && (
              <span className="text-[11px] tabular-nums text-smoke line-through">{pkr(product.compareAtPrice)}</span>
            )}
            {/* The chosen size, so a shopper deep in the reviews can confirm
                what they are about to buy without scrolling back. */}
            {size && (
              <span className="hidden text-caption uppercase tracking-widest text-ash lg:inline">
                <span className="sr-only">Selected size </span>· {size}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="min-h-[48px] shrink-0 bg-charcoal px-8 text-[12px] font-medium uppercase tracking-[0.08em] text-white transition-colors duration-300 hover:bg-charcoal disabled:pointer-events-none disabled:opacity-50 lg:min-w-[210px]"
        >
          {disabled ? 'Sold out' : needsSize && !size ? 'Select a size' : 'Add to bag'}
        </button>
      </div>
    </div>
  );
}
