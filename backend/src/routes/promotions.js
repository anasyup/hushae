const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly } = require('../middleware/auth');
const Promotion = require('../models/Promotion');
const PromotionUse = require('../models/PromotionUse');
const Product = require('../models/Product');
const E = require('../utils/promotionEngine');

const router = express.Router();

/* ---------------------------------------------------------------------------
 * PUBLIC — what a shopper is allowed to know.
 *
 * Deliberately narrow: no eligibility rules, no usage counts, no budgets. A
 * promotion targeted at named phone numbers must not be discoverable by
 * everyone, and knowing a promotion has 3 uses left invites gaming.
 * ------------------------------------------------------------------------- */
router.get('/active', asyncHandler(async (req, res) => {
  const cfg = await E.marketingConfig();
  if (!cfg.enabled) return res.json({ enabled: false, promotions: [] });

  const now = new Date();
  const rows = await Promotion.find({ enabled: true });
  const live = rows
    .filter((p) => p.liveState(now).live)
    .filter((p) => p.showOnCard !== false || p.showInCart !== false)
    .map((p) => ({
      id: String(p._id),
      label: p.publicLabel || p.name,
      type: p.type,
      badge: p.badge?.show === false ? null : p.badge,
      endsAt: p.endsAt,
      // Only the shape of the offer, never who qualifies for it.
      discountPercent: p.discountPercent || 0,
      showOnCard: p.showOnCard !== false,
      showInCart: p.showInCart !== false,
    }));

  res.json({ enabled: true, promotions: live, flash: cfg.flash, badges: { enabled: cfg.badges.enabled } });
}));

/* ---------------------------------------------------------------------------
 * ADMIN. Registered before any /:id route so "preview" is never read as an id.
 * ------------------------------------------------------------------------- */
router.use(protect, adminOnly);

/** Validation lives here, not in the engine: the engine's job is to honour
 *  what was saved. Refusing bad input at the door is what keeps it honest. */
function validate(body) {
  const errs = [];
  const name = String(body.name || '').trim();
  if (!name) errs.push({ field: 'name', message: 'Give the promotion a name' });
  if (!Promotion.TYPES.includes(body.type)) errs.push({ field: 'type', message: 'Choose a promotion type' });

  const pct = Number(body.discountPercent) || 0;
  const fix = Number(body.discountFixed) || 0;
  if (pct < 0 || pct > 100) errs.push({ field: 'discountPercent', message: 'Percentage must be between 0 and 100' });
  if (fix < 0) errs.push({ field: 'discountFixed', message: 'Amount cannot be negative' });

  const needsReward = ['flash', 'percent', 'fixed'].includes(body.type);
  if (needsReward && pct <= 0 && fix <= 0) {
    errs.push({ field: 'discountPercent', message: 'Set either a percentage or a fixed amount' });
  }

  if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) {
    errs.push({ field: 'endsAt', message: 'The end date must be after the start date' });
  }

  if (body.type === 'bxgy') {
    if ((Number(body.bxgy?.buyQty) || 0) < 1) errs.push({ field: 'bxgy.buyQty', message: 'Buy quantity must be at least 1' });
    if ((Number(body.bxgy?.getQty) || 0) < 1) errs.push({ field: 'bxgy.getQty', message: 'Get quantity must be at least 1' });
  }
  if (body.type === 'bundle') {
    const ids = body.bundle?.productIds || [];
    if (ids.length < 2) errs.push({ field: 'bundle.productIds', message: 'A bundle needs at least two products' });
    // The engine no longer clamps this, so the floor is enforced here where
    // the merchant can actually see the message.
    if (body.bundle?.requireAll === false && (Number(body.bundle?.minItems) || 0) < 1) {
      errs.push({ field: 'bundle.minItems', message: 'Minimum items must be at least 1' });
    }
  }
  if (body.type === 'tiered' && !(body.tiers || []).length) {
    errs.push({ field: 'tiers', message: 'Add at least one spend tier' });
  }
  return errs;
}

/* List, with the real reason each promotion is or is not running. "Disabled"
   and "budget spent" look identical in a bare list and mean very different
   things to a merchant. */
