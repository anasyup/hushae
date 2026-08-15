/* ============================================================================
 * customerReliability — COD risk tiers, computed server-side by phone.
 *
 * Rules (per the product spec):
 *   · new       : first or second order (total <= 2)
 *   · high-risk : cancelRate > 40% AND >= 3 historical orders
 *   · reliable  : cancelRate < 10% AND 2+ successful (Delivered) orders
 *   · neutral   : everything else
 *
 * Run:  node tests/customer-reliability.mjs   (also via tests/run-all.mjs)
 * ========================================================================== */

import { createRequire } from 'module';
const require = createRequire('/home/user/hushae/backend/');
const { reliabilityFromOrders, reliabilityMap } = require('/home/user/hushae/backend/src/utils/customerReliability.js');

let pass = 0, fail = 0;
const eq = (n, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
};

const O = (status, hasIssue, issueType) => ({ status, customerService: { hasIssue: !!hasIssue, issueType: issueType || '' } });

console.log('--- tier classification ---');
eq('no orders -> new (total 0)', reliabilityFromOrders([]).tier, 'new');
eq('1 order -> new', reliabilityFromOrders([O('Pending')]).tier, 'new');
eq('2 orders -> new', reliabilityFromOrders([O('Pending'), O('Delivered')]).tier, 'new');

// reliable: <10% cancel, 2+ delivered, >=3 total
eq('3 orders, 3 delivered -> reliable', reliabilityFromOrders([O('Delivered'), O('Delivered'), O('Delivered')]).tier, 'reliable');
eq('5 orders, 4 delivered 1 cancelled (20%) -> neutral (cancelRate >= 10)', reliabilityFromOrders([O('Delivered'), O('Delivered'), O('Delivered'), O('Delivered'), O('Cancelled')]).tier, 'neutral');

// high-risk: >40% cancel with 3+ orders
eq('5 orders, 3 cancelled (60%) -> high-risk', reliabilityFromOrders([O('Cancelled'), O('Cancelled'), O('Cancelled'), O('Delivered'), O('Delivered')]).tier, 'high-risk');
eq('3 orders, 2 cancelled (66%) -> high-risk', reliabilityFromOrders([O('Cancelled'), O('Cancelled'), O('Delivered')]).tier, 'high-risk');

console.log('\n--- metrics ---');
const r = reliabilityFromOrders([O('Delivered'), O('Delivered'), O('Cancelled'), O('Pending')]);
eq('totalOrders', r.totalOrders, 4);
eq('delivered', r.delivered, 2);
eq('cancelled', r.cancelled, 1);
eq('cancelRate (1/4 = 25%)', r.cancelRate, 25);
eq('label for reliable', reliabilityFromOrders([O('Delivered'), O('Delivered'), O('Delivered')]).label, 'Reliable');
eq('label for new', reliabilityFromOrders([O('Pending')]).label, 'New customer');
eq('label for high-risk', reliabilityFromOrders([O('Cancelled'), O('Cancelled'), O('Cancelled')]).label, 'High risk');

console.log('\n--- no-response counting ---');
eq('noResponse counts hasIssue + issueType match', reliabilityFromOrders([O('Pending', true, 'No response'), O('Delivered')]).noResponse, 1);

console.log('\n--- reliabilityMap keyed by phone tail ---');
const map = reliabilityMap([
  { customerInfo: { phone: '0300 1234567' }, status: 'Delivered', customerService: {} },
  { customerInfo: { phone: '0300 1234567' }, status: 'Delivered', customerService: {} },
  { customerInfo: { phone: '0300 1234567' }, status: 'Delivered', customerService: {} },
  { customerInfo: { phone: '+92 300 7654321' }, status: 'Cancelled', customerService: {} },
]);
eq('map has both 10-digit tails', [...map.keys()].sort(), ['3001234567', '3007654321']);
eq('first phone reliable', map.get('3001234567').tier, 'reliable');
eq('second phone new (1 order)', map.get('3007654321').tier, 'new');
eq('skips empty phones', reliabilityMap([{ customerInfo: { phone: '' }, status: 'Delivered' }]).size, 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
