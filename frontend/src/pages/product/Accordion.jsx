import { useId, useState } from 'react';

/* Disclosure with the ARIA the old one skipped entirely: aria-expanded on the
 * trigger, aria-controls pointing at a labelled region, and content that stays
 * in the DOM so in-page search can find it. Styled to the exact client
 * reference: 13px/500 UPPERCASE header with a +/− glyph, 12px #555 content.
 * ========================================================================== */
export default function Accordion({ title, children, defaultOpen = false, headingLevel: H = 'h2' }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `${id}-panel`;
  const btnId = `${id}-button`;

  return (
    <div className="border-b border-[#e5e5e5]">
      <H>
        <button
          id={btnId}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-4 py-4 text-left text-[13px] font-medium uppercase tracking-[0.02em] text-black transition-colors duration-200 hover:text-[#666666]"
        >
          {title}
          <span
            aria-hidden="true"
            className={`grid h-4 w-4 shrink-0 place-items-center text-[15px] font-normal leading-none text-[#555555] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          >
            {open ? '−' : '+'}
          </span>
        </button>
      </H>
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        /* inert, not hidden: keeps the box in the layout so its height can be
           animated, while still taking the content out of the tab order. */
        inert={!open ? '' : undefined}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pb-4 text-[12px] leading-[1.6] text-[#555555]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
