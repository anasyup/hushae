import { useId, useState } from 'react';
import { Plus } from 'lucide-react';

/* Disclosure with the ARIA the old one skipped entirely: aria-expanded on the
 * trigger, aria-controls pointing at a labelled region, and content that stays
 * in the DOM so in-page search can find it. */
/* headingLevel matters: these sit directly under the page h1, so h2 is
 * correct. Hard-coding h3 skips a level and Lighthouse flags heading-order —
 * the same trap caught on product cards in Sprint 2C.2. */
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
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-label font-bold uppercase text-obsidian"
        >
          {title}
          <Plus
            size={15}
            strokeWidth={1.8}
            aria-hidden="true"
            className={`shrink-0 text-ash transition-transform duration-base ease-standard ${open ? 'rotate-45' : ''}`}
          />
        </button>
      </H>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        hidden={!open}
        className="pb-5 text-body-sm leading-relaxed text-ash"
      >
        {children}
      </div>
    </div>
  );
}
