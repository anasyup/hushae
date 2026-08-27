#!/usr/bin/env node
/**
 * HUSHAE admin-integrity check — no dependencies, no build required.
 *
 * WHY THIS EXISTS
 * Two bug classes have already cost this project real time, and neither is
 * visible to `vite build` or `tsc --noEmit`, because they are wiring defects
 * *between* files rather than defects inside one:
 *
 *  1. A nav entry pointing at a route that no longer exists. This happens every
 *     time a feature is reverted or a page is dropped: `settingsNav.js` /
 *     `NAV_SECTIONS` keep their entries while `App.jsx` loses the <Route>. The
 *     2026-08-28 Batch-2 revert produced exactly this (four rail links pointing
 *     at deleted routes, saved only by a SettingsReserved fallback, by luck).
 *  2. A settings key an editor PUTs that `routes/settings.js` does not
 *     whitelist. The write is silently discarded and the UI still says "Saved".
 *     This bit `marketing` (fixed in c0f0030) and — found by this very script —
 *     `search` and `discovery`, which were never fixed, so Settings → Search &
 *     Discovery has never persisted anything.
 *  3. A (lazy) import path whose file does not exist: `import('./admin/SettingsStoreExtras')`
 *     after a revert deleted the file. Vite only notices when it resolves that
 *     chunk, and a dynamic import inside `.then()` is easy to miss in review.
 *
 * RATCHET DESIGN
 * The repo carries a large body of pre-existing dead nav routes (agent memory:
 * "~200 nav routes dead by origin") that we are explicitly NOT allowed to
 * remove. Failing the build on those would make this check noise, so today's
 * findings are frozen in `admin-integrity.baseline.json` and only NEW findings
 * fail:
 *
 *   node scripts/check-admin-integrity.mjs              # CI / pre-push, exit 1 on regression
 *   node scripts/check-admin-integrity.mjs --report     # human-readable, never fails
 *   node scripts/check-admin-integrity.mjs --selftest    # proves this script's own parsers
 *   node scripts/check-admin-integrity.mjs --reconcile   # accept current findings into the baseline
 *
 * Shrinking the baseline is always welcome and needs no ceremony. Growing it is
 * a decision you make explicitly, by running --reconcile and committing it.
 */
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const SRC = join(FRONTEND, 'src');
const BACKEND = resolve(FRONTEND, '..', 'backend');
const BASELINE_PATH = join(HERE, 'admin-integrity.baseline.json');

const MODE = process.argv.slice(2).find((a) => a.startsWith('--')) || '--check';
const EXT_CANDIDATES = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.json', '.css'];

const read = (p) => readFileSync(p, 'utf8');
const rel = (p) => p.replace(`${FRONTEND}/`, '').replace(`${BACKEND}/`, 'backend/');

/** Recursively list source files we care about. */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (['.js', '.jsx', '.ts', '.tsx', '.mjs'].includes(extname(p))) out.push(p);
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * SHARED SCANNER
 *
 * One balanced-delimiter walk, reused by every check below. An earlier revision
 * used a separate regex per shape and matched keys only when the cursor landed
 * exactly on the first letter — so the space after each `,` silently killed
 * every hit and the settings check returned []. `--selftest` caught it; the
 * tests are kept because a guard that quietly reports nothing is worse than no
 * guard.
 * ------------------------------------------------------------------------ */
const OPEN = new Set(['{', '[', '(']);
const CLOSE = new Set(['}', ']', ')']);
const isIdentStart = (c) => /[A-Za-z_$]/.test(c);

/**
 * Walk the balanced literal whose opening character sits at `startIdx` (which
 * must itself be an opener), calling onEnter(depth, idx) for each depth level.
 */
function scanBalanced(src, startIdx, onEnter, maxSpan = 8000) {
  if (startIdx < 0 || startIdx >= src.length || !OPEN.has(src[startIdx])) return;
  let depth = 0;
  const stop = Math.min(src.length, startIdx + maxSpan);
  for (let i = startIdx; i < stop; i += 1) {
    const ch = src[i];
    if (OPEN.has(ch)) { depth += 1; onEnter?.(depth, i); continue; }
    if (CLOSE.has(ch)) { depth -= 1; if (depth === 0) return; continue; }
  }
}

/**
 * Identifier keys written at exactly `wantDepth` inside the literal opening at
 * `startIdx`. Nested object keys live at wantDepth+1 and are therefore excluded
 * structurally, not by a filter list.
 */
