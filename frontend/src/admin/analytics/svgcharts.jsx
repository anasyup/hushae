/* ============================================================================
 * ANALYTICS — hand-rolled SVG chart primitives
 *
 * Chart.js is already in the bundle, but it has no candlestick/financial
 * series without an extra plugin, and none of its charts can be styled to the
 * level the brief asks for. So these are plain SVG: full control over colour,
 * shape and motion, zero new dependencies, and they scale with the container.
 *
 * Every chart is honest about its own data:
 *   - candles are built from REAL daily revenue (open = first day, close = last
 *     day, high/low = best/worst day in the bucket). Nothing is invented.
 *   - partial buckets are drawn dashed and labelled, not silently padded.
 *
 * All geometry lives in pure exported helpers (toCandles, pareto, scale) so
 * scripts/test-analytics-charts.mjs can assert the maths without a browser.
 * ========================================================================== */
import { useState } from 'react';
import './charts.css';

/* ------------------------------------------------------------------ scale */
/* Map a value into pixel space. Guarded so flat/empty data can't produce
 * NaN or Infinity coordinates (a single-value series would otherwise divide
 * by zero). */
export function scale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin;
  const safe = span === 0 ? 1 : span;
  return (v) => rangeMin + ((v - domainMin) / safe) * (rangeMax - rangeMin);
}

/* ---------------------------------------------------------------- candles */
/* Turn a daily series into OHLC candles.
 * bucketDays adapts to the range so you always get a readable number of
 * candles: 7d → 2-day candles, 30d → 5-day, 90d → 15-day. */
export function toCandles(series, targetCount = 6) {
  const rows = (series || []).filter((d) => d && d.date);
  if (rows.length === 0) return { candles: [], bucketDays: 1 };

  const bucketDays = Math.max(2, Math.ceil(rows.length / Math.max(1, targetCount)));
  const candles = [];

  for (let i = 0; i < rows.length; i += bucketDays) {
    const bucket = rows.slice(i, i + bucketDays);
    const vals = bucket.map((d) => Number(d.revenue) || 0);
    const open = vals[0];
    const close = vals[vals.length - 1];
    const high = Math.max(...vals);
    const low = Math.min(...vals);
    const orders = bucket.reduce((s, d) => s + (Number(d.orders) || 0), 0);
    candles.push({
      from: bucket[0].date,
      to: bucket[bucket.length - 1].date,
      days: bucket.length,
      partial: bucket.length < bucketDays,
      open, close, high, low, orders,
      up: close >= open,
      total: vals.reduce((s, v) => s + v, 0),
    });
  }
  return { candles, bucketDays };
}

/* ----------------------------------------------------------------- pareto */
/* Bars sorted desc + the cumulative share line, plus the index where the
 * cumulative share first crosses `mark` (the classic "these N = 80%"). */
export function pareto(rows, key = 'revenue', mark = 80) {
  const items = [...(rows || [])].sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0));
  const total = items.reduce((s, r) => s + (Number(r[key]) || 0), 0);
  let run = 0;
  let crossIndex = -1;
  const out = items.map((r, i) => {
    const v = Number(r[key]) || 0;
    run += v;
    const cum = total ? (run / total) * 100 : 0;
    if (crossIndex === -1 && cum >= mark) crossIndex = i;
    return { ...r, value: v, share: total ? (v / total) * 100 : 0, cum };
  });
  return { items: out, total, crossIndex };
}

/* ------------------------------------------------------------ hover state */
function useTip() {
  const [i, setI] = useState(null);
  return [i, setI];
}

