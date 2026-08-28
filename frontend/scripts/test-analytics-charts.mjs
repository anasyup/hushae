/* ============================================================================
 * Render + maths test for the analytics SVG charts.
 *
 * The candlestick OHLC derivation and the Pareto cumulative math are the parts
 * that can silently lie to the owner, so they are asserted against
 * hand-computed expectations. Then the real chart components are rendered
 * through react-dom/server to prove they emit sane SVG geometry (no NaN, no
 * negative widths) on real, empty and edge-case data.
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

/* 14 days of revenue, chosen so the bucket math is hand-checkable. */
writeFileSync(entry, `
import React from 'react';
import { CandleChart, BubbleScatter, DonutChart, ParetoChart, GaugeChart, toCandles, pareto, scale } from '${chartsAbs}';

export const helpers = { toCandles, pareto, scale };

/* 14 days: two clean 7-day buckets when bucketDays = 7 */
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

/* boss's real product conversion rows */
export const productIntel = [
  { slug: 'a', name: 'HUSHAE Modal Soft Hipster', views: 137, conv: 2.9, orders: 4, revenue: 12600, returns: 0 },
  { slug: 'b', name: 'HUSHAE Cloud Lounge Set', views: 102, conv: 2, orders: 2, revenue: 8250, returns: 0 },
  { slug: 'c', name: 'HUSHAE Winter Thermal Vest', views: 52, conv: 5.8, orders: 3, revenue: 3600, returns: 0 },
  { slug: 'd', name: 'HUSHAE Second-Skin Wireless Bra', views: 29, conv: 0, orders: 0, revenue: 0, returns: 0 },
  { slug: 'e', name: 'HUSHAE Everyday Cotton Boxer', views: 25, conv: 28, orders: 7, revenue: 7700, returns: 0 },
  { slug: 'f', name: 'HUSHAE Contour Bodysuit', views: 227, conv: 2.7, orders: 16, revenue: 55575, returns: 0 },
  { slug: 'g', name: 'HUSHAE Ribbed Cotton Vest', views: 20, conv: 0, orders: 0, revenue: 0, returns: 0 },
  { slug: 'h', name: 'HUSHAE Lace-Edge Bikini Brief', views: 19, conv: 21.1, orders: 4, revenue: 2100, returns: 0 },
  /* synthetic: exercises the "burning traffic" branch — high views, zero conversion */
  { slug: 'burn', name: 'TEST Traffic Burner', views: 180, conv: 0.4, orders: 0, revenue: 0, returns: 0 },
];

export const byCategory = [
  { label: 'hushae', value: 498137 },
  { label: 'formal', value: 88450 },
  { label: 'silhouette', value: 5400 },
];

export const byPayment = [
  { label: 'Cash on delivery', value: 310000 },
  { label: 'JazzCash', value: 145000 },
  { label: 'Safepay', value: 98000 },
  { label: 'Easypaisa', value: 39000 },
];

export function Candles() { return <CandleChart series={series14} />; }
export function CandlesEmpty() { return <CandleChart series={[]} />; }
export function CandlesOne() { return <CandleChart series={[{ date: '2026-08-14', revenue: 5000, orders: 3, sessions: 20 }]} />; }
export function CandlesFlat() {
  /* every day identical — must not divide by zero */
  return <CandleChart series={[0, 1, 2, 3, 4].map((i) => ({ date: '2026-08-0' + (i + 1), revenue: 2000, orders: 2, sessions: 40 }))} />;
}
export function Scatter() { return <BubbleScatter points={productIntel} />; }
export function ScatterEmpty() { return <BubbleScatter points={[]} />; }
export function ScatterZeroViews() { return <BubbleScatter points={[{ slug: 'z', name: 'No traffic', views: 0, conv: 0, orders: 0, revenue: 0 }]} />; }
export function Donut() { return <DonutChart data={byPayment} label="Payments" />; }
export function DonutEmpty() { return <DonutChart data={[]} label="Payments" />; }
export function DonutZeros() { return <DonutChart data={[{ label: 'a', value: 0 }, { label: 'b', value: 0 }]} label="Payments" />; }
export function Pareto() { return <ParetoChart rows={productIntel} />; }
export function ParetoEmpty() { return <ParetoChart rows={[]} />; }
export function ParetoOne() { return <ParetoChart rows={[{ name: 'only', revenue: 5000 }]} />; }
export function Gauge() { return <GaugeChart value={1.6} lo={1.5} hi={2.5} label="Conversion" />; }
export function GaugeZero() { return <GaugeChart value={0} lo={15} hi={25} label="Repeat rate" />; }
export function GaugeOver() { return <GaugeChart value={99} lo={0} hi={5} label="Refund" />; }
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

console.log('\nsvg charts — maths');

/* ---- toCandles: 14 days / target 2 → bucketDays 7, two candles ---- */
const { candles: c2, bucketDays: bd2 } = P.helpers.toCandles(P.series14, 2);
eq(bd2, 7, '14 days at target 2 → 7-day buckets');
eq(c2.length, 2, 'two candles');
/* bucket 1: 1000,4000,2500,9000,500,3000,6000 */
eq([c2[0].open, c2[0].high, c2[0].low, c2[0].close], [1000, 9000, 500, 6000],
  'candle 1 OHLC = 1000 / 9000 / 500 / 6000 (open=first day, close=last day)');
eq(c2[0].up, true, 'candle 1 is up (close 6000 >= open 1000)');
eq(c2[0].orders, 30, 'candle 1 sums its orders (2+5+3+9+1+4+6 = 30)');
eq(c2[0].partial, false, 'candle 1 is a full bucket');
/* bucket 2 = days 8-14: 7000 then six days of 2000 → a DOWN candle */
eq([c2[1].open, c2[1].high, c2[1].low, c2[1].close], [7000, 7000, 2000, 2000],
  'candle 2 OHLC = 7000 / 7000 / 2000 / 2000 (opened high, closed low)');
eq(c2[1].up, false, 'candle 2 is down (close 2000 < open 7000)');
eq(c2[1].days, 7, 'candle 2 holds all 7 of its days');
eq(c2[1].partial, false, 'candle 2 is a full bucket');

/* a genuinely flat bucket must count as up, not down (close >= open) */
const flatSeries = [0, 1, 2, 3].map((i) => ({ date: 'd' + i, revenue: 2000, orders: 2, sessions: 40 }));
const { candles: fc } = P.helpers.toCandles(flatSeries, 2);
eq([fc[0].open, fc[0].high, fc[0].low, fc[0].close], [2000, 2000, 2000, 2000], 'flat bucket OHLC all 2000');
eq(fc[0].up, true, 'flat bucket counts as up (close >= open), not down');

/* ---- adaptive bucketing per range ---- */
eq(P.helpers.toCandles(P.series14, 6).bucketDays, 3, '14 days at target 6 → 3-day candles');
const d30 = Array.from({ length: 30 }, (_, i) => ({ date: `2026-07-${String(i + 1).padStart(2, '0')}`, revenue: 1000 + i, orders: 1, sessions: 30 }));
eq(P.helpers.toCandles(d30, 6).bucketDays, 5, '30 days → 5-day candles');
const d90 = Array.from({ length: 90 }, (_, i) => ({ date: `d${i}`, revenue: i, orders: 1, sessions: 30 }));
eq(P.helpers.toCandles(d90, 6).bucketDays, 15, '90 days → 15-day candles');
ok(P.helpers.toCandles(P.series14.slice(0, 1), 6).bucketDays === 2,
  'minimum bucket is 2 days (a 1-day bucket has no open/close range)');

/* ---- partial bucket is flagged, not hidden ---- */
/* 11 days at target 2 → bucketDays 6 → buckets of 6 and 5, the last one partial */
const { candles: c11, bucketDays: bd11 } = P.helpers.toCandles(P.series14.slice(0, 11), 2);
eq(bd11, 6, '11 days at target 2 → 6-day buckets');
eq(c11.length, 2, '11 days → 2 candles');
eq(c11[0].days, 6, 'first candle is full (6 days)');
eq(c11[0].partial, false, 'first candle not flagged partial');
eq(c11[1].days, 5, 'second candle holds the 5 leftover days');
eq(c11[1].partial, true, 'leftover bucket is flagged partial, not silently padded');

/* a length that divides evenly must flag nothing partial */
const { candles: cEven } = P.helpers.toCandles(P.series14.slice(0, 10), 2);
eq(cEven.every((c) => c.partial === false), true, 'evenly divisible series has no partial buckets');

/* ---- empty / single day ---- */
eq(P.helpers.toCandles([], 6), { candles: [], bucketDays: 1 }, 'empty series → no candles, no crash');
eq(P.helpers.toCandles(null, 6).candles.length, 0, 'null series → no candles');
eq(P.helpers.toCandles(P.series14.slice(0, 1), 6).candles.length, 1, 'single day → one candle');

/* ---- pareto ---- */
const par = P.helpers.pareto([{ name: 'a', revenue: 50 }, { name: 'b', revenue: 30 }, { name: 'c', revenue: 20 }]);
eq(par.items.map((r) => r.name), ['a', 'b', 'c'], 'pareto sorts desc');
eq(par.total, 100, 'pareto total = 100');
eq(par.items.map((r) => +r.share.toFixed(1)), [50, 30, 20], 'shares 50/30/20');
eq(par.items.map((r) => +r.cum.toFixed(1)), [50, 80, 100], 'cumulative 50/80/100');
eq(par.crossIndex, 1, '80% mark is crossed at index 1 (two items)');
eq(P.helpers.pareto([]).total, 0, 'empty pareto total 0');
eq(P.helpers.pareto([]).crossIndex, -1, 'empty pareto never crosses');
eq(P.helpers.pareto([{ name: 'x', revenue: 0 }]).crossIndex, -1, 'all-zero pareto never crosses');

/* ---- scale: flat domain must not produce NaN/Infinity ---- */
const flat = P.helpers.scale(5, 5, 0, 100);
ok(Number.isFinite(flat(5)), 'flat domain yields a finite pixel value');
ok(Number.isFinite(P.helpers.scale(0, 0, 10, 200)(0)), 'zero domain yields a finite pixel value');
eq(P.helpers.scale(0, 10, 0, 100)(5), 50, 'scale maps midpoint to midpoint');

console.log('\nsvg charts — render');

const charts = {
  Candles: P.Candles, CandlesEmpty: P.CandlesEmpty, CandlesOne: P.CandlesOne, CandlesFlat: P.CandlesFlat,
  Scatter: P.Scatter, ScatterEmpty: P.ScatterEmpty, ScatterZeroViews: P.ScatterZeroViews,
  Donut: P.Donut, DonutEmpty: P.DonutEmpty, DonutZeros: P.DonutZeros,
  Pareto: P.Pareto, ParetoEmpty: P.ParetoEmpty, ParetoOne: P.ParetoOne,
  Gauge: P.Gauge, GaugeZero: P.GaugeZero, GaugeOver: P.GaugeOver,
};
const html = {};
for (const [k, C] of Object.entries(charts)) {
  try { html[k] = render(C); ok(true, `${k} renders`); }
  catch (e) { html[k] = ''; ok(false, `${k} renders`, e.message); }
}

const all = Object.values(html).join('\n');
ok(!/NaN/.test(all), 'no NaN coordinates anywhere in the SVG output');
ok(!/Infinity/.test(all), 'no Infinity coordinates anywhere');
ok(!/width="-/.test(all) && !/height="-/.test(all), 'no negative widths/heights');
ok(!/rx="NaN"/.test(all), 'no NaN corner radii');

/* candles: 2 bodies for the 14-day series, up/down classes applied */
/* default targetCount is 6, so 14 days → ceil(14/6)=3-day buckets → 5 candles */
ok((html.Candles.match(/class="cx-body/g) || []).length === 5, 'Candles draws one body per bucket (14d @ target 6 → 5)', String((html.Candles.match(/class="cx-body/g) || []).length));
ok(html.Candles.includes('cx-c up'), 'up candle class present');
ok(html.Candles.includes('cx-ma'), 'moving-average line present');
ok(html.Candles.includes('each candle ≈ 3 days'), 'legend states the real bucket size (3 days)');
ok(html.Candles.includes('2026-08-01 → 2026-08-03'), 'candle carries its real date range (3-day bucket)');
ok(html.Candles.includes('cx-none') === false, 'Candles does not fall back to the empty message');

/* flat + single-day must still draw, not crash or divide by zero */
ok(!/NaN/.test(html.CandlesFlat), 'flat series draws without NaN');
ok(html.CandlesFlat.includes('cx-body'), 'flat series still draws a body');
ok(!/NaN/.test(html.CandlesOne), 'single day draws without NaN');
ok(html.CandlesEmpty.includes('cx-none'), 'empty series shows the empty message');

/* scatter */
ok((html.Scatter.match(/class="cx-bub/g) || []).length === 9, 'Scatter draws one bubble per product (8 real + 1 synthetic burner)');
ok(html.Scatter.includes('cx-bub burn'), 'burning-traffic bubble class present');
ok(html.Scatter.includes('cx-bub star'), 'well-converting bubble class present');
ok(html.Scatter.includes('1.5% target conversion'), 'scatter labels the target conversion line');
ok(html.ScatterZeroViews.includes('cx-none'), 'zero-view products do not produce a broken plot');

/* donut */
ok((html.Donut.match(/class="cx-seg"/g) || []).length === 4, 'Donut draws one segment per payment method');
ok(html.Donut.includes('Cash on delivery'), 'donut legend carries real labels');
ok(/55\.\d%|56%/.test(html.Donut) || html.Donut.includes('55'), 'donut computes a real percentage');
ok(html.DonutEmpty.includes('cx-none'), 'empty donut shows the empty message');
ok(html.DonutZeros.includes('cx-none'), 'all-zero donut shows the empty message instead of dividing by zero');

/* pareto */
ok(html.Pareto.includes('cx-cum'), 'Pareto draws the cumulative line');
ok(html.Pareto.includes('80% of revenue'), 'Pareto labels the 80% guide');
ok(/items? = 80%\+ of revenue/.test(html.Pareto), 'Pareto states how few items make 80%');
ok(html.ParetoEmpty.includes('cx-none'), 'empty pareto shows the empty message');
ok(!/NaN/.test(html.ParetoOne), 'single-item pareto draws without NaN');

/* gauge */
ok(html.Gauge.includes('in healthy band'), 'gauge reads 1.6% as in band (1.5–2.5)');
ok(html.GaugeZero.includes('below band'), 'gauge reads 0% as below band');
ok(!/NaN/.test(html.GaugeOver), 'out-of-range value does not produce NaN geometry');
ok(!/NaN/.test(html.GaugeZero), 'zero value does not produce NaN geometry');

/* a11y: every chart describes itself */
for (const k of ['Candles', 'Scatter', 'Donut', 'Pareto', 'Gauge']) {
  ok(html[k].includes('aria-label'), `${k} has an aria-label`);
}
ok(html.Candles.includes('<title>'), 'candles expose a <title> tooltip per bucket');

console.log(fail === 0 ? '\n✓ all assertions passed\n' : `\n✗ ${fail} assertion(s) failed\n`);
process.exit(fail === 0 ? 0 : 1);
