const express = require('express');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect);

router.get('/orders', asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ orders });
}));

router.get('/profile', asyncHandler(async (req, res) => {
  const u = req.user;
  res.json({ user: { id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, addresses: u.addresses } });
}));

router.put('/profile', asyncHandler(async (req, res) => {
  const { name, phone, addresses } = req.body || {};
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  if (Array.isArray(addresses)) req.user.addresses = addresses.slice(0, 5);
  await req.user.save();
  const u = req.user;
  res.json({ user: { id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, addresses: u.addresses } });
}));

module.exports = router;
