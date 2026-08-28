/* Integration test for GET /api/finance/pnl.
 *
 * Stubs the Mongo models in the require cache, then mounts the REAL finance
 * router in an express app and hits it over HTTP. So this exercises the actual
 * route handler and the real orderEconomics module — not a copy of the logic.
 *
 * Run: node scripts/test-finance-pnl.cjs
 */
const path = require('path');
const Module = require('module');

const root = path.resolve(__dirname, '..');
const resolveFrom = (rel) => require.resolve(rel, { paths: [path.join(root, 'src/routes')] });

/* ---- fixtures: 10 orders exercising every cost path ---- */
const ORDERS = [
  { _id: 1, subtotal: 5000, total: 5200, discount: 0, promotionDiscount: 0, creditUsed: 0, shippingCharge: 200, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'COD', customerInfo: { city: 'Lahore' }, items: [{ costPrice: 1500, quantity: 2 }], createdAt: new Date('2026-08-05') },
  { _id: 2, subtotal: 3200, total: 3200, discount: 0, promotionDiscount: 0, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'COD', customerInfo: { city: 'Karachi' }, items: [{ costPrice: 900, quantity: 2 }], createdAt: new Date('2026-08-06') },
  { _id: 3, subtotal: 8400, total: 8400, discount: 0, promotionDiscount: 0, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'JazzCash', customerInfo: { city: 'Islamabad' }, items: [{ costPrice: 2200, quantity: 3 }], createdAt: new Date('2026-08-07') },
  { _id: 4, subtotal: 2600, total: 2600, discount: 0, promotionDiscount: 0, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'EasyPaisa', customerInfo: { city: 'Multan' }, items: [{ costPrice: 700, quantity: 2 }], createdAt: new Date('2026-08-08') },
  { _id: 5, subtotal: 12000, total: 11500, discount: 500, promotionDiscount: 0, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'Visa', customerInfo: { city: 'Lahore' }, items: [{ costPrice: 4000, quantity: 2 }], createdAt: new Date('2026-08-09') },
  { _id: 6, subtotal: 4100, total: 4100, discount: 0, promotionDiscount: 0, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'COD', courierCost: 350, customerInfo: { city: 'Quetta' }, items: [{ costPrice: 1200, quantity: 2 }], createdAt: new Date('2026-08-10') },
  { _id: 7, subtotal: 6300, total: 6100, discount: 0, promotionDiscount: 200, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'COD', customerInfo: { city: 'Faisalabad' }, items: [{ costPrice: 1800, quantity: 3 }], createdAt: new Date('2026-08-11') },
  { _id: 8, subtotal: 1900, total: 1800, discount: 0, promotionDiscount: 0, creditUsed: 100, shippingCharge: 0, tax: 0, status: 'Delivered', stage: 'Delivered', paymentMethod: 'COD', customerInfo: { city: 'Sialkot' }, items: [{ costPrice: 500, quantity: 2 }], createdAt: new Date('2026-08-12') },
  /* returned after dispatch: both courier legs billed, no revenue kept */
  { _id: 9, subtotal: 7500, total: 7500, discount: 0, promotionDiscount: 0, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Refunded', stage: 'Returned', paymentMethod: 'COD', customerInfo: { city: 'Lahore' }, stageTimestamps: { Shipped: new Date('2026-08-13').toISOString() }, items: [{ costPrice: 2000, quantity: 2 }], createdAt: new Date('2026-08-13') },
  /* cancelled before dispatch: costs nothing */
  { _id: 10, subtotal: 3000, total: 3000, discount: 0, promotionDiscount: 0, creditUsed: 0, shippingCharge: 0, tax: 0, status: 'Cancelled', stage: 'Cancelled', paymentMethod: 'COD', customerInfo: { city: 'Lahore' }, items: [{ costPrice: 900, quantity: 2 }], createdAt: new Date('2026-08-14') },
];

const SETTINGS = {
  key: 'store',
  operatingCosts: {
    packingPerOrder: 40,
    defaultCourierCost: 220,
    shippingSubsidy: 220,
    returnCourierMultiplier: 2,
    monthlyMarketing: 60000,
    monthlySeo: 10000,
    monthlyOther: 5000,
    courierByCity: [{ city: 'Karachi', cost: 180 }],
    paymentFees: { cod: 0, jazzcash: 2, easypaisa: 2, bank: 0, card: 2.75 },
  },
};

/* ---- stub the models BEFORE finance.js is required ---- */
const stub = (id, exports) => {
  const p = resolveFrom(id);
  const m = new Module(p, null);
  m.filename = p; m.loaded = true; m.exports = exports;
  require.cache[p] = m;
};

const queries = [];
const findChain = (rows) => {
  const chain = {
    select() { return chain; },
    sort() { return chain; },
    skip() { return chain; },
    limit() { return chain; },
    lean() { return Promise.resolve(rows); },
    then(res, rej) { return Promise.resolve(rows).then(res, rej); },
  };
  return chain;
};

stub('../models/Order', {
  find(filter) {
    queries.push(filter);
    /* current window vs previous window, decided by the $gte bound */
    const gte = filter?.createdAt?.$gte;
    const lte = filter?.createdAt?.$lte;
    if (gte && lte && lte < new Date('2026-08-01')) return findChain([]);   // previous period: empty
    return findChain(ORDERS);
  },
  countDocuments: () => Promise.resolve(ORDERS.length),
  aggregate: () => Promise.resolve([]),
  distinct: () => Promise.resolve([]),
});
stub('../models/Settings', { findOne: () => ({ lean: () => Promise.resolve(SETTINGS) }) });
stub('../middleware/auth', { protect: (req, _res, next) => next(), adminOnly: (req, _res, next) => next() });

/* ---- mount the REAL router ---- */
const express = require('express');
const app = express();
app.use('/api/finance', require('../src/routes/finance'));
/* surface the real error instead of express's HTML 500 page */
app.use((err, _req, res, _next) => {
  console.error('\n  !! route threw:', err && err.message);
  if (err && err.stack) console.error(err.stack.split('\n').slice(1, 5).join('\n'));
  res.status(500).json({ error: err && err.message });
});

let fail = 0;
const ok = (cond, msg, extra = '') => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { fail += 1; console.log(`  ✗ ${msg}${extra ? ' — ' + extra : ''}`); }
};
const eq = (a, b, msg) => ok(a === b, msg, `got ${a}, want ${b}`);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/api/finance/pnl?from=2026-08-01&to=2026-08-31`);
  ok(res.status === 200, 'GET /finance/pnl returns 200', `status ${res.status}`);
  const body = await res.json().catch(() => { console.log('  (non-JSON body)'); server.close(); process.exit(1); });
  if (res.status !== 200) { server.close(); process.exit(1); }
  const c = body.current;

  console.log('\n/finance/pnl — income lines');
  eq(c.income.net, 42900, 'net sales = sum of live order totals (42,900)');
  eq(c.income.discounts, 700, 'discounts = coupon 500 + promotion 200');
  eq(c.income.rewards, 100, 'store credit redeemed shown as its own line');
  eq(c.income.merchandise, 43500, 'merchandise = sum of live subtotals (43,500)');
  eq(c.income.shipping, 200, 'shipping income separated from merchandise');
  eq(c.reconcileDrift, 0, 'stated income lines reconcile exactly to net sales (drift 0)');

  console.log('\n/finance/pnl — costs use the CANONICAL model');
  /* courier: 7 live orders. Karachi gets its city rate 180, Quetta has a stored
   * courierCost 350, the other five get the 220 default. */
  eq(c.costs.courier, 1850, 'live courier = 220*6 + Karachi 180 + stored Quetta 350 = 1,850');
  eq(c.costs.allCourier, 2290, 'allCourier adds the return leg 220*2 = 2,290');
  eq(c.costs.packaging, 320, 'packaging = 40 x 8 LIVE orders (failed orders shown separately)');
  eq(c.costs.allPackaging, 360, 'allPackaging includes the returned order = 40 x 9');
  eq(c.costs.paymentFees, 536, 'gateway fees = JazzCash 168 + EasyPaisa 52 + Visa 2.75% of 11,500 = 536');
  eq(c.costs.cogs, 29600, 'COGS from item costPrice x quantity');

  console.log('\n/finance/pnl — failed orders are subtracted, not just displayed');
  eq(c.failed.returnedAfterShip, 1, 'one return after dispatch');
  eq(c.failed.cancelledBeforeShip, 1, 'one cancellation before dispatch');
  eq(c.failed.returnedAfterShipCost, 480, 'return costs packaging 40 + both courier legs 220*2 = 480');
  eq(c.failed.cancelledBeforeShipCost, 0, 'cancellation before dispatch costs nothing');

  console.log('\n/finance/pnl — profit ladder');
  eq(c.grossProfit, 13300, 'gross profit = revenue 42,900 - COGS 29,600');
  eq(c.contribution, 10594, 'contribution = 42,900 - 29,600 - 320 - 1,850 - 536 = 10,594');
  eq(c.ladderCheck, 0, 'contribution - sunk cost equals summarise() net profit exactly (ladder check 0)');
  eq(c.opexTotal, 77500, 'opex prorated: (60k+10k+5k) x 31/30 for a 31-day window');
  eq(c.netProfit, 10114 - 77500, 'net profit = (contribution 10,594 - sunk 480) - opex 77,500');
  eq(c.sunkCost, 480, 'sunk cost of failed orders surfaced as its own line');

  console.log('\n/finance/pnl — agreement with the other finance endpoints');
  /* The whole point: this must equal what order-profitability reports. */
  const prof = await (await fetch(`http://127.0.0.1:${port}/api/finance/order-profitability?from=2026-08-01&to=2026-08-31&limit=100`)).json();
  const sumProfit = (prof.rows || []).reduce((n, r) => n + (r.netProfit || 0), 0);
  eq(Math.round(sumProfit), c.contribution - c.sunkCost,
    'sum of per-order profit from order-profitability equals the P&L contribution less sunk cost');

  console.log('\n/finance/pnl — shape for the UI');
  ok(Array.isArray(body.waterfall) && body.waterfall.length >= 6, 'waterfall steps returned', String(body.waterfall?.length));
  eq(body.waterfall[0].kind, 'start', 'waterfall starts at net sales');
  eq(body.waterfall[body.waterfall.length - 1].key, 'netProfit', 'waterfall ends at net profit');
  ok(body.waterfall.every((w) => w.kind !== 'cost' || w.value < 0), 'every cost step is negative');
  /* running total must land exactly on netProfit */
  let run = 0;
  for (const w of body.waterfall) {
    if (w.kind === 'subtotal' || w.kind === 'total') { eq(run, w.value, `waterfall running total reaches "${w.label}"`); }
    else run += w.value;
  }
  ok(c.daily.length === 10, 'daily series has one row per order date', String(c.daily.length));
  ok(c.paymentMix.length === 4, 'payment mix has COD/JazzCash/EasyPaisa/Visa', String(c.paymentMix.length));
  ok(c.paymentMix.every((m) => m.revenue >= 0), 'no negative revenue in payment mix');
  ok(body.previous && typeof body.previous.netProfit === 'number', 'previous period returned for deltas');
  ok(body.range.days >= 1, 'range days computed', String(body.range.days));

  console.log('\n/finance/pnl — degenerate input');
  const empty = await (await fetch(`http://127.0.0.1:${port}/api/finance/pnl?from=2020-01-01&to=2020-01-31`)).json();
  ok(empty.current.income.net === 0, 'empty period returns zero net sales');
  ok(empty.current.netMargin === 0, 'empty period margin is 0, not NaN or Infinity');
  ok(Number.isFinite(empty.current.netProfit), 'empty period net profit is finite');
  ok(Array.isArray(empty.waterfall) && empty.waterfall.length >= 1, 'empty period still returns a waterfall');

  console.log(fail === 0 ? '\n✓ all assertions passed\n' : `\n✗ ${fail} assertion(s) failed\n`);
  server.close();
  process.exit(fail === 0 ? 0 : 1);
});
