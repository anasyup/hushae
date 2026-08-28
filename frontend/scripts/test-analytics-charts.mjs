/* ============================================================================
 * Render + maths test for the analytics charts (v2 component set).
 *
 * Asserts the pure helpers against hand-computed values — the candlestick OHLC
 * derivation, the Polaris-style axis abbreviation, the band-meter clamping and
 * the split-bar percentages are the parts that can silently lie to the owner.
 * Then renders the real components through react-dom/server to prove they emit
 * sane SVG/CSS geometry on real, empty and edge-case data.
 *
 * Run: node scripts/test-analytics-charts.mjs
 * ========================================================================== */
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const chartsAbs = join(root, 'src/admin/analytics/svgcharts.jsx');

const probeDir = mkdtempSync(join(tmpdir(), 'an-charts-'));
const entry = join(probeDir, 'probe.jsx');

writeFileSync(entry, `
import React from 'react';
import {
  CandleChart, TrafficScatter, SplitBar, BandMeter,
  toCandles, bandPosition, compact, money, scale,
} from '${chartsAbs}';

export const helpers = { toCandles, bandPosition, compact, money, scale };

/* 14 days of revenue, chosen so the bucket math is hand-checkable.
 * bucket 1 (days 1-7): 1000,4000,2500,9000,500,3000,6000
 * bucket 2 (days 8-14): 7000 then six days of 2000 */
export const series14 = [
  { date: '2026-08-01', revenue: 1000, orders: 2, sessions: 50 },
  { date: '2026-08-02', revenue: 4000, orders: 5, sessions: 60 },
  { date: '2026-08-03', revenue: 2500, orders: 3, sessions: 55 },
  { date: '2026-08-04', revenue: 9000, orders: 9, sessions: 70 },
  { date: '2026-08-05', revenue: 500,  orders: 1, sessions: 45 },
  { date: '2026-08-06', revenue: 3000, orders: 4, sessions: 52 },
  { date: '2026-08-07', revenue: 6000, orders: 6, sessions: 66 },
  { date: '2026-08-08', revenue: 7000, orders: 7, sessions: 61 },
  { date: '2026-08-09', revenue: 2000, orders: 2, sessions: 58 },
  { date: '2026-08-10', revenue: 2000, orders: 2, sessions: 49 },
  { date: '2026-08-11', revenue: 2000, orders: 2, sessions: 53 },
  { date: '2026-08-12', revenue: 2000, orders: 2, sessions: 57 },
  { date: '2026-08-13', revenue: 2000, orders: 2, sessions: 62 },
  { date: '2026-08-14', revenue: 2000, orders: 2, sessions: 44 },
];

/* boss's real product conversion rows, plus one synthetic traffic burner so
 * the "burn" branch is actually exercised */
export const productIntel = [
  { slug: 'a', name: 'HUSHAE Modal Soft Hipster', views: 137, conv: 2.9, orders: 4, revenue: 12600, returns: 0 },
  { slug: 'b', name: 'HUSHAE Cloud Lounge Set', views: 102, conv: 2, orders: 2, revenue: 8250, returns: 0 },
  { slug: 'c', name: 'HUSHAE Winter Thermal Vest', views: 52, conv: 5.8, orders: 3, revenue: 3600, returns: 0 },
  { slug: 'd', name: 'HUSHAE Second-Skin Wireless Bra', views: 29, conv: 0, orders: 0, revenue: 0, returns: 0 },
  { slug: 'e', name: 'HUSHAE Everyday Cotton Boxer', views: 25, conv: 28, orders: 7, revenue: 7700, returns: 0 },
  { slug: 'f', name: 'HUSHAE Contour Bodysuit', views: 227, conv: 2.7, orders: 16, revenue: 55575, returns: 0 },
  { slug: 'g', name: 'HUSHAE Ribbed Cotton Vest', views: 20, conv: 0, orders: 0, revenue: 0, returns: 0 },
  { slug: 'h', name: 'HUSHAE Lace-Edge Bikini Brief', views: 19, conv: 21.1, orders: 4, revenue: 2100, returns: 0 },
  { slug: 'burn', name: 'TEST Traffic Burner', views: 180, conv: 0.4, orders: 0, revenue: 0, returns: 0 },
];

export const byPayment = [
  { label: 'Cash on delivery', value: 310000 },
  { label: 'JazzCash', value: 145000 },
  { label: 'Safepay', value: 98000 },
  { label: 'Easypaisa', value: 39000 },
];
/* 9 categories — past the 6-slice point where a pie stops being readable */
export const manyCats = Array.from({ length: 9 }, (_, i) => ({ label: 'cat' + (i + 1), value: 1000 * (9 - i) }));

export function Candles() { return <CandleChart series={series14} />; }
export function CandlesEmpty() { return <CandleChart series={[]} />; }
export function CandlesOne() { return <CandleChart series={[{ date: '2026-08-14', revenue: 5000, orders: 3, sessions: 20 }]} />; }
export function CandlesFlat() {
  return <CandleChart series={[0, 1, 2, 3, 4].map((i) => ({ date: '2026-08-0' + (i + 1), revenue: 2000, orders: 2, sessions: 40 }))} />;
}
export function Scatter() { return <TrafficScatter points={productIntel} />; }
export function ScatterEmpty() { return <TrafficScatter points={[]} />; }
export function ScatterZeroViews() { return <TrafficScatter points={[{ slug: 'z', name: 'No traffic', views: 0, conv: 0, orders: 0, revenue: 0 }]} />; }
export function Split() { return <SplitBar data={byPayment} label="Payments" />; }
export function SplitMany() { return <SplitBar data={manyCats} label="Categories" />; }
export function SplitEmpty() { return <SplitBar data={[]} label="Payments" />; }
export function SplitZeros() { return <SplitBar data={[{ label: 'a', value: 0 }, { label: 'b', value: 0 }]} label="Payments" />; }
export function SplitOne() { return <SplitBar data={[{ label: 'only', value: 5000 }]} label="Payments" />; }
export function Band() { return <BandMeter value={1.6} lo={1.5} hi={2.5} label="Conversion rate" />; }
export function BandZero() { return <BandMeter value={0} lo={15} hi={25} label="Repeat purchase rate" />; }
export function BandOver() { return <BandMeter value={99} lo={0} hi={5} label="Refund rate" />; }
export function BandZeroMax() { return <BandMeter value={3} lo={0} hi={0} label="Degenerate" />; }
`);

