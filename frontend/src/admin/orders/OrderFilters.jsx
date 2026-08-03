import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Calendar, ChevronDown, Filter, MapPin, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import {
  PAYMENT_METHODS, PAYMENT_STATES, SORT_OPTIONS, STAGES,
} from './orderConstants';

/* ============================================================================
 * Filter bar — search, quick selects and a drawer for the long tail.
 * Every change writes to the URL via `setFilter`, so views are shareable.
 * ========================================================================== */

const field = 'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10';
const label = 'mb-1 block text-[9px] font-semibold uppercase tracking-wider text-neutral-500';

export default function OrderFilters({ filters, setFilter, resetFilters, activeFilterCount, facets, onExport, token }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(filters.q || '');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hushae.orderSearches') || '[]'); } catch { return []; }
  });
  const debounce = useRef(null);
  const suggestRef = useRef(null);

  // Keep the box in step when the URL changes underneath us (back button).
  useEffect(() => { setTerm(filters.q || ''); }, [filters.q]);

  // Close the suggestion list on an outside click.
  useEffect(() => {
    if (!suggestOpen) return undefined;
    const h = (e) => { if (suggestRef.current && !suggestRef.current.contains(e.target)) setSuggestOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [suggestOpen]);

  const remember = (value) => {
    if (!value) return;
    const next = [value, ...recent.filter((r) => r !== value)].slice(0, 6);
    setRecent(next);
    try { localStorage.setItem('hushae.orderSearches', JSON.stringify(next)); } catch { /* private mode */ }
  };

  const onSearch = (v) => {
    setTerm(v);
    setSuggestOpen(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setFilter({ q: v.trim() });
      if (v.trim().length >= 2 && token) {
        api(`/orders/insights/suggest?q=${encodeURIComponent(v.trim())}`, { token })
          .then((d) => setSuggestions(d.suggestions || []))
          .catch(() => setSuggestions([]));
      } else {
        setSuggestions([]);
      }
    }, 250);
  };

  const applySuggestion = (value) => {
    setTerm(value);
    setFilter({ q: value });
    remember(value);
    setSuggestOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div ref={suggestRef} className="relative min-w-[240px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            data-order-search
            value={term}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSuggestOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { remember(term.trim()); setSuggestOpen(false); }
              if (e.key === 'Escape') setSuggestOpen(false);
            }}
            placeholder="Search order #, customer, phone, city…  ( / )"
            aria-label="Search orders"
            autoComplete="off"
            className={`${field} pl-9 pr-8`}
          />
          {term && (
            <button onClick={() => { onSearch(''); setSuggestions([]); }} aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900">
              <X size={14} />
            </button>
          )}

          {suggestOpen && (suggestions.length > 0 || (!term && recent.length > 0)) && (
            <div className="absolute left-0 right-0 top-11 z-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-xl">
              {suggestions.length > 0 ? suggestions.map((sg) => (
                <button key={`${sg.type}-${sg.value}`} onClick={() => applySuggestion(sg.value)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-50">
                  <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-wide text-neutral-400">{sg.type}</span>
                  <span className="min-w-0 flex-1 truncate text-[9px] text-neutral-800">{sg.value}</span>
                  {sg.hint && <span className="shrink-0 text-[9px] text-neutral-400">{sg.hint}</span>}
                </button>
              )) : (
                <>
                  <p className="flex items-center justify-between px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                    Recent
                    <button onClick={() => { setRecent([]); localStorage.removeItem('hushae.orderSearches'); }}
                      className="font-medium normal-case tracking-normal hover:text-neutral-900">Clear</button>
                  </p>
                  {recent.map((r) => (
                    <button key={r} onClick={() => applySuggestion(r)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[9px] text-neutral-700 hover:bg-neutral-50">
                      <Search size={11} className="text-neutral-300" /> {r}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={filters.sort}
            onChange={(e) => setFilter({ sort: e.target.value })}
            aria-label="Sort orders"
            className={`${field} appearance-none pr-8`}
          >
            {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            open || activeFilterCount
              ? 'border-neutral-900 bg-neutral-900 text-white'
              : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400'
          }`}
        >
          <SlidersHorizontal size={14} /> Filters
          {activeFilterCount > 0 && (
            <span className="ml-0.5 rounded-full bg-white/25 px-1.5 text-[9px] font-bold">{activeFilterCount}</span>
          )}
        </button>

        <button onClick={onExport}
          className="shrink-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400">
          Export CSV
        </button>
      </div>

      {open && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className={label}>Stage</span>
              <select value={filters.stage} onChange={(e) => setFilter({ stage: e.target.value })} className={field}>
                <option value="">Any stage</option>
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <span className={label}>Payment method</span>
              <select value={filters.paymentMethod} onChange={(e) => setFilter({ paymentMethod: e.target.value })} className={field}>
                <option value="all">All methods</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <span className={label}>Payment status</span>
              <select value={filters.paymentState} onChange={(e) => setFilter({ paymentState: e.target.value })} className={field}>
                <option value="all">Any status</option>
                {PAYMENT_STATES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
              </select>
            </div>

            <div>
              <span className={label}><MapPin size={10} className="mr-1 inline" />City</span>
              <select value={filters.city} onChange={(e) => setFilter({ city: e.target.value })} className={field}>
                <option value="all">All cities</option>
                {(facets.cities || []).map((c) => (
                  <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
                ))}
              </select>
            </div>

            <div>
              <span className={label}><Calendar size={10} className="mr-1 inline" />From</span>
              <input type="date" value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} className={field} />
            </div>
            <div>
              <span className={label}>To</span>
              <input type="date" value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} className={field} />
            </div>

            <div>
              <span className={label}>Min amount (PKR)</span>
              <input type="number" min="0" inputMode="numeric" placeholder="0"
                value={filters.minTotal} onChange={(e) => setFilter({ minTotal: e.target.value })} className={field} />
            </div>
            <div>
              <span className={label}>Max amount (PKR)</span>
              <input type="number" min="0" inputMode="numeric" placeholder="Any"
                value={filters.maxTotal} onChange={(e) => setFilter({ maxTotal: e.target.value })} className={field} />
            </div>

            <div>
              <span className={label}>Invoice printed</span>
              <select value={filters.printed} onChange={(e) => setFilter({ printed: e.target.value })} className={field}>
                <option value="">Any</option>
                <option value="no">Unprinted</option>
                <option value="yes">Printed</option>
              </select>
            </div>

            <div>
              <span className={label}>Customer service</span>
              <select value={filters.hasIssue} onChange={(e) => setFilter({ hasIssue: e.target.value })} className={field}>
                <option value="">Any</option>
                <option value="yes">Has an open issue</option>
              </select>
            </div>

            <div>
              <span className={label}>Rows per page</span>
              <select value={filters.limit} onChange={(e) => setFilter({ limit: e.target.value })} className={field}>
                {['25', '50', '100', '200'].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button onClick={resetFilters}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:border-neutral-400">
                <RotateCcw size={13} /> Reset all
              </button>
            </div>
          </div>
        </div>
      )}

      {activeFilterCount > 0 && !open && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Filter size={12} className="text-neutral-400" />
          <span className="text-neutral-500">{activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active</span>
          <button onClick={resetFilters} className="font-semibold text-neutral-900 underline underline-offset-2">Clear</button>
        </div>
      )}
    </div>
  );
}
