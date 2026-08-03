/* ============================================================================
 * CMS DEFAULTS PARITY
 *
 * WHY THIS SUITE EXISTS
 *   Sprint 2J shipped a live bug from exactly this drift: the search engine's
 *   synonym table was empty while the Mongoose schema seeded twelve entries, so
 *   a shopper typing "panty" got one fuzzy match instead of a whole category.
 *   Nobody noticed for a sprint because every individual file looked correct.
 *
 *   THREE files must agree on what a CMS default is:
 *     backend/src/models/Settings.js     the schema Mongo materialises on save
 *     backend/src/utils/cmsEngine.js     what the API falls back to when unset
 *     frontend/src/lib/cmsConfig.js      what the admin form shows the merchant
 *
 *   Gotcha 45/53: schema defaults are materialised on the next SAVE, never on
 *   a .lean() read. So a merchant who has never opened the CMS settings has
 *   NOTHING in settings.cms, and every one of those reads falls through to the
 *   engine's DEFAULTS. If the frontend disagrees, the form lies about what the
 *   shop is actually doing.
 *
 * This parses the three files rather than importing them — Settings.js is a
 * Mongoose schema that needs a live connection, and the frontend file is ESM
 * with Vite-only syntax elsewhere in its tree.
 * ========================================================================== */

import fs from 'fs';

const R = [];
const ok = (n, c, extra = '') => R.push([!!c, n, extra]);

const ROOT = '/home/user/hushae';
const engineSrc = fs.readFileSync(`${ROOT}/backend/src/utils/cmsEngine.js`, 'utf8');
const schemaSrc = fs.readFileSync(`${ROOT}/backend/src/models/Settings.js`, 'utf8');
const frontSrc = fs.readFileSync(`${ROOT}/frontend/src/lib/cmsConfig.js`, 'utf8');

