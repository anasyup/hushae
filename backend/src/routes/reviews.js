const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Recalculate a product's ratingAvg + ratingCount from its APPROVED reviews.
async function recalcProduct(productId) {
  const agg = await Review.aggregate([
    { $match: { product: new (require('mongoose').Types.ObjectId)(productId), status: 'approved' } },
    { $group: { _id: null, avg: { $avg: '$rating' }, cnt: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg || 0;
  const cnt = agg[0]?.cnt || 0;
  await Product.findByIdAndUpdate(productId, {
    ratingAvg: Math.round(avg * 10) / 10,
    ratingCount: cnt,
  });
}

/* ============================================================
 * PUBLIC — list approved reviews for a product
 * GET /api/reviews/product/:productId?limit=20&sort=recent
 * ============================================================ */
router.get('/product/:productId', asyncHandler(async (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
  const sort = req.query.sort === 'helpful' ? { helpful: -1, createdAt: -1 } : { createdAt: -1 };
  const reviews = await Review.find({ product: req.params.productId, status: 'approved' })
    .sort(sort).limit(limit).lean();
  // Aggregate distribution (1..5 stars count)
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const all = await Review.find({ product: req.params.productId, status: 'approved' }, 'rating').lean();
  all.forEach(r => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  const total = all.length;
  const avg = total ? Math.round((all.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0;
  res.json({ reviews, distribution: dist, total, avg });
}));

/* ============================================================
 * PUBLIC — submit a review (verified if orderNumber matches)
 * POST /api/reviews
 * body: { productId, rating, title, body, customerName, customerEmail, images, orderNumber, phone }
 * ============================================================ */
router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.productId || !b.rating || !b.body || !b.customerName) {
    return res.status(400).json({ message: 'Product, rating, body and name are required' });
  }
  const rating = Math.max(1, Math.min(5, parseInt(b.rating, 10)));

  // If an order number + phone was supplied, verify against Order collection
  let verified = false;
  let orderId;
  if (b.orderNumber && b.phone) {
    const digits = String(b.phone).replace(/\D/g, '');
    const o = await Order.findOne({
      orderNumber: String(b.orderNumber).trim(),
      'customerInfo.phone': { $regex: digits.slice(-9) + '$' }, // last 9 digits match
    });
    if (o) {
      const contains = (o.items || []).some(it => String(it.productId || '') === String(b.productId));
      if (contains) { verified = true; orderId = o._id; }
    }
  }

  const review = await Review.create({
    product: b.productId,
    order: orderId,
    customerName: String(b.customerName).slice(0, 80),
    customerEmail: b.customerEmail ? String(b.customerEmail).slice(0, 120) : '',
    rating,
    title: (b.title || '').slice(0, 120),
    body: String(b.body).slice(0, 2000),
    images: Array.isArray(b.images) ? b.images.filter(i => typeof i?.url === 'string').slice(0, 5) : [],
    verified,
    status: 'pending', // Admin approves before public display
  });
  res.status(201).json({ review, message: 'Thank you — your review is under moderation.' });
}));

/* ============================================================
 * PUBLIC — mark a review as helpful
 * POST /api/reviews/:id/helpful
 * ============================================================ */
router.post('/:id/helpful', asyncHandler(async (req, res) => {
  await Review.findByIdAndUpdate(req.params.id, { $inc: { helpful: 1 } });
  res.json({ ok: true });
}));

/* ============================================================
 * ADMIN — list all reviews (with filter)
 * GET /api/reviews/admin?status=pending|approved|rejected
 * ============================================================ */
router.get('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  const reviews = await Review.find(q).populate('product', 'name slug images').sort({ createdAt: -1 }).limit(500).lean();
  const counts = {
    pending:  await Review.countDocuments({ status: 'pending' }),
    approved: await Review.countDocuments({ status: 'approved' }),
    rejected: await Review.countDocuments({ status: 'rejected' }),
  };
  res.json({ reviews, counts });
}));

/* ============================================================
 * ADMIN — approve, reject or reply to a review
 * PATCH /api/reviews/admin/:id
 * body: { status?, adminReply? }
 * ============================================================ */
router.patch('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const r = await Review.findById(req.params.id);
  if (!r) return res.status(404).json({ message: 'Review not found' });
  if (req.body.status) r.status = req.body.status;
  if (typeof req.body.adminReply === 'string') r.adminReply = req.body.adminReply.slice(0, 500);
  await r.save();
  await recalcProduct(r.product);
  res.json({ review: r });
}));

/* ============================================================
 * ADMIN — delete a review
 * DELETE /api/reviews/admin/:id
 * ============================================================ */
router.delete('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const r = await Review.findByIdAndDelete(req.params.id);
  if (r) await recalcProduct(r.product);
  res.json({ ok: true });
}));

module.exports = router;
