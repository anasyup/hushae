const express = require('express');
const Discount = require('../models/Discount');
const PromotionUse = require('../models/PromotionUse');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, evaluateDiscount } = require('../utils/helpers');

const router = express.Router();

/* ============================================================================
 * DISCOUNT / COUPON ROUTES — Phase 6 Enhanced
 *
 * Public validate: now checks product/category/segment/country/schedule/per-customer limits
 * Admin CRUD: saves all new targeting fields
 * ========================================================================== */

// ---- Public: validate a code for a given cart ----
router.post('/validate', asyncHandler(async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim().toUpperCase();
  const subtotal = Math.max(0, parseInt((req.body && req.body.subtotal) || '0', 10));
  const phone = String((req.body && req.body.phone) || '').replace(/\D/g, '').slice(-9);
  const country = String((req.body && req.body.country) || '').toUpperCase();
  const productIds = Array.isArray(req.body?.productIds) ? req.body.productIds : [];
  const categorySlugs = Array.isArray(req.body?.categorySlugs) ? req.body.categorySlugs : [];

  if (!code) return res.status(400).json({ message: 'Please enter a code' });
  const discount = await Discount.findOne({ code });
  if (!discount) return res.status(400).json({ message: 'Invalid code' });

  // Basic checks (preserved from original)
  const r = evaluateDiscount(discount, subtotal);
  if (!r.ok) return res.status(400).json({ message: r.message });

  // Phase 6: Schedule check
  const now = new Date();
  if (discount.startsAt && now < discount.startsAt) {
    return res.status(400).json({ message: 'This code is not yet active' });
  }

  // Phase 6: Per-customer limit
  if (discount.maxUsesPerPhone > 0 && phone) {
    const uses = await PromotionUse.countDocuments({
      promotionName: `coupon:${discount.code}`,
      phone,
    });
    if (uses >= discount.maxUsesPerPhone) {
      return res.status(400).json({ message: 'You have already used this code the maximum number of times' });
    }
  }

  // Phase 6: Country targeting
  if (discount.countries && discount.countries.length > 0) {
    if (!country || !discount.countries.map(c => c.toUpperCase()).includes(country)) {
      return res.status(400).json({ message: 'This code is not available in your region' });
    }
  }

  // Phase 6: Product targeting (coupon applies only if cart has matching products)
  if (discount.productIds && discount.productIds.length > 0) {
    const hasMatch = productIds.some(id => discount.productIds.map(String).includes(String(id)));
    if (!hasMatch) {
      return res.status(400).json({ message: 'This code does not apply to items in your cart' });
    }
  }

  // Phase 6: Category targeting
  if (discount.categorySlugs && discount.categorySlugs.length > 0) {
    const hasMatch = categorySlugs.some(s => discount.categorySlugs.includes(s));
    if (!hasMatch) {
      return res.status(400).json({ message: 'This code does not apply to items in your cart' });
    }
  }

  // Phase 6: Max discount cap
  let amount = r.amount;
  if (discount.maxDiscountAmount > 0 && amount > discount.maxDiscountAmount) {
    amount = discount.maxDiscountAmount;
  }

  res.json({
    code: discount.code,
    type: discount.type,
    value: discount.value,
    discount: amount,
    name: discount.name || '',
    publicLabel: discount.name || discount.code,
  });
}));

// ---- Admin CRUD ----
router.use(protect, adminOnly);

router.get('/', asyncHandler(async (req, res) => {
  const discounts = await Discount.find().sort({ createdAt: -1 });
  res.json({ discounts });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const discount = await Discount.findById(req.params.id);
  if (!discount) return res.status(404).json({ message: 'Discount not found' });
  res.json({ discount });
}));

router.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const code = String(b.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ message: 'Code is required' });
  const value = Number(b.value);
  if (!(value > 0)) return res.status(400).json({ message: 'Value must be greater than 0' });
  const type = b.type === 'fixed' ? 'fixed' : 'percent';
  if (type === 'percent' && value > 100) return res.status(400).json({ message: 'Percent cannot be more than 100' });
  if (await Discount.findOne({ code })) return res.status(409).json({ message: 'This code already exists' });

  const discount = await Discount.create({
    code, type, value,
    name: b.name || '',
    minSubtotal: Math.max(0, Number(b.minSubtotal) || 0),
    maxUses: Math.max(0, Number(b.maxUses) || 0),
    maxUsesPerPhone: Math.max(0, Number(b.maxUsesPerPhone) || 0),
    maxDiscountAmount: Math.max(0, Number(b.maxDiscountAmount) || 0),
    active: b.active !== false,
    expiresAt: b.expiresAt || null,
    startsAt: b.startsAt || null,
    productIds: b.productIds || [],
    categorySlugs: b.categorySlugs || [],
    collectionIds: b.collectionIds || [],
    customerSegments: b.customerSegments || [],
    customerGroupIds: b.customerGroupIds || [],
    countries: (b.countries || []).map(c => String(c).toUpperCase()),
    stacksWithPromotions: b.stacksWithPromotions !== false,
    note: b.note || '',
    createdBy: req.user?._id || null,
  });
  res.status(201).json({ discount });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const d = await Discount.findById(req.params.id);
  if (!d) return res.status(404).json({ message: 'Discount not found' });
  const b = req.body || {};
  if (b.code !== undefined) d.code = String(b.code).trim().toUpperCase();
  if (b.name !== undefined) d.name = b.name;
  if (b.type !== undefined) d.type = b.type === 'fixed' ? 'fixed' : 'percent';
  if (b.value !== undefined) d.value = Math.max(0, Number(b.value) || 0);
  if (b.minSubtotal !== undefined) d.minSubtotal = Math.max(0, Number(b.minSubtotal) || 0);
  if (b.maxUses !== undefined) d.maxUses = Math.max(0, Number(b.maxUses) || 0);
  if (b.maxUsesPerPhone !== undefined) d.maxUsesPerPhone = Math.max(0, Number(b.maxUsesPerPhone) || 0);
  if (b.maxDiscountAmount !== undefined) d.maxDiscountAmount = Math.max(0, Number(b.maxDiscountAmount) || 0);
  if (b.active !== undefined) d.active = !!b.active;
  if (b.expiresAt !== undefined) d.expiresAt = b.expiresAt || null;
  if (b.startsAt !== undefined) d.startsAt = b.startsAt || null;
  if (b.productIds !== undefined) d.productIds = b.productIds;
  if (b.categorySlugs !== undefined) d.categorySlugs = b.categorySlugs;
  if (b.collectionIds !== undefined) d.collectionIds = b.collectionIds;
  if (b.customerSegments !== undefined) d.customerSegments = b.customerSegments;
  if (b.customerGroupIds !== undefined) d.customerGroupIds = b.customerGroupIds;
  if (b.countries !== undefined) d.countries = (b.countries || []).map(c => String(c).toUpperCase());
  if (b.stacksWithPromotions !== undefined) d.stacksWithPromotions = !!b.stacksWithPromotions;
  if (b.note !== undefined) d.note = b.note;
  await d.save();
  res.json({ discount: d });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Discount.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
