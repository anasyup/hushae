const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const Product = require('../models/Product');
const SearchLog = require('../models/SearchLog');
const E = require('../utils/searchEngine');

const router = express.Router();

/* Suggestions fire on almost every keystroke, so they get their own generous
   bucket. The full search is heavier and gets a tighter one. */
const suggestLimit = rateLimit({ windowMs: 60 * 1000, max: 120, key: 'suggest', message: 'Slow down a moment' });
const searchLimit = rateLimit({ windowMs: 60 * 1000, max: 60, key: 'search', message: 'Too many searches — try again shortly' });

const CARD = 'name slug sku price compareAtPrice stock images gender categorySlug tier '
  + 'ratingAvg ratingCount sizes colors tags badges isFeatured isBestSeller createdAt';

/** Fire-and-forget analytics. A logging failure must never fail a search. */
function logSearch(cfg, row) {
  if (!cfg.analytics?.enabled || !cfg.analytics?.logQueries) return;
  const term = String(row.term || '').trim();
  if (term.length < (Number(cfg.analytics.minLogLen) || 2)) return;
  SearchLog.create({
    ...row,
    term,
    normalized: E.norm(term),
    zeroResult: (row.results || 0) === 0,
  }).catch(() => {});
}

const deviceOf = (req) => {
  const ua = String(req.headers['user-agent'] || '');
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return 'desktop';
};

/* ---------------------------------------------------------------------------
 * PUBLIC CONFIG — what the storefront needs to render the search UI.
 * Deliberately excludes analytics settings and blocked terms.
 * ------------------------------------------------------------------------- */
router.get('/config', asyncHandler(async (req, res) => {
  const cfg = await E.searchConfig();
  const dcfg = await E.discoveryConfig();
  res.json({
    enabled: cfg.enabled,
    placeholder: cfg.placeholder,
    minChars: cfg.minChars,
    debounceMs: cfg.debounceMs,
    perPage: cfg.perPage,
    suggest: cfg.suggest,
    history: cfg.history,
    trending: { enabled: cfg.trending.enabled, maxItems: cfg.trending.maxItems },
    noResults: cfg.noResults,
    voice: cfg.voice,
    assistant: dcfg.assistant?.enabled ? {
      enabled: true,
      title: dcfg.assistant.title,
      intro: dcfg.assistant.intro,
      buttonLabel: dcfg.assistant.buttonLabel,
      showOnShop: dcfg.assistant.showOnShop,
      showOnHome: dcfg.assistant.showOnHome,
      prompts: dcfg.assistant.prompts,
      occasions: (dcfg.assistant.occasions || []).map((o) => ({ id: o.id, label: o.label })),
      budgets: dcfg.assistant.budgets,
    } : { enabled: false },
  });
}));

/* ---------------------------------------------------------------------------
 * SUGGEST — the dropdown. Must feel instant, so it is capped hard.
 * ------------------------------------------------------------------------- */
