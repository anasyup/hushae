const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const crypto = require('crypto');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

/* Merchant policy, with defaults identical to models/Settings.js. */
const REVIEW_DEFAULTS = {
  enabled: true, allowGuest: false, verifiedRequired: true, autoApprove: false,
  allowEdit: true, editWindowHours: 24, allowReport: true, allowHelpful: true,
  minLength: 20, maxLength: 2000, minRating: 1, requireTitle: false,
  enablePhotos: true, maxPhotos: 5, enableVideos: false, maxVideos: 1,
  perPage: 8, enableQA: true, qaAutoApprove: false, qaAllowGuest: true,
};
async function reviewPolicy() {
  try {
    const Settings = require('../models/Settings');
    const st = await Settings.findOne({ key: 'store' }).lean();
    return { ...REVIEW_DEFAULTS, ...(st?.reviews || {}) };
  } catch { return { ...REVIEW_DEFAULTS }; }
}

/* One vote per person per review. Guests are identified by a hashed IP —
   enough to stop a counter being held down, and it stores no raw address. */
const voterKey = (req) => (req.user
  ? `u:${req.user._id}`
  : `ip:${crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.ip || '')).digest('hex').slice(0, 16)}`);

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
  const policy = await reviewPolicy();
  const q = req.query;
  const perPage = Math.min(50, parseInt(q.limit || policy.perPage || 8, 10));
  const page = Math.max(1, parseInt(q.page || '1', 10));

  const SORTS = {
    recent:  { pinned: -1, createdAt: -1 },
    oldest:  { pinned: -1, createdAt: 1 },
    highest: { pinned: -1, rating: -1, createdAt: -1 },
    lowest:  { pinned: -1, rating: 1, createdAt: -1 },
    helpful: { pinned: -1, helpful: -1, createdAt: -1 },
  };
  const sort = SORTS[q.sort] || SORTS.recent;

  const where = { product: req.params.productId, status: 'approved' };
  if (q.rating && /^[1-5]$/.test(q.rating)) where.rating = parseInt(q.rating, 10);
  if (q.verified === '1') where.verified = true;
  if (q.media === '1') where['images.0'] = { $exists: true };

  const [reviews, matching] = await Promise.all([
    Review.find(where).sort(sort).skip((page - 1) * perPage).limit(perPage).lean(),
    Review.countDocuments(where),
  ]);

  /* The distribution always describes ALL approved reviews, never the filtered
     subset — otherwise clicking "5 star" would redraw the graph as 100% five
     star and the shopper loses the very context they are filtering against. */
  const all = await Review.find({ product: req.params.productId, status: 'approved' }, 'rating verified images').lean();
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  all.forEach((r) => { dist[r.rating] = (dist[r.rating] || 0) + 1; });
  const total = all.length;
  const avg = total ? Math.round((all.reduce((sum, r) => sum + r.rating, 0) / total) * 10) / 10 : 0;

  res.json({
    reviews,
    distribution: dist,
    total,
    avg,
    matching,
    page,
    perPage,
    hasMore: page * perPage < matching,
    verifiedCount: all.filter((r) => r.verified).length,
    mediaCount: all.filter((r) => (r.images || []).length).length,
  });
}));

/* Every approved photo across a product's reviews, for the media strip. */
router.get('/product/:productId/media', asyncHandler(async (req, res) => {
  const rows = await Review.find(
    { product: req.params.productId, status: 'approved', 'images.0': { $exists: true } },
    'images customerName rating createdAt',
  ).sort({ createdAt: -1 }).limit(40).lean();
  const media = [];
  for (const r of rows) {
    for (const img of r.images || []) {
      if (img?.url) media.push({ url: img.url, by: r.customerName, rating: r.rating, reviewId: r._id });
    }
  }
  res.json({ media: media.slice(0, 40) });
}));

/* ============================================================
 * PUBLIC — submit a review (verified if orderNumber matches)
 * POST /api/reviews
 * body: { productId, rating, title, body, customerName, customerEmail, images, orderNumber, phone }
 * ============================================================ */
