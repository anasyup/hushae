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
  const { gender, category, tier, size, color, badge, tag, minPrice, maxPrice, q: search, ids } = req.query;
  if (gender) q.gender = gender;
  if (category) q.categorySlug = category;
  if (tier) q.tier = tier;
  if (size) q.sizes = size;
  if (color) q['colors.name'] = new RegExp(`^${color}$`, 'i');
  if (badge) q.badges = badge;
  if (tag) {
    // Support comma-separated tags: ?tag=wedding,summer -> any-of match
    const tags = String(tag).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tags.length) q.tags = { $in: tags };
  }
  if (req.query.featured === 'true') q.isFeatured = true;
  if (req.query.bestSeller === 'true') q.isBestSeller = true;
  if (req.query.newArrival === 'true') q.isNewArrival = true;
  if (req.query.sale === 'true') {
    /* v2 — sale windows. `compareAtPrice != null` used to mean "on sale",
       which put EVERY product in the Sale page and printed "% off" on every
       card. Now a product is on sale only when the merchant switched the sale
       on AND a real was-price exists AND the window is open. */
    const sf = Product.saleFilter();
    q.$and = [...(q.$and || []), ...(sf.$and || [])];
  }
  if (minPrice || maxPrice) {
    q.price = {};
    if (minPrice) q.price.$gte = Number(minPrice);
    if (maxPrice) q.price.$lte = Number(maxPrice);
  }
  if (ids) {
    // The theme editor stores hand-picked products by slug (stable, readable);
    // other callers pass ObjectIds. Accept either, in one query.
    const list = String(ids).split(',').map((x) => x.trim()).filter(Boolean);
    const objectIds = list.filter((x) => /^[0-9a-fA-F]{24}$/.test(x));
    const slugs = list.filter((x) => !/^[0-9a-fA-F]{24}$/.test(x));
    const or = [];
    if (objectIds.length) or.push({ _id: { $in: objectIds } });
    if (slugs.length) or.push({ slug: { $in: slugs } });
    if (or.length === 1) Object.assign(q, or[0]);
    else if (or.length > 1) q.$and = [...(q.$and || []), { $or: or }];
  }
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
    .select('name slug price compareAtPrice onSale saleStart saleEnd stock images gender categorySlug tier fabric ratingAvg sizes colors isNewArrival isBestSeller');
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
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  const q = buildQuery(req);
  const products = await Product.find(q)
    .sort(SORTS[req.query.sort] || SORTS.popular)
    .limit(Math.min(parseInt(req.query.limit || '100', 10), 200))
    .lean();

  // Hand-picked lists must come back in the exact order the merchant arranged
  // them in the theme editor, so honour the ?ids= sequence instead of the sort.
  if (req.query.ids) {
    const order = String(req.query.ids).split(',').map((s) => s.trim());
    const rank = new Map(order.map((id, i) => [id, i]));
    const rankOf = (p) => {
      if (rank.has(String(p._id))) return rank.get(String(p._id));
      if (rank.has(p.slug)) return rank.get(p.slug);
      return Infinity;
    };
    products.sort((a, b) => rankOf(a) - rankOf(b));
  }

  res.json({ products });
}));

// Related products — same category, exclude the current product, prefer in-stock
router.get('/:slug/related', asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400');
  const p = await Product.findOne({ slug: req.params.slug, isActive: true, status: { $ne: 'draft' } }).lean();
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
    .select('name slug price compareAtPrice onSale saleStart saleEnd stock images gender categorySlug tier fabric ratingAvg sizes colors isNewArrival isBestSeller')
    .lean();
  res.json({ products });
}));

router.get('/:slug', asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');
  const product = await Product.findOne({ slug: req.params.slug, isActive: true, status: { $ne: 'draft' } }).lean();
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
  try { require('../utils/auditLogger').logAction(req.user?.email, 'create', 'product', product.slug); } catch { /* noop */ }
  res.status(201).json({ product });
}));

