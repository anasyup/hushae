// Dynamic SEO endpoints — /robots.txt and /sitemap.xml
// These are served at the ROOT (not /api/*) so search engines can find them.
// Vercel rewrites route these to the serverless Express app.

const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Settings = require('../models/Settings');
const CmsPage = require('../models/CmsPage');
const BlogPost = require('../models/BlogPost');

const router = express.Router();

// Pick the public origin from the request (X-Forwarded-Host on Vercel) or env var.
function baseUrl(req) {
  const env = process.env.PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'hushae1.vercel.app').split(',')[0].trim();
  return `${proto}://${host}`;
}

const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

router.get('/robots.txt', (req, res) => {
  const site = baseUrl(req);
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /admin/',
    'Disallow: /account',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /api/',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    '',
    // Blog articles are valuable organic-traffic pages — make sure they are crawled.
    'Allow: /blog',
    '',
  ].join('\n');
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(body);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const site = baseUrl(req);
    const now = new Date().toISOString();

    // Static pages — priority ordered
    const staticPages = [
      { loc: '/', priority: '1.0', changefreq: 'daily' },
      { loc: '/shop', priority: '0.9', changefreq: 'daily' },
      { loc: '/women', priority: '0.9', changefreq: 'daily' },
      { loc: '/men', priority: '0.9', changefreq: 'daily' },
      { loc: '/new', priority: '0.7', changefreq: 'weekly' },
      { loc: '/best', priority: '0.7', changefreq: 'weekly' },
      { loc: '/sale', priority: '0.8', changefreq: 'daily' },
      { loc: '/fit-finder', priority: '0.6', changefreq: 'monthly' },
      // /faq may also exist as a CMS page; the de-duplication below keeps one.
      { loc: '/faq', priority: '0.7', changefreq: 'monthly' },
      { loc: '/track', priority: '0.4', changefreq: 'yearly' },
    ];

    // Fetch active products + categories
    const [products, categories] = await Promise.all([
      Product.find({ isActive: { $ne: false } }, 'slug updatedAt').lean(),
      Category.find({ isActive: { $ne: false } }, 'slug updatedAt').lean(),
    ]);

    const urlXml = (loc, lastmod, priority, changefreq) =>
      `  <url><loc>${esc(site + loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;

    const lines = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap-0.9">'];

    for (const p of staticPages) lines.push(urlXml(p.loc, now, p.priority, p.changefreq));

    /* CMS PAGES.
       Only what is genuinely live right now: liveState() applies the same
       draft / scheduled / expired rules the public route does, so a page
       scheduled for Friday cannot be advertised to Google on Tuesday. Pages
       marked noIndex are excluded — telling a crawler about a page and then
       telling it not to index that page is a contradiction Search Console
       reports as an error. */
    try {
      const cmsPages = await CmsPage.find({ status: { $in: ['published', 'scheduled'] } })
        .select('slug updatedAt status publishAt unpublishAt seo type').lean();
      const now = new Date();
      for (const p of cmsPages) {
        if (p.status === 'draft' || p.status === 'archived') continue;
        if (p.publishAt && now < new Date(p.publishAt)) continue;
        if (p.unpublishAt && now > new Date(p.unpublishAt)) continue;
        if (p.seo?.noIndex) continue;
        const priority = p.type === 'legal' ? '0.3' : '0.6';
        const freq = p.type === 'legal' ? 'yearly' : 'monthly';
        lines.push(urlXml(`/${p.slug}`, (p.updatedAt || new Date()).toISOString?.() || now, priority, freq));
      }
    } catch (e) {
      // A sitemap missing the CMS pages is degraded; a 500 is broken.
      console.error('sitemap: cms pages failed:', e.message);
    }

    for (const c of categories) {
      lines.push(urlXml(`/category/${c.slug}`, (c.updatedAt || new Date()).toISOString?.() || now, '0.8', 'weekly'));
    }
    for (const p of products) {
      lines.push(urlXml(`/product/${p.slug}`, (p.updatedAt || new Date()).toISOString?.() || now, '0.7', 'weekly'));
    }

    /* BLOG POSTS — same live rules as /api/blog: scheduled posts are not
       advertised before their publishAt, noIndex is respected. */
    try {
      const blogPosts = await BlogPost.find({ status: { $in: ['published', 'scheduled'] } })
        .select('slug updatedAt publishAt seo').lean();
      const blogNow = new Date();
      for (const b of blogPosts) {
        if (b.publishAt && blogNow < new Date(b.publishAt)) continue;
        if (b.seo?.noIndex) continue;
        lines.push(urlXml(`/blog/${b.slug}`, (b.updatedAt || new Date()).toISOString?.() || now, '0.6', 'weekly'));
      }
    } catch (e) {
      console.error('sitemap: blog failed:', e.message);
    }

    /* De-duplicate. A legal page migrated into the CMS keeps its original
       address, so /privacy could otherwise be listed twice — once as a static
       entry and once as a CMS page. Duplicate <loc> values are a Search
       Console warning. First entry wins, which is the higher-priority static
       one. */
    const seen = new Set();
    const deduped = lines.filter((l) => {
      const m = l.match(/<loc>([^<]+)<\/loc>/);
      if (!m) return true;
      if (seen.has(m[1])) return false;
      seen.add(m[1]);
      return true;
    });
    deduped.push('</urlset>');
    const finalLines = deduped;

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(finalLines.join('\n'));
  } catch (e) {
    res.status(500).type('text/plain').send('Sitemap generation error: ' + e.message);
  }
});

module.exports = router;
