/* ============================================================================
 * CMS SEO / STRUCTURED-DATA SUITE
 *
 * The structured-data box is the only place in the whole CMS where a merchant
 * types raw code that is then injected into a <script> tag on a public page.
 * Two independent validators guard it — safeParse() in the browser and
 * validateStructuredData() on the server — and they must AGREE. A payload the
 * browser waves through and the server rejects is a confusing save failure; a
 * payload the server waves through and the browser rejects is worse, because
 * it means the real boundary is the weaker of the two.
 *
 * Also checks the SEO fallback chain, which is duplicated by necessity (the
 * server resolves it for the storefront, the panel previews it for the
 * merchant). Sprint 2J proved that two copies of one rule drift within a
 * sprint unless something compares them.
 * ========================================================================== */

import fs from 'fs';

const R = [];
const ok = (n, c, extra = '') => R.push([!!c, n, extra]);

const ROOT = '/home/user/hushae';

/* ---- load the browser validator without a DOM -------------------------- */
const panelSrc = fs.readFileSync(`${ROOT}/frontend/src/admin/cms/StructuredDataPanel.jsx`, 'utf8');
const fnStart = panelSrc.indexOf('export function safeParse');
const fnEnd = panelSrc.indexOf('\n}\n', fnStart) + 3;
const safeParseSrc = panelSrc.slice(fnStart, fnEnd).replace('export function', 'function');
ok('safeParse extracted from the panel', safeParseSrc.includes('JSON.parse'));

/* safeParse closes over SCRIPT_CLOSE, declared above it in the module. Lifting
   the function alone threw "SCRIPT_CLOSE is not defined" — carry its real
   declaration across rather than re-typing the regex here, or this suite would
   be testing a copy of the rule instead of the rule. */
const scLine = panelSrc.match(/^const SCRIPT_CLOSE = .+$/m);
ok('SCRIPT_CLOSE declaration found in the panel', !!scLine);

// TextEncoder is global in Node 18+; the function needs nothing else.
// eslint-disable-next-line no-eval
const safeParse = eval(`(() => { ${scLine[0]}\n${safeParseSrc}\nreturn safeParse; })()`);

/* ---- load the server validator ----------------------------------------- */
const E = await import(`${ROOT}/backend/src/utils/cmsEngine.js`).then((m) => m.default || m);
const serverCheck = (v) => E.validateStructuredData(v);

/* ---- 1. the two validators must reach the same verdict ------------------ */
const CASES = [
  ['empty string', '', true],
  ['null', null, true],
  ['valid FAQPage', '{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}', true],
  ['valid @graph', '{"@graph":[{"@type":"Article"}]}', true],
  ['valid array', '[{"@type":"Question"}]', true],
  ['broken JSON — missing brace', '{"@type":"FAQPage"', false],
  ['broken JSON — trailing comma', '{"@type":"FAQPage",}', false],
  ['broken JSON — single quotes', "{'@type':'FAQPage'}", false],
  ['object with no @type', '{"hello":"world"}', false],
  ['a bare number', '42', false],
  ['a bare string', '"hello"', false],
];

for (const [name, input, expectOk] of CASES) {
  const b = safeParse(input);
  const s = serverCheck(input);
  ok(`browser verdict on ${name}`, b.ok === expectOk, `got ${b.ok}, wanted ${expectOk}: ${b.message || ''}`);
  ok(`server verdict on ${name}`, s.ok === expectOk, `got ${s.ok}, wanted ${expectOk}: ${s.message || ''}`);
  ok(`browser and server AGREE on ${name}`, b.ok === s.ok, `browser=${b.ok} server=${s.ok}`);
}

/* ---- 2. the injection case, which is the reason this file exists -------- */
/* A JSON string may legally contain "</script>". JSON.parse accepts it, and
   both validators are technically correct to. But the value is written into a
   <script type="application/ld+json"> block, and the browser's HTML tokeniser
   ends that element at the first "</script" REGARDLESS of JSON quoting — so
   everything after it is parsed as markup. */
const INJECT = '{"@type":"FAQPage","x":"</script><img src=x onerror=alert(1)>"}';
const bi = safeParse(INJECT);
ok('browser refuses a </script> payload', !bi.ok, JSON.stringify(bi).slice(0, 90));
ok('browser explains why in plain words', /script/i.test(bi.message || ''), bi.message);

const si = serverCheck(INJECT);
/* Documented gap: the server accepts it because JSON.parse does. That is only
   safe while the value is re-serialised with JSON.stringify at render time,
   which escapes nothing relevant — so the BROWSER guard is the real one and
   the storefront renderer (Part 3) must escape "<" on output. This assertion
   pins the current behaviour so Part 3 cannot forget. */
ok('server currently accepts it — Part 3 renderer MUST escape on output', si.ok === true,
  `server said ${si.ok}; if this now fails the server was hardened, update Part 3 notes`);

