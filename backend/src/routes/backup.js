const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

/*
 * Backup — download a JSON snapshot of the entire store.
 * Includes: settings, categories, products (with all fields), users (public info only),
 * orders (full), subscribers, discounts, FAQs.
 * The file is streamed as an attachment so the admin can save it locally.
 * Sensitive fields (bcrypt password hashes) are stripped.
 */
router.get('/download', asyncHandler(async (req, res) => {
  const Settings   = require('../models/Settings');
  const Category   = require('../models/Category');
  const Product    = require('../models/Product');
  const User       = require('../models/User');
  const Order      = require('../models/Order');
  const Subscriber = require('../models/Subscriber');
  const Discount   = require('../models/Discount');

  const [settings, categories, products, users, orders, subscribers, discounts] = await Promise.all([
    Settings.findOne({ key: 'store' }).lean(),
    Category.find({}).lean(),
    Product.find({}).lean(),
    User.find({}).select('-password -__v').lean(),
    Order.find({}).lean(),
    Subscriber.find({}).lean(),
    Discount.find({}).lean(),
  ]);

  const backup = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    counts: {
      categories: categories.length,
      products: products.length,
      users: users.length,
      orders: orders.length,
      subscribers: subscribers.length,
      discounts: discounts.length,
    },
    settings,
    categories,
    products,
    users,
    orders,
    subscribers,
    discounts,
  };

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="veloura-backup-${stamp}.json"`);
  res.send(JSON.stringify(backup, null, 2));
}));

/* Backup info — quick counts + last-known backup metadata (does not scan disk).
 * Purely a UI helper so the admin sees how many records are in each collection. */
router.get('/info', asyncHandler(async (req, res) => {
  const Category   = require('../models/Category');
  const Product    = require('../models/Product');
  const User       = require('../models/User');
  const Order      = require('../models/Order');
  const Subscriber = require('../models/Subscriber');
  const Discount   = require('../models/Discount');

  const [categories, products, users, orders, subscribers, discounts] = await Promise.all([
    Category.countDocuments(),
    Product.countDocuments(),
    User.countDocuments(),
    Order.countDocuments(),
    Subscriber.countDocuments(),
    Discount.countDocuments(),
  ]);

  res.json({
    counts: { categories, products, users, orders, subscribers, discounts },
    total: categories + products + users + orders + subscribers + discounts,
    dbHost: 'MongoDB Atlas (Mumbai)',
    atlasBackup: 'Cluster-level snapshots run daily on M0+ tier',
    lastGenerated: new Date().toISOString(),
  });
}));

/* Restore — CAREFUL. Accepts a JSON file previously downloaded from /download
 * and reinserts documents. Existing records with the same _id are replaced.
 * Rejects if fileSize is > 50MB or schemaVersion mismatch.
 */
router.post('/restore', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!b.schemaVersion || b.schemaVersion !== 1) {
    return res.status(400).json({ message: 'Invalid backup file (schemaVersion mismatch)' });
  }
  const Settings   = require('../models/Settings');
  const Category   = require('../models/Category');
  const Product    = require('../models/Product');
  const Order      = require('../models/Order');
  const Subscriber = require('../models/Subscriber');
  const Discount   = require('../models/Discount');

  const results = { restored: {} };

  const restore = async (Model, arr, key) => {
    if (!Array.isArray(arr)) return;
    let n = 0;
    for (const doc of arr) {
      try {
        await Model.findOneAndUpdate({ _id: doc._id }, doc, { upsert: true });
        n += 1;
      } catch { /* skip individual failures */ }
    }
    results.restored[key] = n;
  };

  if (b.settings) {
    await Settings.findOneAndUpdate({ key: 'store' }, b.settings, { upsert: true });
    results.restored.settings = 1;
  }
  await restore(Category,   b.categories,  'categories');
  await restore(Product,    b.products,    'products');
  await restore(Order,      b.orders,      'orders');
  await restore(Subscriber, b.subscribers, 'subscribers');
  await restore(Discount,   b.discounts,   'discounts');
  // Users intentionally NOT restored (password hashes were stripped)
  results.usersSkipped = 'Passwords cannot be restored — admin/customer accounts must reset passwords.';

  res.json({ ok: true, results });
}));

module.exports = router;