router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  const policy = await reviewPolicy();
  if (!policy.enabled) return res.status(403).json({ message: 'Reviews are currently closed' });

  const b = req.body || {};
  if (!b.productId || !b.rating || !b.body || !b.customerName) {
    return res.status(400).json({ message: 'Product, rating, review and your name are required' });
  }

  const rating = Math.max(1, Math.min(5, parseInt(b.rating, 10)));
  if (rating < (policy.minRating || 1)) {
    return res.status(400).json({ field: 'rating', message: `Please give at least ${policy.minRating} stars` });
  }

  const body = String(b.body).trim();
  if (body.length < (policy.minLength || 0)) {
    return res.status(400).json({ field: 'body', message: `Please write at least ${policy.minLength} characters` });
  }
  if (policy.requireTitle && !String(b.title || '').trim()) {
    return res.status(400).json({ field: 'title', message: 'Please add a short headline' });
  }

  /* ------------------------------------------------------------------
   * Verified purchase.
   *
   * THIS WAS BROKEN. The old check read `it.productId` from the order's
   * items, but the Order item schema stores the field as `product`. The
   * comparison was therefore always undefined === id → false, so the
   * "Verified purchase" badge could never be awarded to anybody, however
   * genuine their order.
   * ---------------------------------------------------------------- */
  let verified = false;
  let orderId;
  if (b.orderNumber && b.phone) {
    const digits = String(b.phone).replace(/\D/g, '');
    const order = await Order.findOne({
      orderNumber: String(b.orderNumber).trim().toUpperCase(),
      'customerInfo.phone': { $regex: `${digits.slice(-9)}$` },
    });
    if (order) {
      const bought = (order.items || []).some((it) => String(it.product || '') === String(b.productId));
      if (bought) { verified = true; orderId = order._id; }
    }
  }

  if (policy.verifiedRequired && !verified) {
    return res.status(400).json({
      field: 'orderNumber',
      message: 'We could not match that order number and phone to a purchase of this piece. Reviews are open to buyers only.',
    });
  }
  if (!policy.allowGuest && !verified && !req.user) {
    return res.status(401).json({ message: 'Please sign in to leave a review' });
  }

  // One review per order per product — otherwise a single purchase could be
  // used to post the same rating repeatedly.
  if (orderId) {
    const dupe = await Review.findOne({ product: b.productId, order: orderId });
    if (dupe) return res.status(409).json({ message: 'You have already reviewed this piece for that order.' });
  }

  const images = policy.enablePhotos && Array.isArray(b.images)
    ? b.images.filter((i) => typeof i?.url === 'string').slice(0, policy.maxPhotos || 5)
    : [];
  const videos = policy.enableVideos && Array.isArray(b.videos)
    ? b.videos.filter((v) => typeof v?.url === 'string').slice(0, policy.maxVideos || 1)
    : [];

  const review = await Review.create({
    product: b.productId,
    order: orderId,
    user: req.user ? req.user._id : undefined,
    customerName: String(b.customerName).slice(0, 80),
    customerEmail: b.customerEmail ? String(b.customerEmail).slice(0, 120) : '',
    rating,
    title: String(b.title || '').slice(0, 120),
    body: body.slice(0, policy.maxLength || 2000),
    images,
    videos,
    verified,
    status: policy.autoApprove ? 'approved' : 'pending',
  });

  if (policy.autoApprove) await recalcProduct(b.productId);

  res.status(201).json({
    review,
    message: policy.autoApprove
      ? 'Thank you — your review is now live.'
      : 'Thank you — your review will appear once our team has read it.',
  });
}));

/* Edit your own review, inside the merchant's window. Editing sends it back
   to moderation, or an approved review could be rewritten into anything. */
router.patch('/:id', optionalAuth, asyncHandler(async (req, res, next) => {
  /* Express matches routes in order, so this would otherwise swallow
     PATCH /admin/:id. Hand anything under /admin to the admin handlers. */
  if (req.params.id === 'admin') return next('route');
  const policy = await reviewPolicy();
  if (!policy.allowEdit) return res.status(403).json({ message: 'Reviews cannot be edited' });

  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });

  const owns = (req.user && String(review.user || '') === String(req.user._id))
    || (req.body?.orderNumber && review.order && String(req.body.orderNumber).trim().toUpperCase()
        && await Order.exists({ _id: review.order, orderNumber: String(req.body.orderNumber).trim().toUpperCase() }));
  if (!owns) return res.status(403).json({ message: 'You can only edit your own review' });

  const hours = Number(policy.editWindowHours) || 24;
  if (Date.now() - new Date(review.createdAt).getTime() > hours * 3600000) {
    return res.status(400).json({ message: `Reviews can be edited for ${hours} hours after posting` });
  }

  if (req.body.rating) review.rating = Math.max(1, Math.min(5, parseInt(req.body.rating, 10)));
  if (req.body.title !== undefined) review.title = String(req.body.title).slice(0, 120);
  if (req.body.body) {
    const nb = String(req.body.body).trim();
    if (nb.length < (policy.minLength || 0)) {
      return res.status(400).json({ field: 'body', message: `Please write at least ${policy.minLength} characters` });
    }
    review.body = nb.slice(0, policy.maxLength || 2000);
  }
  review.status = policy.autoApprove ? 'approved' : 'pending';
  await review.save();
  await recalcProduct(review.product);
  res.json({ review, message: 'Your review has been updated.' });
}));

