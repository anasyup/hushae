const express = require('express');
const Discount = require('../models/Discount');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, evaluateDiscount } = require('../utils/helpers');

const router = express.Router();

// ---- Public: validate a code for a given subtotal ----
router.post('/validate', asyncHandler(async (req, res) => {
  const code = String((req.body && req.body.code) || '').trim().toUpperCase();
  const subtotal = Math.max(0, parseInt((req.body && req.body.subtotal) || '0', 10));
  if (!code) return res.status(400).json({ message: 'Please enter a code' });
  const discount = await Discount.findOne({ code });
  const r = evaluateDiscount(discount, subtotal);
  if (!r.ok) return res.status(400).json({ message: r.message });
  res.json({ code: discount.code, type: discount.type, value: discount.value, discount: r.amount });
}));

// ---- Admin CRUD ----
router.use(protect, adminOnly);

router.get('/', asyncHandler(async (req, res) => {
  const discounts = await Discount.find().sort({ createdAt: -1 });
  res.json({ discounts });
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
    minSubtotal: Math.max(0, Number(b.minSubtotal) || 0),
    maxUses: Math.max(0, Number(b.maxUses) || 0),
    active: b.active !== false,
    expiresAt: b.expiresAt || null,
  });
  res.status(201).json({ discount });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const d = await Discount.findById(req.params.id);
  if (!d) return res.status(404).json({ message: 'Discount not found' });
  const b = req.body || {};
  if (b.code !== undefined) d.code = String(b.code).trim().toUpperCase();
  if (b.type !== undefined) d.type = b.type === 'fixed' ? 'fixed' : 'percent';
  if (b.value !== undefined) d.value = Math.max(0, Number(b.value) || 0);
  if (b.minSubtotal !== undefined) d.minSubtotal = Math.max(0, Number(b.minSubtotal) || 0);
  if (b.maxUses !== undefined) d.maxUses = Math.max(0, Number(b.maxUses) || 0);
  if (b.active !== undefined) d.active = !!b.active;
  if (b.expiresAt !== undefined) d.expiresAt = b.expiresAt || null;
  await d.save();
  res.json({ discount: d });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await Discount.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
