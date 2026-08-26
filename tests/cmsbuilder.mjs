/* ============================================================================
 * SECTION BUILDER + DIFF SUITE
 *
 * TWO THINGS THIS PINS
 *
 * 1. validateDoc() must police BOTH document shapes.
 *    MEASURED BUG, Sprint 2L P2B: the function only ever read `doc.sections`.
 *    The section builder reuses theme-editor/core/registry.ts, which produces
 *    { template, header[], body[], footer[] } — so every document the builder
 *    saved skipped section validation completely. A section with no `type`
 *    (which crashes the renderer) and 61 sections in one group both returned
 *    { ok: true }. It LOOKED like validation was working because the byte,
 *    depth and circular-reference guards still fired.
 *
 * 2. The builder must own NO schema knowledge.
 *    The whole justification for reusing the theme registry is that a section
 *    added to schemas/sections.ts appears in the CMS builder with no edit here.
 *    That only holds while the builder never hardcodes a section type, so this
 *    suite greps for one.
 * ========================================================================== */

import fs from 'fs';

const R = [];
const ok = (n, c, extra = '') => R.push([!!c, n, extra]);

const ROOT = '/home/user/hushae';
const E = await import(`${ROOT}/backend/src/utils/cmsEngine.js`).then((m) => m.default || m);

/* ---- 1. both shapes, same rules ---------------------------------------- */
const themeDoc = (body, extra = {}) => ({ template: 'page', header: [], footer: [], body, ...extra });
const sec = (over = {}) => ({ id: 's' + Math.random().toString(36).slice(2, 7), type: 'hero', settings: {}, blocks: [], ...over });

const SHAPES = [
  ['CMS flat: valid', { sections: [{ type: 'hero', blocks: [] }] }, true],
  ['CMS flat: section with no type', { sections: [{ blocks: [] }] }, false],
  ['CMS flat: 61 sections', { sections: Array.from({ length: 61 }, () => ({ type: 'spacer' })) }, false],
  ['CMS flat: sections not a list', { sections: 'nope' }, false],

  ['THEME: valid', themeDoc([sec()]), true],
  ['THEME: empty is fine', themeDoc([]), true],
  ['THEME: section with no type', themeDoc([{ id: 'a', settings: {}, blocks: [] }]), false],
  ['THEME: section that is not an object', themeDoc(['nope']), false],
  ['THEME: 61 body sections', themeDoc(Array.from({ length: 61 }, () => sec({ type: 'spacer' }))), false],
  ['THEME: 60 body sections is allowed', themeDoc(Array.from({ length: 60 }, () => sec({ type: 'spacer' }))), true],
  ['THEME: 41 blocks in one section', themeDoc([sec({ blocks: Array.from({ length: 41 }, (_, i) => ({ id: 'b' + i, type: 'text', settings: {} })) })]), false],
  ['THEME: 40 blocks is allowed', themeDoc([sec({ blocks: Array.from({ length: 40 }, (_, i) => ({ id: 'b' + i, type: 'text', settings: {} })) })]), true],
  ['THEME: nested block with no type', themeDoc([sec({ blocks: [{ id: 'b', settings: {} }] })]), false],
  ['THEME: deeply nested block with no type', themeDoc([sec({ blocks: [{ id: 'b', type: 'text', settings: {}, blocks: [{ id: 'c', settings: {} }] }] })]), false],
  ['THEME: body not a list', themeDoc('nope'), false],
  ['THEME: header not a list', { template: 'page', header: 'x', body: [], footer: [] }, false],
];

for (const [name, doc, want] of SHAPES) {
  const r = E.validateDoc(doc);
  ok(name, r.ok === want, r.ok ? 'accepted' : `refused: ${r.message}`);
}

/* The section limit is per PAGE, not per group — otherwise 60 header + 60 body
   + 60 footer is 180 sections and every one of them renders. */
const split = { template: 'page', header: Array.from({ length: 30 }, () => sec({ type: 'spacer' })), body: Array.from({ length: 31 }, () => sec({ type: 'spacer' })), footer: [] };
ok('section limit counts the whole page, not each group', !E.validateDoc(split).ok, E.validateDoc(split).message);

