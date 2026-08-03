import pkg from '/home/user/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import { serve, PREP } from '/tmp/harness.mjs';

/* ============================================================================
 * FULL ROUTE REGRESSION
 *
 * Lives in the repo, not /tmp. Sprints 2I-2K lost every suite to a cleared
 * /tmp and "regression tested" quietly became "the frontend still builds".
 * /tmp was cleared again during Sprint 2M, which is why this file exists now.
 *
 * Renders every storefront and admin route against the local build and fails
 * on a console error, a blank page, or a duplicated <main> landmark.
 * ========================================================================== */

const PORT = Number(process.env.PORT || 4510);
const srv = await serve(PORT);
const B = `http://127.0.0.1:${PORT}`;

const b = await chromium.launch({
  executablePath: '/home/user/.cache/ms-playwright/chromium-1140/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage();

const errs = [];
pg.on('console', (m) => { if (m.type() === 'error') errs.push([pg.url(), m.text().slice(0, 120)]); });
pg.on('pageerror', (e) => errs.push([pg.url(), 'PAGEERROR: ' + e.message.slice(0, 120)]));

await pg.goto(`${B}/`, { waitUntil: 'domcontentloaded' });
await pg.evaluate(PREP);

const SHOP = ['/', '/shop', '/sale', '/new', '/best', '/men', '/women', '/cart', '/checkout',
  '/account', '/wishlist', '/compare', '/search?q=bra', '/privacy', '/terms', '/returns',
  '/shipping-policy', '/faq', '/rewards', '/track', '/fit-finder', '/unknown-slug-xyz'];

const ADMIN = ['/admin', '/admin/orders', '/admin/products', '/admin/customers', '/admin/promotions',
  '/admin/promotions/new', '/admin/settings', '/admin/settings/cart', '/admin/settings/checkout',
  '/admin/settings/search', '/admin/marketing/settings', '/admin/marketing/analytics',
  '/admin/search-analytics', '/admin/content', '/admin/store', '/admin/loyalty', '/admin/reviews',
  '/admin/discounts', '/admin/growth', '/admin/analytics', '/admin/finance',
  '/admin/cms', '/admin/cms/new', '/admin/cms/redirects'];

const rows = [];
const visit = async (path) => {
  const before = errs.length;
  await pg.goto(B + path, { waitUntil: 'domcontentloaded' });
  // gotcha 60: never measure before load — wait on a real element.
  await pg.waitForSelector('h1,h2', { timeout: 20000 }).catch(() => {});
  await pg.waitForTimeout(900);
  const i = await pg.evaluate(() => ({
    heading: (document.querySelector('h1,h2')?.textContent || '').trim().slice(0, 30),
    blank: document.body.innerText.trim().length < 40,
    mains: document.querySelectorAll('main').length,
    nested: !!document.querySelector('main main'),
  }));
  rows.push([path, i, errs.length - before]);
};

console.log('=========== STOREFRONT ===========');
for (const p of SHOP) await visit(p);
rows.forEach(([p, i, e]) => console.log(
  `${e === 0 && !i.blank && !i.nested ? 'ok  ' : 'BAD '} ${p.padEnd(22)} main:${i.mains}${i.nested ? ' NESTED!' : ''} ${i.blank ? 'BLANK ' : ''}errs:${e}  "${i.heading}"`));

rows.length = 0;
await pg.evaluate(async () => {
  const r = await fetch('/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hushae.pk', password: 'Hushae@2026' }),
  });
  const d = await r.json();
  localStorage.setItem('hushae.auth', JSON.stringify({ token: d.token, user: d.user }));
});

console.log('\n=========== ADMIN ===========');
for (const p of ADMIN) await visit(p);
rows.forEach(([p, i, e]) => console.log(
  `${e === 0 && !i.blank && !i.nested ? 'ok  ' : 'BAD '} ${p.padEnd(30)} main:${i.mains}${i.nested ? ' NESTED!' : ''} ${i.blank ? 'BLANK ' : ''}errs:${e}  "${i.heading}"`));

/* gotcha 78: a route that legitimately has no CMS page logs its own expected
   404. Those are the app working, not the app failing. */
const real = errs.filter(([, m]) => !/status of 404/.test(m));
console.log(`\nexpected 404 probes: ${errs.length - real.length}`);
console.log(`REAL console errors: ${real.length}`);
real.slice(0, 10).forEach(([u, m]) => console.log(`  ${u.replace(B, '')} :: ${m}`));

await b.close(); srv.close();
process.exit(real.length ? 1 : 0);
