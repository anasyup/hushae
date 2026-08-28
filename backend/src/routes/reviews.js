const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const crypto = require('crypto');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const flow = require('../utils/orderFlow');

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
/* Review photo upload — a narrow door for shoppers.
   The shared /uploads route is admin-only, so this mirrors the customer
   avatar endpoint: images only, merchant-set size cap, rate limited. */
const rateLimit = require('../middleware/rateLimit');
const photoLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 25, key: 'rvphoto', message: 'Too many uploads — try again later' });

router.post('/photo', photoLimit, asyncHandler(async (req, res) => {
  const policy = await reviewPolicy();
  if (!policy.enabled || !policy.enablePhotos) {
    return res.status(403).json({ message: 'Photo uploads are switched off' });
  }
  const { mime, dataBase64 } = req.body || {};
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    return res.status(400).json({ message: 'Please choose a JPG, PNG or WebP image' });
  }
  if (typeof dataBase64 !== 'string' || !/^[A-Za-z0-9+/=\s]+$/.test(dataBase64)) {
    return res.status(400).json({ message: 'That file could not be read' });
  }
  const data = Buffer.from(dataBase64, 'base64');
  const maxMb = Number(policy.photoMaxMb) || 2;
  if (!data.length) return res.status(400).json({ message: 'That file is empty' });
  if (data.length > maxMb * 1024 * 1024) {
    return res.status(400).json({ message: `Please choose an image under ${maxMb} MB` });
  }
  const Upload = require('../models/Upload');
  const up = await Upload.create({ mime, data, size: data.length });
  res.status(201).json({ url: `/api/uploads/${up._id}`, id: up._id });
}));

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

  flow.notify({
    type: 'review.new', severity: 'info',
    title: `New ${rating}-star review — ${String(b.customerName).slice(0, 40)}`,
    body: body.slice(0, 120),
    link: '/admin/reviews',
  }).catch(() => {});

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

  /* Optional text search — name / title / body. The DB does it now; the
     list can be long and client-side filtering would only see one page. */
  const term = String(req.query.q || '').trim();
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ customerName: rx }, { title: rx }, { body: rx }];
  }

  const sortMap = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    highest: { rating: -1, createdAt: -1 },
    lowest: { rating: 1, createdAt: -1 },
    helpful: { helpful: -1, createdAt: -1 },
  };
  const sort = sortMap[req.query.sort] || sortMap.newest;

  const counts = {
    pending:  await Review.countDocuments({ status: 'pending' }),
    approved: await Review.countDocuments({ status: 'approved' }),
    rejected: await Review.countDocuments({ status: 'rejected' }),
  };

  /* Paged mode (?page=): server-side slices so the panel stays fast at any
     review count. No page param = legacy behaviour (whole tab, cap 500). */
  if (req.query.page) {
    const per = Math.min(100, Math.max(1, Number(req.query.per) || 10));
    const page = Math.max(1, Number(req.query.page) || 1);
    const total = await Review.countDocuments(q);
    const reviews = await Review.find(q)
      .populate('product', 'name slug images')
      .sort(sort)
      .skip((page - 1) * per)
      .limit(per)
      .lean();
    return res.json({ reviews, counts, total, page, per });
  }

  const reviews = await Review.find(q).populate('product', 'name slug images').sort(sort).limit(500).lean();
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
  const prevStatus = r.status;          // captured before the change
  if (req.body.status) r.status = req.body.status;
  if (typeof req.body.adminReply === 'string') r.adminReply = req.body.adminReply.slice(0, 500);
  await r.save();
  /* Points for a review, paid when it is APPROVED — not when written.
     Paying on submission would reward spam that never goes live. */
  try {
    if (req.body.status === 'approved' && prevStatus !== 'approved') {
      const E = require('../utils/loyaltyEngine');
      const cfg = await E.loyaltyConfig();
      if (cfg.enabled && cfg.earn?.reviewEnabled && cfg.earn.reviewPoints > 0) {
        const Order = require('../models/Order');
        const ord = r.order ? await Order.findById(r.order).select('customerInfo').lean() : null;
        const phone = ord?.customerInfo?.phone;
        if (phone) {
          await E.award({
            phone, email: r.customerEmail, name: r.customerName,
            amount: cfg.earn.reviewPoints, reason: 'review',
            note: 'Thank you for your review',
            idempotencyKey: `review:${r._id}`,
          });
        }
      }
    }
  } catch (e) { console.error('[loyalty] review award failed:', e.message); }

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

