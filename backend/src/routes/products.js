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
  if (!adminView) { q.isActive = true; q.status = { $ne: 'draft' }; }
  else if (req.query.status === 'draft') q.status = 'draft';
  else if (req.query.status === 'active') q.status = { $ne: 'draft' };
  if (adminView && req.query.active === '0') q.isActive = false;
  if (adminView && req.query.active === '1') q.isActive = true;
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
  if (search) {
    const rx = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ name: rx }, { sku: rx }, { categorySlug: rx }]; // search by name, SKU or category
  }
  if (req.query.stock === 'low') q.stock = { $lte: 5 };
  if (req.query.stock === 'out') q.stock = 0;
  return q;
}

// Trending products — computed from recent order frequency (last 30 days)
// Returns [{ _id, name, slug, price, image, stock, orderCount, unitsSold, revenue }]
router.get('/trending', asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days || '30', 10)));
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit || '8', 10)));
  const since = new Date(Date.now() - days * 86400000);

  const Order = require('../models/Order');
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $nin: ['Cancelled', 'Refunded'] } } },
    { $unwind: '$items' },
    { $group: {
      _id: '$items.product',
      orderCount: { $addToSet: '$_id' },
      unitsSold: { $sum: '$items.quantity' },
      revenue: { $sum: '$items.lineTotal' },
    } },
    { $addFields: { orderCount: { $size: '$orderCount' } } },
    { $sort: { unitsSold: -1, orderCount: -1 } },
    { $limit: limit },
  ]);

  // Attach product info
  const ids = rows.map((r) => r._id).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids }, isActive: true, status: { $ne: 'draft' } })
    .select('name slug price compareAtPrice stock images gender categorySlug tier ratingAvg sizes colors');
  const map = new Map(products.map((p) => [String(p._id), p.toObject()]));

  const out = rows
    .map((r) => {
      const p = map.get(String(r._id));
      if (!p) return null;
      return { ...p, orderCount: r.orderCount, unitsSold: r.unitsSold, revenue: r.revenue };
    })
    .filter(Boolean);

  res.json({ products: out, days });
}));

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

// Related products — same category, exclude the current product, prefer in-stock
router.get('/:slug/related', asyncHandler(async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug, isActive: true, status: { $ne: 'draft' } });
  if (!p) return res.json({ products: [] });
  const products = await Product.find({
    _id: { $ne: p._id },
    isActive: true,
    status: { $ne: 'draft' },
    $or: [
      { categorySlug: p.categorySlug, gender: p.gender },
      { gender: p.gender, tier: p.tier },
    ],
  })
    .sort({ stock: -1, isBestSeller: -1, ratingAvg: -1 })
    .limit(8)
    .select('name slug price compareAtPrice stock images gender categorySlug tier ratingAvg sizes colors');
  res.json({ products });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug, isActive: true, status: { $ne: 'draft' } });
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

/* Bulk update — apply the same patch to many products in one call.
 * Body: { ids: [id1, id2, ...], patch: { field: value, ... } }
 * Whitelisted fields: price, compareAtPrice, costPrice, stock, tier, isActive,
 *                     isFeatured, isBestSeller, status, stockDelta (add/subtract)
 * Returns: { updated: N, modifiedIds: [...] }
 */
router.patch('/bulk', protect, adminOnly, asyncHandler(async (req, res) => {
  const { ids = [], patch = {} } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ message: 'Select at least one product' });
  }
  if (ids.length > 500) {
    return res.status(400).json({ message: 'Too many products in one batch (max 500)' });
  }

  const setDoc = {};
  const incDoc = {};

  // Direct numeric fields
  ['price', 'compareAtPrice', 'costPrice', 'stock'].forEach((f) => {
    if (patch[f] !== undefined && patch[f] !== null && patch[f] !== '') {
      const n = Number(patch[f]);
      if (!Number.isFinite(n) || n < 0) {
        // skip invalid instead of failing the whole batch
        return;
      }
      setDoc[f] = n;
    }
  });

  // Stock delta (relative change, e.g. +50 or -10)
  if (patch.stockDelta !== undefined && patch.stockDelta !== null && patch.stockDelta !== '') {
    const n = Number(patch.stockDelta);
    if (Number.isFinite(n) && n !== 0) incDoc.stock = n;
  }

  // Enums / strings
  if (patch.tier && ['Economy', 'Standard', 'Premium'].includes(patch.tier)) {
    setDoc.tier = patch.tier;
  }
  if (patch.status && ['active', 'draft'].includes(patch.status)) {
    setDoc.status = patch.status;
  }

  // Booleans
  ['isActive', 'isFeatured', 'isBestSeller'].forEach((f) => {
    if (typeof patch[f] === 'boolean') setDoc[f] = patch[f];
  });

  // Category-margin update: apply a percentage change to price (e.g. +10% for all)
  if (patch.priceChangePct !== undefined && patch.priceChangePct !== null && patch.priceChangePct !== '') {
    const pct = Number(patch.priceChangePct);
    if (Number.isFinite(pct) && pct !== 0) {
      const factor = 1 + (pct / 100);
      const products = await Product.find({ _id: { $in: ids } }).select('_id price');
      for (const p of products) {
        const newPrice = Math.round(p.price * factor);
        await Product.updateOne({ _id: p._id }, { $set: { price: Math.max(1, newPrice) } });
      }
    }
  }

  const ops = {};
  if (Object.keys(setDoc).length) ops.$set = setDoc;
  if (Object.keys(incDoc).length) ops.$inc = incDoc;

  if (!Object.keys(ops).length) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  const result = await Product.updateMany({ _id: { $in: ids } }, ops);
  res.json({ updated: result.modifiedCount, matched: result.matchedCount });
}));

// Quick stock adjust — set or delta on a single product (used by inline row editor)
router.patch('/:id/stock', protect, adminOnly, asyncHandler(async (req, res) => {
  const { stock, delta } = req.body || {};
  const update = {};
  if (stock !== undefined) {
    const n = Number(stock);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: 'Invalid stock value' });
    update.$set = { stock: n };
  } else if (delta !== undefined) {
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) return res.status(400).json({ message: 'Invalid delta' });
    update.$inc = { stock: n };
  } else {
    return res.status(400).json({ message: 'Provide stock or delta' });
  }
  const p = await Product.findOneAndUpdate({ _id: req.params.id }, update, { new: true }).select('_id stock name');
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json({ product: p });
}));

router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const b = req.body || {};
  const fields = ['name', 'sku', 'gender', 'category', 'categorySlug', 'tier', 'price', 'compareAtPrice',
    'stock', 'images', 'video', 'shortDescription', 'description', 'sizes', 'colors', 'fabric', 'badges',
    'care', 'isFeatured', 'isBestSeller', 'isActive', 'status', 'ratingAvg', 'ratingCount', 'bundleSlug'];
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

// Hard delete — permanently removes the listing (admin only)
router.delete('/:id/permanent', protect, adminOnly, asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product permanently deleted' });
}));

module.exports = router;
