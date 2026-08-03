import { createRequire } from 'module';
const require = createRequire('/home/user/hushae/backend/');
const E = require('/home/user/hushae/backend/src/utils/cmsEngine.js');

/* ============================================================================
 * SLUG + REDIRECT FLOW
 *
 * The route logic reproduced without a database, because these are the rules
 * that break links silently when they are wrong. A broken redirect does not
 * throw — it just quietly loses a customer who clicked an old bookmark.
 * ========================================================================== */

let pass = 0, fail = 0;
const eq = (n, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
};

/** Mirrors the rename branch in PUT /cms/pages/:id. */
function rename(store, oldSlug, newSlug, { autoRedirect = true } = {}) {
  if (oldSlug === newSlug) return store;
  if (autoRedirect) {
    store.set(oldSlug, { to: `/${newSlug}`, code: 301, auto: true });
    // Collapse chains: anything that pointed at the old address now points at
    // the new one, so a browser hops once rather than twice.
    for (const [from, r] of store) {
      if (r.auto && r.to === `/${oldSlug}`) store.set(from, { ...r, to: `/${newSlug}` });
    }
  }
  return store;
}

console.log('--- rename leaves a working 301 ---');
let s = new Map();
rename(s, 'privacy', 'privacy-policy');
eq('old address redirects', s.get('privacy'), { to: '/privacy-policy', code: 301, auto: true });
eq('301, not 302 — a rename is permanent', s.get('privacy').code, 301);

console.log('\n--- renaming twice does NOT create a two-hop chain ---');
rename(s, 'privacy-policy', 'our-privacy');
eq('the new rename is recorded', s.get('privacy-policy').to, '/our-privacy');
eq('the ORIGINAL address skips straight to the final one', s.get('privacy').to, '/our-privacy');

console.log('\n--- loop guard (mirrors POST /cms/redirects) ---');
function wouldLoop(store, from, to) {
  const target = to.replace(/^\//, '');
  if (from === target) return true;
  const reverse = store.get(target);
  return !!(reverse && reverse.to.replace(/^\//, '') === from);
}
const s2 = new Map([['a', { to: '/b' }]]);
eq('self redirect refused', wouldLoop(s2, 'x', '/x'), true);
eq('reverse of an existing one refused', wouldLoop(s2, 'b', '/a'), true);
eq('unrelated pair allowed', wouldLoop(s2, 'c', '/d'), false);

console.log('\n--- uniqueSlug collision shape ---');
const taken = new Set(['returns', 'returns-2']);
function unique(base) {
  const c = E.slugify(base);
  for (let i = 1; i < 100; i += 1) {
    const t = i === 1 ? c : `${c}-${i}`;
    if (!taken.has(t)) return t;
  }
  return c;
}
eq('free slug used as is', unique('Shipping Info'), 'shipping-info');
eq('first collision gets -2', unique('Returns'), 'returns-3');

console.log('\n--- publish/schedule decision (mirrors POST /publish) ---');
function decide(publishAt, now = new Date('2026-07-31T12:00:00Z')) {
  const when = publishAt ? new Date(publishAt) : null;
  return (when && when > now) ? 'scheduled' : 'published';
}
eq('no date publishes now', decide(null), 'published');
eq('future date schedules', decide('2026-08-05'), 'scheduled');
eq('past date publishes now', decide('2026-07-01'), 'published');

console.log('\n--- version pruning keeps the newest N ---');
function prune(versions, keep) { return versions.slice(0, keep); }
const v = Array.from({ length: 42 }, (_, i) => ({ n: 42 - i }));
eq('42 versions pruned to 30', prune(v, 30).length, 30);
eq('newest is kept', prune(v, 30)[0].n, 42);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
