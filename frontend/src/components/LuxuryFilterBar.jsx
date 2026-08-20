import { SlidersHorizontal, ChevronDown } from 'lucide-react';

/* ============================================================================
 * HUSHAE LuxuryFilterBar — Clean Minimalist Controls (Calvin Klein / Rains)
 * ========================================================================== */

const SORTS = [
  { value: 'popular', label: 'Featured' },
  { value: 'newest', label: 'Newest Arrivals' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export default function LuxuryFilterBar({ count = 0, onOpenFilters, f }) {
  const activeCount = f?.activeCount || 0;
  const currentSort = f?.sort || 'popular';

  return (
    <div className="w-full border-b border-[#EAEAEA] bg-[#FFFFFF] py-3.5 font-sans">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 md:px-12">
        {/* Left: Item Counter & Active Filters Reset */}
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-neutral-500 font-light">
            {count} {count === 1 ? 'Piece' : 'Pieces'}
          </span>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={f?.clearAll}
              className="text-xs text-neutral-400 hover:text-black underline underline-offset-4 transition-colors font-light"
            >
              Clear Filters ({activeCount})
            </button>
          )}
        </div>

        {/* Right: Filter Trigger & Sort Dropdown */}
        <div className="flex items-center gap-3">
          {/* All Filters Pill Button */}
          <button
            type="button"
            onClick={onOpenFilters}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
              activeCount > 0
                ? 'border-black bg-black text-white'
                : 'border-neutral-300 bg-white text-black hover:border-black'
            }`}
          >
            <SlidersHorizontal size={12} strokeWidth={1.6} />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] font-bold text-black">
                {activeCount}
              </span>
            )}
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={currentSort}
              onChange={(e) => f?.setOne('sort', e.target.value)}
              className="appearance-none rounded-full border border-neutral-300 bg-white px-4 py-2 pr-8 text-xs font-medium uppercase tracking-wider text-black hover:border-black focus:border-black focus:outline-none cursor-pointer transition-colors"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  Sort: {s.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