/* ============================================================
 * ADMIN — one-shot sample reviews (demo data for the panel)
 * POST /api/reviews/admin/seed-demo
 *
 * Boss order: 10-20 realistic reviews FROM DELIVERED ORDERS — the
 * customers who actually received their pieces. Real delivered orders
 * are used whenever they exist (verified purchase, linked order, real
 * customer name); fallback names fill the rest. Runs exactly once —
 * seeded reviews carry demo:true and the guard refuses a second run.
 * Approved ones recalc product rating aggregates like the real flow.
 * ============================================================ */
const DEMO_CONTENT = [
  [5, 'Perfect fit, soft fabric', 'Used the fit finder and the size was spot on. Fabric is genuinely soft and the stitching is clean. Packaging was completely discreet.'],
  [5, 'Better than imported brands', 'I usually buy imported innerwear but this is softer and holds shape better after a few washes. Genuinely impressed.'],
  [4, 'Very comfortable', 'Comfortable for all-day wear, size runs true. Slightly expensive but the quality justifies it.'],
  [4, 'Good quality, fast delivery', 'Ordered on Monday, delivered Wednesday. Quality is great for the price and the parcel was unmarked as promised.'],
  [5, 'The fabric is incredible', 'You can feel the quality the moment you touch it. Washed three times already — no pilling, no fading.'],
  [5, 'Worth every rupee', 'Discreet packaging as promised, beautiful fabric, fits perfectly. Will definitely reorder.'],
  [4, 'Nice and breathable', 'Breathable in our heat, comfortable fit, seams sit flat. Would recommend to anyone asking.'],
  [3, 'Good but size up', 'Quality is good but I would size up for a relaxed fit. Fabric is lovely though, so I am keeping them.'],
  [5, 'My third order from them', 'Third time ordering. Consistent quality every single time — that is rare, and it keeps me coming back.'],
  [4, 'Soft and well made', 'Very soft, no irritation even for sensitive skin. Happy with the purchase and the quick delivery.'],
  [5, 'Excellent quality', 'Excellent stitching, true to size, arrived in plain packaging. A great experience from checkout to doorstep.'],
  [4, 'Very happy with this', 'Really comfortable and the quality feels premium. Delivery was quick and the rider called before arriving.'],
  [5, 'Feels like nothing at all', 'This is what second skin means. I forget I am wearing them. Ordered two more sets the same week.'],
  [5, 'Impressed by the finishing', 'Bonded edges, clean stitching, no loose threads. The attention to detail is obvious the moment you open the box.'],
  [4, 'Great for daily wear', 'Holds shape through long days and washes well. Colour stayed exactly as pictured on the site.'],
  [5, 'Discreet and fast', 'Plain outer packaging, delivered in two days to Lahore. The product itself is even better than the photos.'],
];
const DEMO_NAMES = ['Ayesha K.', 'Bilal M.', 'Fatima S.', 'Hamza R.', 'Mahnoor A.', 'Usman T.', 'Zara H.', 'Ali Z.', 'Sana P.', 'Omar F.', 'Nimra J.', 'Daniyal S.'];
// Status plan for 16 reviews: 11 approved, 4 pending, 1 rejected — enough
// for the storefront AND for the moderation workflow to feel real.
const DEMO_STATUS = ['approved', 'approved', 'pending', 'approved', 'approved', 'approved', 'rejected', 'approved', 'pending', 'approved', 'approved', 'approved', 'pending', 'approved', 'approved', 'pending'];

