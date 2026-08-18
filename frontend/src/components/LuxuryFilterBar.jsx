import { ChevronDown, SlidersHorizontal } from 'lucide-react';

/* ============================================================================
 * LuxuryFilterBar — CK / Gucci register (not Shopify pills).
 * Bare tracked-caps labels with a small chevron, separated by hairline
 * dividers. No pill borders, no backgrounds, no shadows — the air between
 * the labels IS the luxury. Hover underlines the label. bg white, border-b.
 * ========================================================================== */

const BTN = 'group inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.18em] text-[#111111] transition-opacity duration-200 hover:opacity-60';

const DIVIDER = 'h-4 w-px shrink-0 bg-black/15';

export default function LuxuryFilterBar({ count = 12, onOpenFilters, f }) {
  const filters = [
    { label: 'Category', key: 'category' },
    { label: 'Price', key: 'price' },
    { label: 'Color', key: 'color' },
    { label: 'Size', key: 'size' },
    { label: 'Collection', key: 'collection' },
  ];

  const sortLabel = ({ popular: 'Featured', 'price-asc': 'Price: Low to High', 'price-desc': 'Price: High to Low', newest: 'Newest Arrivals' })[f?.sort] || 'Newest Arrivals';

  return (
    <div className="w-full border-b border-black/10 bg-white px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
        {/* LEFT — bare filter labels with hairline dividers */}
        <div className="no-scrollbar flex items-center overflow-x-auto">
          {filters.map((filter, i) => (
            <span key={filter.key} className="flex items-center">
              {i > 0 && <span className={`${DIVIDER} mx-4`} aria-hidden="true" />}
              <button
                type="button"
                onClick={() => { if (onOpenFilters) onOpenFilters(); }}
                className={BTN}
              >
                <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-[#111111]">{filter.label}</span>
                <ChevronDown size={12} strokeWidth={1.5} className="text-neutral-500" aria-hidden="true" />
              </button>
            </span>
          ))}
          <span className={`${DIVIDER} mx-4`} aria-hidden="true" />
          <button
            type="button"
            onClick={() => { if (onOpenFilters) onOpenFilters(); }}
            className={BTN}
          >
            <span className="flex items-center gap-1.5 border-b border-transparent pb-0.5 transition-colors group-hover:border-[#111111]">
              <SlidersHorizontal size={12} strokeWidth={1.5} className="text-neutral-600" aria-hidden="true" />
              All Filters
            </span>
          </button>
        </div>

        {/* RIGHT — item count + sort (bare label) */}
        <div className="ml-auto flex items-center">
          <span className="hidden text-[11px] font-normal uppercase tracking-[0.18em] text-neutral-400 sm:inline">
            {count} Items
          </span>
          <span className={`${DIVIDER} mx-4 hidden sm:inline`} aria-hidden="true" />
          <button
            type="button"
            onClick={() => { if (onOpenFilters) onOpenFilters(); }}
            className={BTN}
          >
            <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-[#111111]">Sort By: {sortLabel}</span>
            <ChevronDown size={12} strokeWidth={1.5} className="text-neutral-500" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
