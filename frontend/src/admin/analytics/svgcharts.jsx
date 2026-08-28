/* ============================================================================
 * ANALYTICS — chart primitives (v2, Shopify/Polaris-informed)
 *
 * Why v1 looked like a notebook diagram, and what changed:
 *
 *   v1 problem                        Polaris / 2026 SaaS rule applied
 *   --------------------------------  -------------------------------------------
 *   6-hue donut, teal+amber+indigo    "Use one color for all bars"; "color =
 *   +pink palette                       state only"; "avoid the rainbow"
 *   Full-bleed grid, dashed MA line,  "Axis lines should be unobtrusive";
 *   dashed quadrant + 80% guides      "DON'T use bleeding axis lines"
 *   Gauge with a needle (speedometer) Replaced by a calm band meter
 *   "Rs 12,600" on the y-axis         "Abbreviate using k / b — max 3 numeric
 *                                       chars, 1 decimal, 1 letter"
 *   Meaning carried by colour alone   Values labelled directly on the mark
 *   5 chart types                     Chart restraint — fewer, each answering
 *                                       one question
 *
 * Result: one ink colour for all data, green/red reserved strictly for
 * up/down and in-band/out-of-band. Everything else is neutral.
 *
 * Chart.js stays untouched in the bundle — these are hand-rolled SVG so the
 * styling can meet the brief, with zero new dependencies.
 *
 * Geometry lives in pure exported helpers (toCandles, bandPosition, compact,
 * scale) so scripts/test-analytics-charts.mjs can assert the maths headless.
 * ========================================================================== */
import { useState } from 'react';
import './charts.css';

/* ------------------------------------------------------------------ scale */
/* Map a value into pixel space. Guarded so flat/empty data can't produce NaN
 * or Infinity (a single-value series would otherwise divide by zero). */
export function scale(domainMin, domainMax, rangeMin, rangeMax) {
  const span = domainMax - domainMin;
  const safe = span === 0 ? 1 : span;
  return (v) => rangeMin + ((v - domainMin) / safe) * (rangeMax - rangeMin);
}