router.get('/suggest', suggestLimit, asyncHandler(async (req, res) => {
  const cfg = await E.searchConfig();
  if (!cfg.enabled || !cfg.suggest.enabled) return res.json({ products: [], categories: [], terms: [] });

  const q = String(req.query.q || '').trim();
  if (q.length < (Number(cfg.minChars) || 2)) return res.json({ products: [], categories: [], terms: [] });

  const t0 = Date.now();
  const { products, total, fuzzy } = await E.runSearch({
    query: q, cfg, limit: Number(cfg.suggest.maxProducts) || 6, skip: 0,
  });

  /* Category and term suggestions come from what actually matched, not from a
     separate guess — so the dropdown can never offer a category with nothing
     behind it. */
  const catCount = new Map();
  for (const p of products) catCount.set(p.categorySlug, (catCount.get(p.categorySlug) || 0) + 1);

  let categories = [];
  if (catCount.size) {
    const Category = require('../models/Category');
    const cats = await Category.find({ slug: { $in: [...catCount.keys()] } }).select('name slug').lean();
    categories = cats
      .map((c) => ({ ...c, count: catCount.get(c.slug) || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, Number(cfg.suggest.maxCategories) || 4);
  }

  // Completion terms drawn from matching product names.
  const nq = E.norm(q);
  const terms = [...new Set(products
    .map((p) => p.name)
    .filter((n) => E.norm(n).includes(nq))
    .map((n) => n.replace(/^HUSHAE\s+/i, '')))]
    .slice(0, Number(cfg.suggest.maxTerms) || 4);

  res.json({
    products: products.map((p) => ({
      _id: p._id, name: p.name, slug: p.slug, price: p.price,
      compareAtPrice: p.compareAtPrice, stock: p.stock,
      image: cfg.suggest.showImages ? (p.images?.[0]?.url || '') : '',
      categorySlug: p.categorySlug,
    })),
    categories,
    terms,
    total,
    fuzzy,
    tookMs: Date.now() - t0,
  });
}));

/* ---------------------------------------------------------------------------
 * SEARCH — the results page. Paginated, filterable, logged.
 * ------------------------------------------------------------------------- */
router.get('/', searchLimit, optionalAuth, asyncHandler(async (req, res) => {
  const cfg = await E.searchConfig();
  if (!cfg.enabled) return res.status(403).json({ message: 'Search is switched off' });

  const q = String(req.query.q || '').trim();
  const perPage = Math.min(60, Math.max(1, parseInt(req.query.limit || cfg.perPage || 24, 10)));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));

  // Facets narrow the search rather than filtering its output, so the total
  // and the pagination stay honest.
  const filters = {};
  const many = (v) => String(v).split(',').map((s) => s.trim()).filter(Boolean);
  if (req.query.gender) filters.gender = req.query.gender;
  if (req.query.category) filters.categorySlug = { $in: many(req.query.category) };
  if (req.query.tier) filters.tier = { $in: many(req.query.tier) };
  if (req.query.size) filters.sizes = { $in: many(req.query.size) };
  if (req.query.color) filters['colors.name'] = { $in: many(req.query.color).map((c) => new RegExp(`^${E.escapeRx(c)}$`, 'i')) };
  if (req.query.badge) filters.badges = { $in: many(req.query.badge) };
  if (req.query.tag) filters.tags = { $in: many(req.query.tag).map((t) => t.toLowerCase()) };
  if (req.query.availability === 'in') filters.stock = { $gt: 0 };
  if (req.query.availability === 'out') filters.stock = 0;
  if (req.query.sale === 'true') filters.compareAtPrice = { $ne: null };
  if (req.query.featured === 'true') filters.isFeatured = true;
  if (req.query.bestSeller === 'true') filters.isBestSeller = true;
  if (req.query.minRating) filters.ratingAvg = { $gte: Number(req.query.minRating) };
  if (req.query.minPrice || req.query.maxPrice) {
    filters.price = {};
    if (req.query.minPrice) filters.price.$gte = Number(req.query.minPrice);
    if (req.query.maxPrice) filters.price.$lte = Number(req.query.maxPrice);
  }
  if (req.query.newDays) {
    filters.createdAt = { $gte: new Date(Date.now() - Number(req.query.newDays) * 86400000) };
  }

  const t0 = Date.now();

  /* No query text = a plain browse. Relevance is meaningless with nothing to
     be relevant to, so this path stays in Mongo and is sorted, not scored. */
  if (!q) {
    const SORTS = {
      newest: { createdAt: -1 }, popular: { ratingCount: -1, ratingAvg: -1 },
      'price-asc': { price: 1 }, 'price-desc': { price: -1 },
      rating: { ratingAvg: -1, ratingCount: -1 },
      bestselling: { isBestSeller: -1, ratingCount: -1 },
      featured: { isFeatured: -1, createdAt: -1 },
    };
    const where = { isActive: true, status: { $ne: 'draft' }, ...filters };
    const [products, total] = await Promise.all([
      Product.find(where).select(CARD).sort(SORTS[req.query.sort] || SORTS.newest)
        .skip((page - 1) * perPage).limit(perPage).lean(),
      Product.countDocuments(where),
    ]);
    return res.json({
      products, total, page, perPage, hasMore: page * perPage < total,
      query: '', terms: [], fuzzy: false, tookMs: Date.now() - t0,
    });
  }

  const r = await E.runSearch({ query: q, filters, cfg, limit: perPage, skip: (page - 1) * perPage });

  /* Relevance is the default when there IS a query, but the shopper can
     override it. Re-sorting the scored set keeps the same result membership. */
  let products = r.products;
  if (req.query.sort && req.query.sort !== 'relevance') {
    const cmp = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      popular: (a, b) => (b.ratingCount || 0) - (a.ratingCount || 0),
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0),
      bestselling: (a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0),
      featured: (a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0),
    }[req.query.sort];
    if (cmp) products = [...products].sort(cmp);
  }

  const tookMs = Date.now() - t0;

  // Only log page 1: pages 2+ of one search are not separate searches.
  if (page === 1) {
    logSearch(cfg, {
      term: q, results: r.total, source: req.query.source || 'search',
      session: String(req.query.sid || '').slice(0, 40),
      user: req.user ? req.user._id : null,
      device: deviceOf(req), usedFuzzy: !!r.fuzzy, usedSynonym: !!r.synonym,
    });
  }

  /* A dead end is where a search is lost. Offer a way forward rather than an
     empty page — all three lists are merchant-switchable. */
  let recovery = null;
  if (!r.total && cfg.noResults) {
    recovery = { message: cfg.noResults.message, terms: [], products: [] };
    if (cfg.noResults.showTrending) {
      const since = new Date(Date.now() - (Number(cfg.trending.windowDays) || 14) * 86400000);
      const rows = await SearchLog.aggregate([
        { $match: { createdAt: { $gte: since }, zeroResult: false } },
        { $group: { _id: '$normalized', n: { $sum: 1 } } },
        { $match: { n: { $gte: Number(cfg.trending.minCount) || 2 } } },
        { $sort: { n: -1 } }, { $limit: Number(cfg.trending.maxItems) || 6 },
      ]);
      recovery.terms = [...(cfg.trending.manual || []), ...rows.map((x) => x._id)].slice(0, 6);
    }
    if (cfg.noResults.showPopular) {
      recovery.products = await Product.find({ isActive: true, status: { $ne: 'draft' }, stock: { $gt: 0 } })
        .select(CARD).sort({ isBestSeller: -1, ratingCount: -1 }).limit(8).lean();
    }
  }

  res.json({
    products, total: r.total, page, perPage,
    hasMore: page * perPage < r.total,
    query: q, terms: r.terms, fuzzy: r.fuzzy, synonym: r.synonym,
    recovery, tookMs,
  });
}));

