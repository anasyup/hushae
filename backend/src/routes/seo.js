// Dynamic SEO endpoints — /robots.txt and /sitemap.xml
// These are served at the ROOT (not /api/*) so search engines can find them.
// Vercel rewrites route these to the serverless Express app.

const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Settings = require('../models/Settings');

const router = express.Router();

// Pick the public origin from the request (X-Forwarded-Host on Vercel) or env var.
function baseUrl(req) {
  const env = process.env.PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.headers.host || 'veloura-73q1.vercel.app').split(',')[0].trim();
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

    for (const c of categories) {
      lines.push(urlXml(`/category/${c.slug}`, (c.updatedAt || new Date()).toISOString?.() || now, '0.8', 'weekly'));
    }
    for (const p of products) {
      lines.push(urlXml(`/product/${p.slug}`, (p.updatedAt || new Date()).toISOString?.() || now, '0.7', 'weekly'));
    }

    lines.push('</urlset>');

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(lines.join('\n'));
  } catch (e) {
    res.status(500).type('text/plain').send('Sitemap generation error: ' + e.message);
  }
});

module.exports = router;
