const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();
router.use(protect, adminOnly);

const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

/* =========================================================================
 * CSV EXPORTS
 * ========================================================================= */

// Export Orders (CSV)
router.get('/export/orders', asyncHandler(async (req, res) => {
  const Order = require('../models/Order');
  const query = {};

  const { status, start, end } = req.query || {};
  if (status) query.status = status;
  if (start || end) {
    query.createdAt = {};
    if (start) query.createdAt.$gte = new Date(start);
    if (end) query.createdAt.$lte = new Date(end);
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });

  const headers = ['Order Number', 'Date', 'Customer Name', 'Customer Email', 'Customer Phone', 'City', 'Province', 'Items', 'Subtotal', 'Shipping', 'Discount', 'Tax', 'Total', 'Payment Method', 'Payment Status', 'Fulfillment Status'];
  const rows = [headers.join(',')];

  for (const o of orders) {
    const c = o.customerInfo || {};
    const itemsList = (o.items || []).map(i => `${i.name} (x${i.quantity})`).join('; ');
    const row = [
      escapeCSV(o.orderNumber),
      escapeCSV(o.createdAt ? o.createdAt.toISOString() : ''),
      escapeCSV(c.name),
      escapeCSV(c.email),
      escapeCSV(c.phone),
      escapeCSV(c.city),
      escapeCSV(c.province),
      escapeCSV(itemsList),
      o.subtotal || 0,
      o.shippingCharge || 0,
      o.discount || 0,
      o.tax || 0,
      o.total || 0,
      escapeCSV(o.paymentMethod),
      escapeCSV(o.paymentStatus),
      escapeCSV(o.status)
    ];
    rows.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="orders-export.csv"');
  res.send(rows.join('\r\n'));
}));