async function seedDemoReviews() {
  const mongoose = require('mongoose');
  const already = await Review.countDocuments({ demo: true });
  if (already > 0) {
    const e = new Error(`Sample reviews already exist (${already}). One-shot by design.`);
    e.statusCode = 409;
    throw e;
  }

  // Real delivered orders → real customers → verified reviews.
  const orders = await Order.find({ $or: [{ status: 'Delivered' }, { stage: 'Delivered' }] })
    .sort({ createdAt: -1 }).limit(40).lean();
  const prods = await Product.find({ isActive: true, status: { $ne: 'draft' } })
    .sort({ isFeatured: -1, isBestSeller: -1, createdAt: -1 }).limit(14).lean();
  if (!prods.length) {
    const e = new Error('No live products to attach sample reviews to.');
    e.statusCode = 400;
    throw e;
  }
  const liveIds = new Set(prods.map((p) => String(p._id)));

  const docs = [];
  const seen = new Set();
  let ci = 0;
  for (const o of orders) {
    for (const it of o.items || []) {
      const pid = String(it.product || '');
      const key = `${o._id}:${pid}`;
      if (!pid || seen.has(key) || !liveIds.has(pid)) continue;
      seen.add(key);
      const [rating, title, body] = DEMO_CONTENT[ci % DEMO_CONTENT.length];
      docs.push({
        _id: new mongoose.Types.ObjectId(),
        product: it.product,
        order: o._id,
        customerName: (o.customerInfo?.name || 'HUSHAE Customer').slice(0, 80),
        customerEmail: o.customerInfo?.email || '',
        rating, title, body,
        images: [], videos: [],
        verified: true,
        status: DEMO_STATUS[ci % DEMO_STATUS.length],
        helpful: ci % 4 === 0 ? (ci % 7) + 2 : 0,
        reports: 0, adminReply: '', adminReplyAt: null,
        featured: false, pinned: false, demo: true,
        createdAt: new Date(Date.now() - (ci + 1) * 30 * 3600000),
        updatedAt: new Date(),
      });
      ci += 1;
      if (docs.length >= 16) break;
    }
    if (docs.length >= 16) break;
  }
  const linked = docs.length;

  // Fill the remainder with realistic unlinked reviews (still marked demo).
  let fi = 0;
  while (docs.length < 16) {
    const p = prods[fi % prods.length];
    const [rating, title, body] = DEMO_CONTENT[(ci + fi) % DEMO_CONTENT.length];
    docs.push({
      _id: new mongoose.Types.ObjectId(),
      product: p._id,
      order: null,
      customerName: DEMO_NAMES[(ci + fi) % DEMO_NAMES.length],
      customerEmail: '',
      rating, title, body,
      images: [], videos: [],
      verified: false,
      status: DEMO_STATUS[(ci + fi) % DEMO_STATUS.length],
      helpful: 0, reports: 0, adminReply: '', adminReplyAt: null,
      featured: false, pinned: false, demo: true,
      createdAt: new Date(Date.now() - (docs.length + 1) * 26 * 3600000),
      updatedAt: new Date(),
    });
    fi += 1;
  }

  // Raw insert keeps the back-dated createdAt (timestamps would overwrite it).
  await Review.collection.insertMany(docs);

  // Public averages follow the real flow — approved reviews only.
  const approvedProducts = [...new Set(docs.filter((d) => d.status === 'approved').map((d) => String(d.product)))];
  for (const pid of approvedProducts) await recalcProduct(pid);

  const count = (s) => docs.filter((d) => d.status === s).length;
  return { created: docs.length, linked, approved: count('approved'), pending: count('pending'), rejected: count('rejected') };
}

router.post('/admin/seed-demo', protect, adminOnly, asyncHandler(async (req, res) => {
  try {
    const out = await seedDemoReviews();
    res.status(201).json(out);
  } catch (ex) {
    if (ex.statusCode === 409 || ex.statusCode === 400) return res.status(ex.statusCode).json({ message: ex.message });
    throw ex;
  }
}));
router.seedDemoReviews = seedDemoReviews; // exposed for the QA script only

module.exports = router;
