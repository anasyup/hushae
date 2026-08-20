import { ChevronDown, Plus } from 'lucide-react';

/* ============================================================================
 * HUSHAE catalog controls — quiet, typographic (The Row / CK register).
 *
 * No pills, no filled buttons: uppercase tracked text with a hairline
 * underline on interaction. Renders as an inline cluster so callers can
 * compose it into their own control row (Shop) or a standalone bar
 * (Collection). `onOpenFilters` is optional — pages without a facet sheet
 * simply get the sort control.
 * ========================================================================== */

const SORTS = [
  { value: 'popular', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
];

const TEXT_CTRL =
  'inline-flex min-h-[44px] items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-black transition-colors hover:text-neutral-500';

export default function LuxuryFilterBar({ onOpenFilters, f, filterBtnRef }) {
  const activeCount = f?.activeCount || 0;
  const currentSort = f?.sort || 'popular';

  return (
    <div className="flex shrink-0 items-center gap-5 md:gap-7">
      {activeCount > 0 && (
        <button
          type="button"
          onClick={f?.clearAll}
          className="hidden min-h-[44px] items-center text-[11px] uppercase tracking-[0.14em] text-neutral-400 underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-black sm:inline-flex"
        >
          Clear ({activeCount})
        </button>
      )}

      {onOpenFilters && (
        <button
          ref={filterBtnRef}
          type="button"
          onClick={onOpenFilters}
          className={TEXT_CTRL}
        >
          <span>Filter</span>
          {activeCount > 0 ? (
            <span className="tabular-nums normal-case tracking-normal text-neutral-500">({activeCount})</span>
          ) : (
            <Plus size={11} strokeWidth={1.6} aria-hidden="true" />
          )}
        </button>
      )}

      <label className="relative inline-flex min-h-[44px] cursor-pointer items-center">
        <span className="sr-only">Sort products</span>
        <select
          value={currentSort}
          onChange={(e) => f?.setOne('sort', e.target.value)}
          className="cursor-pointer appearance-none border-0 bg-transparent py-2 pr-5 text-[11px] font-medium uppercase tracking-[0.16em] text-black focus:outline-none focus-visible:underline"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              Sort: {s.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={12}
          strokeWidth={1.6}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-neutral-500"
          aria-hidden="true"
        />
      </label>
    </div>
  );
}
