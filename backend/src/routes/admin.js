const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [statusAgg, revenueAgg, totalProducts, lowStock, totalCustomers, recentOrders, bestAgg] = await Promise.all([
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Product.countDocuments({ isActive: true }),
    Product.find({ isActive: true, stock: { $lte: 5 } }).sort({ stock: 1 }).limit(10)
      .select('name slug sku stock tier images'),
    User.countDocuments({ role: 'customer' }),
    Order.find().sort({ createdAt: -1 }).limit(6)
      .select('orderNumber customerInfo.name customerInfo.city total status paymentMethod createdAt'),
    Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { qty: -1 } },
      { $limit: 5 },
    ]),
  ]);

  const byStatus = Object.fromEntries(statusAgg.map((s) => [s._id, s.count]));
  const totalOrders = statusAgg.reduce((n, s) => n + s.count, 0);

  res.json({
    stats: {
      totalOrders,
      pending: byStatus['Pending'] || 0,
      processing: (byStatus['Processing'] || 0) + (byStatus['Confirmed'] || 0),
      readyToShip: byStatus['Ready to Ship'] || 0,
      delivered: byStatus['Delivered'] || 0,
      revenue: revenueAgg[0]?.total || 0,
      totalProducts,
      lowStockCount: lowStock.length,
      totalCustomers,
    },
    lowStock,
    recentOrders,
    bestSellers: bestAgg.map((b) => ({ name: b._id, qty: b.qty, revenue: b.revenue })),
  });
}));

// Customers list with order counts
router.get('/customers', asyncHandler(async (req, res) => {
  const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(500)
    .select('name email phone createdAt isActive');
  const orderCounts = await Order.aggregate([
    { $match: { customer: { $ne: null } } },
    { $group: { _id: '$customer', orders: { $sum: 1 }, spent: { $sum: '$total' } } },
  ]);
  const map = Object.fromEntries(orderCounts.map((o) => [String(o._id), o]));
  res.json({
    customers: customers.map((c) => ({
      id: c._id, name: c.name, email: c.email, phone: c.phone, createdAt: c.createdAt,
      orders: map[String(c._id)]?.orders || 0, spent: map[String(c._id)]?.spent || 0,
    })),
  });
}));

module.exports = router;
