const express = require('express');
const crypto = require('crypto');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const LoyaltyAccount = require('../models/LoyaltyAccount');
const LoyaltyLedger = require('../models/LoyaltyLedger');
const GiftCard = require('../models/GiftCard');
const E = require('../utils/loyaltyEngine');

const router = express.Router();

/* ---------------------------------------------------------------------------
 * PUBLIC — what the programme looks like, for anyone.
 * Only presentation values: nothing here reveals another customer's balance.
 * ------------------------------------------------------------------------- */
router.get('/program', asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  res.json({
    enabled: cfg.enabled,
    programName: cfg.programName,
    pointsName: cfg.pointsName,
    pointsNameOne: cfg.pointsNameOne,
    joinText: cfg.joinText,
    dashboardTitle: cfg.dashboardTitle,
    earn: {
      perCurrency: cfg.earn.perCurrency,
      signupPoints: cfg.earn.signupEnabled ? cfg.earn.signupPoints : 0,
      firstOrderPoints: cfg.earn.firstOrderEnabled ? cfg.earn.firstOrderPoints : 0,
      reviewPoints: cfg.earn.reviewEnabled ? cfg.earn.reviewPoints : 0,
      birthdayPoints: cfg.earn.birthdayEnabled ? cfg.earn.birthdayPoints : 0,
    },
    redeem: cfg.redeem,
    tiers: cfg.tiers.enabled ? cfg.tiers : { enabled: false, levels: [] },
    referral: { enabled: cfg.referral.enabled, referrerPoints: cfg.referral.referrerPoints, refereePoints: cfg.referral.refereePoints },
    giftCards: { enabled: cfg.giftCards.enabled, minAmount: cfg.giftCards.minAmount, maxAmount: cfg.giftCards.maxAmount },
    achievements: cfg.achievements.enabled ? cfg.achievements.list : [],
    expiry: cfg.expiry,
  });
}));

/* ---------------------------------------------------------------------------
 * CUSTOMER — my standing
 * ------------------------------------------------------------------------- */
router.get('/me', protect, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  if (!cfg.enabled) return res.json({ enabled: false });

  const acc = await E.getAccount({
    phone: req.user.phone, email: req.user.email, name: req.user.name, user: req.user._id,
  }, cfg);
  if (!acc) {
    // No phone on the account: loyalty is keyed on phone, so say so plainly
    // rather than silently showing a zero balance that can never move.
    return res.json({ enabled: true, needsPhone: true });
  }

  const spend = await E.spendForTier(acc.phone, cfg);
  const tier = E.resolveTier(spend, cfg);

  // Points about to lapse, so the dashboard can warn rather than surprise.
  let expiringSoon = 0;
  if (cfg.expiry.enabled) {
    const soon = new Date(Date.now() + (Number(cfg.expiry.warnDays) || 30) * 86400000);
    const rows = await LoyaltyLedger.aggregate([
      { $match: { account: acc._id, kind: 'points', amount: { $gt: 0 }, expired: false, expiresAt: { $ne: null, $lte: soon } } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$consumed'] } } } },
    ]);
    expiringSoon = Math.max(0, rows[0]?.total || 0);
  }

  /* Badges are evaluated AND granted here. The dashboard is the one place a
     customer reliably visits, so it is the natural moment to settle anything
     they have already earned — rather than a nightly job that may not run. */
  let achievements = { list: [], unlocked: [] };
  try {
    achievements = await E.evaluateAchievements(acc, cfg, { grant: true });
  } catch { /* a badge must never break the dashboard */ }

  // Re-read only if granting changed something, so the balance shown is current.
  const fresh = achievements.unlocked.length
    ? await LoyaltyAccount.findById(acc._id)
    : acc;

  res.json({
    enabled: true,
    programName: cfg.programName,
    pointsName: cfg.pointsName,
    pointsNameOne: cfg.pointsNameOne,
    dashboardTitle: cfg.dashboardTitle,
    joinText: cfg.joinText,
    account: {
      points: fresh.pointsBalance,
      credit: fresh.creditBalance,
      lifetimeEarned: fresh.pointsEarned,
      lifetimeRedeemed: fresh.pointsRedeemed,
      referralCode: fresh.referralCode,
      referralCount: fresh.referralCount,
      badges: fresh.badges,
      birthday: fresh.birthday,
      claimed: fresh.claimed,
      blocked: fresh.blocked,
    },
    tier: { ...tier, spend },
    achievements: achievements.list,
    justUnlocked: achievements.unlocked,
    stats: achievements.stats || null,
    expiringSoon,
    pointValue: cfg.redeem.pointValue,
    redeem: cfg.redeem,
    referral: cfg.referral.enabled
      ? { enabled: true, referrerPoints: cfg.referral.referrerPoints, refereePoints: cfg.referral.refereePoints, minOrderValue: cfg.referral.minOrderValue }
      : { enabled: false },
    giftCards: { enabled: cfg.giftCards.enabled },
    credit: cfg.credit,
    expiry: cfg.expiry,
    earn: {
      perCurrency: cfg.earn.perCurrency,
      signupPoints: cfg.earn.signupEnabled ? cfg.earn.signupPoints : 0,
      firstOrderPoints: cfg.earn.firstOrderEnabled ? cfg.earn.firstOrderPoints : 0,
      reviewPoints: cfg.earn.reviewEnabled ? cfg.earn.reviewPoints : 0,
      birthdayPoints: cfg.earn.birthdayEnabled ? cfg.earn.birthdayPoints : 0,
      newsletterPoints: cfg.earn.newsletterEnabled ? cfg.earn.newsletterPoints : 0,
      profilePoints: cfg.earn.profileEnabled ? cfg.earn.profilePoints : 0,
    },
    tiers: cfg.tiers.enabled ? cfg.tiers : { enabled: false, levels: [] },
  });
}));

