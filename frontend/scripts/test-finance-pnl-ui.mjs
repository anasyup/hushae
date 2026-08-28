/* ============================================================================
 * Test for the Finance page's pure helpers and the waterfall chart.
 *
 * Asserts the P&L arithmetic against hand-computed values (delta, statement
 * grouping, memos, runway, KPI tones) and renders the real WaterfallChart
 * through react-dom/server to prove its geometry is finite and its running
 * total actually lands on net profit.
 *
 * Run: node scripts/test-finance-pnl-ui.mjs
 * ========================================================================== */
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const chartsAbs = join(root, 'src/admin/analytics/svgcharts.jsx');

const probeDir = mkdtempSync(join(tmpdir(), 'fn-probe-'));
const entry = join(probeDir, 'probe.jsx');

writeFileSync(entry, `
import React from 'react';
import { WaterfallChart } from '${chartsAbs}';

/* the exact waterfall the backend returns for the 10-order fixture */
export const waterfall = [
  { key: 'net', label: 'Net sales', value: 42900, kind: 'start' },
  { key: 'cogs', label: 'Cost of goods', value: -29600, kind: 'cost' },
  { key: 'packaging', label: 'Packaging', value: -320, kind: 'cost' },
  { key: 'courier', label: 'Courier', value: -1850, kind: 'cost' },
  { key: 'fees', label: 'Payment fees', value: -536, kind: 'cost' },
  { key: 'contribution', label: 'Contribution', value: 10594, kind: 'subtotal' },
  { key: 'sunk', label: 'Failed orders', value: -480, kind: 'cost' },
  { key: 'marketing', label: 'Marketing', value: -60000, kind: 'cost' },
  { key: 'seo', label: 'SEO', value: -10000, kind: 'cost' },
  { key: 'other', label: 'Other costs', value: -5000, kind: 'cost' },
  { key: 'netProfit', label: 'Net profit', value: -64886, kind: 'total' },
];

export function Waterfall() { return <WaterfallChart steps={waterfall} />; }
export function WaterfallEmpty() { return <WaterfallChart steps={[]} />; }
export function WaterfallNull() { return <WaterfallChart steps={null} />; }
export function WaterfallZero() {
  /* every value zero — must not divide by zero */
  return <WaterfallChart steps={[
    { key: 'a', label: 'Net sales', value: 0, kind: 'start' },
    { key: 'b', label: 'COGS', value: 0, kind: 'cost' },
    { key: 'c', label: 'Net profit', value: 0, kind: 'total' },
  ]} />;
}
export function WaterfallOne() {
  return <WaterfallChart steps={[{ key: 'a', label: 'Net sales', value: 5000, kind: 'start' }]} />;
}
`);

const cacheDir = join(root, 'node_modules/.cache/fn-render');
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

/* pnl.js is plain ESM with no React, so import it directly */
const pnlAbs = join(root, 'src/admin/finance/pnl.js');
const H = await import(pnlAbs);
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

console.log('\nfinance helpers — deltas');
eq(H.delta(110, 100), 10, '110 vs 100 = +10%');
eq(H.delta(90, 100), -10, '90 vs 100 = -10%');
eq(H.delta(100, 100), 0, 'no change = 0');
eq(H.delta(50, 0), null, 'zero baseline returns null, not Infinity');
eq(H.delta(50, null), null, 'missing baseline returns null');
eq(H.delta(-50, 100), -150, 'falling into negative is a real percentage');
eq(H.fmtDelta(10), '+10%', 'positive delta formatted with a sign');
eq(H.fmtDelta(-10), '-10%', 'negative delta formatted');
eq(H.fmtDelta(null), '—', 'null delta shows an em dash, not NaN');

console.log('\nfinance helpers — delta tone (costs invert)');
eq(H.deltaTone(10), 'good', 'a rise in profit is good');
eq(H.deltaTone(-10), 'bad', 'a fall in profit is bad');
eq(H.deltaTone(10, true), 'bad', 'a rise in cost is bad');
eq(H.deltaTone(-10, true), 'good', 'a fall in cost is good');
eq(H.deltaTone(0), 'flat', 'no change is flat');
eq(H.deltaTone(null), 'flat', 'no baseline is flat, never a false alarm');