// Export Customers (CSV)
router.get('/export/customers', asyncHandler(async (req, res) => {
  const User = require('../models/User');
  const Order = require('../models/Order');

  // Customers are Users with customer role
  const customers = await User.find({ role: 'customer' }).sort({ createdAt: -1 });

  const headers = ['Customer Name', 'Email', 'Phone', 'City', 'Province', 'Total Orders', 'Total Spent', 'Registered At'];
  const rows = [headers.join(',')];

  for (const c of customers) {
    // Get aggregate order stats
    const orders = await Order.find({ 'customerInfo.email': c.email });
    const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    // Get default or first address city/province
    const addr = c.addresses?.find(a => a.isDefault) || c.addresses?.[0] || {};

    const row = [
      escapeCSV(c.name),
      escapeCSV(c.email),
      escapeCSV(c.phone),
      escapeCSV(addr.city || '—'),
      escapeCSV(addr.province || '—'),
      orders.length,
      totalSpent,
      escapeCSV(c.createdAt ? c.createdAt.toISOString() : '')
    ];
    rows.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="customers-export.csv"');
  res.send(rows.join('\r\n'));
}));

// Export Products (CSV)
router.get('/export/products', asyncHandler(async (req, res) => {
  const Product = require('../models/Product');
  const products = await Product.find({}).sort({ createdAt: -1 });

  const headers = ['Product Name', 'Slug', 'SKU', 'Stock', 'Price (PKR)', 'Cost Price (PKR)', 'Tier', 'Status', 'Average Rating', 'Total Reviews'];
  const rows = [headers.join(',')];

  for (const p of products) {
    const row = [
      escapeCSV(p.name),
      escapeCSV(p.slug),
      escapeCSV(p.sku || p._id),
      p.stock || 0,
      p.price || 0,
      p.costPrice || 0,
      escapeCSV(p.tier || 'Standard'),
      escapeCSV(p.status || 'draft'),
      p.ratings?.average || 0,
      p.ratings?.count || 0
    ];
    rows.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="products-export.csv"');
  res.send(rows.join('\r\n'));
}));

// Export Reviews (CSV)
router.get('/export/reviews', asyncHandler(async (req, res) => {
  const Review = require('../models/Review');
  const reviews = await Review.find({}).sort({ createdAt: -1 });

  const headers = ['Customer Name', 'Product Slug', 'Rating', 'Comment', 'Status', 'Created At'];
  const rows = [headers.join(',')];

  for (const r of reviews) {
    const row = [
      escapeCSV(r.userName || r.userEmail || 'Guest'),
      escapeCSV(r.productSlug || '—'),
      r.rating || 0,
      escapeCSV(r.comment || ''),
      escapeCSV(r.status || 'pending'),
      escapeCSV(r.createdAt ? r.createdAt.toISOString() : '')
    ];
    rows.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="reviews-export.csv"');
  res.send(rows.join('\r\n'));
}));

/* =========================================================================
 * JSON BACKUPS & RESTORES
 * ========================================================================= */

router.get('/download', asyncHandler(async (req, res) => {
  const Settings   = require('../models/Settings');
  const Category   = require('../models/Category');
  const Product    = require('../models/Product');
  const User       = require('../models/User');
  const Order      = require('../models/Order');
  const Subscriber = require('../models/Subscriber');
  const Discount   = require('../models/Discount');
  const AuditLog   = require('../models/AuditLog');

  const [settings, categories, products, users, orders, subscribers, discounts, auditLogs] = await Promise.all([
    Settings.findOne({ key: 'store' }).lean(),
    Category.find({}).lean(),
    Product.find({}).lean(),
    User.find({}).select('-password -__v').lean(),
    Order.find({}).lean(),
    Subscriber.find({}).lean(),
    Discount.find({}).lean(),
    AuditLog.find({}).lean()
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
      auditLogs: auditLogs ? auditLogs.length : 0,
    },
    settings,
    categories,
    products,
    users,
    orders,
    subscribers,
    discounts,
    auditLogs
  };

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hushae-backup-${stamp}.json"`);
  res.send(JSON.stringify(backup, null, 2));
}));

router.get('/info', asyncHandler(async (req, res) => {
  const Category   = require('../models/Category');
  const Product    = require('../models/Product');
  const User       = require('../models/User');
  const Order      = require('../models/Order');
  const Subscriber = require('../models/Subscriber');
  const Discount   = require('../models/Discount');
  const AuditLog   = require('../models/AuditLog');

  const [categories, products, users, orders, subscribers, discounts, auditLogs] = await Promise.all([
    Category.countDocuments(),
    Product.countDocuments(),
    User.countDocuments(),
    Order.countDocuments(),
    Subscriber.countDocuments(),
    Discount.countDocuments(),
    AuditLog.countDocuments()
  ]);

  res.json({
    counts: { categories, products, users, orders, subscribers, discounts, auditLogs },
    total: categories + products + users + orders + subscribers + discounts + auditLogs,
    dbHost: 'MongoDB Atlas (Mumbai)',
    atlasBackup: 'Cluster-level snapshots run daily on M0+ tier',
    lastGenerated: new Date().toISOString(),
  });
}));

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
  const AuditLog   = require('../models/AuditLog');

  const results = { restored: {} };

  const restore = async (Model, arr, key) => {
    if (!Array.isArray(arr)) return;
    let n = 0;
    for (const doc of arr) {
      try {
        await Model.findOneAndUpdate({ _id: doc._id }, doc, { upsert: true });
        n += 1;
      } catch { /* skip */ }
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
  await restore(AuditLog,   b.auditLogs,   'auditLogs');
  results.usersSkipped = 'Passwords cannot be restored — admin/customer accounts must reset passwords.';

  res.json({ ok: true, results });
}));

router.get('/snapshots', asyncHandler(async (req, res) => {
  const db = require('mongoose').connection.db;
  const rows = await db.collection('snapshots')
    .find({}, { projection: { data: 0 } })
    .sort({ createdAt: -1 })
    .limit(14)
    .toArray();
  res.json({ snapshots: rows });
}));

router.post('/snapshots/take', asyncHandler(async (req, res) => {
  const { takeSnapshot } = require('../utils/autoBackup');
  const snap = await takeSnapshot(req.body?.reason || 'manual');
  res.json({ ok: true, sizes: snap.sizes, createdAt: snap.createdAt });
}));

router.post('/snapshots/:id/restore', asyncHandler(async (req, res) => {
  const db = require('mongoose').connection.db;
  const { ObjectId } = require('mongodb');
  const snap = await db.collection('snapshots').findOne({ _id: new ObjectId(req.params.id) });
  if (!snap) return res.status(404).json({ message: 'Snapshot not found' });

  try {
    const { takeSnapshot } = require('../utils/autoBackup');
    await takeSnapshot('pre-restore');
  } catch { /* noop */ }

  const results = {};
  for (const [col, docs] of Object.entries(snap.data || {})) {
    if (col === 'users') continue;
    try {
      await db.collection(col).deleteMany({});
      if (docs && docs.length) await db.collection(col).insertMany(docs);
      results[col] = docs?.length || 0;
    } catch (e) {
      results[col] = 'error: ' + e.message;
    }
  }
  res.json({ ok: true, restoredFrom: snap.createdAt, results });
}));

router.delete('/snapshots/:id', asyncHandler(async (req, res) => {
  const db = require('mongoose').connection.db;
  const { ObjectId } = require('mongodb');
  await db.collection('snapshots').deleteOne({ _id: new ObjectId(req.params.id) });
  res.json({ ok: true });
}));

module.exports = router;
