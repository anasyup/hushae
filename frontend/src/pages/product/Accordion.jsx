import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/* Disclosure with the ARIA the old one skipped entirely: aria-expanded on the
 * trigger, aria-controls pointing at a labelled region, and content that stays
 * in the DOM so in-page search can find it. Atelier-register styling:
 * 12px uppercase tracking-wider font-semibold header with a rotating
 * ChevronDown, border-b rows, 12px neutral body. Only one row open at a time.
 * ========================================================================== */
export default function AccordionGroup({ items, headingLevel: H = 'h2' }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="border-t border-neutral-200">
      {items.map((item, index) => {
        const id = useId();
        const panelId = `${id}-panel`;
        const btnId = `${id}-button`;
        const isOpen = open === index;
        return (
          <div key={item.title} className="border-b border-neutral-200 py-4">
            <H>
              <button
                id={btnId}
                type="button"
                onClick={() => setOpen(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between text-left text-[12px] font-semibold uppercase tracking-wider text-[#1a1a1a] transition-colors duration-200 hover:text-[#666666]"
              >
                {item.title}
                <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </H>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              inert={!isOpen ? '' : undefined}
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-4 text-xs leading-relaxed text-neutral-600">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