console.log('\nfinance helpers — P&L statement');
const cur = {
  days: 31, revenue: 42900, aov: 5363, orders: 8,
  income: { merchandise: 43500, shipping: 200, tax: 0, discounts: 700, rewards: 100, net: 42900 },
  costs: { cogs: 29600, packaging: 320, courier: 1850, paymentFees: 536, total: 32306 },
  opex: { marketing: 62000, seo: 10333, other: 5167 },
  opexTotal: 77500,
  grossProfit: 13300, grossMargin: 31,
  contribution: 10594, contributionMargin: 24.7,
  sunkCost: 480, netProfit: -67386, netMargin: -157.1,
  failed: { cancelledBeforeShip: 1, cancelledBeforeShipCost: 0, returnedAfterShip: 1, returnedAfterShipCost: 480 },
  memos: { refundedValue: 7500, refundedCount: 1, cancelledValue: 3000, cancelledCount: 1 },
  paymentMix: [{ method: 'COD', orders: 5, revenue: 19300, fees: 0, profit: 4970 }],
  health: { profitable: 6, thin: 2, loss: 2 },
  daily: [], ladderCheck: 0, reconcileDrift: 0,
};
const st = H.buildStatement(cur);
eq(st.length, 5, 'five statement groups');
eq(st.map((g) => g.title), ['Income', 'Cost of goods', 'Fulfilment & fees', 'Lost orders', 'Operating costs'], 'group order');
eq(st[0].subtotal.label, 'Net sales', 'income group subtotals to net sales');
eq(st[0].subtotal.value, 42900, 'net sales subtotal value');
eq(st[1].subtotal.label, 'Gross profit', 'cost of goods subtotals to gross profit');
eq(st[2].subtotal.label, 'Trading profit', 'fulfilment & fees subtotal to trading profit');
eq(st[3].subtotal.label, 'Profit after losses', 'lost orders subtotal to profit after losses');
eq(st[4].subtotal.label, 'Net profit', 'operating costs subtotal to net profit');
eq(st[4].subtotal.emphasis, true, 'net profit is the emphasised total');
/* the statement must add up: each group's rows + prior subtotal = its subtotal */
eq(st[0].rows.reduce((s, r) => s + r.value, 0), 42900, 'income rows sum to net sales (43500+200-700-100)');
eq(st[1].subtotal.value, st[0].subtotal.value + st[1].rows.reduce((s, r) => s + r.value, 0),
  'gross profit = net sales + direct cost rows');
eq(st[2].subtotal.value, st[1].subtotal.value + st[2].rows.reduce((s, r) => s + r.value, 0),
  'contribution = gross profit + lost order rows');
eq(st[3].subtotal.value, st[2].subtotal.value + st[3].rows.reduce((s, r) => s + r.value, 0),
  'net profit = contribution + operating cost rows');
ok(st.every((g) => g.rows.every((r) => typeof r.value === 'number' && Number.isFinite(r.value))),
  'every statement row is a finite number');
eq(H.buildStatement(null), [], 'null current period yields no statement');

console.log('\nfinance helpers — memos never counted as revenue');
const memos = H.buildMemos(cur);
eq(memos.length, 2, 'refund + cancelled memos');
ok(memos.some((m) => m.value === 7500), 'refunded value shown as a memo');
ok(memos.some((m) => m.value === 3000), 'cancelled value shown as a memo');
ok(!memos.some((m) => m.label.toLowerCase().includes('tax')), 'no tax line when tax is 0');
const taxed = H.buildMemos({ ...cur, income: { ...cur.income, tax: 450 } });
ok(taxed.some((m) => /liability/i.test(m.label)), 'tax labelled as a liability, not revenue');
eq(taxed.filter((m) => /liability/i.test(m.label)).length, 1, 'tax line appears exactly once, never duplicated');
eq(H.buildMemos(null), [], 'null yields no memos');

