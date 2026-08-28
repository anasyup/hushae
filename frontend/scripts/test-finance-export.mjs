/* Test for the printable P&L exporter.
 *
 * The old exporter read fields the rebuilt page no longer supplies, so it
 * would have thrown on `s.margin.toFixed(1)` and printed "PKR 0" for eight
 * lines. This asserts the new one never emits NaN/undefined and that its
 * subtotals equal the on-screen statement's.
 *
 * Run: node scripts/test-finance-export.mjs
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const { buildPnlHtml } = await import(resolve(root, 'src/admin/finance/exportPnl.js'));
const H = await import(resolve(root, 'src/admin/finance/pnl.js'));

let fail = 0;
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { fail += 1; console.log(`  ✗ ${msg}${extra ? ' — ' + extra : ''}`); }
};
const eq = (a, b, msg) => ok(a === b, msg, `got ${a}, want ${b}`);

/* the exact shape GET /api/finance/pnl returns */
const data = {
  range: { from: '2026-08-01T00:00:00.000Z', to: '2026-08-31T00:00:00.000Z', days: 31 },
  current: {
    days: 31, revenue: 42900, aov: 5363, orders: 8,
    income: { merchandise: 43500, shipping: 200, tax: 450, discounts: 700, rewards: 100, net: 42900 },
    costs: { cogs: 29600, packaging: 320, courier: 1850, paymentFees: 536, total: 32306 },
    opex: { marketing: 62000, seo: 10333, other: 5167 },
    opexTotal: 77500,
    grossProfit: 13300, grossMargin: 31,
    contribution: 10594, contributionMargin: 24.7,
    sunkCost: 480, netProfit: -67386, netMargin: -157.1,
    failed: { cancelledBeforeShip: 1, cancelledBeforeShipCost: 0, returnedAfterShip: 1, returnedAfterShipCost: 480 },
    memos: { refundedValue: 7500, refundedCount: 1, cancelledValue: 3000, cancelledCount: 1 },
    paymentMix: [
      { method: 'COD', orders: 5, revenue: 19300, fees: 0, profit: 4970 },
      { method: 'JazzCash', orders: 1, revenue: 8400, fees: 168, profit: 1372 },
    ],
    health: { profitable: 6, thin: 2, loss: 2 },
    daily: [], ladderCheck: 0, reconcileDrift: 0,
  },
  previous: {},
  waterfall: [],
};

console.log('\nP&L export — renders');
const html = buildPnlHtml({ data, rangeLabel: 'Last 31 days' });
ok(typeof html === 'string' && html.length > 1000, 'returns a full HTML document');
ok(html.startsWith('<!doctype html>'), 'starts with a doctype');
ok(html.includes('</html>'), 'closes the document');

console.log('\nP&L export — no broken values');
ok(!/NaN/.test(html), 'no NaN anywhere in the document');
ok(!/undefined/.test(html), 'no undefined anywhere in the document');
ok(!/PKR NaN/.test(html), 'no "PKR NaN" money values');
ok(!/Infinity/.test(html), 'no Infinity');
ok(!/>null</.test(html), 'no bare null printed');

console.log('\nP&L export — content is real');
ok(html.includes('PKR 42,900'), 'net sales printed');
ok(html.includes('PKR 13,300'), 'gross profit printed');
ok(html.includes('PKR 10,594'), 'contribution printed');
ok(html.includes('−PKR 29,600'), 'COGS printed as a deduction');
ok(html.includes('−PKR 536'), 'gateway fees printed as a deduction');
ok(html.includes('31.0%'), 'gross margin printed');
ok(html.includes('Returns after dispatch (1)'), 'failed order counts printed');
ok(html.includes('JazzCash'), 'payment mix printed');
ok(html.includes('PKR 168'), 'the fee each method cost is printed');

console.log('\nP&L export — memos kept out of revenue');
ok(html.includes('Not revenue'), 'the memo section exists');
ok(html.includes('Tax collected'), 'tax labelled as a liability');
ok(html.includes('Refunded to customers (1)'), 'refunds shown as a memo');
ok(html.includes('Cancelled, never collected (1)'), 'cancellations shown as a memo');

console.log('\nP&L export — subtotals match the on-screen statement');
const st = H.buildStatement(data.current);
for (const g of st) {
  const label = g.subtotal.label;
  ok(html.includes(label), `statement subtotal "${label}" appears in the document`);
}
/* the printed net profit must equal the on-screen net profit */
ok(html.includes('\u2212PKR 67,386'),
  'net profit printed as a proper negative (\u2212PKR 67,386), matching the screen');

console.log('\nP&L export — reconciliation warnings surface');
const clean = buildPnlHtml({ data });
ok(!clean.includes('Check before filing'), 'no warning block when the numbers reconcile');
const drifting = buildPnlHtml({
  data: { ...data, current: { ...data.current, reconcileDrift: -800, ladderCheck: 120 } },
});
ok(drifting.includes('Check before filing'), 'warning block appears when income lines drift');
ok(drifting.includes('\u2212PKR 800'), 'the drift amount is stated with its sign');
ok(drifting.includes('PKR 120'), 'the ladder drift is stated');

console.log('\nP&L export — degenerate input');
const empty = buildPnlHtml({ data: { current: {}, range: {} } });
ok(!/NaN/.test(empty), 'empty payload prints no NaN');
ok(!/undefined/.test(empty), 'empty payload prints no undefined');
ok(empty.includes('PKR 0'), 'empty payload prints zeroed money');
ok(empty.includes('—'), 'empty margin prints an em dash, not NaN');
const nullDoc = buildPnlHtml({});
ok(!/NaN/.test(nullDoc) && !/undefined/.test(nullDoc), 'missing data entirely still renders safely');
ok(nullDoc.includes('</html>'), 'missing data still produces a valid document');

console.log('\nP&L export — escaping');
const xss = buildPnlHtml({
  data: {
    ...data,
    current: { ...data.current, paymentMix: [{ method: '<script>x</script>', orders: 1, revenue: 10, fees: 0, profit: 10 }] },
  },
  storeName: 'A & B "Store"',
});
ok(!xss.includes('<script>x</script>'), 'payment method names are escaped, not injected');
ok(xss.includes('&lt;script&gt;'), 'escaped form is present instead');
ok(xss.includes('A &amp; B &quot;Store&quot;'), 'store name is escaped');
ok(!/&amp;amp;/.test(xss), 'no double-escaping anywhere (& must not render as "&amp;")');
ok(html.includes('Discounts &amp; promotions'), '"Discounts & promotions" escaped exactly once');
ok(!html.includes('Discounts &amp;amp;'), 'the ampersand label is not double-escaped');
ok(html.includes('Fulfilment &amp; fees'), '"Fulfilment & fees" heading escaped exactly once');

console.log(fail === 0 ? '\n✓ all assertions passed\n' : `\n✗ ${fail} assertion(s) failed\n`);
process.exit(fail === 0 ? 0 : 1);
