import { X } from 'lucide-react';
import {
  PAYMENT_METHODS, PAYMENT_STATES, STAGES,
} from './orderConstants';
import s from './adesk.module.css';

/* ===========================================================================
 * Filter panel — the secondary controls that live under the desk's filter
 * bar. Open/closed state is owned by OrdersDesk (its "Filter" button), so
 * there is exactly one toggle for the whole thing. Every change is live and
 * writes to the URL; the chips below are removable.
 * =========================================================================== */

const cx = (...cls) => cls.filter(Boolean).join('');

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];

const CHIPS = [
  { key: 'stage', label: 'Stage', map: (v) => STAGES.find((st) => st.key === v)?.label || v },
  { key: 'status', label: 'Status', map: (v) => v },
  { key: 'paymentState', label: 'Payment', map: (v) => PAYMENT_STATES.find((p) => p.key === v)?.label || v },
  { key: 'paymentMethod', label: 'Method' },
  { key: 'city', label: 'City' },
  { key: 'from', label: 'From' },
  { key: 'to', label: 'To' },
  { key: 'minTotal', label: 'Min', map: (v) => `₨${v}` },
  { key: 'maxTotal', label: 'Max', map: (v) => `₨${v}` },
  { key: 'printed', label: 'Invoice', map: (v) => (v === 'no' ? 'Unprinted' : 'Printed') },
  { key: 'hasIssue', label: 'Service', map: () => 'Has issue' },
  { key: 'q', label: 'Search' },
];

const DEFAULTS_BY_KEY = { paymentState: 'all', paymentMethod: 'all', city: 'all' };

export default function OrderFilters({
  filters, setFilter, resetFilters, activeFilterCount, facets, open, setOpen,
}) {
  const chips = CHIPS
    .map((c) => ({ ...c, value: filters[c.key] }))
    .filter((c) => c.value && c.value !== 'all');

  const field = (label, control) => (
    <div style={{ minWidth: 0 }}>
      <span className={s.ctlLabel}>{label}</span>
      {control}
    </div>
  );

  return (
    <>
      {open && (
        <div className={s.advGrid}>
          {field('Stage', (
            <select className={s.ctl} value={filters.stage} onChange={(e) => setFilter({ stage: e.target.value })}>
              <option value="">Any stage</option>
              {STAGES.map((st) => <option key={st.key} value={st.key}>{st.label}</option>)}
            </select>
          ))}
          {field('Status', (
            <select className={s.ctl} value={filters.status} onChange={(e) => setFilter({ status: e.target.value, group: 'all', stage: '', preset: '' })}>
              <option value="">Any status</option>
              {STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          ))}
          {field('Payment state', (
            <select className={s.ctl} value={filters.paymentState} onChange={(e) => setFilter({ paymentState: e.target.value })}>
              <option value="all">All</option>
              {PAYMENT_STATES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
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
              {(facets?.cities || []).map((c) => <option key={c.city} value={c.city}>{c.city} ({c.count})</option>)}
            </select>
          ))}
          {field('From', (
            <input type="date" className={s.ctl} value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} />
          ))}
          {field('To', (
            <input type="date" className={s.ctl} value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} />
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
              {['10', '25', '50', '100', '200'].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ))}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <button type="button" className={cx(s.btnSm, s.btnPrimary)} style={{ height: 32 }} onClick={() => setOpen(false)}>Done</button>
            <button type="button" className={s.btnSm} style={{ height: 32 }} onClick={resetFilters}>Reset all</button>
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '2px 0 10px' }}>
          {chips.map((c) => (
            <span key={c.key} className={cx(s.bdg, s.bGray)} style={{ paddingRight: 4 }}>
              <span style={{ color: 'var(--muted2)', fontWeight: 600 }}>{c.label}</span>
              <span style={{ fontWeight: 700, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.map ? c.map(c.value) : c.value}
              </span>
              <button type="button" className={s.searchBtn} aria-label={`Remove ${c.label} filter`} style={{ marginLeft: 2 }}
                onClick={() => setFilter({ [c.key]: DEFAULTS_BY_KEY[c.key] ?? '', ...(c.key === 'status' ? {} : {}) })}>
                <X size={11} />
              </button>
            </span>
          ))}
          {activeFilterCount > 0 && (
            <button type="button" className={s.btnSm} onClick={resetFilters}>Clear all ({activeFilterCount})</button>
          )}
        </div>
      )}
    </>
  );
}
