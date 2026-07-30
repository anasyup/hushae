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

  // Never over the compare page itself, the checkout, or the admin console.
  const suppressed = pathname === '/compare'
    || pathname.startsWith('/checkout')
    || pathname.startsWith('/admin');

  const hidden = !cfg.enabled || compare.length === 0 || suppressed;

  return (
    <div
      className={`fixed inset-x-0 bottom-[53px] z-[41] px-3 transition-transform duration-base ease-standard motion-reduce:transition-none md:bottom-6 md:px-6 ${
        hidden ? 'pointer-events-none translate-y-[130%]' : 'translate-y-0'
      }`}
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
            <li key={`slot-${i}`} aria-hidden="true" className="h-11 w-11 shrink-0 rounded-control border border-dashed border-stone/60" />
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
