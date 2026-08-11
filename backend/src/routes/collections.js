const express = require('express');
const Collection = require('../models/Collection');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, slugify } = require('../utils/helpers');

const router = express.Router();

/* Build a Mongo query from a collection's smart rules. */
function smartQuery(c) {
  const q = { isActive: true, status: { $ne: 'draft' } };
  if (c.smart?.tags?.length)   q.tags     = { $in: c.smart.tags };
  if (c.smart?.category)       q.categorySlug = c.smart.category;
  if (c.smart?.tier)           q.tier     = c.smart.tier;
  if (c.smart?.gender)         q.gender   = c.smart.gender;
  if (c.smart?.onSale) {
    /* v2 — sale windows. A smart "On sale" collection now honours the sale
       flag + was-price + window, not just a present compareAtPrice. */
    const sf = Product.saleFilter();
    q.$and = [...(q.$and || []), ...(sf.$and || [])];
  }
  if (c.smart?.minPrice != null) q.price = { ...(q.price || {}), $gte: c.smart.minPrice };
  if (c.smart?.maxPrice != null) q.price = { ...(q.price || {}), $lte: c.smart.maxPrice };
  return q;
}

/* Resolve products for a single collection (manual + smart merged, deduped) */
async function resolveProducts(c, limit = 60) {
  const ids = new Set();
  const items = [];

  // Manual products first (preserves admin order)
  if (Array.isArray(c.products) && c.products.length) {
    const manual = await Product.find({
      _id: { $in: c.products },
      isActive: true, status: { $ne: 'draft' },
    }).select('name slug price compareAtPrice onSale saleStart saleEnd stock images gender categorySlug tier ratingAvg sizes colors isNewArrival bestSeller tags');
    for (const p of manual) {
      if (!ids.has(String(p._id))) { ids.add(String(p._id)); items.push(p); }
    }
  }

  // Smart rules fill the rest
  if (c.smart?.enabled) {
    const smart = await Product.find(smartQuery(c))
      .sort({ isBestSeller: -1, stock: -1 })
      .limit(limit)
      .select('name slug price compareAtPrice onSale saleStart saleEnd stock images gender categorySlug tier ratingAvg sizes colors isNewArrival bestSeller tags');
    for (const p of smart) {
      if (items.length >= limit) break;
      if (!ids.has(String(p._id))) { ids.add(String(p._id)); items.push(p); }
    }
  }
  return items;
}

/* -------- PUBLIC -------- */
router.get('/', asyncHandler(async (req, res) => {
  const q = { isActive: true };
  if (req.query.featured === 'true') q.featuredOnHome = true;
  const collections = await Collection.find(q).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ collections });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const c = await Collection.findOne({ slug: req.params.slug, isActive: true });
  if (!c) return res.status(404).json({ message: 'Collection not found' });
  const products = await resolveProducts(c);
  res.json({ collection: c, products });
}));

/* -------- ADMIN -------- */
router.get('/admin/list', protect, adminOnly, asyncHandler(async (req, res) => {
  const collections = await Collection.find({}).sort({ sortOrder: 1, createdAt: -1 });
  // Attach a computed count for each
  const withCounts = await Promise.all(collections.map(async (c) => {
    const products = await resolveProducts(c, 200);
    return { ...c.toObject(), productCount: products.length };
  }));
  res.json({ collections: withCounts });
}));

router.get('/admin/all-tags', protect, adminOnly, asyncHandler(async (req, res) => {
  // All unique tags across products — useful for the admin autocomplete
  const tags = await Product.distinct('tags', { tags: { $ne: '' } });
  res.json({ tags: tags.filter(Boolean).sort() });
}));

router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name?.trim()) return res.status(400).json({ message: 'Name is required' });
  const slug = slugify(b.slug || b.name);
  if (await Collection.findOne({ slug })) return res.status(409).json({ message: 'A collection with this slug already exists' });
  const doc = await Collection.create({ ...b, slug });
  res.status(201).json({ collection: doc });
}));

router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const b = req.body || {};
  const c = await Collection.findById(req.params.id);
  if (!c) return res.status(404).json({ message: 'Not found' });
  ['name', 'description', 'image', 'products', 'smart', 'featuredOnHome', 'sortOrder', 'isActive'].forEach((f) => {
    if (b[f] !== undefined) c[f] = b[f];
  });
  if (b.slug) c.slug = slugify(b.slug);
  await c.save();
  res.json({ collection: c });
}));

router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await Collection.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
