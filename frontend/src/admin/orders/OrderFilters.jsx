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

const label = 'mb-1.5 block text-[9px] font-medium uppercase tracking-[0.18em] text-white/35';

export default function OrderFilters({ filters, setFilter, resetFilters, activeFilterCount, facets, onExport, token, viewsSlot }) {
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
    <div className="od-fbar">
      <div className="od-fbar-row">
        <div ref={suggestRef} className="od-search">
          <Search size={13} className="od-search-ico" aria-hidden="true" />
          <input
            data-order-search
            value={term}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={() => setSuggestOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { remember(term.trim()); setSuggestOpen(false); }
              if (e.key === 'Escape') setSuggestOpen(false);
            }}
            placeholder="Search orders, customers, phone…"
            aria-label="Search orders"
            autoComplete="off"
            className="od-search-input"
          />
          {term && (
            <button type="button" onClick={() => { onSearch(''); setSuggestions([]); }} aria-label="Clear search" className="od-search-x">
              <X size={12} />
            </button>
          )}

          {suggestOpen && (suggestions.length > 0 || (!term && recent.length > 0)) && (
            <div className="od-suggest">
              {suggestions.length > 0 ? suggestions.map((sg) => (
                <button type="button" key={`${sg.type}-${sg.value}`} onClick={() => applySuggestion(sg.value)} className="od-suggest-row">
                  <span className="od-suggest-type">{sg.type}</span>
                  <span className="od-suggest-val">{sg.value}</span>
                  {sg.hint && <span className="od-suggest-hint">{sg.hint}</span>}
                </button>
              )) : (
                <>
                  <p className="od-suggest-head">
                    Recent
                    <button type="button" onClick={() => { setRecent([]); localStorage.removeItem('hushae.orderSearches'); }} className="od-suggest-clear">Clear</button>
                  </p>
                  {recent.map((r) => (
                    <button type="button" key={r} onClick={() => applySuggestion(r)} className="od-suggest-row">
                      <span className="od-suggest-val">{r}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {viewsSlot}

        <select value={filters.paymentState} onChange={(e) => setFilter({ paymentState: e.target.value })} aria-label="Payment" className="od-fctl">
          <option value="all">Payment</option>
          {PAYMENT_STATES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>

        <input type="date" value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} aria-label="From date" className="od-fctl" />

        <select value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })} aria-label="Sort orders" className="od-fctl">
          {SORT_OPTIONS.map((so) => <option key={so.key} value={so.key}>{so.label}</option>)}
        </select>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`od-fbtn ${open || activeFilterCount ? 'active' : ''}`}
        >
          More{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
        </button>

        <button type="button" onClick={onExport} className="od-fbtn">Export</button>
      </div>

      {open && (
        <div className="od-fmore">
          <div>
            <span className="od-flabel">Stage</span>
            <select value={filters.stage} onChange={(e) => setFilter({ stage: e.target.value })} className="od-fctl w-full">
              <option value="">Any stage</option>
              {STAGES.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
            </select>
          </div>
          <div>
            <span className="od-flabel">Payment method</span>
            <select value={filters.paymentMethod} onChange={(e) => setFilter({ paymentMethod: e.target.value })} className="od-fctl w-full">
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <span className="od-flabel">City</span>
            <select value={filters.city} onChange={(e) => setFilter({ city: e.target.value })} className="od-fctl w-full">
              <option value="all">All cities</option>
              {(facets.cities || []).map((c) => (
                <option key={c.city} value={c.city}>{c.city} ({c.count})</option>
              ))}
            </select>
          </div>
          <div>
            <span className="od-flabel">To date</span>
            <input type="date" value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} className="od-fctl w-full" />
          </div>
          <div>
            <span className="od-flabel">Min amount (PKR)</span>
            <input type="number" min="0" inputMode="numeric" placeholder="0"
              value={filters.minTotal} onChange={(e) => setFilter({ minTotal: e.target.value })} className="od-fctl w-full" />
          </div>
          <div>
            <span className="od-flabel">Max amount (PKR)</span>
            <input type="number" min="0" inputMode="numeric" placeholder="Any"
              value={filters.maxTotal} onChange={(e) => setFilter({ maxTotal: e.target.value })} className="od-fctl w-full" />
          </div>
          <div>
            <span className="od-flabel">Invoice printed</span>
            <select value={filters.printed} onChange={(e) => setFilter({ printed: e.target.value })} className="od-fctl w-full">
              <option value="">Any</option>
              <option value="no">Unprinted</option>
              <option value="yes">Printed</option>
            </select>
          </div>
          <div>
            <span className="od-flabel">Customer service</span>
            <select value={filters.hasIssue} onChange={(e) => setFilter({ hasIssue: e.target.value })} className="od-fctl w-full">
              <option value="">Any</option>
              <option value="yes">Has an open issue</option>
            </select>
          </div>
          <div>
            <span className="od-flabel">Rows per page</span>
            <select value={filters.limit} onChange={(e) => setFilter({ limit: e.target.value })} className="od-fctl w-full">
              {['25', '50', '100', '200'].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" onClick={resetFilters} className="od-fbtn w-full">Reset all</button>
          </div>
        </div>
      )}

      {activeFilterCount > 0 && !open && (
        <p className="od-fcount">
          {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} active ·{' '}
          <button type="button" onClick={resetFilters} className="od-fcount-clear">Clear</button>
        </p>
      )}
    </div>
  );
}
