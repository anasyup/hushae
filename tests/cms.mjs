import { createRequire } from 'module';
const require = createRequire('/home/user/hushae/backend/');
const E = require('/home/user/hushae/backend/src/utils/cmsEngine.js');
const CmsPage = require('/home/user/hushae/backend/src/models/CmsPage.js');
const Settings = require('/home/user/hushae/backend/src/models/Settings.js');

let pass = 0, fail = 0;
const eq = (n, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} -> ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
  ok ? pass++ : fail++;
};
const ok_ = (n, c, extra = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${extra}`); c ? pass++ : fail++; };

const cfg = JSON.parse(JSON.stringify(E.DEFAULTS));

console.log('--- slugify ---');
eq('spaces to hyphens', E.slugify('Our Returns Policy'), 'our-returns-policy');
eq('accents stripped not dropped', E.slugify('Café Crème'), 'cafe-creme');
eq('punctuation removed', E.slugify('Size & Fit — Guide!'), 'size-fit-guide');
eq('collapses runs', E.slugify('a   b---c'), 'a-b-c');
eq('trims edges', E.slugify('  -hello-  '), 'hello');
eq('empty stays empty', E.slugify(''), '');
eq('respects max length', E.slugify('a'.repeat(200), 20).length <= 20, true);

console.log('\n--- checkSlug: reserved routes ---');
eq('cart refused', E.checkSlug('cart', cfg).ok, false);
eq('checkout refused', E.checkSlug('checkout', cfg).ok, false);
eq('admin refused', E.checkSlug('admin', cfg).ok, false);
// Only the FIRST segment is reserved — refusing "shop-guide" would be baffling.
eq('shop-guide ALLOWED', E.checkSlug('shop-guide', cfg).ok, true);
eq('nested under reserved refused', E.checkSlug('cart/help', cfg).ok, false);
eq('nested under free word allowed', E.checkSlug('guides/sizing', cfg).ok, true);
eq('uppercase refused', E.checkSlug('Privacy', cfg).ok, false);
eq('spaces refused', E.checkSlug('my page', cfg).ok, false);
eq('leading hyphen refused', E.checkSlug('-x', cfg).ok, false);
eq('normal slug ok', E.checkSlug('returns-policy', cfg).slug, 'returns-policy');

console.log('\n--- validateDoc: the DoS guards ---');
eq('null is fine (body-only page)', E.validateDoc(null).ok, true);
eq('array refused', E.validateDoc([]).ok, false);
eq('sections must be a list', E.validateDoc({ sections: 'nope' }).ok, false);
eq('section without a type refused', E.validateDoc({ sections: [{ id: 'a' }] }).ok, false);
eq('valid tree accepted', E.validateDoc({ sections: [{ type: 'hero', blocks: [] }] }).ok, true);
eq(`over ${E.MAX_SECTIONS} sections refused`,
  E.validateDoc({ sections: Array.from({ length: E.MAX_SECTIONS + 1 }, () => ({ type: 'spacer' })) }).ok, false);
eq('too many blocks refused',
  E.validateDoc({ sections: [{ type: 'hero', blocks: Array.from({ length: 99 }, () => ({ type: 'x' })) }] }).ok, false);

// Depth bomb
let deep = { v: 1 };
for (let i = 0; i < 12; i++) deep = { child: deep };
eq('deeply nested refused', E.validateDoc(deep).ok, false);

// Circular reference must not hang or throw uncaught
const circ = { sections: [] }; circ.self = circ;
ok_('circular reference handled, not thrown', E.validateDoc(circ).ok === false);

// Size bomb
const big = { sections: [{ type: 'richText', html: 'x'.repeat(600 * 1024) }] };
eq('oversize doc refused', E.validateDoc(big).ok, false);

console.log('\n--- validateStructuredData ---');
eq('null ok', E.validateStructuredData(null).ok, true);
eq('bad JSON string refused', E.validateStructuredData('{nope').ok, false);
eq('object without @type refused', E.validateStructuredData({ a: 1 }).ok, false);
eq('FAQPage accepted', E.validateStructuredData({ '@type': 'FAQPage' }).ok, true);
eq('@graph accepted', E.validateStructuredData({ '@graph': [] }).ok, true);
eq('JSON string parsed', E.validateStructuredData('{"@type":"Article"}').value['@type'], 'Article');

console.log('\n--- resolveSeo: fallbacks resolved at READ time ---');
const page = { title: 'Returns Policy', slug: 'returns', excerpt: 'How to send something back.', seo: {} };
const seo = E.resolveSeo(page, cfg);
eq('title falls back to page title', seo.title, 'Returns Policy');
eq('template applied', seo.fullTitle, 'Returns Policy · HUSHAE');
eq('description falls back to excerpt', seo.description, 'How to send something back.');
eq('canonical defaults to the slug', seo.canonical, '/returns');
eq('og title inherits', seo.og.title, 'Returns Policy');
eq('og description inherits', seo.og.description, 'How to send something back.');
eq('robots default', seo.robots, 'index,follow');

const noIndexed = E.resolveSeo({ ...page, seo: { noIndex: true, noFollow: true } }, cfg);
eq('noindex,nofollow honoured', noIndexed.robots, 'noindex,nofollow');

const explicit = E.resolveSeo({ ...page, seo: { ogTitle: 'Custom OG' } }, cfg);
eq('explicit og title wins', explicit.og.title, 'Custom OG');

console.log('\n--- liveState: draft / scheduled / expired are NOT the same thing ---');
const mk = (o) => new CmsPage({ title: 't', slug: 's', ...o });
const now = new Date('2026-07-31T12:00:00Z');
eq('draft', mk({ status: 'draft' }).liveState(now).reason, 'draft');
eq('archived', mk({ status: 'archived' }).liveState(now).reason, 'archived');
eq('published with no dates', mk({ status: 'published' }).liveState(now).reason, 'live');
eq('scheduled for later', mk({ status: 'published', publishAt: new Date('2026-08-05') }).liveState(now).reason, 'scheduled');
eq('publish date passed', mk({ status: 'published', publishAt: new Date('2026-07-01') }).liveState(now).reason, 'live');
eq('expired', mk({ status: 'published', unpublishAt: new Date('2026-07-20') }).liveState(now).reason, 'expired');
eq('window open', mk({ status: 'published', publishAt: new Date('2026-07-01'), unpublishAt: new Date('2026-08-30') }).liveState(now).reason, 'live');

console.log('\n--- defaults parity (the contract Sprint 2J broke) ---');
const doc = new Settings({ key: 'store' }).toObject();
const clean = (x) => JSON.parse(JSON.stringify(x ?? null));
eq('defaultStatus', E.DEFAULTS.defaultStatus, doc.cms.defaultStatus);
eq('autoRedirectOnRename', E.DEFAULTS.autoRedirectOnRename, doc.cms.autoRedirectOnRename);
eq('maxVersions', E.DEFAULTS.maxVersions, doc.cms.maxVersions);
eq('slug.reserved', clean(E.DEFAULTS.slug.reserved), clean(doc.cms.slug.reserved));
eq('slug.maxLength', E.DEFAULTS.slug.maxLength, doc.cms.slug.maxLength);
eq('seo block', clean(E.DEFAULTS.seo), clean(doc.cms.seo));
eq('structuredData block', clean(E.DEFAULTS.structuredData), clean(doc.cms.structuredData));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