/* Guards that already worked must still work on the theme shape. */
let deep = themeDoc([sec()]);
let n = deep.body[0];
for (let i = 0; i < 10; i += 1) { n.blocks = [{ id: 'x' + i, type: 'text', settings: {} }]; n = n.blocks[0]; }
ok('depth guard still fires', !E.validateDoc(deep).ok, E.validateDoc(deep).message);
ok('byte ceiling still fires', !E.validateDoc(themeDoc([sec({ settings: { html: 'x'.repeat(600 * 1024) } })])).ok);
const circ = themeDoc([]); circ.self = circ;
ok('circular reference still caught', !E.validateDoc(circ).ok);

/* ---- 2. the diff engine ------------------------------------------------ */
const V = (body, docBody, seo = {}) => ({ body, doc: themeDoc(docBody), seo });

const same = E.diffContent(V('same', [sec({ id: 'a' })]), V('same', [sec({ id: 'a' })]));
ok('identical documents report no changes', same.length === 0, JSON.stringify(same));

const added = E.diffContent(V('x', [{ id: 'a', type: 'hero', settings: {}, blocks: [] }]),
  V('x', [{ id: 'a', type: 'hero', settings: {}, blocks: [] }, { id: 'b', type: 'faq', settings: {}, blocks: [] }]));
ok('a new section is reported as added', added.some((c) => c.kind === 'section-added'), JSON.stringify(added));

const removed = E.diffContent(V('x', [{ id: 'a', type: 'hero', settings: {}, blocks: [] }, { id: 'b', type: 'faq', settings: {}, blocks: [] }]),
  V('x', [{ id: 'a', type: 'hero', settings: {}, blocks: [] }]));
ok('a deleted section is reported as removed', removed.some((c) => c.kind === 'section-removed'));

const moved = E.diffContent(V('x', [{ id: 'a', type: 'hero', settings: {}, blocks: [] }, { id: 'b', type: 'faq', settings: {}, blocks: [] }]),
  V('x', [{ id: 'b', type: 'faq', settings: {}, blocks: [] }, { id: 'a', type: 'hero', settings: {}, blocks: [] }]));
ok('reordering is reported as a move', moved.some((c) => c.kind === 'section-moved'), JSON.stringify(moved.map((c) => c.kind)));

const edited = E.diffContent(V('x', [{ id: 'a', type: 'hero', settings: { heading: 'Old' }, blocks: [] }]),
  V('x', [{ id: 'a', type: 'hero', settings: { heading: 'New' }, blocks: [] }]));
ok('a settings change is reported as edited', edited.some((c) => c.kind === 'section-edited'));
ok('the edited section is named in the label', /Old|New|Hero/.test(edited.find((c) => c.kind === 'section-edited')?.label || ''),
  edited.find((c) => c.kind === 'section-edited')?.label);

const hidden = E.diffContent(V('x', [{ id: 'a', type: 'hero', settings: {}, blocks: [] }]),
  V('x', [{ id: 'a', type: 'hero', settings: {}, blocks: [], hidden: true }]));
ok('switching a section off is distinguished from editing it',
  hidden.some((c) => c.kind === 'section-hidden'), JSON.stringify(hidden.map((c) => c.kind)));

const bodyDiff = E.diffContent(V('one\ntwo', []), V('one\ntwo\nthree', []));
const bc = bodyDiff.find((c) => c.kind === 'body-changed');
ok('a writing change is reported', !!bc);
ok('the writing change counts lines', bc?.fromLines === 2 && bc?.toLines === 3, JSON.stringify(bc));

const seoDiff = E.diffContent(V('x', [], { title: 'Old', noIndex: false }), V('x', [], { title: 'New', noIndex: true }));
ok('each SEO field is reported separately', seoDiff.filter((c) => c.kind === 'seo-changed').length === 2,
  JSON.stringify(seoDiff.map((c) => c.field)));
ok('a boolean SEO change reads as yes/no', seoDiff.find((c) => c.field === 'noIndex')?.to === 'yes',
  JSON.stringify(seoDiff.find((c) => c.field === 'noIndex')));
ok('an SEO change carries both values', seoDiff.find((c) => c.field === 'title')?.from === 'Old');
ok('an empty SEO value reads as (empty)',
  E.diffContent(V('x', [], { title: 'Old' }), V('x', [], {})).find((c) => c.field === 'title')?.to === '(empty)');

