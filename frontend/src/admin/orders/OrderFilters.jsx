import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import {
  PAYMENT_METHODS, PAYMENT_STATES, SORT_OPTIONS, STAGES,
} from './orderConstants';
import s from './adesk.module.css';

/* ===========================================================================
 * Filter bar — ATELIER row of controls. Every change writes to the URL.
 * The live search box lives in the desk's top bar (OrdersDesk), so this row
 * carries the narrowing controls + removable chips only.
 * ========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join('');

const ACTIVE_CHIPS = [
  { key: 'stage', label: 'Stage', map: (v) => STAGES.find((st) => st.key === v)?.label || v },
  { key: 'paymentState', label: 'Payment', map: (v) => PAYMENT_STATES.find((p) => p.key === v)?.label || v },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'city', label: 'City' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'minTotal', label: 'Min', map: (v) => `₨${v}` },
  { key: 'maxTotal', label: 'Max', map: (v) => `₨${v}` },
  { key: 'printed', label: 'Printed', map: (v) => (v === 'no' ? 'Unprinted' : 'Printed') },
  { key: 'hasIssue', label: 'Service', map: () => 'Has issue' },
  { key: 'q', label: 'Search' },
];

export default function OrderFilters({
  filters, setFilter, resetFilters, activeFilterCount, facets, onExport, token, hideSearch = false,
}) {
  const [open, setOpen] = useState(false);

  const field = (label, control) => (
    <div style={{ minWidth: 0 }}>
      <span className={s.ctlLabel}>{label}</span>
      {control}
    </div>
  );

  const chips = ACTIVE_CHIPS
    .map((c) => ({ ...c, value: filters[c.key] }))
    .filter((c) => c.value && c.value !== 'all' && c.value !== '');

  return (
    <div className={cx(s.card, 'mb-3')} style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        {!hideSearch && (
          <div className={s.search} style={{ flex: 1, minWidth: 200 }}>
            <input
              value={filters.q || ''}
              onChange={(e) => setFilter({ q: e.target.value })}
              placeholder="Search orders…" aria-label="Search orders" autoComplete="off"
            />
          </div>
        )}

        <select className={s.filter} value={filters.paymentState} aria-label="Payment"
          onChange={(e) => setFilter({ paymentState: e.target.value })}>
          <option value="all">All payments</option>
          {PAYMENT_STATES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>

        <select className={s.filter} value={filters.sort} aria-label="Sort orders"
          onChange={(e) => setFilter({ sort: e.target.value })}>
          {SORT_OPTIONS.map((so) => <option key={so.key} value={so.key}>{so.label}</option>)}
        </select>

        <input type="date" className={s.filter} value={filters.from} aria-label="From date"
          onChange={(e) => setFilter({ from: e.target.value })} />
        <input type="date" className={s.filter} value={filters.to} aria-label="To date"
          onChange={(e) => setFilter({ to: e.target.value })} />

        <button type="button" className={cx(s.pill, (open || activeFilterCount > 0) && s.pillOn)}
          aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <SlidersHorizontal size={12} /> More
          {activeFilterCount > 0 && <span className={s.structCount}>{activeFilterCount}</span>}
          <ChevronDown size={11} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: '.18s' }} />
        </button>

        <button type="button" className={s.pill} onClick={onExport}>Export CSV</button>
        {token && activeFilterCount > 0 && (
          <button type="button" className={s.btnSm} onClick={resetFilters}>Clear all</button>
        )}
      </div>

      {open && (
        <div style={{
          display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)',
        }}>
          {field('Stage', (
            <select className={s.ctl} value={filters.stage} onChange={(e) => setFilter({ stage: e.target.value })}>
              <option value="">Any stage</option>
              {STAGES.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
            </select>
          ))}
          {field('Payment method', (
            <select className={s.ctl} value={filters.paymentMethod} onChange={(e) => setFilter({ paymentMethod: e.target.value })}>
              <option value="all">All methods</option>
              {PAYMENT_METHODS.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
            </select>
          ))}
          {field('City', (
            <select className={s.ctl} value={filters.city} onChange={(e) => setFilter({ city: e.target.value })}>
              <option value="all">All cities</option>
              {(facets.cities || []).map((c) => <option key={c.city} value={c.city}>{c.city} ({c.count})</option>)}
            </select>
          ))}
          {field('Min amount (PKR)', (
            <input type="number" min="0" inputMode="numeric" placeholder="0" className={s.ctl}
              value={filters.minTotal} onChange={(e) => setFilter({ minTotal: e.target.value })} />
          ))}
          {field('Max amount (PKR)', (
            <input type="number" min="0" inputMode="numeric" placeholder="Any" className={s.ctl}
              value={filters.maxTotal} onChange={(e) => setFilter({ maxTotal: e.target.value })} />
          ))}
          {field('Invoice printed', (
            <select className={s.ctl} value={filters.printed} onChange={(e) => setFilter({ printed: e.target.value })}>
              <option value="">Any</option>
              <option value="no">Unprinted</option>
              <option value="yes">Printed</option>
            </select>
          ))}
          {field('Customer service', (
            <select className={s.ctl} value={filters.hasIssue} onChange={(e) => setFilter({ hasIssue: e.target.value })}>
              <option value="">Any</option>
              <option value="yes">Has an open issue</option>
            </select>
          ))}
          {field('Rows per page', (
            <select className={s.ctl} value={filters.limit} onChange={(e) => setFilter({ limit: e.target.value })}>
              {['25', '50', '100', '200'].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ))}
        </div>
      )}

      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {chips.map((c) => (
            <span key={c.key} className={cx(s.bdg, s.bGray)} style={{ paddingRight: 4 }}>
              <span style={{ color: 'var(--muted2)', fontWeight: 600 }}>{c.label}</span>
              <span style={{ fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(c.map ? c.map(c.value) : c.value)}
              </span>
              <button type="button" className={s.searchBtn} aria-label={`Remove ${c.label} filter`}
                onClick={() => setFilter({ [c.key]: c.key === 'paymentState' || c.key === 'paymentMethod' || c.key === 'city' ? 'all' : '' })}
                style={{ marginLeft: 2 }}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