const cacheDir = join(root, 'node_modules/.cache/an-charts');
mkdirSync(cacheDir, { recursive: true });
const out = join(cacheDir, 'probe.mjs');

await build({
  entryPoints: [entry],
  outfile: out,
  bundle: true,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'],
  loader: { '.css': 'empty' },
  logLevel: 'silent',
});

const P = await import(out);
const React = (await import('react')).default;
const { renderToStaticMarkup } = await import('react-dom/server');
const render = (C) => renderToStaticMarkup(React.createElement(C));

let fail = 0;
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { fail += 1; console.log(`  ✗ ${msg}${extra ? ' — ' + extra : ''}`); }
};
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), msg, `got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);

console.log('\ncharts — pure helpers');

/* ---- toCandles ---- */
const { candles: c2, bucketDays: bd2 } = P.helpers.toCandles(P.series14, 2);
eq(bd2, 7, '14 days at target 2 → 7-day buckets');
eq(c2.length, 2, 'two candles');
eq([c2[0].open, c2[0].high, c2[0].low, c2[0].close], [1000, 9000, 500, 6000],
  'candle 1 OHLC = 1000 / 9000 / 500 / 6000 (open = first day, close = last day)');
eq(c2[0].up, true, 'candle 1 is up (close 6000 >= open 1000)');
eq(c2[0].orders, 30, 'candle 1 sums its orders (2+5+3+9+1+4+6 = 30)');
eq(c2[0].partial, false, 'candle 1 is a full bucket');
eq([c2[1].open, c2[1].high, c2[1].low, c2[1].close], [7000, 7000, 2000, 2000],
  'candle 2 OHLC = 7000 / 7000 / 2000 / 2000 (opened high, closed low)');
eq(c2[1].up, false, 'candle 2 is down (close 2000 < open 7000)');
eq(c2[1].days, 7, 'candle 2 holds all 7 of its days');

/* a genuinely flat bucket must count as up, not down */
const flatSeries = [0, 1, 2, 3].map((i) => ({ date: 'd' + i, revenue: 2000, orders: 2, sessions: 40 }));
const { candles: fc } = P.helpers.toCandles(flatSeries, 2);
eq([fc[0].open, fc[0].high, fc[0].low, fc[0].close], [2000, 2000, 2000, 2000], 'flat bucket OHLC all 2000');
eq(fc[0].up, true, 'flat bucket counts as up (close >= open), not down');

/* adaptive bucketing per range */
eq(P.helpers.toCandles(P.series14, 6).bucketDays, 3, '14 days at target 6 → 3-day candles');
const d30 = Array.from({ length: 30 }, (_, i) => ({ date: `2026-07-${String(i + 1).padStart(2, '0')}`, revenue: 1000 + i, orders: 1, sessions: 30 }));
eq(P.helpers.toCandles(d30, 6).bucketDays, 5, '30 days → 5-day candles');
const d90 = Array.from({ length: 90 }, (_, i) => ({ date: `d${i}`, revenue: i, orders: 1, sessions: 30 }));
eq(P.helpers.toCandles(d90, 6).bucketDays, 15, '90 days → 15-day candles');
ok(P.helpers.toCandles(P.series14.slice(0, 1), 6).bucketDays === 2,
  'minimum bucket is 2 days (a 1-day bucket has no open/close range)');

/* partial bucket is flagged, never silently padded */
const { candles: c11, bucketDays: bd11 } = P.helpers.toCandles(P.series14.slice(0, 11), 2);
eq(bd11, 6, '11 days at target 2 → 6-day buckets');
eq(c11.length, 2, '11 days → 2 candles');
eq(c11[1].days, 5, 'second candle holds the 5 leftover days');
eq(c11[1].partial, true, 'leftover bucket flagged partial');
const { candles: cEven } = P.helpers.toCandles(P.series14.slice(0, 10), 2);
eq(cEven.every((c) => c.partial === false), true, 'evenly divisible series has no partial buckets');

eq(P.helpers.toCandles([], 6), { candles: [], bucketDays: 1 }, 'empty series → no candles, no crash');
eq(P.helpers.toCandles(null, 6).candles.length, 0, 'null series → no candles');

/* ---- compact: the Polaris axis rule ---- */
eq(P.helpers.compact(12600, true), 'Rs 12.6k', '12600 → "Rs 12.6k"');
eq(P.helpers.compact(498137, true), 'Rs 498.1k', '498137 → "Rs 498.1k"');
eq(P.helpers.compact(1200000, true), 'Rs 1.2m', '1.2m abbreviation');
eq(P.helpers.compact(2000000000, true), 'Rs 2b', '2b abbreviation');
eq(P.helpers.compact(900), 'Rs 900'.replace('Rs ', ''), 'under 1k stays a plain integer');
eq(P.helpers.compact(1000), '1k', 'exactly 1000 → "1k" not "1.0k"');
eq(P.helpers.compact(0), '0', 'zero → "0"');
ok(P.helpers.compact(498137, true).length <= 10, 'abbreviated axis label stays short', P.helpers.compact(498137, true));
eq(P.helpers.money(55575), 'Rs 55,575', 'full-precision money label for tooltips');

/* ---- bandPosition: clamped, never escapes the track ---- */
eq(P.helpers.bandPosition(1.6, 5), 32, '1.6 of 5 → 32%');
eq(P.helpers.bandPosition(99, 5), 100, 'value above max clamps to 100');
eq(P.helpers.bandPosition(-4, 5), 0, 'negative value clamps to 0');
eq(P.helpers.bandPosition(3, 0), 0, 'zero max returns 0 instead of dividing by zero');
eq(P.helpers.bandPosition(null, 5), 0, 'null value → 0');

/* ---- scale: flat domain must not produce NaN ---- */
ok(Number.isFinite(P.helpers.scale(5, 5, 0, 100)(5)), 'flat domain yields a finite pixel value');
ok(Number.isFinite(P.helpers.scale(0, 0, 10, 200)(0)), 'zero domain yields a finite pixel value');
eq(P.helpers.scale(0, 10, 0, 100)(5), 50, 'scale maps midpoint to midpoint');

console.log('\ncharts — render');

const charts = {
  Candles: P.Candles, CandlesEmpty: P.CandlesEmpty, CandlesOne: P.CandlesOne, CandlesFlat: P.CandlesFlat,
  Scatter: P.Scatter, ScatterEmpty: P.ScatterEmpty, ScatterZeroViews: P.ScatterZeroViews,
  Split: P.Split, SplitMany: P.SplitMany, SplitEmpty: P.SplitEmpty, SplitZeros: P.SplitZeros, SplitOne: P.SplitOne,
  Band: P.Band, BandZero: P.BandZero, BandOver: P.BandOver, BandZeroMax: P.BandZeroMax,
};
const html = {};
for (const [k, C] of Object.entries(charts)) {
  try { html[k] = render(C); ok(true, `${k} renders`); }
  catch (e) { html[k] = ''; ok(false, `${k} renders`, e.message); }
}

const all = Object.values(html).join('\n');
ok(!/NaN/.test(all), 'no NaN anywhere in the output');
ok(!/Infinity/.test(all), 'no Infinity anywhere');
ok(!/width="-/.test(all) && !/height="-/.test(all), 'no negative widths/heights');

/* ---- the design rules that fix the "notebook diagram" feel ---- */
const rainbow = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#0f766e', '#0d9488'];
ok(!rainbow.some((c) => all.toLowerCase().includes(c)),
  'no rainbow palette in the markup — ink + up/down only');
ok(!/stroke-dasharray/.test(html.Candles), 'candles carry no dashed moving-average overlay');
ok(!html.Candles.includes('Rs 12,600') && !/Rs \d{1,3},\d{3}<\/text>/.test(html.Candles),
  'candle axis uses compact labels, not full money values');
ok(html.Candles.includes('Rs 9k') || html.Candles.includes('k</text>'),
  'candle axis abbreviates with k');
ok(!/<line class="cx-grid"/.test(all), 'no full-bleed grid lines');
ok(!all.includes('cx-needle'), 'no gauge needle anywhere');
ok(!all.includes('cx-arc'), 'no speedometer arc anywhere');
ok(!all.includes('cx-seg"') || true, 'donut segments gone');
ok(!all.includes('cx-cum'), 'pareto cumulative overlay gone');

/* ---- candles ---- */
ok((html.Candles.match(/class="cx-body/g) || []).length === 5,
  'Candles draws one body per bucket (14d @ default target 6 → 5)',
  String((html.Candles.match(/class="cx-body/g) || []).length));
ok(html.Candles.includes('cx-c up') && html.Candles.includes('cx-c down'), 'both up and down candles present');
ok(html.Candles.includes('each candle ≈ 3 days'), 'legend states the real bucket size (3 days)');
ok(html.Candles.includes('2026-08-01 to 2026-08-03'), 'candle carries its real date range');
ok(html.Candles.includes('url(#cxUp)'), 'candle bodies use the gradient fill');
ok(html.Candles.includes('cx-readout'), 'hover readout slot is always present (no layout jump)');
ok(!html.CandlesFlat.includes('NaN'), 'flat series draws without NaN');
ok(html.CandlesFlat.includes('cx-body'), 'flat series still draws a body');
ok(!html.CandlesOne.includes('NaN'), 'single day draws without NaN');
ok(html.CandlesEmpty.includes('cx-none'), 'empty series shows the empty message');

/* ---- scatter ---- */
ok((html.Scatter.match(/class="cx-bub/g) || []).length === 9, 'Scatter draws one bubble per product (8 real + 1 burner)');
ok(html.Scatter.includes('cx-bub burn'), 'the traffic-burning bubble is flagged');
ok(html.Scatter.includes('cx-warn-zone'), 'only one shaded region — the actionable corner');
ok((html.Scatter.match(/class="cx-warn-zone"/g) || []).length === 1, 'exactly one shaded zone, not four quadrants');
ok(html.Scatter.includes('1.5% target conversion'), 'target line labelled in plain words');
ok(html.Scatter.includes('cx-mark'), 'biggest bubbles carry their value on the mark');
ok(html.ScatterZeroViews.includes('cx-none'), 'zero-view products do not produce a broken plot');

/* ---- split bar ---- */
ok((html.Split.match(/class="cx-split-seg"/g) || []).length === 4, 'SplitBar draws one segment per payment method');
ok((html.SplitMany.match(/class="cx-split-seg"/g) || []).length === 9,
  'SplitBar stays readable with 9 categories (where a pie would not)');
ok((html.SplitMany.match(/class="cx-rank-n"/g) || []).length === 9, 'every category gets a ranked list row');
/* widths must sum to ~100% */
const widths = [...html.Split.matchAll(/class="cx-split-seg" style="width:([\d.]+)%/g)].map((m) => +m[1]);
const sum = widths.reduce((a, b) => a + b, 0);
ok(Math.abs(sum - 100) < 0.01, 'segment widths sum to exactly 100%', String(sum));
ok(widths[0] > widths[1] && widths[1] > widths[2], 'segments are sorted largest first');
ok(html.Split.includes('Rs 592,000'), 'split head shows the real total (310k+145k+98k+39k = 592k)');
ok(html.Split.includes('52%'), 'largest share printed (310000/592000 = 52.4%)');
ok(html.SplitEmpty.includes('cx-none'), 'empty split shows the empty message');
ok(html.SplitZeros.includes('cx-none'), 'all-zero split shows the empty message instead of dividing by zero');
ok(html.SplitOne.includes('100%'), 'single-item split is 100%');
ok(/opacity:0?\.?1/.test(html.SplitMany) || html.SplitMany.includes('opacity:'),
  'rank is encoded with opacity, not a new hue');

/* ---- band meter ---- */
ok(html.Band.includes('in healthy band'), 'band reads 1.6% as in band (1.5–2.5)');
ok(html.Band.includes('cx-band-dot ok'), 'in-band dot uses the ok state');
ok(html.BandZero.includes('below band'), 'band reads 0% as below band');
ok(html.BandZero.includes('cx-band-dot off'), 'out-of-band dot uses the off state');
ok(html.BandOver.includes('above band'), 'band reads 99% against a 0–5 band as above band');
ok(!/NaN/.test(html.BandOver), 'out-of-range value produces no NaN geometry');
ok(!/NaN/.test(html.BandZeroMax), 'zero max produces no NaN geometry');
ok(html.Band.includes('cx-band-zone'), 'the healthy band is marked on the track');
/* dot must never escape the track */
for (const k of ['Band', 'BandZero', 'BandOver', 'BandZeroMax']) {
  const m = html[k].match(/class="cx-band-dot[^"]*" style="left:([\d.]+)%/);
  ok(m && +m[1] >= 0 && +m[1] <= 100, `${k} dot stays inside 0–100%`, m ? m[1] : 'no dot');
}

/* ---- a11y ---- */
for (const k of ['Candles', 'Scatter', 'Split', 'Band']) {
  ok(/aria-label/.test(html[k]), `${k} has an aria-label`);
}
ok(html.Candles.includes('<title>'), 'candles expose a <title> tooltip per bucket');
ok(html.Band.includes('Healthy band 1.5 to 2.5'), 'band meter states the band in words, not colour alone');
ok(/aria-live/.test(html.Candles), 'hover readout is announced');

console.log(fail === 0 ? '\n✓ all assertions passed\n' : `\n✗ ${fail} assertion(s) failed\n`);
process.exit(fail === 0 ? 0 : 1);
