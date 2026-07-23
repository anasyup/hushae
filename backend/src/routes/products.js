const express = require('express');
const Product = require('../models/Product');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, slugify } = require('../utils/helpers');

const router = express.Router();

const SORTS = {
  'newest': { createdAt: -1 },
  'popular': { ratingCount: -1, ratingAvg: -1 },
  'price-asc': { price: 1 },
  'price-desc': { price: -1 },
};

function buildQuery(req, { adminView = false } = {}) {
  const q = {};
  if (!adminView) q.isActive = true;
  const { gender, category, tier, size, color, badge, minPrice, maxPrice, q: search, ids } = req.query;
  if (gender) q.gender = gender;
  if (category) q.categorySlug = category;
  if (tier) q.tier = tier;
  if (size) q.sizes = size;
  if (color) q['colors.name'] = new RegExp(`^${color}$`, 'i');
  if (badge) q.badges = badge;
  if (req.query.featured === 'true') q.isFeatured = true;
  if (req.query.bestSeller === 'true') q.isBestSeller = true;
  if (req.query.sale === 'true') q.compareAtPrice = { $ne: null };
  if (minPrice || maxPrice) {
    q.price = {};
    if (minPrice) q.price.$gte = Number(minPrice);
    if (maxPrice) q.price.$lte = Number(maxPrice);
  }
  if (ids) q._id = { $in: String(ids).split(',') };
  if (search) q.name = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (req.query.stock === 'low') q.stock = { $lte: 5 };
  if (req.query.stock === 'out') q.stock = 0;
  return q;
}

// Admin list (must be before /:slug)
router.get('/admin/list', protect, adminOnly, asyncHandler(async (req, res) => {
  const q = buildQuery(req, { adminView: true });
  const products = await Product.find(q).sort(SORTS[req.query.sort] || { createdAt: -1 }).limit(300);
  res.json({ products });
}));

router.get('/', asyncHandler(async (req, res) => {
  const q = buildQuery(req);
  const products = await Product.find(q)
    .sort(SORTS[req.query.sort] || SORTS.popular)
    .limit(Math.min(parseInt(req.query.limit || '100', 10), 200));
  res.json({ products });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product });
}));

router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.gender || !b.tier || b.price === undefined) {
    return res.status(400).json({ message: 'Name, gender, tier and price are required' });
  }
  const slug = slugify(b.slug || b.name);
  if (await Product.findOne({ $or: [{ slug }, { sku: b.sku }] })) {
    return res.status(409).json({ message: 'Slug or SKU already exists' });
  }
  const product = await Product.create({ ...b, slug });
  res.status(201).json({ product });
}));

router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const b = req.body || {};
  const fields = ['name', 'sku', 'gender', 'category', 'categorySlug', 'tier', 'price', 'compareAtPrice',
    'stock', 'images', 'shortDescription', 'description', 'sizes', 'colors', 'fabric', 'badges',
    'care', 'isFeatured', 'isBestSeller', 'isActive', 'ratingAvg', 'ratingCount', 'bundleSlug'];
  fields.forEach((f) => { if (b[f] !== undefined) product[f] = b[f]; });
  if (b.slug) product.slug = slugify(b.slug);
  await product.save();
  res.json({ product });
}));

// Soft delete
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ product, message: 'Product disabled' });
}));

module.exports = router;
