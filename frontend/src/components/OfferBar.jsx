import { Link } from 'react-router-dom';
import { ArrowRight, BadgePercent } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { storefrontConfig } from '../lib/storefrontConfig';

/* ============================================================================
 * OFFER BAR — the top-most strip on every page. English only.
 *
 * Locked height so the fallback → real-content swap can never move the page
 * (CLS fix kept from Phase 2F). Single source of defaults lives in
 * storefrontConfig(). Empty/invalid CTA link is rejected there, so the bar
 * safely degrades to a message-only strip when no campaign is configured.
 *
 * Admin-ready:
 *   · enabled flag respected (defaults to ON with safe house copy)
 *   · messageEn/ctaEn/link come from settings.offerBar
 *   · schedule.start/end shape reserved for a future scheduler (no UI now)
 * ========================================================================== */

const SHELL_BASE =
  'relative flex h-7 items-center justify-center gap-2 overflow-hidden px-3 text-center '
  + 'text-[10px] uppercase tracking-wider sm:h-[34px] sm:gap-3 sm:px-4 sm:text-[11px] sm:tracking-widest '
  + 'select-none pt-[max(0px,env(safe-area-inset-top))]';

export default function OfferBar() {
  const { settings } = useApp();
  const cfg = storefrontConfig(settings);
  const ob = cfg.offerBar;

  // House default: trust line when no campaign (or no message configured).
  if (!ob.enabled || !ob.message) {
    return (
      <div
        data-section="offerbar"
        style={{ zIndex: 'var(--z-offerbar)' }}
        className={`${SHELL_BASE} bg-obsidian text-alabaster/90`}
        role="region"
        aria-label="Announcement"
      >
        <span className="truncate sm:hidden">{ob.message}</span>
        <span className="hidden truncate sm:inline">{ob.messageLong}</span>
      </div>
    );
  }

  return (
    <div
      data-section="offerbar"
      style={{ zIndex: 'var(--z-offerbar)' }}
      className={`${SHELL_BASE} bg-obsidian text-alabaster/90`}
      role="region"
      aria-label="Announcement"
    >
      <BadgePercent size={12} className="shrink-0 text-sage sm:hidden" aria-hidden="true" />
      <BadgePercent size={13} className="hidden shrink-0 text-sage sm:block" aria-hidden="true" />
      <span className="truncate">{ob.message}</span>
      {ob.cta && ob.link && (
        <Link
          to={ob.link}
          className="inline-flex shrink-0 items-center gap-1 border-b border-sage font-semibold text-sage transition-[gap,color] duration-base ease-standard hover:gap-1.5 hover:text-sage/80 motion-reduce:transition-none"
        >
          {ob.cta} <ArrowRight size={11} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