function keysAtDepth(src, startIdx, wantDepth, maxSpan = 8000) {
  const keys = [];
  if (startIdx < 0 || startIdx >= src.length || !OPEN.has(src[startIdx])) return keys;
  let depth = 0;
  const stop = Math.min(src.length, startIdx + maxSpan);
  let i = startIdx;
  while (i < stop) {
    const ch = src[i];
    if (OPEN.has(ch)) { depth += 1; i += 1; continue; }
    if (CLOSE.has(ch)) { depth -= 1; if (depth === 0) break; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') {           // skip string literals
      const q = ch;
      i += 1;
      while (i < stop && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; }
      i += 1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {                    // skip line comments
      while (i < stop && src[i] !== '\n') i += 1;
      continue;
    }
    if (depth === wantDepth && isIdentStart(ch)) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(src.slice(i, i + 96));
      if (m) { keys.push(m[1]); i += m[0].length; continue; }
    }
    i += 1;
  }
  return keys;
}

/** Index of the first opener at or after `from`. */
function nextOpen(src, from) {
  for (let i = from; i < src.length; i += 1) if (OPEN.has(src[i])) return i;
  return -1;
}

/**
 * Index of the '{' that opens `body:` inside the options object at `braceIdx`.
 * `scanBalanced` calls onEnter with the depth *after* the opener is consumed
 * (the '{' itself is depth 1), so the options object's own keys — `method`,
 * `token`, `body` — are all reported at depth 1 by design.
 */
function bodyBraceOfOptions(src, braceIdx) {
  if (braceIdx < 0) return -1;
  let depth = 0;
  let found = -1;
  let i = braceIdx;
  const stop = Math.min(src.length, braceIdx + 4000);
  while (i < stop) {
    const ch = src[i];
    if (OPEN.has(ch)) { depth += 1; i += 1; continue; }
    if (CLOSE.has(ch)) { depth -= 1; if (depth === 0) break; i += 1; continue; }
    if (depth === 1 && isIdentStart(ch)) {
      const m = /^([A-Za-z_$][\w$]*)\s*:/.exec(src.slice(i, i + 96));
      if (m) {
        if (found < 0 && m[1] === 'body') found = nextOpen(src, i + m[0].length);
        i += m[0].length;
        continue;
      }
    }
    i += 1;
  }
  return found;
}

/** Index of the '{' opening `api()`'s 2nd argument, or -1. */
function optionsBraceOfApiCall(src, apiIdx) {
  const open = src.indexOf('(', apiIdx);
  if (open < 0) return -1;
  let depth = 0;
  for (let i = open; i < src.length && i < open + 4000; i += 1) {
    const ch = src[i];
    if (OPEN.has(ch)) { depth += 1; continue; }
    if (CLOSE.has(ch)) { depth -= 1; if (depth === 0) break; continue; }
    if (ch === ',' && depth === 1) return nextOpen(src, i + 1);
  }
  return -1;
}

/* ---------------------------------------------------------------------------
 * 1. NAV TARGETS vs ROUTES
 * ------------------------------------------------------------------------ */
function collectRoutes() {
  const src = read(join(SRC, 'App.jsx'));
  const routes = new Set();
  const redirects = new Set();
  for (const m of src.matchAll(/path\s*=\s*"([^"]+)"/g)) routes.add(m[1]);
  // <Navigate to="/admin/orders?tab=x"> — a redirect is a legitimate
  // destination, and any route that redirects onward can never be called dead.
  for (const m of src.matchAll(/Navigate\s+to\s*=\s*"([^"?]+)/g)) redirects.add(m[1]);
  return { routes, redirects };
}

/**
 * A nav `to` resolves if some route matches it exactly, some deeper param route
 * answers it (/admin/orders/:id serves /admin/orders/68f…), some ancestor route
 * carries a '*' wildcard, or a <Navigate> redirects to it.
 */
