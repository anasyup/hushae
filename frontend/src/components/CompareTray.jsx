import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Scale, X } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { cxConfig } from '../lib/cxConfig';
import Img from './Img';

/* ============================================================================
 * Compare tray.
 *
 * Without this, adding something to compare does nothing visible and the
 * shopper has no route to the comparison page. The tray is the feedback and
 * the door.
 *
 * Placement follows the rule the cart and PDP bars already established:
 * MobileNav is docked at bottom-0 z-40, so anything at the same offset renders
 * underneath it. This sits at bottom-[53px] z-[41] on mobile and drops to
 * bottom-6 on desktop where no nav exists.
 *
 * Hidden — not unmounted — when empty, so it can slide rather than pop, and
 * `inert` goes with `aria-hidden` because aria-hidden alone leaves the buttons
 * in the tab order.
 * ========================================================================== */
export default function CompareTray() {
  const { compare, removeCompare, clearCompare, settings } = useApp();
  const { pathname } = useLocation();
  const cfg = useMemo(() => cxConfig(settings).compare, [settings]);

  /* Never over the compare page itself, the checkout, or the admin console.
   *
   * MEASURED on live, Phase 2C: a product page also docks StickyBuyBar at
   * bottom-[53px] z-[41]. With two items in the tray both bars claimed the
   * same 66px of screen and the tray — mounted later in App.jsx — painted on
   * top, hiding "Add to bag" completely. A shopper who had compared anything
   * could no longer buy from a scrolled product page on a phone.
   *
   * Buying beats comparing. On a product page the tray yields the dock to the
   * buy bar on mobile; from md: up the buy bar is gone (it is lg:hidden and
   * md:bottom-0) and the tray floats at bottom-6, so there is nothing to
   * yield to and the tray stays.
   */
  const onProduct = pathname.startsWith('/product/');
  const suppressed = pathname === '/compare'
    || pathname.startsWith('/checkout')
    || pathname.startsWith('/admin');

  const hidden = !cfg.enabled || compare.length === 0 || suppressed;

  return (
    <div
      /* Docking offsets. A fixed pixel guess was WRONG once already: the buy
       * bar is 72px at 390px wide but 94px at 320px, because the product name
       * and price wrap onto a second line. bottom-[125px] left a measured 21px
       * overlap at 320px — the narrowest phone, and the one least able to
       * afford a hidden button.
       *
       * So the offset is not hard-coded. StickyBuyBar publishes its own
       * measured height on --buy-bar-h and the tray stacks on top of whatever
       * that turns out to be. Falls back to 72px when the variable is absent
       * (any page without a buy bar), and MobileNav's 53px is added below md
       * where that nav exists.
       *
       * Phase 2C2: the buy bar is no longer lg:hidden — it now docks on
       * desktop as well, so the old `lg:bottom-6` escape hatch would have put
       * the tray straight back on top of it. The calc() runs at every width;
       * --buy-bar-h is removed on unmount, so non-product pages still fall
       * back cleanly.
       *
       * `invisible` when hidden, and it is load-bearing. translate-y-[130%] is
       * 130% of the tray's OWN 66px height = 85.8px, which was enough to clear
       * the old bottom-[53px] but NOT the new bottom-[125px+]: a screenshot
       * caught the empty tray still painted across the buy bar, measured 60px
       * of overlap at 390 and 66px at 1440 with compare empty. My own clash
       * probe missed it because it filtered on pointer-events:none — the tray
       * was untouchable but perfectly visible. visibility:hidden is animatable
       * (it flips at the end of the transition), so the slide is preserved. */
      /* --nav-h used to be hard-coded to 53px here, which was wrong twice
       * over: it ignored the iOS safe-area inset the nav actually carries,
       * and the md: variant had to drop the term entirely to avoid adding a
       * phantom 53px on desktop. MobileNav now publishes its real measured
       * height globally (0px when it is display:none above md), so one
       * expression is correct at every width and the local override is gone.
       *
       * z-[46] keeps the tray above the WhatsApp float (z-45), which docks in
       * the same bottom-right corner. */
      className={`fixed inset-x-0 z-[46] px-3 transition-transform duration-base ease-standard motion-reduce:transition-none md:px-6 ${
        onProduct
          ? 'bottom-[calc(var(--nav-h,0px)+var(--buy-bar-h,72px)+8px)]'
          : 'bottom-[calc(var(--nav-h,0px)+8px)] md:bottom-[calc(var(--nav-h,0px)+1.5rem)]'
      } ${hidden ? 'pointer-events-none invisible translate-y-[130%]' : 'visible translate-y-0'}`}
      aria-hidden={hidden}
      inert={hidden ? '' : undefined}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-panel border border-line bg-alabaster/97 p-2.5 shadow-e-4 backdrop-blur">
        <span className="ml-1 hidden shrink-0 items-center gap-1.5 text-label uppercase tracking-widest text-ash sm:flex">
          <Scale size={13} aria-hidden="true" /> {cfg.title}
        </span>

        {/* Thumbnails double as remove buttons — the whole tile is the target. */}
        <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
          {compare.map((p) => (
            <li key={p.id} className="shrink-0">
              <button
                type="button"
                onClick={() => removeCompare(p.id)}
                aria-label={`Remove ${p.name} from compare`}
                className="group relative block h-11 w-11 overflow-hidden rounded-control border border-line bg-cream"
              >
                <Img src={p.image} alt="" className="h-full w-full object-cover" />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 grid place-items-center bg-obsidian/0 text-transparent transition group-hover:bg-obsidian/55 group-hover:text-alabaster group-focus-visible:bg-obsidian/55 group-focus-visible:text-alabaster"
                >
                  <X size={14} />
                </span>
              </button>
            </li>
          ))}
          {/* Remaining slots, so the limit is visible rather than a surprise. */}
          {Array.from({ length: Math.max(0, (cfg.maxItems || 4) - compare.length) }).map((_, i) => (
            <li key={`slot-${i}`} aria-hidden="true" className="h-11 w-11 shrink-0 rounded-control border border-dashed border-bronze/60" />
          ))}
        </ul>

        <button
          type="button"
          onClick={clearCompare}
          className="hidden min-h-[44px] shrink-0 px-2 text-caption font-semibold text-ash underline-offset-4 transition hover:text-obsidian hover:underline sm:block"
        >
          Clear
        </button>

        <Link
          to="/compare"
          className="btn btn-sm shrink-0 bg-obsidian px-4 text-alabaster"
        >
          Compare<span className="ml-1 tabular-nums">({compare.length})</span>
        </Link>
      </div>
    </div>
  );
}
