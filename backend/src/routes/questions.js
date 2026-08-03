const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../utils/helpers');
const Question = require('../models/Question');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

/* Merchant policy lives in the same settings.reviews block as reviews — a
   question is part of the same product-feedback surface, and splitting it
   across two blocks would let the two drift. */
const QA_DEFAULTS = { enableQA: true, qaAutoApprove: false, qaAllowGuest: true, allowHelpful: true, allowReport: true };
async function qaPolicy() {
  try {
    const Settings = require('../models/Settings');
    const st = await Settings.findOne({ key: 'store' }).lean();
    return { ...QA_DEFAULTS, ...(st?.reviews || {}) };
  } catch { return { ...QA_DEFAULTS }; }
}

/* One vote per person. Guests are keyed by a hashed IP — enough to stop a
   counter being held down, and no raw address is stored. */
const voterKey = (req) => (req.user
  ? `u:${req.user._id}`
  : `ip:${crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.ip || '')).digest('hex').slice(0, 16)}`);

const askLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, key: 'ask', message: 'Too many questions — please try again later' });

/* ---------------------------------------------------------------------------
 * PUBLIC — questions for a product
 * Only approved questions, and only approved answers inside them, so a
 * rejected answer can never leak out attached to a live question.
 * ------------------------------------------------------------------------- */
router.get('/product/:productId', asyncHandler(async (req, res) => {
  const policy = await qaPolicy();
  if (!policy.enableQA) return res.json({ questions: [], total: 0, enabled: false });

  const perPage = Math.min(20, parseInt(req.query.limit || '5', 10));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const search = String(req.query.q || '').trim();

  const where = { product: req.params.productId, status: 'approved' };
  if (search) where.body = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

  const [rows, total] = await Promise.all([
    Question.find(where)
      .sort({ featured: -1, helpful: -1, createdAt: -1 })
      .skip((page - 1) * perPage).limit(perPage).lean(),
    Question.countDocuments(where),
  ]);

  const questions = rows.map((q) => ({
    ...q,
    answers: (q.answers || [])
      .filter((a) => a.status === 'approved')
      .sort((a, b) => (b.isMerchant ? 1 : 0) - (a.isMerchant ? 1 : 0)),
  }));

  res.json({ questions, total, page, perPage, hasMore: page * perPage < total, enabled: true });
}));

/* ---------------------------------------------------------------------------
 * PUBLIC — ask a question
 * ------------------------------------------------------------------------- */
router.post('/', askLimit, optionalAuth, asyncHandler(async (req, res) => {
  const policy = await qaPolicy();
  if (!policy.enableQA) return res.status(403).json({ message: 'Questions are currently closed' });
  if (!policy.qaAllowGuest && !req.user) return res.status(401).json({ message: 'Please sign in to ask a question' });

  const b = req.body || {};
  const body = String(b.body || '').trim();
  const name = String(b.customerName || '').trim();
  if (!b.productId) return res.status(400).json({ message: 'Missing product' });
  if (body.length < 10) return res.status(400).json({ field: 'body', message: 'Please write at least 10 characters' });
  if (name.length < 2) return res.status(400).json({ field: 'customerName', message: 'Please enter your name' });

  const question = await Question.create({
    product: b.productId,
    user: req.user ? req.user._id : null,
    customerName: name.slice(0, 80),
    customerEmail: String(b.customerEmail || '').slice(0, 120),
    body: body.slice(0, 500),
    status: policy.qaAutoApprove ? 'approved' : 'pending',
  });

  res.status(201).json({
    question,
    message: policy.qaAutoApprove
      ? 'Thank you — your question is now live.'
      : 'Thank you — we will answer shortly.',
  });
}));

/* ---------------------------------------------------------------------------
 * PUBLIC — answer someone else's question
 * ------------------------------------------------------------------------- */
router.post('/:id/answer', askLimit, optionalAuth, asyncHandler(async (req, res) => {
  const policy = await qaPolicy();
  if (!policy.enableQA) return res.status(403).json({ message: 'Questions are currently closed' });

  const body = String(req.body?.body || '').trim();
  const name = String(req.body?.authorName || '').trim();
  if (body.length < 5) return res.status(400).json({ field: 'body', message: 'Please write a little more' });
  if (name.length < 2) return res.status(400).json({ field: 'authorName', message: 'Please enter your name' });

  const q = await Question.findById(req.params.id);
  if (!q || q.status !== 'approved') return res.status(404).json({ message: 'Question not found' });

  q.answers.push({
    body: body.slice(0, 1500),
    authorName: name.slice(0, 80),
    user: req.user ? req.user._id : null,
    // A shopper cannot mark their own answer as coming from the store.
    isMerchant: false,
    status: policy.qaAutoApprove ? 'approved' : 'pending',
  });
  await q.save();

  res.status(201).json({
    message: policy.qaAutoApprove ? 'Thank you — your answer is live.' : 'Thank you — your answer is with our team.',
  });
}));

