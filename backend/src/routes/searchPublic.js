const express = require('express');
const Product = require('../models/Product');
const Category = require('../models/Category');
const SearchLog = require('../models/SearchLog');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { searchConfig, runSearch, norm, escapeRx } = require('../utils/searchEngine');

const router = express.Router();

/* ============================================================================
 * PUBLIC STOREFRONT SEARCH
 *
 * Why this file exists: routes/search.js is the ADMIN ⌘K palette and opens with
 * `router.use(protect, adminOnly)`. It was mounted on /api/search, so every
 * shopper-facing search call — /search, /search/config, /search/facets,
 * /search/suggest, /search/trending, /search/click — answered 401 for anonymous
 * visitors. Storefront search was dead in production, not just locally.
 *
 * The matching engine already existed in utils/searchEngine.js (scoring,
 * synonyms, fuzzy fallback, blocked terms) and was fully tested; only the HTTP
 * surface was missing. This router is that surface and nothing more — no
 * ranking logic is reimplemented here.
 *
 * Everything below is public and read-only except /click, which appends one
 * anonymous row. No endpoint returns a draft or inactive product.
 * ========================================================================== */

// Only these fields ever reach the browser. Cost price, stock ledger and
// supplier data live on the same document and must not leak through search.
const CARD = 'name slug sku price compareAtPrice onSale stock images gender '
  + 'categorySlug tier ratingAvg ratingCount sizes colors badges tags '
  + 'isFeatured isBestSeller shortDescription createdAt';

const LIVE = { isActive: true, status: { $ne: 'draft' } };

const clampInt = (v, min, max, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const csv = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

/* Translate URL params into a Mongo filter. Anything not named here is ignored
   rather than passed through, so a crafted query string cannot reach into the
   document (e.g. ?costPrice[$lt]=1 or ?status=draft). */
function buildFilters(q) {
  const f = {};
  if (q.gender) f.gender = q.gender;
  if (q.category) f.categorySlug = { $in: csv(q.category) };
  if (q.tier) f.tier = { $in: csv(q.tier) };
  if (q.size) f.sizes = { $in: csv(q.size) };
  if (q.color) f['colors.name'] = { $in: csv(q.color).map((c) => new RegExp(`^${escapeRx(c)}$`, 'i')) };
  if (q.badge) f.badges = { $in: csv(q.badge) };
  if (q.tag) f.tags = { $in: csv(q.tag).map((t) => t.toLowerCase()) };

  const min = Number(q.minPrice); const max = Number(q.maxPrice);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    f.price = {};
    if (Number.isFinite(min)) f.price.$gte = min;
    if (Number.isFinite(max)) f.price.$lte = max;
  }
  if (Number.isFinite(Number(q.minRating))) f.ratingAvg = { $gte: Number(q.minRating) };
  if (q.availability === 'in') f.stock = { $gt: 0 };
  if (q.availability === 'out') f.stock = { $lte: 0 };
  if (q.sale === 'true' || q.sale === '1') f.onSale = true;
  if (q.featured === 'true' || q.featured === '1') f.isFeatured = true;
  if (q.bestSeller === 'true' || q.bestSeller === '1') f.isBestSeller = true;

  const days = parseInt(q.newDays, 10);
  if (Number.isFinite(days) && days > 0) {
    f.createdAt = { $gte: new Date(Date.now() - days * 86400000) };
  }
  return f;
}

/* Sorts the engine does not rank. 'relevance' is the engine's own order and is
   deliberately left untouched. */
const SORTS = {
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  rating: (a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0),
};

/* ---------------------------------------------------------------------------
 * GET /api/search/config — presentation settings for the search UI.
 * Mirrors SEARCH_DEFAULTS in frontend/src/lib/searchConfig.js.
 * ------------------------------------------------------------------------- */
router.get('/config', asyncHandler(async (_req, res) => {
  const cfg = await searchConfig();
  // Matching internals (synonym tables, blocked terms, fuzzy thresholds) are
  // server business — the browser only needs what it renders.
  const { synonyms, blockedTerms, fuzzy, weights, ...safe } = cfg;
  res.json(safe);
}));

/* ---------------------------------------------------------------------------
 * GET /api/search/facets — filter options with real counts.
 * Counts come from the live catalogue, so the UI never offers a filter that
 * would return nothing.
 * ------------------------------------------------------------------------- */