/* ---------------------------------------------------------------------------
 * REFERRAL — my own dashboard
 * Shows who I brought in and what I was paid, without leaking their details.
 * ------------------------------------------------------------------------- */
router.get('/me/referrals', protect, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  if (!cfg.enabled || !cfg.referral.enabled) return res.json({ enabled: false });

  const acc = await E.getAccount({ phone: req.user.phone, user: req.user._id }, cfg);
  if (!acc) return res.json({ enabled: true, needsPhone: true });

  const [joined, payouts] = await Promise.all([
    LoyaltyAccount.find({ referredBy: acc.referralCode })
      .select('name createdAt').sort({ createdAt: -1 }).limit(50).lean(),
    LoyaltyLedger.find({ account: acc._id, reason: 'referral' })
      .select('amount note createdAt').sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  const paidTotal = payouts.reduce((s, r) => s + (r.amount || 0), 0);

  res.json({
    enabled: true,
    code: acc.referralCode,
    referrerPoints: cfg.referral.referrerPoints,
    refereePoints: cfg.referral.refereePoints,
    minOrderValue: cfg.referral.minOrderValue,
    payOnStatus: cfg.referral.payOnStatus,
    joinedCount: joined.length,
    paidCount: payouts.length,
    paidTotal,
    // First name only. My friend's identity is not mine to publish.
    joined: joined.map((j) => ({
      name: (j.name || '').split(' ')[0] || 'A friend',
      at: j.createdAt,
    })),
    payouts,
  });
}));

/* Points statement, paginated — a balance nobody can explain is not trusted. */
router.get('/me/history', protect, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  const acc = await E.getAccount({ phone: req.user.phone, user: req.user._id }, cfg);
  if (!acc) return res.json({ rows: [], total: 0 });

  const perPage = Math.min(50, parseInt(req.query.limit || '15', 10));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const where = { account: acc._id };
  if (['points', 'credit'].includes(req.query.kind)) where.kind = req.query.kind;

  const [rows, total] = await Promise.all([
    LoyaltyLedger.find(where).sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage)
      .select('kind amount reason note orderNumber createdAt expiresAt expired balanceAfter').lean(),
    LoyaltyLedger.countDocuments(where),
  ]);
  res.json({ rows, total, page, perPage, hasMore: page * perPage < total });
}));

/* Save a birthday. Locked after it is set — a movable birthday is an annual
   points tap, which is the classic abuse of this feature. */