/* Report a review. One report per person; the merchant sees the count. */
router.post('/:id/report', optionalAuth, asyncHandler(async (req, res, next) => {
  if (req.params.id === 'admin') return next('route');
  const policy = await reviewPolicy();
  if (!policy.allowReport) return res.status(403).json({ message: 'Reporting is switched off' });
  const key = voterKey(req);
  const review = await Review.findById(req.params.id).select('+reportedBy');
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if ((review.reportedBy || []).includes(key)) return res.json({ ok: true, already: true });
  review.reportedBy.push(key);
  review.reports = (review.reports || 0) + 1;
  await review.save();
  res.json({ ok: true, message: 'Thank you — our team will take a look.' });
}));

/* ============================================================
 * PUBLIC — mark a review as helpful
 * POST /api/reviews/:id/helpful
 * ============================================================ */
router.post('/:id/helpful', optionalAuth, asyncHandler(async (req, res, next) => {
  if (req.params.id === 'admin') return next('route');
  const policy = await reviewPolicy();
  if (!policy.allowHelpful) return res.status(403).json({ message: 'Not available' });

  /* Was a bare $inc — one person could hold the button and run the count to
     any number they liked. Now one vote per person, and pressing again takes
     it back. */
  const key = voterKey(req);
  const review = await Review.findById(req.params.id).select('+helpfulBy');
  if (!review) return res.status(404).json({ message: 'Review not found' });

  const had = (review.helpfulBy || []).includes(key);
  review.helpfulBy = had ? review.helpfulBy.filter((k) => k !== key) : [...review.helpfulBy, key];
  review.helpful = review.helpfulBy.length;
  await review.save();
  res.json({ ok: true, helpful: review.helpful, voted: !had });
}));

/* ============================================================
 * ADMIN — list all reviews (with filter)
 * GET /api/reviews/admin?status=pending|approved|rejected
 * ============================================================ */
/* Review analytics for the admin desk. */
router.get('/admin/stats', protect, adminOnly, asyncHandler(async (req, res) => {
  const [byStatus, byRating, recent, reported] = await Promise.all([
    Review.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Review.aggregate([{ $match: { status: 'approved' } }, { $group: { _id: '$rating', n: { $sum: 1 } } }]),
    Review.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    Review.countDocuments({ reports: { $gt: 0 } }),
  ]);
  const status = {}; byStatus.forEach((r) => { status[r._id] = r.n; });
  const rating = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; byRating.forEach((r) => { rating[r._id] = r.n; });
  const approved = Object.entries(rating).reduce((s2, [k, n]) => s2 + Number(k) * n, 0);
  const cnt = Object.values(rating).reduce((a, c) => a + c, 0);
  res.json({
    status, rating, last30Days: recent, reported,
    avg: cnt ? Math.round((approved / cnt) * 10) / 10 : 0,
    totalApproved: cnt,
  });
}));

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

/* ---- admin: feature, pin, bulk ---- */
router.post('/admin/bulk', protect, adminOnly, asyncHandler(async (req, res) => {
  const { ids = [], action } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'No reviews selected' });

  const OPS = {
    approve: { status: 'approved' },
    reject: { status: 'rejected' },
    feature: { featured: true },
    unfeature: { featured: false },
    pin: { pinned: true },
    unpin: { pinned: false },
    verify: { verified: true },
  };

  if (action === 'delete') {
    const rows = await Review.find({ _id: { $in: ids } }, 'product').lean();
    await Review.deleteMany({ _id: { $in: ids } });
    for (const pid of [...new Set(rows.map((r) => String(r.product)))]) await recalcProduct(pid);
    return res.json({ ok: true, affected: rows.length });
  }

  const op = OPS[action];
  if (!op) return res.status(400).json({ message: 'Unknown action' });
  const rows = await Review.find({ _id: { $in: ids } }, 'product').lean();
  await Review.updateMany({ _id: { $in: ids } }, { $set: op });
  // Only approval/rejection changes a product's public average.
  if (op.status) for (const pid of [...new Set(rows.map((r) => String(r.product)))]) await recalcProduct(pid);
  res.json({ ok: true, affected: rows.length });
}));

module.exports = router;