/* ---------------------------------------------------------------- compact */
/* Polaris axis rule: abbreviate with k/b, never exceed ~3 numeric chars. */
export function compact(v, currency = false) {
  const n = Number(v) || 0;
  const pre = currency ? 'Rs ' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${pre}${trim0((n / 1e9).toFixed(1))}b`;
  if (abs >= 1e6) return `${pre}${trim0((n / 1e6).toFixed(1))}m`;
  if (abs >= 1e3) return `${pre}${trim0((n / 1e3).toFixed(1))}k`;
  return `${pre}${Math.round(n)}`;
}
const trim0 = (s) => s.replace(/\.0$/, '');

/* Full-precision label for tooltips and direct value labels. */
export function money(v) {
  return `Rs ${Math.round(Number(v) || 0).toLocaleString('en-US')}`;
}

/* ---------------------------------------------------------------- candles */
/* Turn a daily series into OHLC candles.
 * bucketDays adapts to the range so you always get a readable count:
 * 7d → 2-day candles, 30d → 5-day, 90d → 15-day. */
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
    candles.push({
      from: bucket[0].date,
      to: bucket[bucket.length - 1].date,
      days: bucket.length,
      partial: bucket.length < bucketDays,
      open,
      close,
      high: Math.max(...vals),
      low: Math.min(...vals),
      orders: bucket.reduce((s, d) => s + (Number(d.orders) || 0), 0),
      up: close >= open,
      total: vals.reduce((s, v) => s + v, 0),
    });
  }
  return { candles, bucketDays };
}

/* ----------------------------------------------------------- bandPosition */
/* Where a value sits on a 0..max band meter, clamped so the dot can never
 * escape the track. */
export function bandPosition(value, max) {
  const top = Number(max) || 0;
  if (top <= 0) return 0;
  const v = Number(value) || 0;
  return Math.max(0, Math.min(100, (v / top) * 100));
}

/* ------------------------------------------------------------------- tip */
function useTip() {
  const [i, setI] = useState(null);
  return [i, setI];
}

/* ======================================================================= */
/* CANDLESTICK — revenue per period, open/close/high/low                    */
/*                                                                          */
/* One question: "is my revenue trending up or down, and how lumpy is it?"  */
/* Ink bodies with green/red reserved for direction. No moving-average      */
/* overlay, no full-bleed grid — three quiet reference values instead.      */
/* ======================================================================= */
export function CandleChart({ series, height = 240 }) {
  const [tip, setTip] = useTip();
  const { candles, bucketDays } = toCandles(series);

  const W = 720; const H = height;
  const pad = { t: 18, r: 52, b: 30, l: 8 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (candles.length === 0) {
    return <p className="cx-none">No daily sales in this range yet — candles appear as orders come in.</p>;
  }

  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const dMin = lo * 0.9;
  const dMax = hi * 1.08 || 1;
  const y = scale(dMin, dMax, pad.t + ih, pad.t);
  const slot = iw / candles.length;
  /* Polaris: bar roughly twice the width of the gap between bars */
  const bw = Math.max(7, Math.min(34, slot * 0.66));

  const active = tip == null ? null : candles[tip];

  return (
    <div className="cx-wrap">
      <svg className="cx" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Revenue candles: ${candles.length} periods of about ${bucketDays} days, high ${money(hi)}, low ${money(lo)}`}>
        <defs>
          <linearGradient id="cxUp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cx-up)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--cx-up)" stopOpacity="0.72" />
          </linearGradient>
          <linearGradient id="cxDn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--cx-down)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--cx-down)" stopOpacity="0.68" />
          </linearGradient>
        </defs>

        {/* three quiet reference values — not a full grid, and never bleeding
            past the data area */}
        {[0, 0.5, 1].map((f) => {
          const v = dMin + (dMax - dMin) * f;
          return (
            <g key={f}>
              <line className="cx-ref" x1={pad.l} x2={pad.l + iw} y1={y(v)} y2={y(v)} />
              <text className="cx-tick" x={W - pad.r + 10} y={y(v) + 3.5}>{compact(v, true)}</text>
            </g>
          );
        })}

        {candles.map((c, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(Math.max(c.open, c.close));
          const bot = y(Math.min(c.open, c.close));
          const h = Math.max(3, bot - top);
          return (
            <g key={c.from} className={`cx-c ${c.up ? 'up' : 'down'}`}
              onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
              style={{ opacity: tip == null || tip === i ? 1 : 0.38 }}>
              <title>{`${c.from} to ${c.to} · open ${money(c.open)} · high ${money(c.high)} · low ${money(c.low)} · close ${money(c.close)} · ${c.orders} orders`}</title>
              {/* full-height hover target so small bodies are easy to hit */}
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={ih} fill="transparent" />
              <line className="cx-wick" x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} />
              <rect className={`cx-body${c.partial ? ' partial' : ''}`}
                x={cx - bw / 2} y={top} width={bw} height={h} rx={Math.min(4, bw / 3)}
                fill={c.up ? 'url(#cxUp)' : 'url(#cxDn)'} />
              <text className="cx-xlab" x={cx} y={H - 10} textAnchor="middle">{c.from.slice(5)}</text>
            </g>
          );
        })}
      </svg>

      <div className="cx-foot">
        <span className="cx-lg"><i className="cx-sw up" /> up period</span>
        <span className="cx-lg"><i className="cx-sw down" /> down period</span>
        <span className="cx-lg quiet">
          each candle ≈ {bucketDays} days{candles.some((c) => c.partial) ? ' · dashed = part period' : ''}
        </span>
      </div>

      <div className={`cx-readout${active ? ' on' : ''}`} role="status" aria-live="polite">
        {active ? (
          <>
            <span className="cx-ro-t">{active.from} → {active.to}</span>
            {active.partial && <span className="cx-part">part period</span>}
            <span className="cx-ro">Open <b>{money(active.open)}</b></span>
            <span className="cx-ro">High <b>{money(active.high)}</b></span>
            <span className="cx-ro">Low <b>{money(active.low)}</b></span>
            <span className="cx-ro">Close <b>{money(active.close)}</b></span>
            <span className={`cx-ro ${active.up ? 'up' : 'down'}`}>
              {active.up ? '▲' : '▼'} {money(Math.abs(active.close - active.open))}
            </span>
            <span className="cx-ro">{active.orders} orders</span>
          </>
        ) : (
          <span className="cx-ro hint">Hover a candle for its open, high, low and close</span>
        )}
      </div>
    </div>
  );
}