/* Duplicate a product — clone into a DRAFT so it never appears on the
 * storefront until the merchant edits and publishes it. New slug/SKU so
 * there are no unique-index collisions. Images are shared references. */
router.post('/:id/duplicate', protect, adminOnly, asyncHandler(async (req, res) => {
  const src = await Product.findById(req.params.id);
  if (!src) return res.status(404).json({ message: 'Product not found' });

  const baseName = `${src.name} (Copy)`;
  let slug = slugify(baseName);
  if (await Product.findOne({ slug })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  let sku = `${src.sku}-COPY`;
  if (await Product.findOne({ sku })) sku = `${sku}-${Date.now().toString(36).slice(-4)}`;

  const data = src.toObject();
  delete data._id;
  delete data.createdAt;
  delete data.updatedAt;
  delete data.__v;

  const product = await Product.create({
    ...data,
    name: baseName,
    slug,
    sku,
    status: 'draft',
    isActive: false,
  });
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

  // Direct numeric fields (null clears the value — e.g. remove a was-price)
  ['price', 'compareAtPrice', 'costPrice', 'stock'].forEach((f) => {
    if (patch[f] === null) { setDoc[f] = null; return; }
    if (patch[f] !== undefined && patch[f] !== '') {
      const n = Number(patch[f]);
      if (!Number.isFinite(n) || n < 0) {
        // skip invalid instead of failing the whole batch
        return;
      }
      setDoc[f] = n;
    }
  });

  // Sale window dates — null clears, valid ISO strings set
  ['saleStart', 'saleEnd'].forEach((f) => {
    if (patch[f] === null) { setDoc[f] = null; return; }
    if (patch[f]) {
      const d = new Date(patch[f]);
      if (!Number.isNaN(d.getTime())) setDoc[f] = d;
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
  ['isActive', 'isFeatured', 'isBestSeller', 'onSale'].forEach((f) => {
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

/* ── REORDER workflow (low-stock) ────────────────────────────────────────── */
router.patch('/:id/reorder', protect, adminOnly, asyncHandler(async (req, res) => {
  const p = await Product.findByIdAndUpdate(
    req.params.id,
    { $set: { reorderStatus: 'pending', reorderRequestedAt: new Date() } },
    { new: true }
  ).select('_id name stock reorderStatus reorderRequestedAt targetStock');
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json({ product: p });
}));

router.patch('/:id/reorder/received', protect, adminOnly, asyncHandler(async (req, res) => {
  const { stock } = req.body || {};
  const update = { $set: { reorderStatus: '', reorderRequestedAt: null } };
  if (stock !== undefined) {
    const n = Number(stock);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ message: 'Invalid stock value' });
    update.$set.stock = n;
  }
  const p = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
    .select('_id name stock reorderStatus');
  if (!p) return res.status(404).json({ message: 'Product not found' });
  res.json({ product: p });
}));

router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  const b = req.body || {};
  const fields = ['name', 'sku', 'gender', 'category', 'categorySlug', 'tier', 'price', 'compareAtPrice',
    'costPrice', 'stock', 'images', 'video', 'shortDescription', 'description', 'sizes', 'colors', 'fabric', 'badges', 'tags',
    'care', 'isFeatured', 'isBestSeller', 'isNewArrival', 'isActive', 'status', 'ratingAvg', 'ratingCount', 'bundleSlug',
    'onSale', 'saleStart', 'saleEnd', 'targetStock', 'barcode', 'weightGrams', 'reorderPoint', 'safetyStock', 'variants'];
  fields.forEach((f) => { if (b[f] !== undefined) product[f] = b[f]; });
  if (b.slug) product.slug = slugify(b.slug);
  await product.save();
  try { require('../utils/auditLogger').logAction(req.user?.email, 'update', 'product', product.slug); } catch { /* noop */ }
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