router.put('/me/birthday', protect, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  const acc = await E.getAccount({ phone: req.user.phone, user: req.user._id }, cfg);
  if (!acc) return res.status(400).json({ message: 'Add a mobile number to your profile first' });
  if (acc.birthday) return res.status(400).json({ message: 'Your birthday is already saved. Contact us to change it.' });

  const d = new Date(req.body?.birthday);
  if (Number.isNaN(d.getTime())) return res.status(400).json({ field: 'birthday', message: 'Please enter a valid date' });
  const age = (Date.now() - d.getTime()) / (365.25 * 86400000);
  if (age < 13 || age > 110) return res.status(400).json({ field: 'birthday', message: 'Please enter a valid date of birth' });

  acc.birthday = d;
  await acc.save();
  res.json({ ok: true, birthday: acc.birthday });
}));

/* ---------------------------------------------------------------------------
 * CHECKOUT — how much can this customer take off, right now?
 * The client asks; the server answers. It never accepts a value.
 * ------------------------------------------------------------------------- */
router.post('/quote', protect, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  if (!cfg.enabled) return res.json({ enabled: false });

  const acc = await E.getAccount({ phone: req.user.phone, user: req.user._id }, cfg);
  if (!acc) return res.json({ enabled: true, points: 0, credit: 0 });

  const subtotal = Math.max(0, Number(req.body?.subtotal) || 0);
  const q = E.maxRedeemable(acc.pointsBalance, subtotal, cfg);
  const creditUsable = cfg.credit.enabled && cfg.credit.allowAtCheckout
    ? Math.min(acc.creditBalance, subtotal)
    : 0;

  res.json({
    enabled: true,
    balance: acc.pointsBalance,
    credit: acc.creditBalance,
    maxPoints: q.points,
    maxPointsValue: q.value,
    pointValue: cfg.redeem.pointValue,
    step: cfg.redeem.step,
    minPoints: cfg.redeem.minPoints,
    creditUsable,
    reason: q.reason || null,
  });
}));

/* ---------------------------------------------------------------------------
 * REFERRAL
 * ------------------------------------------------------------------------- */
router.get('/referral/:code', asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  if (!cfg.enabled || !cfg.referral.enabled) return res.status(404).json({ message: 'Not found' });
  const acc = await LoyaltyAccount.findOne({ referralCode: String(req.params.code).toUpperCase() }).lean();
  if (!acc) return res.status(404).json({ valid: false, message: 'That referral code is not recognised' });
  // Only the first name — a referral link must not leak the referrer's identity.
  res.json({ valid: true, referrerName: (acc.name || '').split(' ')[0] || 'A friend', refereePoints: cfg.referral.refereePoints });
}));

/* ---------------------------------------------------------------------------
 * GIFT CARDS
 * ------------------------------------------------------------------------- */
const gcHash = (code) => crypto.createHash('sha256').update(String(code).trim().toUpperCase()).digest('hex');
const gcLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 12, key: 'giftcard', message: 'Too many attempts — try again shortly' });

router.post('/gift-card/check', gcLimit, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  if (!cfg.enabled || !cfg.giftCards.enabled) return res.status(403).json({ message: 'Gift cards are not available' });

  const code = String(req.body?.code || '').trim();
  if (!code) return res.status(400).json({ field: 'code', message: 'Please enter the card code' });

  const card = await GiftCard.findOne({ codeHash: gcHash(code) });
  // One message for every failure. Distinguishing "not found" from "expired"
  // turns this endpoint into a way to discover which codes exist.
  const bad = { valid: false, message: 'That gift card is not valid or has no balance left' };
  if (!card || !card.active || card.balance <= 0) return res.status(404).json(bad);
  if (card.expiresAt && card.expiresAt < new Date()) return res.status(404).json(bad);

  res.json({ valid: true, balance: card.balance, last4: card.last4, expiresAt: card.expiresAt });
}));

/* ---------------------------------------------------------------------------
 * ADMIN — registered before any /:id route so "admin" is never read as an id.
 * ------------------------------------------------------------------------- */