/** Pull an object literal out of a source file by its assignment. */
function literalAfter(src, marker) {
  const i = src.indexOf(marker);
  if (i < 0) return null;
  const start = src.indexOf('{', i);
  let depth = 0;
  for (let j = start; j < src.length; j += 1) {
    if (src[j] === '{') depth += 1;
    else if (src[j] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return null;
}

// eslint-disable-next-line no-eval
const evalLit = (lit) => eval(`(${lit})`);

const engine = evalLit(literalAfter(engineSrc, 'const DEFAULTS ='));
const front = evalLit(literalAfter(frontSrc, 'export const CMS_DEFAULTS ='));

ok('cmsEngine DEFAULTS parsed', engine && typeof engine === 'object');
ok('cmsConfig CMS_DEFAULTS parsed', front && typeof front === 'object');

/* ---- 1. engine vs frontend, field by field ---- */
const flat = (o, pre = '') => Object.entries(o).reduce((acc, [k, v]) => {
  const key = pre ? `${pre}.${k}` : k;
  if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(acc, flat(v, key));
  else acc[key] = Array.isArray(v) ? JSON.stringify(v) : v;
  return acc;
}, {});

const fe = flat(engine);
const ff = flat(front);

const engineKeys = Object.keys(fe).sort();
const frontKeys = Object.keys(ff).sort();

ok('same field count in engine and frontend', engineKeys.length === frontKeys.length,
  `engine ${engineKeys.length} vs frontend ${frontKeys.length}`);

for (const k of engineKeys) {
  ok(`frontend has "${k}"`, k in ff);
  if (k in ff) ok(`"${k}" values match`, fe[k] === ff[k], `engine=${fe[k]} frontend=${ff[k]}`);
}
for (const k of frontKeys) ok(`engine has "${k}" (no frontend-only field)`, k in fe);

/* ---- 2. the Mongoose schema block agrees on the scalars ---- */
const cmsBlock = literalAfter(schemaSrc, '  cms: {');
ok('settings.cms block found in Settings.js', !!cmsBlock);

/** `field: { type: X, default: V }` — read the default the schema will write. */
function schemaDefault(block, field) {
  const rx = new RegExp(`${field}\\s*:\\s*\\{[^{}]*default\\s*:\\s*([^,}]+)`, 's');
  const m = block.match(rx);
  if (!m) return undefined;
  const raw = m[1].trim();
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw.replace(/^['"]|['"]$/g, '');
}

const SCALARS = [
  ['enabled', engine.enabled],
  ['defaultStatus', engine.defaultStatus],
  ['requireSeoTitle', engine.requireSeoTitle],
  ['autoRedirectOnRename', engine.autoRedirectOnRename],
  ['maxVersions', engine.maxVersions],
  ['lowercase', engine.slug.lowercase],
  ['maxLength', engine.slug.maxLength],
  ['titleTemplate', engine.seo.titleTemplate],
  ['defaultNoIndex', engine.seo.defaultNoIndex],
  ['organisation', engine.structuredData.organisation],
  ['breadcrumbs', engine.structuredData.breadcrumbs],
];

for (const [field, expected] of SCALARS) {
  const got = schemaDefault(cmsBlock, field);
  ok(`schema default for "${field}" matches the engine`, got === expected, `schema=${got} engine=${expected}`);
}

/* ---- 3. the reserved list is the thing most likely to drift ---- */
const reservedIn = (src) => {
  const lit = literalAfter(src.slice(src.indexOf('reserved')), 'default:')
    || (src.slice(src.indexOf('reserved')).match(/\[([^\]]+)\]/) || [])[0];
  return lit;
};
const engRes = engine.slug.reserved;
const froRes = front.slug.reserved;
ok('reserved slug list same length', engRes.length === froRes.length, `${engRes.length} vs ${froRes.length}`);
ok('reserved slug list same order and content', JSON.stringify(engRes) === JSON.stringify(froRes));

// And the schema's copy, which is what actually gets written to Mongo.
const schemaResMatch = cmsBlock.match(/reserved:\s*\{[\s\S]*?default:\s*\[([\s\S]*?)\]/);
ok('schema reserved list found', !!schemaResMatch);
if (schemaResMatch) {
  const schemaRes = schemaResMatch[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  ok('schema reserved list matches the engine', JSON.stringify(schemaRes) === JSON.stringify(engRes),
    `schema ${schemaRes.length} vs engine ${engRes.length}`);
  /* Every reserved word must correspond to a real route, or the merchant is
     refused an address for no reason. Spot-check the ones that matter. */
  for (const must of ['cart', 'checkout', 'account', 'shop', 'search', 'admin', 'api']) {
    ok(`"${must}" is reserved (a CMS page there would shadow the shop)`, schemaRes.includes(must));
  }
}

/* ---- 4. the slug rules themselves must behave identically ---- */
/* checkSlug lives in the engine; checkSlugLocal mirrors it in the browser. A
   merchant refused by one and accepted by the other learns to distrust both.
   Sprint 2L P1 found a real bug here: the engine lowercased BEFORE testing, so
   the case rule could never fire. */
const { checkSlug } = await import(`${ROOT}/backend/src/utils/cmsEngine.js`).then((m) => m.default || m);

// Re-implement the frontend's function by evaluating just that function body.
const frontFn = frontSrc.slice(frontSrc.indexOf('export function checkSlugLocal'));
const frontBody = frontFn.slice(0, frontFn.indexOf('\n}\n') + 2).replace('export function', 'function');
const slugifyBody = (() => {
  const s = frontSrc.slice(frontSrc.indexOf('export function slugify'));
  return s.slice(0, s.indexOf('\n}\n') + 2).replace('export function', 'function');
})();
// eslint-disable-next-line no-eval
const checkSlugLocal = eval(`(() => { ${slugifyBody}\n${frontBody}\nreturn checkSlugLocal; })()`);

const CASES = [
  ['size-guide', true, 'a normal address'],
  ['Privacy', false, 'uppercase must be refused by BOTH — the 2L P1 bug'],
  ['cart', false, 'a reserved first segment'],
  ['shop-guide', true, 'reserved word as a PREFIX is fine'],
  ['', false, 'empty'],
  ['has spaces', false, 'spaces'],
  ['-leading', false, 'leading hyphen'],
  ['a'.repeat(120), false, 'too long'],
  ['size/guide', true, 'a nested address'],
  ['checkout/thanks', false, 'reserved first segment even when nested'],
];

for (const [input, expected, why] of CASES) {
  const a = checkSlug(input, engine);
  const b2 = checkSlugLocal(input, front);
  ok(`server and browser agree on "${input.slice(0, 20)}" (${why})`, a.ok === b2.ok && a.ok === expected,
    `server=${a.ok} browser=${b2.ok} expected=${expected}`);
  if (!a.ok && !b2.ok) {
    ok(`  same wording for "${input.slice(0, 20)}"`, a.message === b2.message,
      `server="${a.message}" browser="${b2.message}"`);
  }
}

/* ---- report ---- */
const failed = R.filter(([p]) => !p);
failed.forEach(([, n, e]) => console.log(`FAIL  ${n}${e ? '  →  ' + e : ''}`));
console.log(`${R.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