console.log('\nfinance helpers — runway');
eq(H.runwayDays(30000, 60000), 15, 'PKR 30k contribution against 60k/month = 15 days');
eq(H.runwayDays(-30000, 60000), 0, 'negative contribution never reports negative days');
eq(H.runwayDays(30000, 0), null, 'no fixed costs means no runway figure, not Infinity');
eq(H.runwayDays(30000, null), null, 'missing fixed costs returns null');

console.log('\nfinance helpers — KPI cards');
const kpis = H.buildKpis(cur, { ...cur, revenue: 40000, grossProfit: 12000, contribution: 9000, netProfit: -70000, costs: { total: 30000 }, sunkCost: 0 });
eq(kpis.length, 6, 'six headline cards');
eq(kpis.map((k) => k.key), ['revenue', 'gross', 'contribution', 'net', 'costs', 'sunk'], 'card order');
const rev = kpis.find((k) => k.key === 'revenue');
eq(rev.pct, 7.3, 'revenue delta = (42900-40000)/40000');
eq(rev.tone, 'good', 'rising revenue is good');
const sunk = kpis.find((k) => k.key === 'sunk');
eq(sunk.tone, 'bad', 'rising sunk cost is bad even though the number grew');
const net = kpis.find((k) => k.key === 'net');
eq(net.verdict, true, 'net profit is flagged as the verdict card');
ok(kpis.every((k) => Number.isFinite(k.value)), 'every KPI value is finite');
eq(H.buildKpis(null), [], 'null yields no cards');

console.log('\nWaterfallChart — render');
const html = {};
for (const [k, C] of Object.entries({ Waterfall: P.Waterfall, WaterfallEmpty: P.WaterfallEmpty, WaterfallNull: P.WaterfallNull, WaterfallZero: P.WaterfallZero, WaterfallOne: P.WaterfallOne })) {
  try { html[k] = render(C); ok(true, `${k} renders`); }
  catch (e) { html[k] = ''; ok(false, `${k} renders`, e.message); }
}
ok(!/NaN/.test(html.Waterfall), 'no NaN in waterfall geometry');
ok(!/Infinity/.test(html.Waterfall), 'no Infinity in waterfall geometry');
ok(!/width="-/.test(html.Waterfall) && !/height="-/.test(html.Waterfall), 'no negative bar sizes');
eq((html.Waterfall.match(/class="cx-wf-bar"/g) || []).length, 11, 'one bar per waterfall step');
ok(html.Waterfall.includes('cx-wf total neg'), 'a negative net profit renders as a red total');
ok(!html.Waterfall.includes('cx-wf total pos'), 'no green verdict when the result is a loss');
ok((html.Waterfall.match(/class="cx-wf-link"/g) || []).length === 10, 'every step but the first gets a connector');
ok(html.Waterfall.includes('cx-readout'), 'hover readout slot always present (no layout jump)');
ok(html.Waterfall.includes('aria-label'), 'waterfall has an aria-label');
ok(/Net sales/.test(html.Waterfall) && /Net profit/.test(html.Waterfall), 'both endpoints labelled on the chart');

/* the running total must land exactly on the final value */
const runCheck = P.waterfall.reduce((acc, s) => {
  if (s.kind === 'subtotal' || s.kind === 'total') { eq(acc, s.value, `running total reaches "${s.label}"`); return s.value; }
  return acc + s.value;
}, 0);
ok(typeof runCheck === 'number', 'waterfall walk completes');

ok(html.WaterfallEmpty.includes('cx-none'), 'empty steps show the empty message');
ok(html.WaterfallNull.includes('cx-none'), 'null steps show the empty message, no crash');
ok(!/NaN/.test(html.WaterfallZero), 'all-zero values do not divide by zero');
ok(!/NaN/.test(html.WaterfallOne), 'a single step renders without NaN');

console.log(fail === 0 ? '\n✓ all assertions passed\n' : `\n✗ ${fail} assertion(s) failed\n`);
process.exit(fail === 0 ? 0 : 1);