function navResolves(to, routes, redirects) {
  const clean = to.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  if (routes.has(clean) || redirects.has(clean)) return true;
  const segs = clean.split('/').filter(Boolean);
  for (let i = segs.length; i > 0; i -= 1) {
    const ancestor = `/${segs.slice(0, i).join('/')}`;
    if (routes.has(`${ancestor}/*`) || routes.has(`${ancestor}/**`)) return true;
  }
  for (const r of routes) {
    if (!r.includes(':') && !r.includes('*')) continue;
    const rsegs = r.split('/').filter(Boolean);
    // A param route at or above this depth answers the path outright:
    // /admin/orders/:id serves /admin/orders/68f…, and /admin/x/:a/:b serves
    // /admin/x/1/2. NOTE: this deliberately does NOT require a sibling list
    // route — an earlier revision demanded one and the self-test flagged it as
    // wrong, because a detail route is a valid destination on its own.
    for (let d = segs.length; d <= rsegs.length; d += 1) {
      const head = rsegs.slice(0, d);
      if (head.length !== d) continue;
      let ok = true;
      for (let i = 0; i < d; i += 1) {
        if (head[i].startsWith(':') || head[i] === '*') continue;
        if (i >= segs.length || head[i] !== segs[i]) { ok = false; break; }
      }
      if (ok) return true;
    }
  }
  return false;
}

function collectNavTargets() {
  const files = [join(SRC, 'admin/AdminLayout.jsx'), join(SRC, 'admin/settings/settingsNav.js')];
  const targets = [];
  for (const f of files) {
    if (!existsSync(f)) continue;
    const src = read(f);
    const re = /to\s*:\s*'(\/admin[^']*)'/g;
    let m;
    while ((m = re.exec(src))) {
      targets.push({ to: m[1], file: rel(f), line: src.slice(0, m.index).split('\n').length });
    }
  }
  return targets;
}

/* ---------------------------------------------------------------------------
 * 2. SETTINGS KEYS vs PUT WHITELIST + MODEL
 * ------------------------------------------------------------------------ */
function modelTopLevelKeys() {
  const src = read(join(BACKEND, 'src/models/Settings.js'));
  const keys = new Set();
  for (const m of src.matchAll(/^ {2}([A-Za-z_$][\w$]*)\s*:\s/gm)) keys.add(m[1]);
  keys.delete('key');
  return keys;
}