router.get('/facets', asyncHandler(async (_req, res) => {
  const docs = await Product.find(LIVE)
    .select('price sizes colors tier badges stock onSale isFeatured isBestSeller')
    .lean();

  const tally = (rows) => {
    const m = new Map();
    for (const r of rows) m.set(r, (m.get(r) || 0) + 1);
    return [...m.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
  };

  const prices = docs.map((d) => d.price).filter((n) => Number.isFinite(n));
  const colorHex = new Map();
  for (const d of docs) for (const c of d.colors || []) if (c?.name && !colorHex.has(c.name)) colorHex.set(c.name, c.hex || '');

  res.json({
    price: {
      min: prices.length ? Math.floor(Math.min(...prices)) : 0,
      max: prices.length ? Math.ceil(Math.max(...prices)) : 0,
    },
    availability: {
      in: docs.filter((d) => d.stock > 0).length,
      out: docs.filter((d) => !(d.stock > 0)).length,
    },
    sizes: tally(docs.flatMap((d) => d.sizes || [])),
    colors: tally(docs.flatMap((d) => (d.colors || []).map((c) => c.name).filter(Boolean)))
      .map((c) => ({ ...c, hex: colorHex.get(c.value) || '' })),
    tiers: tally(docs.map((d) => d.tier).filter(Boolean)),
    badges: tally(docs.flatMap((d) => d.badges || [])),
    flags: {
      sale: docs.filter((d) => d.onSale).length,
      featured: docs.filter((d) => d.isFeatured).length,
      bestSeller: docs.filter((d) => d.isBestSeller).length,
    },
    total: docs.length,
  });
}));

/* ---------------------------------------------------------------------------
 * GET /api/search/trending — most-searched terms that actually found something.
 * Falls back to configured terms when the log is still empty (a new store has
 * no history, and an empty trending row looks broken).
 * ------------------------------------------------------------------------- */
router.get('/trending', asyncHandler(async (req, res) => {
  const cfg = await searchConfig();
  const max = clampInt(req.query.limit, 1, 20, cfg.trending?.maxItems || 6);

  const rows = await SearchLog.aggregate([
    { $match: { zeroResult: false, createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
    { $group: { _id: '$normalized', n: { $sum: 1 }, term: { $first: '$term' } } },
    { $sort: { n: -1 } },
    { $limit: max },
  ]);

  const terms = rows.map((r) => r.term).filter(Boolean);
  res.json({ terms: terms.length ? terms : (cfg.trending?.terms || []).slice(0, max) });
}));

/* ---------------------------------------------------------------------------
 * GET /api/search/suggest — typeahead. Products, categories and related terms.
 * Not logged: logging every keystroke would drown the analytics that /search
 * and /click produce.
 * ------------------------------------------------------------------------- */
router.get('/suggest', asyncHandler(async (req, res) => {
  const cfg = await searchConfig();
  const q = String(req.query.q || '').trim();
  if (q.length < (cfg.minChars || 2)) return res.json({ products: [], categories: [], terms: [] });

  const s = cfg.suggest || {};
  const { products } = await runSearch({ query: q, cfg, limit: s.maxProducts || 6, skip: 0 });

  const rx = new RegExp(escapeRx(q), 'i');
  const categories = await Category.find({ isActive: { $ne: false }, name: rx })
    .select('name slug').limit(s.maxCategories || 4).lean();

  // Related terms come from what other shoppers searched successfully — real
  // demand, not a hardcoded list.
  const termRows = await SearchLog.aggregate([
    { $match: { normalized: new RegExp(escapeRx(norm(q))), zeroResult: false } },
    { $group: { _id: '$normalized', n: { $sum: 1 }, term: { $first: '$term' } } },
    { $sort: { n: -1 } },
    { $limit: s.maxTerms || 4 },
  ]);

  res.json({
    products: products.map((p) => ({
      _id: p._id, name: p.name, slug: p.slug, price: p.price,
      compareAtPrice: p.compareAtPrice, images: (p.images || []).slice(0, 1),
    })),
    categories,
    terms: termRows.map((r) => r.term).filter((t) => norm(t) !== norm(q)),
  });
}));

/* ---------------------------------------------------------------------------
 * POST /api/search/click — join a query to the product it led to.
 * Fire-and-forget from the browser, so it always answers 200: a failed log
 * must never look like a failed navigation.
 * ------------------------------------------------------------------------- */
router.post('/click', optionalAuth, asyncHandler(async (req, res) => {
  const { term, product, position, sid } = req.body || {};
  if (!term || !product) return res.json({ ok: true });

  await SearchLog.findOneAndUpdate(
    { normalized: norm(term), session: String(sid || ''), clicked: false },
    {
      $set: {
        clicked: true,
        clickedProduct: product,
        clickedAt: new Date(),
        clickPosition: clampInt(position, 0, 500, 0),
        user: req.user?._id || null,
      },
    },
    { sort: { createdAt: -1 } },
  ).catch(() => null);

  res.json({ ok: true });
}));

/* ---------------------------------------------------------------------------
 * GET /api/search — the results page.
 * ------------------------------------------------------------------------- */
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const cfg = await searchConfig();
  const q = String(req.query.q || '').trim();
  const limit = clampInt(req.query.limit, 1, 60, cfg.perPage || 24);
  const page = clampInt(req.query.page, 1, 1000, 1);

  // Browsing with filters but no keyword is a legitimate use of this page, so
  // an empty q lists the catalogue instead of returning nothing.
  if (!q) {
    const filters = { ...LIVE, ...buildFilters(req.query) };
    const [docs, total] = await Promise.all([
      Product.find(filters).select(CARD)
        .sort(req.query.sort === 'newest' ? { createdAt: -1 } : { isFeatured: -1, createdAt: -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filters),
    ]);
    return res.json({ products: docs, total, page, hasMore: page * limit < total, terms: [], fuzzy: false, synonym: false });
  }

  const r = await runSearch({
    query: q, cfg, filters: buildFilters(req.query),
    limit, skip: (page - 1) * limit,
  });

  let products = r.products;
  const cmp = SORTS[req.query.sort];
  if (cmp) products = [...products].sort(cmp);

  // One row per search, first page only — paging is the same search continued,
  // not a new one, and counting it twice would inflate every keyword report.
  if (page === 1) {
    SearchLog.create({
      term: q,
      normalized: norm(q),
      results: r.total,
      zeroResult: r.total === 0,
      session: String(req.query.sid || ''),
      user: req.user?._id || null,
      usedFuzzy: !!r.fuzzy,
      usedSynonym: !!r.synonym,
      source: 'search',
    }).catch(() => {});
  }

  res.json({
    products,
    total: r.total,
    page,
    hasMore: page * limit < r.total,
    terms: r.terms,
    fuzzy: !!r.fuzzy,
    synonym: !!r.synonym,
    blocked: !!r.blocked,
  });
}));

module.exports = router;