router.get('/', asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.type) where.type = req.query.type;
  if (req.query.enabled === 'true') where.enabled = true;
  if (req.query.enabled === 'false') where.enabled = false;

  const perPage = Math.min(100, parseInt(req.query.limit || '50', 10));
  const page = Math.max(1, parseInt(req.query.page || '1', 10));

  const [rows, total] = await Promise.all([
    Promotion.find(where).sort({ priority: 1, createdAt: -1 }).skip((page - 1) * perPage).limit(perPage),
    Promotion.countDocuments(where),
  ]);

  const now = new Date();
  res.json({
    promotions: rows.map((p) => ({ ...p.toObject(), state: p.liveState(now) })),
    total, page, perPage, hasMore: page * perPage < total,
  });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const p = await Promotion.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  const uses = await PromotionUse.find({ promotion: p._id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ promotion: { ...p.toObject(), state: p.liveState() }, uses });
}));

router.post('/', asyncHandler(async (req, res) => {
  const errs = validate(req.body || {});
  if (errs.length) return res.status(400).json({ message: errs[0].message, errors: errs });

  // Every promotion is created OFF. A rule that goes live the instant it is
  // saved gives the merchant no chance to check it first.
  const p = await Promotion.create({
    ...req.body,
    enabled: false,
    usedCount: 0,
    totalDiscounted: 0,
    createdBy: req.user._id,
  });
  res.status(201).json({ promotion: { ...p.toObject(), state: p.liveState() } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const errs = validate({ ...req.body });
  if (errs.length) return res.status(400).json({ message: errs[0].message, errors: errs });

  const p = await Promotion.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });

  /* Counters are never accepted from the client — they are the record of what
     actually happened, not a field to edit. */
  const { usedCount, totalDiscounted, createdBy, _id, ...safe } = req.body || {};
  Object.assign(p, safe);
  await p.save();
  res.json({ promotion: { ...p.toObject(), state: p.liveState() } });
}));

router.patch('/:id/toggle', asyncHandler(async (req, res) => {
  const p = await Promotion.findById(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  p.enabled = req.body?.enabled !== undefined ? !!req.body.enabled : !p.enabled;
  await p.save();
  res.json({ ok: true, enabled: p.enabled, state: p.liveState() });
}));

/* Bulk enable/disable — a seasonal sale is usually several promotions that
   must start and stop together. */
router.post('/bulk', asyncHandler(async (req, res) => {
  const ids = (req.body?.ids || []).filter((x) => /^[0-9a-fA-F]{24}$/.test(String(x)));
  const action = String(req.body?.action || '');
  if (!ids.length) return res.status(400).json({ message: 'Select at least one promotion' });

  let update = null;
  if (action === 'enable') update = { $set: { enabled: true } };
  else if (action === 'disable') update = { $set: { enabled: false } };
  else if (action === 'delete') {
    const r = await Promotion.deleteMany({ _id: { $in: ids } });
    return res.json({ ok: true, affected: r.deletedCount });
  } else if (action === 'schedule') {
    const { startsAt = null, endsAt = null } = req.body || {};
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      return res.status(400).json({ message: 'The end date must be after the start date' });
    }
    update = { $set: { startsAt: startsAt ? new Date(startsAt) : null, endsAt: endsAt ? new Date(endsAt) : null } };
  } else {
    return res.status(400).json({ message: 'Unknown action' });
  }

  const r = await Promotion.updateMany({ _id: { $in: ids } }, update);
  res.json({ ok: true, affected: r.modifiedCount });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const p = await Promotion.findByIdAndDelete(req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });
  // Usage rows are KEPT. They are the record of money already given away;
  // deleting the rule must not rewrite the accounts.
  res.json({ ok: true });
}));

/* ---------------------------------------------------------------------------
 * PREVIEW — what would this promotion do to a real basket?
 *
 * Writes nothing. A merchant should be able to see the arithmetic before a
 * customer does, including WHY a promotion was rejected.
 * ------------------------------------------------------------------------- */
