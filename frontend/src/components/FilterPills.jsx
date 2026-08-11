import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/* ============================================================================
 * Filter Pills Bar — exact client reference ("CK Style Collection Layout").
 *   · left: pill buttons (Category ▾ / Price ▾ / Color ▾ / Size ▾ /
 *           Collection ▾ / All Filters ⇅) — white, 1px #dcdcdc, radius 20,
 *           padding 8px 18px, 13px, hover border black
 *   · right: "{n} Items" (13px #666) | "Sort By: … ▾" sort pill
 * Each pill opens a dropdown panel under it; clicking outside / Escape closes.
 * Active pills darken their border and show a count badge.
 *
 * `pills` shape:
 *   { key, label, options: [{ value, label }], selected: array, multi, onPick }
 * ========================================================================== */

const PILL = 'inline-flex items-center gap-2 rounded-[20px] border bg-white px-[18px] py-2 text-[13px] text-black transition-colors duration-200 hover:border-black';
const PILL_ON = 'border-black';
const PILL_OFF = 'border-[#dcdcdc]';

export default function FilterPills({ countLabel, pills = [], sortValue, sortLabel, onSortChange, onAllFilters }) {
  const [open, setOpen] = useState(null); // pill key or 'sort' or 'all'
  const barRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) setOpen(null);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onEsc); };
  }, [open]);

  const toggle = (k) => setOpen((o) => (o === k ? null : k));

  const renderOptions = (pill) => {
    const on = (v) => pill.selected.includes(v);
    return (
      <div className="max-h-[300px] w-[240px] overflow-y-auto border border-[#e5e5e5] bg-white p-2 shadow-[0_12px_30px_rgba(0,0,0,0.10)]">
        {pill.options.length === 0 && (
          <p className="px-3 py-4 text-center text-[12px] text-[#888888]">Nothing here yet.</p>
        )}
        {pill.options.map((o) => {
          const active = on(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => { pill.onPick(o.value); }}
              className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-[13px] transition-colors ${active ? 'bg-[#f2f2f2] font-medium text-black' : 'text-[#333333] hover:bg-[#f7f7f7]'}`}
            >
              <span className="truncate">{o.label}</span>
              {pill.multi && active && <Check size={14} className="shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div ref={barRef} className="relative">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-[25px]">
        {/* Left — filter pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {pills.map((pill) => {
            const n = pill.selected.length;
            const active = n > 0;
            return (
              <div key={pill.key} className="relative">
                <button
                  type="button"
                  aria-expanded={open === pill.key}
                  onClick={() => toggle(pill.key)}
                  className={`${PILL} ${active ? PILL_ON : PILL_OFF}`}
                >
                  {pill.label}
                  {active && (
                    <span className="grid h-4 min-w-4 place-items-center rounded-full bg-black px-1 text-[9px] font-semibold text-white">
                      {n}
                    </span>
                  )}
                  <ChevronDown size={13} className={`transition-transform duration-200 ${open === pill.key ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {open === pill.key && (
                  <div className="absolute left-0 top-full z-30 mt-2">{renderOptions(pill)}</div>
                )}
              </div>
            );
          })}

          {/* All Filters */}
          {onAllFilters && (
            <div className="relative">
              <button
                type="button"
                onClick={() => { setOpen(null); onAllFilters(); }}
                className={`${PILL} ${PILL_OFF}`}
              >
                All Filters <span aria-hidden="true">⇅</span>
              </button>
            </div>
          )}
        </div>

        {/* Right — count + sort */}
        <div className="flex items-center gap-[15px] text-[13px] text-[#666666]">
          <span>{countLabel}</span>
          <span aria-hidden="true">|</span>
          <div className="relative">
            <button
              type="button"
              aria-expanded={open === 'sort'}
              onClick={() => toggle('sort')}
              className={`${PILL} ${PILL_OFF}`}
            >
              Sort By: {sortLabel} <ChevronDown size={13} aria-hidden="true" />
            </button>
            {open === 'sort' && (
              <div className="absolute right-0 top-full z-30 mt-2">
                <div className="w-[220px] border border-[#e5e5e5] bg-white p-2 shadow-[0_12px_30px_rgba(0,0,0,0.10)]">
                  {[
                    ['popular', 'Featured'],
                    ['price-asc', 'Price: Low to High'],
                    ['price-desc', 'Price: High to Low'],
                    ['newest', 'Newest Arrivals'],
                  ].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { onSortChange(v); setOpen(null); }}
                      className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-[13px] transition-colors ${sortValue === v ? 'bg-[#f2f2f2] font-medium text-black' : 'text-[#333333] hover:bg-[#f7f7f7]'}`}
                    >
                      {l}
                      {sortValue === v && <Check size={14} aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
