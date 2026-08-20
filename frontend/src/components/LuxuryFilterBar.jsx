import { SlidersHorizontal, ChevronDown } from 'lucide-react';

/* ============================================================================
 * Catalog control bar — three-zone luxury PLP anatomy (Versace / Gucci):
 *
 *   ≡ FILTERS                    497 Products                    SORT BY ⌄
 *   ──────────────────────────────────────────────────────────────────────
 *
 * Symmetric, quiet, full-width hairlines. The count lives HERE (centered),
 * not glued to the page title. On mobile the count hides — the filter sheet
 * already shows "Show N results".
 * ========================================================================== */

const SORTS = [
  { value: 'popular', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export default function LuxuryFilterBar({ count = null, onOpenFilters, f, filterBtnRef }) {
  const activeCount = f?.activeCount || 0;
  const currentSort = f?.sort || 'popular';

  return (
    <div className="border-y border-[#E5E5E5] bg-white">
      <div className="relative mx-auto flex min-h-[52px] max-w-[1600px] items-center justify-between px-5 md:px-10">
        {/* Left — FILTERS */}
        {onOpenFilters ? (
          <button
            ref={filterBtnRef}
            type="button"
            onClick={onOpenFilters}
            className="inline-flex min-h-[44px] items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#111111] transition-opacity hover:opacity-60"
          >
            <SlidersHorizontal size={13} strokeWidth={1.4} aria-hidden="true" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="tabular-nums text-neutral-500">({activeCount})</span>
            )}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        {/* Center — count */}
        <span className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 text-[12px] tracking-[0.04em] text-neutral-500 tabular-nums sm:block">
          {typeof count === 'number' ? `${count} ${count === 1 ? 'Product' : 'Products'}` : ''}
        </span>

        {/* Right — SORT BY */}
        <label className="relative inline-flex min-h-[44px] cursor-pointer items-center">
          <span className="sr-only">Sort products</span>
          <select
            value={currentSort}
            onChange={(e) => f?.setOne('sort', e.target.value)}
            className="cursor-pointer appearance-none border-0 bg-transparent py-2 pl-0 pr-6 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-[#111111] focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <ChevronDown
            size={13}
            strokeWidth={1.4}
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[#111111]"
            aria-hidden="true"
          />
        </label>
      </div>
    </div>
  );
}