const VARIANTS = ['</script', '</ script', '</SCRIPT>', '<\\/script>'];
for (const v of VARIANTS) {
  const payload = JSON.stringify({ '@type': 'FAQPage', x: v });
  const r = safeParse(payload);
  // The escaped form <\/script> is safe: it cannot close the tag.
  const shouldRefuse = !v.startsWith('<\\');
  ok(`browser handles "${v}" correctly`, r.ok === !shouldRefuse,
    `refused=${!r.ok}, expected refusal=${shouldRefuse}`);
}

/* ---- 3. size ceiling agrees ------------------------------------------- */
const big = JSON.stringify({ '@type': 'FAQPage', pad: 'x'.repeat(33 * 1024) });
ok('browser refuses >32 KB', !safeParse(big).ok);
ok('server refuses >32 KB', !serverCheck(big).ok);
const okSize = JSON.stringify({ '@type': 'FAQPage', pad: 'x'.repeat(4 * 1024) });
ok('browser accepts 4 KB', safeParse(okSize).ok);
ok('server accepts 4 KB', serverCheck(okSize).ok);

/* ---- 4. the SEO fallback chain, server vs panel ------------------------ */
/* resolveSeo() feeds the storefront; SeoPanel previews the same chain for the
   merchant. If they disagree the preview is a lie. */
const cfg = await E.cmsConfig();
const page = {
  title: 'Size guide',
  slug: 'size-guide',
  excerpt: 'Measure yourself in two minutes.',
  seo: {},
};
const r1 = E.resolveSeo(page, cfg, {});
ok('title falls back to the page name', r1.title === 'Size guide', r1.title);
ok('description falls back to the excerpt', r1.description === 'Measure yourself in two minutes.', r1.description);
ok('canonical defaults to the slug', r1.canonical === '/size-guide', r1.canonical);
ok('robots default to index,follow', r1.robots === 'index,follow', r1.robots);
ok('og title falls back to the resolved title', r1.og.title === 'Size guide', r1.og.title);
ok('og description falls back to the resolved description', r1.og.description === 'Measure yourself in two minutes.');
ok('title template is applied', r1.fullTitle === 'Size guide · HUSHAE', r1.fullTitle);

const page2 = {
  ...page,
  seo: { title: 'Find your size', description: 'A short guide.', noIndex: true, noFollow: true, ogTitle: 'Fits first time' },
};
const r2 = E.resolveSeo(page2, cfg, {});
ok('explicit search title wins', r2.title === 'Find your size', r2.title);
ok('explicit description wins', r2.description === 'A short guide.', r2.description);
ok('noIndex + noFollow both land in robots', r2.robots === 'noindex,nofollow', r2.robots);
ok('explicit og title wins', r2.og.title === 'Fits first time', r2.og.title);
ok('og description still falls back to the search description', r2.og.description === 'A short guide.', r2.og.description);

/* The panel builds its preview from the same chain. Rather than duplicating
   the logic in the test, assert the panel SOURCE contains the same order. */
const seoPanelSrc = fs.readFileSync(`${ROOT}/frontend/src/admin/cms/SeoPanel.jsx`, 'utf8');
ok('panel title chain matches the server', /seo\.title \|\| page\.title/.test(seoPanelSrc));
ok('panel description chain matches the server',
  /seo\.description \|\| page\.excerpt \|\| cfg\.seo\?\.defaultDescription/.test(seoPanelSrc));
ok('panel canonical chain matches the server', /seo\.canonical \|\| `\/\$\{page\.slug/.test(seoPanelSrc));

const socialSrc = fs.readFileSync(`${ROOT}/frontend/src/admin/cms/SocialPanel.jsx`, 'utf8');
ok('social title chain matches the server', /seo\.ogTitle \|\| seo\.title \|\| page\.title/.test(socialSrc));
ok('social description chain matches the server',
  /seo\.ogDescription \|\| seo\.description \|\| page\.excerpt/.test(socialSrc));
ok('social image chain matches the server', /seo\.ogImage \|\| cfg\.seo\?\.defaultOgImage/.test(socialSrc));

/* ---- 5. UI-only keys must never be persisted --------------------------- */
const editSrc = fs.readFileSync(`${ROOT}/frontend/src/admin/CmsEdit.jsx`, 'utf8');
ok('a payload() helper exists', /const payload = \(\) =>/.test(editSrc));
ok('payload strips __ keys', /startsWith\('__'\)/.test(editSrc));
ok('POST uses payload()', /method: 'POST'[^}]*body: payload\(\)/.test(editSrc));
ok('PUT uses payload()', /method: 'PUT'[^}]*body: payload\(\)/.test(editSrc));
ok('no raw `body: p` save path remains', !/body: p \}/.test(editSrc));

/* ---- report ---- */
const failed = R.filter(([p]) => !p);
failed.forEach(([, n, e]) => console.log(`FAIL  ${n}${e ? '  →  ' + e : ''}`));
console.log(`${R.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