function putWhitelistKeys() {
  const src = read(join(BACKEND, 'src/routes/settings.js'));
  const block = src.match(/router\.put\('\/'[\s\S]*?\.forEach\(\(f\)/);
  if (!block) return null; // shape changed — reported loudly below, never passed silently
  return new Set([...block[0].matchAll(/'([A-Za-z_$][\w$]*)'/g)].map((m) => m[1]));
}

/**
 * Keys the server owns and intentionally does NOT accept via the settings PUT.
 * `adminShare` mints share-link admin sessions and is written only by
 * routes/auth.js — whitelisting it would be a privilege-escalation hole, so the
 * checker must not nag about it, and nobody should "complete" the whitelist.
 */
const SERVER_ONLY_KEYS = new Set(['adminShare']);

function savedSettingsKeys() {
  const out = [];
  for (const f of walk(join(SRC, 'admin'))) {
    const src = read(f);
    if (!src.includes('useSettingsSlice') && !src.includes('/settings')) continue;
    const push = (key, idx) => out.push({ key, file: rel(f), line: src.slice(0, idx).split('\n').length });

    // Pattern A — the shared useSettingsSlice helper: save(['a','b'], { c: … }).
    // The overrides object's keys are saved too.
    for (const m of src.matchAll(/save\(\s*\[([^\]]*)\]\s*(?:,\s*\{([^}]*)\})?/g)) {
      for (const k of m[1].matchAll(/'([^']+)'/g)) push(k[1], m.index);
      if (m[2]) for (const k of m[2].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) push(k[1], m.index);
    }

    // Pattern B — hand-rolled PUT: api('/settings', { method: 'PUT', body: { … } }).
    // Only the body object's depth-0 keys count; nested editor fields belong to
    // their parent object and are whitelisted with it.
    for (const m of src.matchAll(/api\(\s*['"]\/settings['"]\s*,/g)) {
      if (!/method:\s*['"]PUT['"]/.test(src.slice(m.index, m.index + 400))) continue;
      const bodyBrace = bodyBraceOfOptions(src, optionsBraceOfApiCall(src, m.index));
      for (const k of keysAtDepth(src, bodyBrace, 1)) {
        if (SERVER_ONLY_KEYS.has(k)) continue;
        push(k, m.index);
      }
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. LOCAL IMPORT TARGETS EXIST ON DISK
 * ------------------------------------------------------------------------ */
function importTargets(src) {
  const out = new Set();
  for (const m of src.matchAll(/(?:import|export)[\s\S]{0,200}?from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) out.add(m[1]);
  for (const m of src.matchAll(/^\s*import\s+['"](\.{1,2}\/[^'"]+)['"]/gm)) out.add(m[1]);
  // Includes the lazy pattern used across App.jsx:
  //   lazy(() => import('./admin/SettingsAddress').then((m) => ({ default: m.X })))
  for (const m of src.matchAll(/import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g)) out.add(m[1]);
  return [...out];
}

function checkImports(files) {
  const missing = [];
  for (const f of files) {
    const src = read(f);
    for (const spec of importTargets(src)) {
      const base = resolve(dirname(f), spec);
      const candidates = extname(spec) ? [base] : EXT_CANDIDATES.map((e) => `${base}${e}`);
      if (candidates.some((p) => { try { return statSync(p).isFile(); } catch { return false; } })) continue;
      if (existsSync(join(base, 'index.js')) || existsSync(join(base, 'index.jsx'))) continue;
      missing.push({ from: rel(f), spec });
    }
  }
  return missing;
}

/* ---------------------------------------------------------------------------
 * SELF-TEST — this file parses source, so it carries proof of its own
 * correctness. Without it, a broken scanner reports "all clean" forever.
 * ------------------------------------------------------------------------ */
function selfTest() {
  const cases = [];
  const t = (name, got, want) => {
    const ok = JSON.stringify([...got].sort()) === JSON.stringify([...want].sort());
    cases.push({ name, ok, got, want });
  };
  const bodyKeys = (src) => {
    const m = /api\(\s*['"]\/settings['"]\s*,/.exec(src);
    return keysAtDepth(src, bodyBraceOfOptions(src, optionsBraceOfApiCall(src, m.index)), 1);
  };

  t('nested keys are NOT reported as settings keys',
    bodyKeys(`await api('/settings', { method: 'PUT', token: tok, body: {
      integrations: { whatsapp: wa, social, analytics },
      media: { cloudName: 'c', uploadPreset: 'p' },
    } });`), ['integrations', 'media']);
  t('single-line PUT body', bodyKeys(`await api('/settings', { method: 'PUT', token: t, body: { search: S, discovery: D } });`), ['search', 'discovery']);
  t('spread in body yields its named keys', bodyKeys(`await api('/settings', { method: 'PUT', body: { ...existing, taxPercent: 5 } });`), ['taxPercent']);
  t('SERVER_ONLY_KEYS suppressed', bodyKeys(`await api('/settings', { method: 'PUT', body: { adminShare: { linkId: 'x' } } });`).filter((k) => !SERVER_ONLY_KEYS.has(k)), []);
  t('key names containing "body" are not confused', bodyKeys(`await api('/settings', { method: 'PUT', body: { bodyClass: 'x', theme: {} } });`), ['bodyClass', 'theme']);
  t('string literals with braces do not break depth tracking', bodyKeys(`await api('/settings', { method: 'PUT', body: { header: "a{b}c", footer: {} } });`), ['header', 'footer']);

  const routes = new Set(['/admin/orders', '/admin/orders/:id', '/admin/inbox', '/admin/analytics/*']);
  const redirects = new Set(['/admin/orders/pending']);
  t('exact route resolves', [navResolves('/admin/inbox', routes, redirects)], [true]);
  t('query string stripped', [navResolves('/admin/orders?tab=ship', routes, redirects)], [true]);
  t('param child route resolves', [navResolves('/admin/orders/68fabc', routes, redirects)], [true]);
  t('wildcard ancestor resolves', [navResolves('/admin/analytics/sales', routes, redirects)], [true]);
  t('<Navigate> redirect counts as resolved', [navResolves('/admin/orders/pending', routes, redirects)], [true]);
  t('truly dead link flagged', [navResolves('/admin/customers/segments', routes, redirects)], [false]);

  const failed = cases.filter((c) => !c.ok);
  for (const c of cases) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}${c.ok ? '' : `  got=${JSON.stringify(c.got)} want=${JSON.stringify(c.want)}`}`);
  }
  console.log(`\n  ${cases.length - failed.length}/${cases.length} self-tests passed`);
  process.exit(failed.length ? 1 : 0);
}

/* ---------------------------------------------------------------------------
 * RUN
 * ------------------------------------------------------------------------ */
function collect() {
  const { routes, redirects } = collectRoutes();
  const navTargets = collectNavTargets();
  const navUnresolved = navTargets
    .filter((t) => t.to !== '/admin' && !navResolves(t.to, routes, redirects))
    .map((t) => `${t.file}:${t.line} -> ${t.to}`);

  const modelKeys = modelTopLevelKeys();
  const whitelist = putWhitelistKeys();
  const saved = savedSettingsKeys();
  const settingsOrphan = [];
  for (const s of new Map(saved.map((x) => [`${x.file}|${x.key}`, x])).values()) {
    const inModel = modelKeys.has(s.key);
    const inWhitelist = whitelist ? whitelist.has(s.key) : true;
    if (!inModel || !inWhitelist) {
      settingsOrphan.push(`${s.file}:${s.line} -> ${s.key}${!inModel ? ' (NOT IN MODEL)' : ''}${!inWhitelist ? ' (NOT IN PUT WHITELIST)' : ''}`);
    }
  }

  const frontendFiles = walk(SRC);
  const backendFiles = existsSync(join(BACKEND, 'src')) ? walk(join(BACKEND, 'src')) : [];
  const importMissing = checkImports([...frontendFiles, ...backendFiles]).map((i) => `${i.from} -> ${i.spec}`);

  const uniq = (a) => [...new Set(a)].sort();
  return {
    counts: {
      routes: routes.size,
      navTargets: navTargets.length,
      settingsKeysSaved: new Set(saved.map((s) => s.key)).size,
      filesScanned: frontendFiles.length + backendFiles.length,
    },
    findings: {
      navUnresolved: uniq(navUnresolved),
      settingsOrphan: uniq(settingsOrphan),
      importMissing: uniq(importMissing),
    },
  };
}

if (MODE === '--selftest') selfTest();

const result = collect();
const flat = (f) => Object.entries(f).flatMap(([cat, arr]) => arr.map((x) => `${cat}|${x}`));
const current = flat(result.findings);

if (MODE === '--reconcile') {
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ reconciledAt: new Date().toISOString(), counts: result.counts, findings: result.findings }, null, 2)}\n`);
  console.log(`✓ baseline reconciled — ${current.length} accepted findings written to ${rel(BASELINE_PATH)}`);
  process.exit(0);
}

const baseline = existsSync(BASELINE_PATH) ? JSON.parse(read(BASELINE_PATH)) : { findings: {} };
const accepted = new Set(flat(baseline.findings || {}));
const regressions = current.filter((f) => !accepted.has(f));
const fixed = [...accepted].filter((f) => !current.includes(f));

console.log('HUSHAE admin-integrity check');
console.log(`  scanned      ${result.counts.filesScanned} files · ${result.counts.routes} routes · ${result.counts.navTargets} nav targets · ${result.counts.settingsKeysSaved} settings keys`);
for (const [cat, arr] of Object.entries(result.findings)) console.log(`  ${cat.padEnd(14)} ${arr.length} finding(s)`);

if (MODE === '--report') {
  for (const [cat, arr] of Object.entries(result.findings)) {
    if (!arr.length) continue;
    console.log(`\n  ${cat}:`);
    for (const f of arr.slice(0, 60)) console.log(`    - ${f.replace(/^navUnresolved\|/, '')}`);
    if (arr.length > 60) console.log(`    … and ${arr.length - 60} more`);
  }
  if (fixed.length) console.log(`\n  ${fixed.length} baseline entries are now clean — run --reconcile to shrink the baseline.`);
  console.log('\n  (--report never fails. Ratchet mode: npm run check:admin)');
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error('\n✗ No baseline found. Create it with: npm run check:admin -- --reconcile');
  console.error('  then commit frontend/scripts/admin-integrity.baseline.json');
  process.exit(1);
}

if (fixed.length) {
  console.log(`\n  ~ ${fixed.length} baseline finding(s) now resolved. Shrink it: npm run check:admin -- --reconcile`);
}

if (regressions.length) {
  console.error(`\n✗ ${regressions.length} NEW integrity problem(s), not in the baseline — this is a regression:\n`);
  for (const r of regressions) console.error(`    ${r.replace(/\|/, '  ·  ')}`);
  console.error('\n  Fix the wiring. Only if the new state is intended: npm run check:admin -- --reconcile');
  process.exit(1);
}

console.log('\n✓ No new nav/route, settings-whitelist, or broken-import findings.');