/* ======================================================================= */
/* CANDLESTICK — revenue per bucket, open/close/high/low                    */
/* ======================================================================= */
export function CandleChart({ series, height = 250, fmt = (v) => Math.round(v).toLocaleString('en-US') }) {
  const [tip, setTip] = useTip();
  const { candles, bucketDays } = toCandles(series);

  const W = 720; const H = height;
  const pad = { t: 14, r: 56, b: 34, l: 12 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (candles.length === 0) {
    return <p className="cx-none">No daily data in this range yet — candles build as orders come in.</p>;
  }

  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const y = scale(lo * 0.92, hi * 1.06 || 1, pad.t + ih, pad.t);
  const slot = iw / candles.length;
  const bw = Math.max(6, Math.min(30, slot * 0.52));

  /* simple moving average of bucket totals, for trend reading */
  const ma = candles.map((_, i) => {
    const w = candles.slice(Math.max(0, i - 2), i + 1);
    return w.reduce((s, c) => s + c.total, 0) / w.length;
  });

  const ticks = 4;
  const active = tip == null ? null : candles[tip];

  return (
    <div className="cx-wrap">
      <svg className="cx" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Revenue candles, ${candles.length} periods of about ${bucketDays} days`}>
        {/* y grid + labels */}
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = lo * 0.92 + ((hi * 1.06 - lo * 0.92) / ticks) * i;
          return (
            <g key={i}>
              <line className="cx-grid" x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} />
              <text className="cx-tick" x={W - pad.r + 8} y={y(v) + 3.5}>{fmt(v)}</text>
            </g>
          );
        })}

        {/* moving average */}
        <polyline
          className="cx-ma"
          points={candles.map((c, i) => `${pad.l + slot * i + slot / 2},${y(ma[i])}`).join(' ')}
        />

        {/* candles */}
        {candles.map((c, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const bodyTop = y(Math.max(c.open, c.close));
          const bodyBot = y(Math.min(c.open, c.close));
          const bodyH = Math.max(2, bodyBot - bodyTop);
          const cls = c.up ? 'cx-c up' : 'cx-c down';
          return (
            <g key={c.from} className={cls}
              onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
              style={{ opacity: tip == null || tip === i ? 1 : 0.42 }}>
              <title>{`${c.from} → ${c.to} · open ${fmt(c.open)} · high ${fmt(c.high)} · low ${fmt(c.low)} · close ${fmt(c.close)} · ${c.orders} orders`}</title>
              {/* hover target spans the full column so small bodies are easy to hit */}
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={ih} fill="transparent" />
              <line className="cx-wick" x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} />
              <rect
                className={`cx-body${c.partial ? ' partial' : ''}`}
                x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} rx={2.5}
              />
              <text className="cx-xlab" x={cx} y={H - 12} textAnchor="middle">
                {c.from.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="cx-legend">
        <span className="cx-lg"><i className="cx-sw up" /> up period</span>
        <span className="cx-lg"><i className="cx-sw down" /> down period</span>
        <span className="cx-lg"><i className="cx-sw ma" /> 3-period average</span>
        <span className="cx-lg muted">each candle ≈ {bucketDays} days · hover for detail</span>
      </div>

      {active && (
        <div className="cx-readout" role="status">
          <b>{active.from} → {active.to}</b>
          {active.partial && <span className="cx-part">partial period</span>}
          <span className="cx-ro">Open <b>{fmt(active.open)}</b></span>
          <span className="cx-ro">High <b>{fmt(active.high)}</b></span>
          <span className="cx-ro">Low <b>{fmt(active.low)}</b></span>
          <span className="cx-ro">Close <b>{fmt(active.close)}</b></span>
          <span className={`cx-ro ${active.up ? 'up' : 'down'}`}>
            {active.up ? '▲' : '▼'} {fmt(Math.abs(active.close - active.open))}
          </span>
          <span className="cx-ro">{active.orders} orders</span>
        </div>
      )}
    </div>
  );
}

/* ======================================================================= */
/* BUBBLE SCATTER — views vs conversion, bubble size = revenue              */
/* The single easiest "what should I fix?" picture: bottom-right = lots of   */
/* traffic that isn't converting.                                           */
/* ======================================================================= */
export function BubbleScatter({ points, height = 260, target = 1.5, fmt = (v) => `Rs ${Math.round(v).toLocaleString('en-US')}` }) {
  const [tip, setTip] = useTip();
  const rows = (points || []).filter((p) => p && p.views > 0);

  const W = 720; const H = height;
  const pad = { t: 16, r: 18, b: 40, l: 44 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (rows.length === 0) {
    return <p className="cx-none">No product views recorded in this range yet.</p>;
  }

  const maxViews = Math.max(...rows.map((r) => r.views), 1);
  const maxConv = Math.max(...rows.map((r) => r.conv || 0), target * 2, 1);
  const maxRev = Math.max(...rows.map((r) => r.revenue || 0), 1);
  const x = scale(0, maxViews * 1.08, pad.l, pad.l + iw);
  const y = scale(0, maxConv * 1.1, pad.t + ih, pad.t);
  const rOf = (rev) => 5 + Math.sqrt((rev || 0) / maxRev) * 17;

  const active = tip == null ? null : rows[tip];

  return (
    <div className="cx-wrap">
      <svg className="cx" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Product views against conversion rate, bubble size shows revenue">
        {/* quadrant shading: bottom-right = traffic that isn't converting */}
        <rect className="cx-zone bad" x={x(maxViews * 0.5)} y={y(target)} width={x(maxViews * 1.08) - x(maxViews * 0.5)} height={y(0) - y(target)} />
        <rect className="cx-zone good" x={x(maxViews * 0.5)} y={pad.t} width={x(maxViews * 1.08) - x(maxViews * 0.5)} height={y(target) - pad.t} />

        {/* guides */}
        <line className="cx-guide" x1={pad.l} x2={pad.l + iw} y1={y(target)} y2={y(target)} />
        <text className="cx-tick" x={pad.l + 4} y={y(target) - 5}>{target}% target conversion</text>
        <line className="cx-guide" x1={x(maxViews * 0.5)} x2={x(maxViews * 0.5)} y1={pad.t} y2={pad.t + ih} />

        {/* axes */}
        <line className="cx-axis" x1={pad.l} x2={pad.l + iw} y1={pad.t + ih} y2={pad.t + ih} />
        <line className="cx-axis" x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + ih} />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <text key={f} className="cx-tick" x={x(maxViews * 1.08 * f)} y={H - 20} textAnchor="middle">
            {Math.round(maxViews * 1.08 * f)}
          </text>
        ))}
        {[0, 0.5, 1].map((f) => (
          <text key={f} className="cx-tick" x={pad.l - 8} y={y(maxConv * 1.1 * f) + 3.5} textAnchor="end">
            {(maxConv * 1.1 * f).toFixed(0)}%
          </text>
        ))}
        <text className="cx-axislab" x={pad.l + iw / 2} y={H - 4} textAnchor="middle">product views →</text>
        <text className="cx-axislab" transform={`translate(12 ${pad.t + ih / 2}) rotate(-90)`} textAnchor="middle">conversion %</text>

        {/* bubbles */}
        {rows.map((p, i) => {
          const burning = p.views >= maxViews * 0.5 && (p.conv || 0) < target;
          const star = p.views >= maxViews * 0.5 && (p.conv || 0) >= target;
          const cls = burning ? 'burn' : star ? 'star' : 'mid';
          return (
            <g key={p.slug || p.name + i} className={`cx-bub ${cls}`}
              onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
              style={{ opacity: tip == null || tip === i ? 1 : 0.35 }}>
              <title>{`${p.name} · ${p.views} views · ${p.conv == null ? 'n/a' : p.conv + '%'} conversion · ${fmt(p.revenue)}`}</title>
              <circle cx={x(p.views)} cy={y(p.conv || 0)} r={rOf(p.revenue)} />
            </g>
          );
        })}
      </svg>

      <div className="cx-legend">
        <span className="cx-lg"><i className="cx-sw star" /> converting well</span>
        <span className="cx-lg"><i className="cx-sw burn" /> traffic not converting</span>
        <span className="cx-lg muted">bubble size = revenue</span>
      </div>

      {active && (
        <div className="cx-readout" role="status">
          <b>{active.name}</b>
          <span className="cx-ro">{active.views} views</span>
          <span className={`cx-ro ${(active.conv || 0) >= target ? 'up' : 'down'}`}>
            {active.conv == null ? 'no conversion' : `${active.conv}% conversion`}
          </span>
          <span className="cx-ro">{fmt(active.revenue)}</span>
          <span className="cx-ro">{active.orders} orders</span>
        </div>
      )}
    </div>
  );
}

/* ======================================================================= */
/* DONUT — share of revenue, with the total in the middle                   */
/* ======================================================================= */
function arc(cx, cy, r, a0, a1) {
  const p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(a0, r); const [x1, y1] = p(a1, r);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

export function DonutChart({ data, label = 'Total', size = 210, fmt = (v) => Math.round(v).toLocaleString('en-US') }) {
  const [tip, setTip] = useTip();
  const rows = (data || []).filter((d) => d && (Number(d.value) || 0) > 0);
  const total = rows.reduce((s, d) => s + (Number(d.value) || 0), 0);

  if (rows.length === 0 || total === 0) {
    return <p className="cx-none">Nothing to split yet in this range.</p>;
  }

  const S = size; const c = S / 2; const R = c - 14; const inner = R * 0.62;
  let a = -Math.PI / 2;
  const segs = rows.map((d) => {
    const sweep = (Number(d.value) / total) * Math.PI * 2;
    const seg = { ...d, a0: a, a1: a + sweep, pct: (Number(d.value) / total) * 100 };
    a += sweep;
    return seg;
  });

  const shown = tip == null ? null : segs[tip];
  const palette = ['--cx-1', '--cx-2', '--cx-3', '--cx-4', '--cx-5', '--cx-6'];

  return (
    <div className="cx-donut">
      <svg className="cx" viewBox={`0 0 ${S} ${S}`} width={S} height={S} role="img"
        aria-label={`${label} split into ${rows.length} parts`}>
        {segs.map((s, i) => (
          <path key={s.label} className="cx-seg"
            d={arc(c, c, (R + inner) / 2, s.a0 + 0.012, s.a1 - 0.012)}
            style={{
              stroke: `var(${palette[i % palette.length]})`,
              strokeWidth: R - inner,
              opacity: tip == null || tip === i ? 1 : 0.35,
            }}
            onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}>
            <title>{`${s.label}: ${fmt(s.value)} (${s.pct.toFixed(1)}%)`}</title>
          </path>
        ))}
        <text className="cx-donut-l" x={c} y={c - 6} textAnchor="middle">{shown ? shown.label : label}</text>
        <text className="cx-donut-v" x={c} y={c + 14} textAnchor="middle">
          {shown ? `${shown.pct.toFixed(1)}%` : fmt(total)}
        </text>
      </svg>
      <ul className="cx-key">
        {segs.map((s, i) => (
          <li key={s.label} onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
            style={{ opacity: tip == null || tip === i ? 1 : 0.5 }}>
            <i style={{ background: `var(${palette[i % palette.length]})` }} />
            <span className="cx-key-l">{s.label}</span>
            <span className="cx-key-v">{fmt(s.value)}</span>
            <span className="cx-key-p">{s.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ======================================================================= */
/* PARETO — ranked bars + cumulative share line + the 80% crossing          */
/* Answers "how much of my revenue comes from how few products?"            */
/* ======================================================================= */
export function ParetoChart({ rows, height = 250, mark = 80, fmt = (v) => `Rs ${Math.round(v).toLocaleString('en-US')}` }) {
  const [tip, setTip] = useTip();
  const { items, crossIndex } = pareto(rows);
  const top = items.slice(0, 8);

  const W = 720; const H = height;
  const pad = { t: 16, r: 42, b: 46, l: 12 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (top.length === 0) return <p className="cx-none">No sales in this range yet.</p>;

  const maxV = Math.max(...top.map((r) => r.value), 1);
  const y = scale(0, maxV * 1.08, pad.t + ih, pad.t);
  const yc = scale(0, 100, pad.t + ih, pad.t);
  const slot = iw / top.length;
  const bw = Math.max(8, Math.min(42, slot * 0.6));
  const active = tip == null ? null : top[tip];

  return (
    <div className="cx-wrap">
      <svg className="cx" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Top ${top.length} items by revenue with cumulative share`}>
        {[0, 25, 50, 75, 100].map((p) => (
          <g key={p}>
            <line className="cx-grid" x1={pad.l} x2={W - pad.r} y1={yc(p)} y2={yc(p)} />
            <text className="cx-tick" x={W - pad.r + 6} y={yc(p) + 3.5}>{p}%</text>
          </g>
        ))}

        {top.map((r, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const past = crossIndex !== -1 && i > crossIndex;
          return (
            <g key={r.name || r.slug || i}
              onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
              style={{ opacity: tip == null || tip === i ? 1 : 0.45 }}>
              <title>{`${r.name || r.slug}: ${fmt(r.value)} · ${r.share.toFixed(1)}% of total · ${r.cum.toFixed(1)}% cumulative`}</title>
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={ih} fill="transparent" />
              <rect className={`cx-bar${past ? ' faded' : ''}`} x={cx - bw / 2} y={y(r.value)} width={bw} height={Math.max(2, y(0) - y(r.value))} rx={4} />
              <text className="cx-xlab" x={cx} y={H - 26} textAnchor="middle">
                {(r.name || r.slug || '').slice(0, 14)}
              </text>
            </g>
          );
        })}

        <polyline className="cx-cum"
          points={top.map((r, i) => `${pad.l + slot * i + slot / 2},${yc(r.cum)}`).join(' ')} />
        {top.map((r, i) => (
          <circle key={i} className="cx-dot" cx={pad.l + slot * i + slot / 2} cy={yc(r.cum)} r={3} />
        ))}
        <line className="cx-guide" x1={pad.l} x2={W - pad.r} y1={yc(mark)} y2={yc(mark)} />
        <text className="cx-tick" x={pad.l + 4} y={yc(mark) - 5}>{mark}% of revenue</text>
      </svg>

      <div className="cx-legend">
        <span className="cx-lg"><i className="cx-sw bar" /> revenue</span>
        <span className="cx-lg"><i className="cx-sw cum" /> cumulative share</span>
        {crossIndex !== -1 && (
          <span className="cx-lg strong">
            {crossIndex + 1} item{crossIndex === 0 ? '' : 's'} = {mark}%+ of revenue
          </span>
        )}
      </div>

      {active && (
        <div className="cx-readout" role="status">
          <b>{active.name || active.slug}</b>
          <span className="cx-ro">{fmt(active.value)}</span>
          <span className="cx-ro">{active.share.toFixed(1)}% of total</span>
          <span className="cx-ro up">{active.cum.toFixed(1)}% cumulative</span>
        </div>
      )}
    </div>
  );
}