/* A structured-data object must not be dumped into the timeline verbatim. */
const sdDiff = E.diffContent(V('x', [], { structuredData: null }), V('x', [], { structuredData: { '@type': 'FAQPage' } }));
ok('structured data is summarised, not dumped', sdDiff.find((c) => c.field === 'structuredData')?.to === '(a block of data)',
  JSON.stringify(sdDiff.find((c) => c.field === 'structuredData')));

/* Documents with no ids at all still get an answer rather than silence. */
const noIds = E.diffContent(V('x', [{ type: 'hero', settings: {}, blocks: [] }]), V('x', []));
ok('id-less documents still report a change', noIds.length > 0, JSON.stringify(noIds));

/* ---- 3. the builder owns no schema knowledge --------------------------- */
const builderSrc = fs.readFileSync(`${ROOT}/frontend/src/admin/cms/SectionBuilder.jsx`, 'utf8');
ok('builder imports the theme registry', /theme-editor\/core\/registry/.test(builderSrc));
ok('builder imports the theme doc helpers', /theme-editor\/core\/docUtils/.test(builderSrc));
ok('builder imports the schema catalogue for its side effect', /theme-editor\/schemas\/sections/.test(builderSrc));
ok('builder does not register its own sections', !/registerSection/.test(builderSrc));
ok('builder does not define a section list', !/SECTION_TYPES|const SECTIONS\s*=/.test(builderSrc));

/* The real test of "no duplicate registry": no section TYPE string appears in
   the builder. If one does, adding a section to the theme would need an edit
   here — which is the coupling this design exists to avoid.

   `variant` props are excluded first. They belong to the admin Controls
   namespace — Section/Toggle take variant="editorial" for their flat layout —
   which only collides by name with the theme-editor section type 'editorial'.
   A UI variant never makes the builder aware of the section registry, so
   counting it here would be a false positive. */
const sectionsSrc = fs.readFileSync(`${ROOT}/frontend/src/theme-editor/schemas/sections.ts`, 'utf8');
const types = [...sectionsSrc.matchAll(/^S\(\{\s*$|type: '([a-z_]+)', name: '/gm)].map((m) => m[1]).filter(Boolean);
const builderSrcSansVariants = builderSrc.replace(/\bvariant=(?:"[^"]*"|'[^']*'|\{[^}]*\})/g, '');
const leaked = types.filter((t) => new RegExp(`['"\`]${t}['"\`]`).test(builderSrcSansVariants));
ok('builder hardcodes no section type', leaked.length === 0, `leaked: ${leaked.join(', ')}`);
ok('registry exposed enough types to make that meaningful', types.length > 10, `${types.length} types found`);

/* It filters Header/Footer by CATEGORY, which is registry data, not by naming
   individual types. */
ok('shop chrome excluded by category, not by type name', /skip = new Set\(\['Header', 'Footer'\]\)/.test(builderSrc));

/* ---- 4. the version endpoints exist and are admin-gated ---------------- */
const routeSrc = fs.readFileSync(`${ROOT}/backend/src/routes/cms.js`, 'utf8');
const adminLine = routeSrc.indexOf('router.use(protect, adminOnly)');
const versionLine = routeSrc.indexOf("router.get('/pages/:id/versions/:versionId'");
const diffLine = routeSrc.indexOf("router.get('/pages/:id/diff'");
ok('single-version endpoint exists', versionLine > 0);
ok('diff endpoint exists', diffLine > 0);
ok('version endpoint is behind the admin gate', versionLine > adminLine, `${versionLine} vs ${adminLine}`);
ok('diff endpoint is behind the admin gate', diffLine > adminLine);
ok('a version is checked against its page', /String\(v\.page\) !== String\(req\.params\.id\)/.test(routeSrc));
ok('restore still returns a draft', /restoredAs: 'draft'/.test(routeSrc));

/* ---- report ---- */
const failed = R.filter(([p]) => !p);
failed.forEach(([, n, e]) => console.log(`FAIL  ${n}${e ? '  →  ' + e : ''}`));
console.log(`${R.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
