/* ============================================================================
 * Dashboard "Order status mix" donut — data invariant test.
 *
 * The one invariant the centre number relies on:
 *   sum(segments shown in the donut + legend) === the Total in the centre.
 *
 * The donut counts FULFILMENT status (Order.status). This suite feeds
 * buildStatusDonut() (frontend/src/lib/statusDonut.js) several `byStatus`
 * maps and asserts:
 *   · zero buckets are excluded (no "0" segments)
 *   · every non-zero bucket is present, in canonical order
 *   · sum(segments) === total
 *
 * Run:  node tests/dashboard-donut.mjs      (or via tests/run-all.mjs)
 * ========================================================================== */

const { buildStatusDonut, ORDER_STATUSES } = await import(
  new URL('../frontend/src/lib/statusDonut.js', import.meta.url).href
);

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
  cond ? pass++ : fail++;
};
const eq = (name, got, want) => {
  const same = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${same ? 'PASS' : 'FAIL'}  ${name} -> ${JSON.stringify(got)}${same ? '' : ` (want ${JSON.stringify(want)})`}`);
  same ? pass++ : fail++;
};

/* The invariant itself, applied to every scenario. */
const sumEqualsTotal = (label, byStatus) => {
  const { segments, total } = buildStatusDonut(byStatus);
  const sum = segments.reduce((n, s) => n + s.value, 0);
  eq(`${label}: sum(segments) === total`, sum, total);
  ok(`${label}: total === sum of shown legend`, sum === total);
  return { segments, total };
};

/* ── Scenario 1: empty (no orders at all) ─────────────────────────────── */
console.log('--- scenario 1: empty ---');
let r = sumEqualsTotal('empty', {});
eq('empty: zero segments', r.segments.length, 0);
eq('empty: total is 0', r.total, 0);

/* ── Scenario 2: mixed statuses (zeros + several non-zero) ────────────── */
console.log('\n--- scenario 2: mixed statuses ---');
const mixed = {
  Pending: 4,
  Confirmed: 0,
  Processing: 3,
  'Ready to Ship': 0,
  Shipped: 2,
  'Out for Delivery': 1,
  Delivered: 10,
  Cancelled: 0,
  Refunded: 1,
};
r = sumEqualsTotal('mixed', mixed);
eq('mixed: total is 21', r.total, 21);
eq('mixed: zero buckets excluded',
  r.segments.map((s) => s.name),
  ['Pending', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Refunded']);
eq('mixed: canonical fulfilment order',
  r.segments.map((s) => s.name).join('>'),
  'Pending>Processing>Shipped>Out for Delivery>Delivered>Refunded');
ok('mixed: every segment has a colour', r.segments.every((s) => /^#[0-9a-f]{6}$/i.test(s.color)));

/* ── Scenario 3: all cancelled (single bucket, other buckets zero) ─────── */
console.log('\n--- scenario 3: all cancelled ---');
r = sumEqualsTotal('all-cancelled', { Cancelled: 50, Refunded: 0 });
eq('all-cancelled: total is 50', r.total, 50);
eq('all-cancelled: only Cancelled shown', r.segments.map((s) => s.name), ['Cancelled']);
eq('all-cancelled: no Refunded "0" segment', r.segments.some((s) => s.name === 'Refunded'), false);

/* ── Scenario 4 (extra): every status non-zero ─────────────────────────── */
console.log('\n--- scenario 4 (extra): every status non-zero ---');
const full = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 1]));
r = sumEqualsTotal('full', full);
eq('full: all 9 segments shown', r.segments.length, 9);
eq('full: total is 9', r.total, 9);

/* ── Scenario 5 (extra): unknown/legacy status is never dropped ─────────── */
console.log('\n--- scenario 5 (extra): unknown/legacy status kept ---');
r = sumEqualsTotal('legacy', { Pending: 2, 'Some Legacy Status': 3 });
eq('legacy: total is 5', r.total, 5);
eq('legacy: both segments shown', r.segments.length, 2);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