/* ======================================================================= */
/* GAUGE — one metric against its healthy industry band                     */
/* ======================================================================= */
export function GaugeChart({ value, lo, hi, max, label, unit = '%', size = 190 }) {
  const S = size; const c = S / 2; const R = c - 18;
  const v = Math.max(0, Math.min(max || hi * 2 || 1, Number(value) || 0));
  const top = max || hi * 2 || 1;
  const ang = (f) => Math.PI + f * Math.PI; /* left (180°) → right (360°) */
  const pt = (f) => [c + R * Math.cos(ang(f)), c + R * Math.sin(ang(f))];

  const a0 = ang(0); const a1 = ang(1);
  const zx0 = pt(lo / top); const zx1 = pt(hi / top);
  const needle = pt(v / top);
  const good = v >= lo && v <= hi;

  return (
    <div className="cx-gauge">
      <svg className="cx" viewBox={`0 0 ${S} ${S * 0.66}`} width={S} height={S * 0.66} role="img"
        aria-label={`${label}: ${value}${unit}, healthy band ${lo} to ${hi}${unit}`}>
        <path className="cx-arc" d={arc(c, c, R, a0, a1)} />
        <path className="cx-arc zone"
          d={`M ${zx0[0]} ${zx0[1]} A ${R} ${R} 0 0 1 ${zx1[0]} ${zx1[1]}`} />
        <line className="cx-needle" x1={c} y1={c} x2={needle[0]} y2={needle[1]} />
        <circle className="cx-hub" cx={c} cy={c} r={4.5} />
        <text className="cx-gauge-v" x={c} y={c - 14} textAnchor="middle">{value}{unit}</text>
        <text className="cx-gauge-l" x={c} y={c + 14} textAnchor="middle">{label}</text>
      </svg>
      <div className={`cx-gauge-s ${good ? 'up' : 'warn'}`}>
        {good ? 'in healthy band' : value < lo ? 'below band' : 'above band'} · {lo}–{hi}{unit}
      </div>
    </div>
  );
}