router.get('/admin/stats', protect, adminOnly, asyncHandler(async (req, res) => {
  const [accounts, totals, tiers, recent, cards] = await Promise.all([
    LoyaltyAccount.countDocuments({}),
    LoyaltyAccount.aggregate([{ $group: {
      _id: null,
      points: { $sum: '$pointsBalance' },
      credit: { $sum: '$creditBalance' },
      earned: { $sum: '$pointsEarned' },
      redeemed: { $sum: '$pointsRedeemed' },
    } }]),
    LoyaltyAccount.aggregate([{ $group: { _id: '$tier', n: { $sum: 1 } } }]),
    LoyaltyLedger.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }),
    GiftCard.aggregate([{ $match: { active: true } }, { $group: { _id: null, n: { $sum: 1 }, outstanding: { $sum: '$balance' } } }]),
  ]);
  const byTier = {}; tiers.forEach((t) => { byTier[t._id || 'none'] = t.n; });
  res.json({
    accounts,
    points: totals[0]?.points || 0,
    credit: totals[0]?.credit || 0,
    lifetimeEarned: totals[0]?.earned || 0,
    lifetimeRedeemed: totals[0]?.redeemed || 0,
    byTier,
    movements30d: recent,
    giftCards: { active: cards[0]?.n || 0, outstanding: cards[0]?.outstanding || 0 },
  });
}));

/* Customer list, searchable and paginated — 34 members today, but this must
   still work at 34,000. */
router.get('/admin/accounts', protect, adminOnly, asyncHandler(async (req, res) => {
  const perPage = Math.min(100, parseInt(req.query.limit || '25', 10));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const q = String(req.query.q || '').trim();

  const where = {};
  if (q) {
    const rx = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    where.$or = [
      { phone: { $regex: rx, $options: 'i' } },
      { email: { $regex: rx, $options: 'i' } },
      { name: { $regex: rx, $options: 'i' } },
      { referralCode: { $regex: rx, $options: 'i' } },
    ];
  }
  if (req.query.tier) where.tier = req.query.tier;

  const SORTS = { points: { pointsBalance: -1 }, spend: { tierSpend: -1 }, recent: { updatedAt: -1 } };
  const sort = SORTS[req.query.sort] || SORTS.points;

  const [rows, total] = await Promise.all([
    LoyaltyAccount.find(where).sort(sort).skip((page - 1) * perPage).limit(perPage).lean(),
    LoyaltyAccount.countDocuments(where),
  ]);
  res.json({ accounts: rows, total, page, perPage, hasMore: page * perPage < total });
}));

router.get('/admin/accounts/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const acc = await LoyaltyAccount.findById(req.params.id).lean();
  if (!acc) return res.status(404).json({ message: 'Not found' });
  const rows = await LoyaltyLedger.find({ account: acc._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.json({ account: acc, ledger: rows });
}));

/* Manual adjustment. Always attributed, always reversible by another row. */
router.post('/admin/accounts/:id/adjust', protect, adminOnly, asyncHandler(async (req, res) => {
  const acc = await LoyaltyAccount.findById(req.params.id);
  if (!acc) return res.status(404).json({ message: 'Not found' });

  const amount = Math.round(Number(req.body?.amount) || 0);
  const kind = req.body?.kind === 'credit' ? 'credit' : 'points';
  if (!amount) return res.status(400).json({ field: 'amount', message: 'Enter an amount other than zero' });
  const note = String(req.body?.note || '').trim().slice(0, 200);
  if (!note) return res.status(400).json({ field: 'note', message: 'Please say why — this is recorded permanently' });

  const r = await E.award({
    phone: acc.phone, kind, amount, reason: 'manual', note,
    actor: req.user.name || 'admin', actorId: req.user._id,
    skipLimits: true,      // the merchant's own hand is not abuse
  });
  if (!r.ok) return res.status(400).json({ message: `Could not adjust: ${r.reason}` });
  res.json({ ok: true, balance: r.balance });
}));

router.post('/admin/accounts/:id/block', protect, adminOnly, asyncHandler(async (req, res) => {
  const acc = await LoyaltyAccount.findByIdAndUpdate(
    req.params.id,
    { $set: { blocked: !!req.body?.blocked, blockedReason: String(req.body?.reason || '').slice(0, 200) } },
    { new: true },
  );
  if (!acc) return res.status(404).json({ message: 'Not found' });
  res.json({ ok: true, blocked: acc.blocked });
}));

/* ---- Gift cards (admin) ---- */
router.get('/admin/gift-cards', protect, adminOnly, asyncHandler(async (req, res) => {
  const rows = await GiftCard.find({}).sort({ createdAt: -1 }).limit(200)
    .select('-codeHash -redemptions').lean();
  res.json({ cards: rows });
}));

