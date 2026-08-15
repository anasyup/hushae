/* ============================================================================
 * growthPct() — the single growth-percentage function behind every dashboard
 * KPI card (Revenue, Orders, AOV, Profit, Cost) and the /dashboard/compare
 * endpoint. Lives in backend/src/utils/helpers.js.
 *
 * Contract:
 *   previous = 0/absent  & current = 0   → null   (UI hides the arrow)
 *   previous = 0/absent  & current > 0   → null   (UI shows "New")
 *   previous > 0         & current = 0   → -100   (rounded to 1 decimal)
 *   previous > 0                          → ((cur - prev)/prev)*100, 1 decimal
 *
 * Run:  node tests/growth-pct.mjs   (also via tests/run-all.mjs)
 * ========================================================================== */

import { createRequire } from 'module';
const require = createRequire('/home/user/hushae/backend/');
const { growthPct } = require('/home/user/hushae/backend/src/utils/helpers.js');

let pass = 0, fail = 0;
const eq = (n, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
};

console.log('--- previous = 0 ---');
eq('prev=0, cur=0 -> null', growthPct(0, 0), null);
eq('prev=0, cur>0 -> null', growthPct(150, 0), null);
eq('prev absent (undefined), cur>0 -> null', growthPct(150, undefined), null);
eq('prev absent (null), cur>0 -> null', growthPct(150, null), null);

console.log('\n--- previous > 0 ---');
eq('prev=100, cur=0 -> -100', growthPct(0, 100), -100);
eq('prev=100, cur=130 -> 30', growthPct(130, 100), 30);
eq('prev=100, cur=50 -> -50', growthPct(50, 100), -50);
eq('prev=200, cur=233 -> 16.5 (1 decimal)', growthPct(233, 200), 16.5);
eq('prev=300, cur=299 -> -0.3 (1 decimal)', growthPct(299, 300), -0.3);
eq('strings accepted', growthPct('130', '100'), 30);

console.log('\n--- edge inputs ---');
eq('NaN prev -> null', growthPct(10, NaN), null);
eq('negative prev -> normal maths', growthPct(-50, -100), -50);
eq('cur null -> treated as 0', growthPct(null, 100), -100);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
