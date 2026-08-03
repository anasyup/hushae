import { useId, useState } from 'react';
import { Plus } from 'lucide-react';

/* Disclosure with the ARIA the old one skipped entirely: aria-expanded on the
 * trigger, aria-controls pointing at a labelled region, and content that stays
 * in the DOM so in-page search can find it. */
/* headingLevel matters: these sit directly under the page h1, so h2 is
 * correct. Hard-coding h3 skips a level and Lighthouse flags heading-order —
 * the same trap caught on product cards in Sprint 2C.2. */

/* ============================================================================
 * PHASE 2C2 — why the markup changed shape.
 *
 * MEASURED: the panel used the `hidden` attribute, which computes to
 * display:none. A display:none box has no height to interpolate, so `height`
 * and `max-height` transitions are both no-ops — every one of the five
 * accordions on a product page snapped open and shut with zero easing, while
 * the size buttons beside them animate at 150ms and the CTAs at 220ms. The
 * page felt half-finished in exactly the place a shopper reads fabric and
 * care detail.
 *
 * The fix is grid-template-rows: 0fr -> 1fr. It is the only pure-CSS way to
 * animate to content height without hard-coding a max-height that either
 * clips long copy or makes short copy lag. The inner wrapper needs
 * overflow:hidden and min-h-0 so the row can actually collapse (gotcha 16 —
 * min-w-0/min-h-0 on grid children).
 *
 * WHAT DID NOT CHANGE, deliberately:
 *   - the content stays in the DOM, so Ctrl+F still finds it
 *   - aria-expanded / aria-controls / role=region / headingLevel are untouched
 *   - `inert` replaces `hidden` for the collapsed state, so the panel is
 *     removed from the tab order and the a11y tree exactly as before. Using
 *     visibility:hidden alone would have left the links inside focusable
 *     (gotcha 35: aria-hidden does not remove focusability).
 * ========================================================================== */
export default function Accordion({ title, children, defaultOpen = false, headingLevel: H = 'h2' }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `${id}-panel`;
  const btnId = `${id}-button`;

  return (
    <div className="border-b border-line">
      <H>
        <button
          id={btnId}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-label font-bold uppercase text-obsidian transition-colors duration-base ease-standard hover:text-ash"
        >
          {title}
          <Plus
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
            className={`shrink-0 text-ash transition-transform duration-base ease-standard motion-reduce:transition-none ${open ? 'rotate-45' : ''}`}
          />
        </button>
      </H>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        /* inert, not hidden: keeps the box in the layout so its height can be
           animated, while still taking the content out of the tab order. */
        inert={!open ? '' : undefined}
        className={`grid transition-[grid-template-rows,opacity] duration-base ease-standard motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-5 text-body-sm leading-relaxed text-ash">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