/* ---------------------------------------------------------------------------
 * FACETS — the filter panel, generated from what is actually in the catalogue.
 *
 * Hardcoded filter lists rot: the shop panel still offers sizes and colours
 * that no product has, and misses ones that were added later. This returns
 * only values that exist, each with a real count.
 * ------------------------------------------------------------------------- */
router.get('/facets', asyncHandler(async (req, res) => {
  const base = { isActive: true, status: { $ne: 'draft' } };
  if (req.query.gender) base.gender = req.query.gender;
  if (req.query.category) base.categorySlug = req.query.category;

  const rows = await Product.aggregate([
    { $match: base },
    { $facet: {
      sizes: [{ $unwind: '$sizes' }, { $group: { _id: '$sizes', n: { $sum: 1 } } }, { $sort: { n: -1 } }],
      colors: [{ $unwind: '$colors' }, { $group: { _id: { name: '$colors.name', hex: '$colors.hex' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }],
      tiers: [{ $group: { _id: '$tier', n: { $sum: 1 } } }, { $sort: { n: -1 } }],
      badges: [{ $unwind: '$badges' }, { $group: { _id: '$badges', n: { $sum: 1 } } }, { $sort: { n: -1 } }],
      categories: [{ $group: { _id: '$categorySlug', n: { $sum: 1 } } }, { $sort: { n: -1 } }],
      tags: [{ $unwind: '$tags' }, { $group: { _id: '$tags', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 30 }],
      price: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
      stock: [{ $group: { _id: null, inStock: { $sum: { $cond: [{ $gt: ['$stock', 0] }, 1, 0] } }, outStock: { $sum: { $cond: [{ $gt: ['$stock', 0] }, 0, 1] } } } }],
      flags: [{ $group: { _id: null,
        sale: { $sum: { $cond: [{ $ne: ['$compareAtPrice', null] }, 1, 0] } },
        featured: { $sum: { $cond: ['$isFeatured', 1, 0] } },
        best: { $sum: { $cond: ['$isBestSeller', 1, 0] } } } }],
    } },
  ]);
  const f = rows[0] || {};

  /* Sizes come back as both "L" and "l" because the catalogue holds both.
     Merging them here is a display fix, not a data fix — the underlying
     records are reported to the merchant under Search analytics. */
  const sizeMap = new Map();
  for (const s of f.sizes || []) {
    const key = String(s._id || '').trim().toUpperCase();
    if (!key) continue;
    sizeMap.set(key, (sizeMap.get(key) || 0) + s.n);
  }
  const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const sizes = [...sizeMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a.value); const ib = SIZE_ORDER.indexOf(b.value);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.value.localeCompare(b.value);
    });

  const colorMap = new Map();
  for (const c of f.colors || []) {
    const name = String(c._id?.name || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const prev = colorMap.get(key);
    if (prev) prev.count += c.n;
    else colorMap.set(key, { value: name, hex: c._id?.hex || '#cccccc', count: c.n });
  }

  res.json({
    sizes,
    colors: [...colorMap.values()].sort((a, b) => b.count - a.count),
    tiers: (f.tiers || []).filter((x) => x._id).map((x) => ({ value: x._id, count: x.n })),
    badges: (f.badges || []).filter((x) => x._id).map((x) => ({ value: x._id, count: x.n })),
    categories: (f.categories || []).filter((x) => x._id).map((x) => ({ value: x._id, count: x.n })),
    tags: (f.tags || []).filter((x) => x._id).map((x) => ({ value: x._id, count: x.n })),
    price: { min: Math.floor(f.price?.[0]?.min || 0), max: Math.ceil(f.price?.[0]?.max || 0) },
    availability: { in: f.stock?.[0]?.inStock || 0, out: f.stock?.[0]?.outStock || 0 },
    flags: { sale: f.flags?.[0]?.sale || 0, featured: f.flags?.[0]?.featured || 0, bestSeller: f.flags?.[0]?.best || 0 },
  });
}));

/* ---------------------------------------------------------------------------
 * TRENDING — what other shoppers are searching for.
 * ------------------------------------------------------------------------- */
router.get('/trending', asyncHandler(async (req, res) => {
  const cfg = await E.searchConfig();
  if (!cfg.trending.enabled) return res.json({ terms: [] });

  const since = new Date(Date.now() - (Number(cfg.trending.windowDays) || 14) * 86400000);
  const rows = await SearchLog.aggregate([
    { $match: { createdAt: { $gte: since }, zeroResult: false } },
    { $group: { _id: '$normalized', n: { $sum: 1 } } },
    { $match: { n: { $gte: Number(cfg.trending.minCount) || 2 } } },
    { $sort: { n: -1 } },
    { $limit: Number(cfg.trending.maxItems) || 6 },
  ]);

  /* Merchant-pinned terms lead. A brand-new store has no search history, and
     an empty "trending" row looks broken — this is how the merchant seeds it. */
  const manual = (cfg.trending.manual || []).filter(Boolean);
  const seen = new Set(manual.map(E.norm));
  const organic = rows.map((r) => r._id).filter((t) => !seen.has(t));

  res.json({ terms: [...manual, ...organic].slice(0, Number(cfg.trending.maxItems) || 6) });
}));

/* Record that a search result was clicked. Fire-and-forget from the client. */
router.post('/click', asyncHandler(async (req, res) => {
  const cfg = await E.searchConfig();
  if (!cfg.analytics?.enabled || !cfg.analytics?.logClicks) return res.json({ ok: true, skipped: true });

  const term = String(req.body?.term || '').trim();
  const sid = String(req.body?.sid || '').slice(0, 40);
  if (!term) return res.json({ ok: true, skipped: true });

  // Attach the click to the most recent matching search from this session.
  await SearchLog.findOneAndUpdate(
    { normalized: E.norm(term), ...(sid ? { session: sid } : {}) },
    { $set: {
      clicked: true,
      clickedProduct: /^[0-9a-fA-F]{24}$/.test(String(req.body?.product)) ? req.body.product : null,
      clickedAt: new Date(),
      clickPosition: Math.max(0, parseInt(req.body?.position, 10) || 0),
    } },
    { sort: { createdAt: -1 } },
  ).catch(() => {});

  res.json({ ok: true });
}));

/* ---------------------------------------------------------------------------
 * ADMIN — analytics. Registered before any /:param route.
 * ------------------------------------------------------------------------- */
router.get('/admin/stats', protect, adminOnly, asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '30', 10)));
  const since = new Date(Date.now() - days * 86400000);
  const match = { createdAt: { $gte: since } };

  const [totals, top, zero, clicked, byDevice, daily] = await Promise.all([
    SearchLog.aggregate([{ $match: match }, { $group: {
      _id: null,
      searches: { $sum: 1 },
      zero: { $sum: { $cond: ['$zeroResult', 1, 0] } },
      clicks: { $sum: { $cond: ['$clicked', 1, 0] } },
      conversions: { $sum: { $cond: ['$converted', 1, 0] } },
      fuzzy: { $sum: { $cond: ['$usedFuzzy', 1, 0] } },
    } }]),
    SearchLog.aggregate([
      { $match: match },
      { $group: { _id: '$normalized', n: { $sum: 1 }, clicks: { $sum: { $cond: ['$clicked', 1, 0] } }, avgResults: { $avg: '$results' } } },
      { $sort: { n: -1 } }, { $limit: 25 },
    ]),
    SearchLog.aggregate([
      { $match: { ...match, zeroResult: true } },
      { $group: { _id: '$normalized', n: { $sum: 1 }, last: { $max: '$createdAt' } } },
      { $sort: { n: -1 } }, { $limit: 25 },
    ]),
    SearchLog.aggregate([
      { $match: { ...match, clicked: true } },
      { $group: { _id: '$normalized', n: { $sum: 1 } } },
      { $sort: { n: -1 } }, { $limit: 15 },
    ]),
    SearchLog.aggregate([{ $match: match }, { $group: { _id: '$device', n: { $sum: 1 } } }]),
    SearchLog.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, n: { $sum: 1 }, zero: { $sum: { $cond: ['$zeroResult', 1, 0] } } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const t = totals[0] || {};
  const searches = t.searches || 0;
  const device = {}; byDevice.forEach((d) => { device[d._id || 'unknown'] = d.n; });

  res.json({
    days,
    searches,
    zeroResults: t.zero || 0,
    // Percentages are computed here so every screen reports the same number.
    zeroRate: searches ? Math.round(((t.zero || 0) / searches) * 100) : 0,
    clicks: t.clicks || 0,
    clickRate: searches ? Math.round(((t.clicks || 0) / searches) * 100) : 0,
    conversions: t.conversions || 0,
    conversionRate: searches ? Math.round(((t.conversions || 0) / searches) * 1000) / 10 : 0,
    fuzzyUsed: t.fuzzy || 0,
    top: top.map((x) => ({ term: x._id, count: x.n, clicks: x.clicks, avgResults: Math.round(x.avgResults || 0) })),
    zero: zero.map((x) => ({ term: x._id, count: x.n, last: x.last })),
    clicked: clicked.map((x) => ({ term: x._id, count: x.n })),
    device,
    daily: daily.map((d) => ({ date: d._id, count: d.n, zero: d.zero })),
  });
}));