/* ---------------------------------------------------------------------------
 * PUBLIC — helpful / report
 * ------------------------------------------------------------------------- */
router.post('/:id/helpful', optionalAuth, asyncHandler(async (req, res) => {
  const policy = await qaPolicy();
  if (!policy.allowHelpful) return res.status(403).json({ message: 'Not available' });
  const key = voterKey(req);
  const q = await Question.findById(req.params.id).select('+helpfulBy');
  if (!q) return res.status(404).json({ message: 'Question not found' });
  const had = (q.helpfulBy || []).includes(key);
  q.helpfulBy = had ? q.helpfulBy.filter((k) => k !== key) : [...q.helpfulBy, key];
  q.helpful = q.helpfulBy.length;
  await q.save();
  res.json({ ok: true, helpful: q.helpful, voted: !had });
}));

router.post('/:id/report', optionalAuth, asyncHandler(async (req, res) => {
  const policy = await qaPolicy();
  if (!policy.allowReport) return res.status(403).json({ message: 'Reporting is switched off' });
  const key = voterKey(req);
  const q = await Question.findById(req.params.id).select('+reportedBy');
  if (!q) return res.status(404).json({ message: 'Question not found' });
  if ((q.reportedBy || []).includes(key)) return res.json({ ok: true, already: true });
  q.reportedBy.push(key);
  q.reports = (q.reports || 0) + 1;
  await q.save();
  res.json({ ok: true, message: 'Thank you — our team will take a look.' });
}));

/* ---------------------------------------------------------------------------
 * ADMIN
 * Registered before the generic /:id handlers so /admin is never captured
 * as a question id — the same ordering trap the reviews route hit.
 * ------------------------------------------------------------------------- */
router.get('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const rows = await Question.find({ status })
    .sort({ createdAt: -1 }).limit(200)
    .populate('product', 'name slug images').lean();
  const [pending, approved, rejected, unanswered] = await Promise.all([
    Question.countDocuments({ status: 'pending' }),
    Question.countDocuments({ status: 'approved' }),
    Question.countDocuments({ status: 'rejected' }),
    Question.countDocuments({ status: 'approved', 'answers.0': { $exists: false } }),
  ]);
  res.json({ questions: rows, counts: { pending, approved, rejected, unanswered } });
}));

router.patch('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const q = await Question.findById(req.params.id);
  if (!q) return res.status(404).json({ message: 'Question not found' });
  const b = req.body || {};
  if (b.status && ['pending', 'approved', 'rejected'].includes(b.status)) q.status = b.status;
  if (b.featured !== undefined) q.featured = !!b.featured;

  /* A merchant reply is an answer flagged as the store's, approved on the
     spot — the merchant is the moderator, so a second approval step would
     only make them approve their own words. */
  if (b.reply) {
    q.answers.push({
      body: String(b.reply).slice(0, 1500),
      authorName: b.replyAs || 'HUSHAE',
      isMerchant: true,
      status: 'approved',
    });
    if (q.status === 'pending') q.status = 'approved';
  }
  if (b.answerId && b.answerStatus) {
    const a = q.answers.id(b.answerId);
    if (a && ['pending', 'approved', 'rejected'].includes(b.answerStatus)) a.status = b.answerStatus;
  }
  await q.save();
  res.json({ question: q });
}));

router.delete('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await Question.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

router.post('/admin/bulk', protect, adminOnly, asyncHandler(async (req, res) => {
  const { ids = [], action } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'No questions selected' });
  if (action === 'delete') {
    const r = await Question.deleteMany({ _id: { $in: ids } });
    return res.json({ ok: true, affected: r.deletedCount });
  }
  const OPS = {
    approve: { status: 'approved' }, reject: { status: 'rejected' },
    feature: { featured: true }, unfeature: { featured: false },
  };
  const op = OPS[action];
  if (!op) return res.status(400).json({ message: 'Unknown action' });
  const r = await Question.updateMany({ _id: { $in: ids } }, { $set: op });
  res.json({ ok: true, affected: r.modifiedCount });
}));

module.exports = router;