router.post('/admin/gift-cards', protect, adminOnly, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  if (!cfg.giftCards.enabled) return res.status(403).json({ message: 'Gift cards are switched off' });

  const amount = Math.round(Number(req.body?.amount) || 0);
  if (amount < cfg.giftCards.minAmount || amount > cfg.giftCards.maxAmount) {
    return res.status(400).json({ field: 'amount', message: `Amount must be between ${cfg.giftCards.minAmount} and ${cfg.giftCards.maxAmount}` });
  }

  const raw = `${cfg.giftCards.codePrefix || 'HUSGC'}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const months = Number(cfg.giftCards.expiryMonths) || 0;
  const card = await GiftCard.create({
    codeHash: gcHash(raw),
    last4: raw.slice(-4),
    label: String(req.body?.label || '').slice(0, 80),
    initialAmount: amount,
    balance: amount,
    issuedTo: String(req.body?.issuedTo || '').slice(0, 120),
    issuedToName: String(req.body?.issuedToName || '').slice(0, 80),
    issuedBy: req.user._id,
    expiresAt: months ? new Date(Date.now() + months * 30 * 86400000) : null,
  });

  /* The full code is returned exactly once. It is stored hashed, so if the
     merchant loses it here it cannot be recovered — only reissued. */
  res.status(201).json({ card: { id: card._id, last4: card.last4, balance: card.balance }, code: raw });
}));

router.patch('/admin/gift-cards/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const card = await GiftCard.findById(req.params.id);
  if (!card) return res.status(404).json({ message: 'Not found' });
  if (req.body?.active !== undefined) card.active = !!req.body.active;
  if (req.body?.label !== undefined) card.label = String(req.body.label).slice(0, 80);
  await card.save();
  res.json({ ok: true, card: { id: card._id, active: card.active, label: card.label } });
}));

/* Export the whole ledger as CSV, so the merchant's accountant is never
   locked out of their own data. */
router.get('/admin/export', protect, adminOnly, asyncHandler(async (req, res) => {
  const rows = await LoyaltyLedger.find({}).sort({ createdAt: -1 }).limit(10000).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = 'date,phone,kind,amount,reason,note,orderNumber,actor,balanceAfter';
  const body = rows.map((r) => [
    new Date(r.createdAt).toISOString(), r.phone, r.kind, r.amount,
    r.reason, r.note, r.orderNumber, r.actor, r.balanceAfter,
  ].map(esc).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="loyalty-ledger.csv"');
  res.send(`${head}\n${body}`);
}));

/* Run the expiry sweep by hand.
   A serverless app has no reliable long-running cron, and /loyalty/me only
   settles the customer looking at it. This gives the merchant a button, and
   the response says plainly what it did. */
router.post('/admin/expire', protect, adminOnly, asyncHandler(async (req, res) => {
  const r = await E.expireDuePoints({ limit: 1000 });
  res.json(r);
}));

/* Dry-run backfill: what WOULD historical orders be worth? Writes nothing.
   The merchant sees the numbers before anything touches the database. */
router.get('/admin/backfill/preview', protect, adminOnly, asyncHandler(async (req, res) => {
  const cfg = await E.loyaltyConfig();
  const Order = require('../models/Order');
  const orders = await Order.find({ status: 'Delivered' }).select('customerInfo subtotal discount shippingCharge total orderNumber').lean();

  const byPhone = {};
  for (const o of orders) {
    const key = E.phoneKey(o.customerInfo?.phone);
    if (!key) continue;
    const pts = E.pointsForOrder(o, cfg, 1);
    if (!byPhone[key]) byPhone[key] = { phone: key, name: o.customerInfo?.name || '', orders: 0, spend: 0, points: 0 };
    byPhone[key].orders += 1;
    byPhone[key].spend += Number(o.total) || 0;
    byPhone[key].points += pts;
  }
  const list = Object.values(byPhone).sort((a, b) => b.points - a.points);
  res.json({
    customers: list.length,
    ordersConsidered: orders.length,
    totalPoints: list.reduce((s, c) => s + c.points, 0),
    preview: list.slice(0, 50),
  });
}));

module.exports = router;