/* CSV export — the merchant's data must never be locked inside a dashboard. */
router.get('/admin/export', protect, adminOnly, asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '90', 10)));
  const rows = await SearchLog.find({ createdAt: { $gte: new Date(Date.now() - days * 86400000) } })
    .sort({ createdAt: -1 }).limit(20000).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = 'date,term,results,zeroResult,clicked,clickPosition,converted,orderNumber,device,fuzzy,synonym,source';
  const body = rows.map((r) => [
    new Date(r.createdAt).toISOString(), r.term, r.results, r.zeroResult, r.clicked,
    r.clickPosition, r.converted, r.orderNumber, r.device, r.usedFuzzy, r.usedSynonym, r.source,
  ].map(esc).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="search-analytics.csv"');
  res.send(`${head}\n${body}`);
}));

/* Data-quality report. The facets endpoint merges "L" and "l" for display;
   this tells the merchant which records to actually fix. */
router.get('/admin/data-quality', protect, adminOnly, asyncHandler(async (req, res) => {
  const products = await Product.find({}).select('name sku sizes colors fabric tags status isActive').lean();
  const sizeCase = new Map(); const colorCase = new Map();
  const noFabric = []; const noTags = [];

  for (const p of products) {
    for (const s of p.sizes || []) {
      const k = String(s).trim().toUpperCase();
      if (!sizeCase.has(k)) sizeCase.set(k, new Set());
      sizeCase.get(k).add(s);
    }
    for (const c of p.colors || []) {
      const k = String(c.name || '').trim().toLowerCase();
      if (!k) continue;
      if (!colorCase.has(k)) colorCase.set(k, new Set());
      colorCase.get(k).add(c.name);
    }
    if (!p.fabric) noFabric.push({ name: p.name, sku: p.sku });
    if (!(p.tags || []).length) noTags.push({ name: p.name, sku: p.sku });
  }

  const dupSizes = [...sizeCase.entries()].filter(([, v]) => v.size > 1).map(([k, v]) => ({ canonical: k, variants: [...v] }));
  const dupColors = [...colorCase.entries()].filter(([, v]) => v.size > 1).map(([k, v]) => ({ canonical: k, variants: [...v] }));
  const oddColors = [...colorCase.keys()].filter((k) => !/^[a-z][a-z\s-]{2,}$/.test(k));

  res.json({
    products: products.length,
    duplicateSizes: dupSizes,
    duplicateColors: dupColors,
    suspiciousColors: oddColors,
    missingFabric: noFabric.slice(0, 40),
    missingFabricCount: noFabric.length,
    missingTags: noTags.slice(0, 40),
    missingTagsCount: noTags.length,
  });
}));

module.exports = router;
