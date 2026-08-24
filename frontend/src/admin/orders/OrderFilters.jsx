import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import { Search, X } from 'lucide-react';
import {
  PAYMENT_METHODS, PAYMENT_STATES, SORT_OPTIONS, STAGES,
} from './orderConstants';
import { btnGhost, ctl, ctlInline } from './orderUi';

/* ===========================================================================
 * Filter bar — editorial control row. Every change writes to the URL.
 * ========================================================================== */

const label = 'mb-1.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-[#AAAAAA]';

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

  useEffect(() => { setTerm(filters.q || ''); }, [filters.q]);

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
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <div ref={suggestRef} className="relative min-w-[200px] flex-1">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
          <input
            data-order-search
            value={term}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSuggestOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { remember(term.trim()); setSuggestOpen(false); }
              if (e.key === 'Escape') setSuggestOpen(false);
            }}
            placeholder="Search orders…"
            aria-label="Search orders"
            autoComplete="off"
            className={`${ctl} pl-9 pr-8`}
          />
          {term && (
            <button onClick={() => { onSearch(''); setSuggestions([]); }} aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-black">
              <X size={13} />
            </button>
          )}

          {suggestOpen && (suggestions.length > 0 || (!term && recent.length > 0)) && (
            <div className="absolute left-0 right-0 top-9 z-40 overflow-hidden border border-[#EAEAEA] bg-[#0D0D0D] py-1">
              {suggestions.length > 0 ? suggestions.map((sg) => (
                <button key={`${sg.type}-${sg.value}`} onClick={() => applySuggestion(sg.value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#FAFAFA]">
                  <span className="w-14 shrink-0 text-[9px] font-medium uppercase tracking-[0.14em] text-[#AAAAAA]">{sg.type}</span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-black">{sg.value}</span>
                  {sg.hint && <span className="shrink-0 text-[11px] text-[#AAAAAA]">{sg.hint}</span>}
                </button>
              )) : (
                <>
                  <p className="flex items-center justify-between px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-[#AAAAAA]">
                    Recent
                    <button onClick={() => { setRecent([]); localStorage.removeItem('hushae.orderSearches'); }}
                      className="font-medium normal-case tracking-normal text-[#999999] hover:text-black">Clear</button>
                  </p>
                  {recent.map((r) => (
                    <button key={r} onClick={() => applySuggestion(r)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[#555555] hover:bg-[#FAFAFA]">
                      {r}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <select
          value={filters.paymentState}
          onChange={(e) => setFilter({ paymentState: e.target.value })}
          aria-label="Payment"
          className={`${ctlInline} max-w-[160px]`}
        >
          <option value="all">Payment</option>
          {PAYMENT_STATES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilter({ from: e.target.value })}
          aria-label="From date"
          className={`${ctlInline} max-w-[148px]`}
        />

        <select
          value={filters.sort}
          onChange={(e) => setFilter({ sort: e.target.value })}
          aria-label="Sort orders"
          className={`${ctlInline} max-w-[170px]`}
        >
          {SORT_OPTIONS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={open || activeFilterCount ? 'inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-white px-3 text-[10px] font-medium uppercase tracking-[0.08em] text-black' : btnGhost}
        >
          More
          {activeFilterCount > 0 && (
            <span className="tabular-nums">{activeFilterCount}</span>
          )}
        </button>

        <button onClick={onExport} className={btnGhost}>
          Export
        </button>
      </div>

      {open && (
        <div className="mt-5 grid gap-4 border-t border-[#EAEAEA] pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className={label}>Stage</span>
            <select value={filters.stage} onChange={(e) => setFilter({ stage: e.target.value })} className={ctl}>
              <option value="">Any stage</option>
              {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>Payment method</span>
            <select value={filters.paymentMethod} onChange={(e) => setFilter({ paymentMethod: e.target.value })} className={ctl}>
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>City</span>
            <select value={filters.city} onChange={(e) => setFilter({ city: e.target.value })} className={ctl}>
              <option value="all">All cities</option>
              {(facets.cities || []).map((c) => (
                <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
              ))}
            </select>
          </div>
          <div>
            <span className={label}>To date</span>
            <input type="date" value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} className={ctl} />
          </div>
          <div>
            <span className={label}>Min amount (PKR)</span>
            <input type="number" min="0" inputMode="numeric" placeholder="0"
              value={filters.minTotal} onChange={(e) => setFilter({ minTotal: e.target.value })} className={ctl} />
          </div>
          <div>
            <span className={label}>Max amount (PKR)</span>
            <input type="number" min="0" inputMode="numeric" placeholder="Any"
              value={filters.maxTotal} onChange={(e) => setFilter({ maxTotal: e.target.value })} className={ctl} />
          </div>
          <div>
            <span className={label}>Invoice printed</span>
            <select value={filters.printed} onChange={(e) => setFilter({ printed: e.target.value })} className={ctl}>
              <option value="">Any</option>
              <option value="no">Unprinted</option>
              <option value="yes">Printed</option>
            </select>
          </div>
          <div>
            <span className={label}>Customer service</span>
            <select value={filters.hasIssue} onChange={(e) => setFilter({ hasIssue: e.target.value })} className={ctl}>
              <option value="">Any</option>
              <option value="yes">Has an open issue</option>
            </select>
          </div>
          <div>
            <span className={label}>Rows per page</span>
            <select value={filters.limit} onChange={(e) => setFilter({ limit: e.target.value })} className={ctl}>
              {['25', '50', '100', '200'].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={resetFilters} className={`${btnGhost} w-full`}>
              Reset all
            </button>
          </div>
        </div>
      )}

      {activeFilterCount > 0 && !open && (
        <p className="mt-3 text-[11px] text-[#AAAAAA]">
          {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active
          {' · '}
          <button onClick={resetFilters} className="text-[#555555] underline underline-offset-2 hover:text-black">Clear</button>
        </p>
      )}
    </div>
  );
}