router.post('/preview', asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 50) : [];
  if (!items.length) return res.status(400).json({ message: 'Add at least one product to preview' });

  const ids = items.map((i) => i.product).filter((x) => /^[0-9a-fA-F]{24}$/.test(String(x)));
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines = [];
  for (const it of items) {
    const p = byId.get(String(it.product));
    if (!p) continue;
    const qty = Math.max(1, Math.min(20, parseInt(it.quantity, 10) || 1));
    lines.push({
      key: `${p._id}:${it.size || ''}:${it.color || ''}`,
      productId: p._id, price: p.price, qty, product: p,
    });
  }
  if (!lines.length) return res.status(400).json({ message: 'None of those products were found' });

  /* An unsaved promotion can be previewed by passing it in the body, so the
     merchant can test a rule BEFORE committing it. */
  let promotions = null;
  if (req.body?.draft) {
    const draft = { ...req.body.draft, _id: req.body.draft._id || '000000000000000000000000', enabled: true };
    promotions = [draft];
  }

  const result = await E.evaluateCart({
    lines,
    ctx: {
      phone: req.body?.phone || '',
      city: req.body?.city || '',
      paymentMethod: req.body?.paymentMethod || '',
      orderCount: Number(req.body?.orderCount) || 0,
      loyaltyTier: req.body?.loyaltyTier || '',
      hasCoupon: !!req.body?.hasCoupon,
    },
    at: req.body?.at ? new Date(req.body.at) : new Date(),
    promotions,
    // Admin-only, writes nothing: let the merchant test rules before the
    // programme is switched on.
    force: true,
  });

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  res.json({
    ...result,
    subtotal,
    payable: Math.max(0, subtotal - result.total),
    effectivePercent: subtotal ? Math.round((result.total / subtotal) * 100) : 0,
    lines: lines.map((l) => ({ name: l.product.name, price: l.price, qty: l.qty, key: l.key })),
  });
}));

/* ---------------------------------------------------------------------------
 * ANALYTICS — what did these rules actually cost, and what did they move?
 * ------------------------------------------------------------------------- */
router.get('/admin/stats', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '30', 10)));
  const since = new Date(Date.now() - days * 86400000);

  const [totals, byPromo, byDay, active] = await Promise.all([
    PromotionUse.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: null, uses: { $sum: 1 }, given: { $sum: '$amount' }, orders: { $addToSet: '$order' } } },
      { $addFields: { orders: { $size: '$orders' } } },
    ]),
    PromotionUse.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$promotion', name: { $last: '$promotionName' }, type: { $last: '$type' }, uses: { $sum: 1 }, given: { $sum: '$amount' } } },
      { $sort: { given: -1 } }, { $limit: 25 },
    ]),
    PromotionUse.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, uses: { $sum: 1 }, given: { $sum: '$amount' } } },
      { $sort: { _id: 1 } },
    ]),
    Promotion.countDocuments({ enabled: true }),
  ]);

  const t = totals[0] || {};
  res.json({
    days,
    uses: t.uses || 0,
    ordersAffected: t.orders || 0,
    totalGiven: t.given || 0,
    avgPerOrder: t.orders ? Math.round((t.given || 0) / t.orders) : 0,
    activePromotions: active,
    byPromotion: byPromo.map((x) => ({
      id: String(x._id), name: x.name, type: x.type, uses: x.uses, given: x.given,
    })),
    daily: byDay.map((x) => ({ date: x._id, uses: x.uses, given: x.given })),
  });
}));

router.get('/admin/export', asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '90', 10)));
  const rows = await PromotionUse.find({ createdAt: { $gte: new Date(Date.now() - days * 86400000) } })
    .sort({ createdAt: -1 }).limit(20000).lean();
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = 'date,promotion,type,orderNumber,phone,amount';
  const body = rows.map((r) => [
    new Date(r.createdAt).toISOString(), r.promotionName, r.type, r.orderNumber, r.phone, r.amount,
  ].map(esc).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="promotions.csv"');
  res.send(`${head}\n${body}`);
}));

module.exports = router;
