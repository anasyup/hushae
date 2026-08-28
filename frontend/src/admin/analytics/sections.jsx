/* ============================================================================
 * ANALYTICS — reusable report section components
 *
 * One visual language for every report section: <Section> + <HeadRow> +
 * <Row>/<Metric> (or <CohortGrid> / <EmptyState>). Same card, same column
 * rhythm, same chips, same empty state everywhere — so the lower sections read
 * like the top of the page instead of like paragraphs of text.
 *
 * Layout: rows are CSS grid (repeat(12,1fr)). Every <Metric> takes `span` of
 * those 12, so all rows in a section share an identical column rhythm, and a
 * column hidden by a media query makes the rest re-flow automatically — no JS
 * measuring, no resize listeners.
 *
 * Pure presentational components: no data fetching, no page state.
 * ========================================================================== */
import { Inbox } from 'lucide-react';
import './analytics.css';

const nf = new Intl.NumberFormat('en-US');
export const num = (v) => (Number(v) || 0).toLocaleString('en-US');
export const pct = (v, d = 1) => `${(Number(v) || 0).toFixed(d)}%`;

/* ------------------------------------------------------------------ <Section> */
export function Section({ title, subtitle, actions, footer, className = '', delay = 0, children }) {
  return (
    <section className={`an-sec ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {(title || actions) && (
        <header className="an-sec-h">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="an-sec-t">{title}</h3>}
            {subtitle && <p className="an-sec-sub">{subtitle}</p>}
          </div>
          {actions && <div className="an-sec-act">{actions}</div>}
        </header>
      )}
      {children}
      {footer && <div className="an-sec-f">{footer}</div>}
    </section>
  );
}

/* -------------------------------------------------------------- <HeadRow> */
/* Column labels — same 12-col grid and same spans as the rows, so each label
 * sits exactly above the values it describes. `cols` must mirror the <Metric>
 * spans used in that section's rows. */
export function HeadRow({ label, cols = [] }) {
  return (
    <div className="an-hrow" aria-hidden="true">
      <span className="an-leadcell">{label}</span>
      {cols.map((c) => (
        <span
          key={c.label}
          className={`an-m ${c.align === 'c' ? 'an-c' : c.align === 'l' ? '' : 'an-r'} ${c.hide ? `hide-${c.hide}` : ''}`}
          style={{ gridColumn: `span ${c.span}` }}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- <Row> */
/* rank + title (+ optional sub / badge line) then any number of <Metric>. */
export function Row({ rank, title, sub, top, badge, children }) {
  return (
    <div className="an-row">
      <div className="an-leadcell">
        {rank != null && <span className={`an-rank${top ? ' top' : ''}`}>{rank}</span>}
        <div className="an-tt">
          <div className="an-tt-t" title={title}>{title}</div>
          {(sub || badge) && (
            <div className="an-tt-s">
              {badge}
              {badge && sub ? ' · ' : ''}
              {sub}
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- <Metric> */
/* One aligned value cell. value = node, bar = 0–100 fill, chip = node.
 * hide: 'md' | 'sm' — column drops out on narrow viewports (see CSS). */
export function Metric({ span, align = 'r', value, bar, barTone, chip, mute, big, money, hide, title }) {
  const alignCls = align === 'c' ? 'an-c' : align === 'l' ? '' : 'an-r';
  const vCls = ['an-m-v', alignCls, big && 'big', mute && 'mut', money && 'money'].filter(Boolean).join(' ');
  return (
    <div className={`an-m ${alignCls} ${hide ? `hide-${hide}` : ''}`} style={{ gridColumn: `span ${span}` }} title={title}>
      {chip || <span className={vCls}>{value}</span>}
      {bar != null && (
        <span className={`an-mbar ${barTone || ''}`}>
          <i style={{ width: `${Math.max(0, Math.min(100, bar))}%` }} />
        </span>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- <Chip> */
export function Chip({ tone = '', children, mono, className = '', ...rest }) {
  return (
    <span className={`an-chip ${tone} ${mono ? 'mono' : ''} ${className}`} {...rest}>
      {children}
    </span>
  );
}

/* conversion chip: micro bar + rate, toned by how good the rate is */
export function ConvChip({ v, max }) {
  if (v == null) return <Chip tone="plain">—</Chip>;
  const tone = v >= 3 ? 'good' : v >= 1 ? '' : 'warn';
  return (
    <Chip tone={tone}>
      <span className="an-mbar teal"><i style={{ width: `${Math.max(8, Math.min(100, (v / (max || 1)) * 100))}%` }} /></span>
      {pct(v)}
    </Chip>
  );
}

/* ------------------------------------------------------------ <EmptyState> */
export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="an-empty">
      <span className="an-empty-i">{icon || <Inbox size={15} />}</span>
      <div style={{ minWidth: 0 }}>
        <div className="an-empty-t">{title}</div>
        {body && <div className="an-empty-b">{body}</div>}
      </div>
      {action && <div style={{ marginLeft: 'auto' }}>{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------- <BenchRow> */
/* Metric vs industry range: label · range track with zone + marker · chip. */
export function BenchRow({ label, value, unit = '%', lo, hi, note, good, scaleMax }) {
  const max = scaleMax || Math.max(hi * 2, value * 1.5, 1);
  const pos = Math.min(100, (value / max) * 100);
  return (
    <div className="an-bench">
      <span className="an-bench-l">{label}</span>
      <span className="an-bench-track">
        <span className="zone" style={{ left: `${(lo / max) * 100}%`, width: `${((hi - lo) / max) * 100}%` }} />
        <i style={{ width: `${pos}%`, background: good ? '#0e9f6e' : '#f59e0b' }} />
        <b style={{ left: `${pos}%` }} />
      </span>
      <span className="an-bench-v">
        <Chip tone={good ? 'good' : 'warn'}>{value}{unit}</Chip>
        <span className="an-bench-n">{note} · industry {lo}–{hi}{unit}</span>
      </span>
    </div>
  );
}

/* ---------------------------------------------------------- <CohortGrid> */
/* Retention heatmap: 6 month columns, tint scales with the repeat rate. */
export function CohortGrid({ rows, months = 6 }) {
  const head = { fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--od-muted2)', fontWeight: 700 };
  return (
    <div className="an-coh">
      <div className="an-coh-head">
        <span className="an-coh-l" style={head}>Cohort</span>
        <span className="an-coh-buyers" style={head}>Buyers</span>
        <span className="an-coh-cells">{Array.from({ length: months }, (_, i) => <span key={i}>M{i + 1}</span>)}</span>
      </div>
      {rows.map((c) => (
        <div className="an-coh-row" key={c.cohort}>
          <span className="an-coh-l">{c.cohort}</span>
          <span className="an-coh-buyers">{nf.format(c.customers)}</span>
          <span className="an-coh-cells">
            {c.rates.slice(0, months).map((r, i) => {
              const h = r >= 25 ? 'h3' : r >= 15 ? 'h2' : r > 0 ? 'h1' : 'h0';
              return (
                <span className={`an-coh-cell ${h}`} key={i} title={`${c.cohort} · month ${i + 1} · ${r}% repeat`}>
                  {r > 0 ? `${r}%` : '·'}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- <StatStrip> */
export function StatStrip({ items }) {
  return (
    <div className="an-strip" style={{ gridTemplateColumns: `repeat(${items.length},1fr)` }}>
      {items.map((s) => (
        <div className="an-strip-i" key={s.label}>
          <div className="an-strip-l">{s.label}</div>
          <div className="an-strip-v">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- <Pills> */
export function Pills({ options, value, onChange, ariaLabel }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }} role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.v} type="button" className="an-chip click" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export { nf };
