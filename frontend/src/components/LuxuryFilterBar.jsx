import { ChevronDown, SlidersHorizontal } from 'lucide-react';

/* ============================================================================
 * LuxuryFilterBar — exact client reference.
 * Rounded filter pills (Category/Price/Color/Size/Collection + All Filters)
 * on the left; item count + "Sort By: …" pill on the right. bg #fcfbf9,
 * border-b. Used on the homepage under the hero.
 * ========================================================================== */

const PILL = 'flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border border-neutral-300/80 bg-white px-4 py-2 text-[11px] font-normal text-[#111111] shadow-sm transition-all duration-200 hover:border-black';

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
    <div className="w-full border-b border-neutral-200/60 bg-[#fcfbf9] px-4 py-4 md:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
        {/* LEFT — rounded filter pills */}
        <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto py-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => { if (onOpenFilters) onOpenFilters(); }}
              className={PILL}
            >
              <span>{filter.label}</span>
              <ChevronDown size={12} strokeWidth={1.8} className="text-neutral-500" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => { if (onOpenFilters) onOpenFilters(); }}
            className={PILL}
          >
            <span>All Filters</span>
            <SlidersHorizontal size={12} strokeWidth={1.8} className="text-neutral-600" aria-hidden="true" />
          </button>
        </div>

        {/* RIGHT — item count + sort pill */}
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden text-[11px] font-normal uppercase tracking-wider text-neutral-400 sm:inline">
            {count} Items
          </span>
          <span className="hidden text-neutral-300 sm:inline" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => { if (onOpenFilters) onOpenFilters(); }}
            className={PILL}
          >
            <span>Sort By: {sortLabel}</span>
            <ChevronDown size={12} strokeWidth={1.8} className="text-neutral-500" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
