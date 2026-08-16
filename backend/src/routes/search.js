const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

const esc = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ============================================================================
 * Global admin search — ⌘K. Returns REAL entities, grouped, capped at 5 each.
 * Nothing fabricated: results come straight from the live collections.
 * ========================================================================== */
router.get('/', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (q.length < 2) return res.json({ products: [], orders: [], customers: [] });
  const rx = new RegExp(esc(q), 'i');

  const [products, orders, customers] = await Promise.all([
    Product.find({ $or: [{ name: rx }, { sku: rx }, { slug: rx }] })
      .select('name sku slug images stock price isActive')
      .limit(5).lean(),
    Order.find({
      $or: [
        { orderNumber: rx },
        { 'customerInfo.name': rx },
        { 'customerInfo.phone': rx },
        { 'customerInfo.city': rx },
      ],
    })
      .select('orderNumber customerInfo.name customerInfo.city total status createdAt')
      .sort({ createdAt: -1 })
      .limit(5).lean(),
    User.find({ role: 'customer', $or: [{ name: rx }, { email: rx }, { phone: rx }] })
      .select('name email phone isActive')
      .limit(5).lean(),
  ]);

  res.json({ products, orders, customers });
}));

module.exports = router;