/* ======================================================================= */
/* SCATTER — views vs conversion, bubble area = revenue                     */
/*                                                                          */
/* One question: "which products are burning traffic?" The bottom-right is  */
/* the answer, so it is the only thing shaded. Every bubble carries its own  */
/* number, so the point survives without colour.                            */
/* ======================================================================= */
export function TrafficScatter({ points, height = 260, target = 1.5 }) {
  const [tip, setTip] = useTip();
  const rows = (points || []).filter((p) => p && p.views > 0);

  const W = 720; const H = height;
  const pad = { t: 18, r: 20, b: 38, l: 46 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;

  if (rows.length === 0) {
    return <p className="cx-none">No product views recorded in this range yet.</p>;
  }

  const maxViews = Math.max(...rows.map((r) => r.views), 1);
  const maxConv = Math.max(...rows.map((r) => r.conv || 0), target * 2, 1);
  const maxRev = Math.max(...rows.map((r) => r.revenue || 0), 1);
  const xMax = maxViews * 1.08;
  const yMax = maxConv * 1.12;
  const x = scale(0, xMax, pad.l, pad.l + iw);
  const y = scale(0, yMax, pad.t + ih, pad.t);
  const rOf = (rev) => 6 + Math.sqrt((rev || 0) / maxRev) * 16;

  /* the only threshold that matters: is it converting or not */
  const splitX = x(maxViews * 0.5);
  const splitY = y(target);
  const active = tip == null ? null : rows[tip];

  /* label only the biggest bubbles, so the plot stays calm */
  const labelled = [...rows].sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).slice(0, 3);
  const isLabelled = (p) => labelled.includes(p);

  return (
    <div className="cx-wrap">
      <svg className="cx" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Product views against conversion rate. Bubble size is revenue. The shaded corner marks products with high views but conversion below target.">
        {/* the one shaded region — the actionable corner, nothing else */}
        <rect className="cx-warn-zone" x={splitX} y={splitY}
          width={Math.max(0, pad.l + iw - splitX)} height={Math.max(0, y(0) - splitY)} rx={8} />

        {/* axes: only the two the data needs, no full grid */}
        <line className="cx-axis" x1={pad.l} x2={pad.l + iw} y1={pad.t + ih} y2={pad.t + ih} />
        <line className="cx-axis" x1={pad.l} x2={pad.l} y1={pad.t} y2={pad.t + ih} />

        {/* the conversion target, labelled in plain words */}
        <line className="cx-target" x1={pad.l} x2={pad.l + iw} y1={splitY} y2={splitY} />
        <text className="cx-note" x={pad.l + iw} y={splitY - 7} textAnchor="end">
          {target}% target conversion
        </text>

        {[0, 0.5, 1].map((f) => (
          <text key={`x${f}`} className="cx-tick" x={x(xMax * f)} y={H - 18} textAnchor="middle">
            {Math.round(xMax * f)}
          </text>
        ))}
        {[0, 0.5, 1].map((f) => (
          <text key={`y${f}`} className="cx-tick" x={pad.l - 10} y={y(yMax * f) + 3.5} textAnchor="end">
            {(yMax * f).toFixed(0)}%
          </text>
        ))}
        <text className="cx-axislab" x={pad.l + iw / 2} y={H - 3} textAnchor="middle">product views</text>

        {rows.map((p, i) => {
          const burning = p.views >= maxViews * 0.5 && (p.conv || 0) < target;
          return (
            <g key={p.slug || p.name + i} className={`cx-bub${burning ? ' burn' : ''}`}
              onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
              style={{ opacity: tip == null || tip === i ? 1 : 0.32 }}>
              <title>{`${p.name} · ${p.views} views · ${p.conv == null ? 'no conversions' : p.conv + '% conversion'} · ${money(p.revenue)} · ${p.orders} orders`}</title>
              <circle cx={x(p.views)} cy={y(p.conv || 0)} r={rOf(p.revenue)} />
              {/* value on the mark — the point survives without colour */}
              {isLabelled(p) && (
                <text className="cx-mark" x={x(p.views)} y={y(p.conv || 0) - rOf(p.revenue) - 5} textAnchor="middle">
                  {compact(p.revenue, true)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="cx-foot">
        <span className="cx-lg"><i className="cx-sw dot" /> bubble size = revenue</span>
        <span className="cx-lg"><i className="cx-sw zone" /> high views, below target — check price, photos or stock</span>
      </div>

      <div className={`cx-readout${active ? ' on' : ''}`} role="status" aria-live="polite">
        {active ? (
          <>
            <span className="cx-ro-t">{active.name}</span>
            <span className="cx-ro">{active.views} views</span>
            <span className={`cx-ro ${(active.conv || 0) >= target ? 'up' : 'down'}`}>
              {active.conv == null ? 'no conversions' : `${active.conv}% conversion`}
            </span>
            <span className="cx-ro">{money(active.revenue)}</span>
            <span className="cx-ro">{active.orders} orders</span>
          </>
        ) : (
          <span className="cx-ro hint">Hover a bubble to see that product</span>
        )}
      </div>
    </div>
  );
}

/* ======================================================================= */
/* SPLIT — one 100% bar plus a ranked list                                  */
/*                                                                          */
/* One question: "where does the money come from?" A ranked list with the    */
/* value printed on each row beats a multi-coloured pie: no legend round     */
/* trip, and it stays readable past six categories (Polaris switches to a   */
/* table at that point anyway).                                             */
/* ======================================================================= */
export function SplitBar({ data, label = 'Total' }) {
  const [tip, setTip] = useTip();
  const rows = (data || [])
    .map((d) => ({ ...d, value: Number(d.value) || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = rows.reduce((s, d) => s + d.value, 0);

  if (rows.length === 0 || total === 0) {
    return <p className="cx-none">Nothing to split yet in this range.</p>;
  }

  /* monochrome ramp: one hue, opacity encodes rank. Never a rainbow. */
  const opacities = [1, 0.72, 0.52, 0.38, 0.28, 0.2, 0.15, 0.11];
  let left = 0;
  const segs = rows.map((d, i) => {
    const pct = (d.value / total) * 100;
    const seg = { ...d, pct, left, opacity: opacities[Math.min(i, opacities.length - 1)] };
    left += pct;
    return seg;
  });
  const active = tip == null ? null : segs[tip];

  return (
    <div className="cx-split">
      <div className="cx-split-head">
        <span className="cx-split-l">{label}</span>
        <span className="cx-split-v">{money(active ? active.value : total)}</span>
      </div>

      <div className="cx-split-track" role="img"
        aria-label={`${label} split: ${rows.map((r) => `${r.label} ${((r.value / total) * 100).toFixed(0)}%`).join(', ')}`}>
        {segs.map((s, i) => (
          <span key={s.label} className="cx-split-seg"
            style={{ width: `${s.pct}%`, opacity: tip == null || tip === i ? s.opacity : s.opacity * 0.35 }}
            onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}>
            <em>{s.pct >= 9 ? `${Math.round(s.pct)}%` : ''}</em>
          </span>
        ))}
      </div>

      <ol className="cx-rank">
        {segs.map((s, i) => (
          <li key={s.label} onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)}
            style={{ opacity: tip == null || tip === i ? 1 : 0.45 }}>
            <span className="cx-rank-n">{i + 1}</span>
            <span className="cx-rank-l">{s.label}</span>
            <span className="cx-rank-bar"><i style={{ width: `${s.pct}%`, opacity: s.opacity }} /></span>
            <span className="cx-rank-v">{money(s.value)}</span>
            <span className="cx-rank-p">{s.pct.toFixed(s.pct < 10 ? 1 : 0)}%</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ======================================================================= */
/* BAND METER — one metric against its healthy industry band                */
/*                                                                          */
/* Replaces the v1 gauge. A needle on an arc reads as a speedometer          */
/* diagram; a quiet track with the healthy band marked, the value printed,   */
/* and the verdict in words reads as a product.                             */
/* ======================================================================= */
export function BandMeter({ value, lo, hi, label, unit = '%', max }) {
  const v = Number(value) || 0;
  const top = Number(max) || Math.max(hi * 2.2, v * 1.35, 1);
  const pos = bandPosition(v, top);
  const zLo = bandPosition(lo, top);
  const zHi = bandPosition(hi, top);
  const good = v >= lo && v <= hi;
  const verdict = good ? 'in healthy band' : v < lo ? 'below band' : 'above band';

  return (
    <div className="cx-band">
      <div className="cx-band-head">
        <span className="cx-band-l">{label}</span>
        <span className={`cx-band-v ${good ? 'ok' : 'off'}`}>
          {v}{unit}
          <em>{verdict}</em>
        </span>
      </div>
      <div className="cx-band-track" role="img"
        aria-label={`${label}: ${v}${unit}. Healthy band ${lo} to ${hi}${unit}. ${verdict}.`}>
        <span className="cx-band-zone" style={{ left: `${zLo}%`, width: `${Math.max(0, zHi - zLo)}%` }} />
        <span className={`cx-band-dot ${good ? 'ok' : 'off'}`} style={{ left: `${pos}%` }} />
      </div>
      <div className="cx-band-scale">
        <span>0{unit}</span>
        <span className="cx-band-hint">healthy {lo}–{hi}{unit}</span>
        <span>{compact(top)}{unit === '%' ? '' : ''}</span>
      </div>
    </div>
  );
}
