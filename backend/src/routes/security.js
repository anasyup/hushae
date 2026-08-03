const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { protect, adminOnly, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { logAction } = require('../utils/auditLogger');

const router = express.Router();

router.use(protect, adminOnly);

/** =========================================================================
 * AUDIT LOGS
 * ========================================================================= */
router.get('/audit-logs', requirePermission('security'), asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const q = String(req.query.q || '').trim();

  const query = {};
  if (q) {
    const rx = new RegExp(q, 'i');
    query.$or = [
      { user: rx },
      { action: rx },
      { target: rx },
      { targetId: rx }
    ];
  }

  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await AuditLog.countDocuments(query);

  res.json({ logs, total, page, limit, hasMore: page * limit < total });
}));

/** =========================================================================
 * USER MANAGEMENT (ROLES)
 * ========================================================================= */
router.get('/users', requirePermission('security'), asyncHandler(async (req, res) => {
  const users = await User.find({ role: { $ne: 'customer' } }).select('-password');
  res.json({ users });
}));

router.post('/users', requirePermission('security'), asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields (name, email, password, role) are required.' });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const exists = await User.findOne({ email: emailNorm });
  if (exists) return res.status(400).json({ message: 'User with this email already exists.' });

  const user = await User.create({
    name: name.trim(),
    email: emailNorm,
    password, // will be hashed in pre-save hook
    role,
    isActive: true,
  });

  await logAction(req.user?.email, 'create', 'user', user._id, null, { name: user.name, email: user.email, role: user.role });

  res.status(201).json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
}));

router.put('/users/:id', requirePermission('security'), asyncHandler(async (req, res) => {
  const { role, isActive, password } = req.body || {};
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (String(user._id) === String(req.user._id) && isActive === false) {
    return res.status(400).json({ message: 'You cannot deactivate your own user account.' });
  }

  const oldState = { role: user.role, isActive: user.isActive };

  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password && String(password).trim()) {
    user.password = String(password).trim(); // hashed in pre-save
  }

  if (isActive === false) {
    // Invalidate active sessions
    user.sessions = [];
  }

  await user.save();

  await logAction(req.user?.email, 'update', 'user', user._id, oldState, { role: user.role, isActive: user.isActive });

  res.json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
}));

router.delete('/users/:id', requirePermission('security'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });

  if (String(user._id) === String(req.user._id)) {
    return res.status(400).json({ message: 'You cannot delete your own user account.' });
  }

  await User.deleteOne({ _id: user._id });

  await logAction(req.user?.email, 'delete', 'user', user._id, { name: user.name, email: user.email, role: user.role }, null);

  res.json({ ok: true });
}));

/** =========================================================================
 * ROTATE JWT SECRET
 * ========================================================================= */
router.post('/rotate-jwt', requirePermission('security'), asyncHandler(async (req, res) => {
  // Generate high entropy random secret
  const newSecret = crypto.randomBytes(32).toString('hex');

  // Save to Database Settings
  const s = await Settings.findOne({ key: 'store' }) || await Settings.create({ key: 'store' });
  s.integrations = s.integrations || {};
  const oldSecret = s.integrations.jwtSecret || '';
  s.integrations.jwtSecret = newSecret;
  await s.save();

  // Invalidate settings cache in search/promotions
  try { require('../utils/searchEngine').invalidateSettingsCache(); } catch { /* noop */ }

  // Update cached in-memory secret in auth middleware
  const { setJwtSecretCached } = require('../middleware/auth');
  setJwtSecretCached(newSecret);

  // Invalidate all sessions across all users in DB so everyone must sign back in
  await User.updateMany({ role: { $ne: 'customer' } }, { $set: { sessions: [] } });

  await logAction(req.user?.email, 'rotate-jwt', 'settings', s._id, { oldSecret: '***' }, { newSecret: '***' });

  res.json({ ok: true, message: 'JWT Secret rotated successfully. All admin sessions have been invalidated and required to re-authenticate.' });
}));

/** =========================================================================
 * FRAUD FILTER GATE
 * ========================================================================= */
router.get('/fraud-orders', requirePermission('orders'), asyncHandler(async (req, res) => {
  const query = { 'fraudFilter.isFlagged': true };
  const orders = await Order.find(query).sort({ createdAt: -1 });
  res.json({ orders });
}));

router.post('/fraud-orders/:id/action', requirePermission('orders'), asyncHandler(async (req, res) => {
  const { action } = req.body || {}; // approve or reject
  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action. Must be approve or reject.' });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found.' });

  const oldStatus = order.fraudFilter?.status || 'pending';
  order.fraudFilter = order.fraudFilter || { isFlagged: true, reasons: [] };
  order.fraudFilter.status = action;

  if (action === 'rejected') {
    // Flag order status as Cancelled
    order.status = 'Cancelled';
    order.statusHistory.push({ status: 'Cancelled', note: 'Fraud filter: order rejected by administrator' });
  }

  await order.save();

  await logAction(req.user?.email, action, 'order', order._id, { fraudStatus: oldStatus }, { fraudStatus: action });

  res.json({ order });
}));

module.exports = router;
