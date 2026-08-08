import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent } from 'lucide-react';
import { useApp } from '../store/AppContext';

/* ============================================================================
 * OFFER BAR — the top-most strip on every page. English only.
 *
 * MEASURED IN PHASE 2F, and it turned out to be the single largest remaining
 * source of layout shift on the whole site.
 *
 * The fallback copy renders immediately; the merchant's offer replaces it once
 * /settings resolves (~285ms). The two strings are different lengths, so the
 * strip CHANGED HEIGHT after first paint and pushed every page down with it:
 *
 *     320px   42px -> 28px   (-14px)   fallback wrapped to two lines
 *     390px   27px -> 28px   (+1px)
 *     768px   33px -> 34px   (+1px)
 *    1440px   33px -> 34px   (+1px)
 *
 * On /search that was 0.019 of the page's 0.0495 CLS, and it applies to every
 * route because this strip sits above everything.
 *
 * THE FIX IS A LOCKED HEIGHT, NOT SHORTER COPY
 * Both states now occupy exactly the same box — h-7 below sm, h-[34px] from sm
 * — with the content centred inside it and clipped rather than wrapped. The
 * height cannot depend on which string won the race, so the strip can never
 * move the page again. Truncation already existed on the offer branch; it is
 * now applied to the fallback too, which is what allowed 320px to wrap.
 * ========================================================================== */

/* One box, both states. Any change here must keep the two branches identical
   in height or the shift comes straight back. */
const SHELL = 'flex h-7 items-center justify-center gap-2 overflow-hidden bg-obsidian px-3 text-center '
  + 'text-[11px] font-light uppercase tracking-widest text-alabaster/85 sm:h-7 sm:gap-3 sm:px-4';

export default function OfferBar() {
  const { settings } = useApp();
  const offer = settings?.offerBar;

  if (offer?.enabled && offer.messageEn) {
    const message = offer.messageEn;
    const cta = offer.ctaEn || 'Shop now';
    const link = offer.link || '/sale';
    return (
      <div className={SHELL}>
        <BadgePercent size={12} className="shrink-0 text-alabaster/60 sm:hidden" aria-hidden="true" />
        <BadgePercent size={13} className="hidden shrink-0 text-alabaster/60 sm:block" aria-hidden="true" />
        <span className="truncate">{message}</span>
        <Link to={link} className="inline-flex shrink-0 items-center gap-1 border-b border-alabaster/50 font-medium text-alabaster transition-[gap] duration-base ease-standard hover:gap-1.5 hover:border-alabaster motion-reduce:transition-none">
          {cta} <ArrowRight size={11} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className={SHELL}>
      {/* truncate, not wrap: at 320px the long fallback took two lines and made
          the strip 42px, so the swap to the real offer LOST 14px. */}
      <span className="truncate sm:hidden">Free shipping over PKR 4,999 · Discreet packaging</span>
      <span className="hidden truncate sm:inline">Free nationwide shipping over PKR 4,999 · Discreet packaging on every order</span>
    </div>
  );
}
