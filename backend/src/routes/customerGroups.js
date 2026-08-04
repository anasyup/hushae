const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly } = require('../middleware/auth');
const CustomerGroup = require('../models/CustomerGroup');
const { evaluateGroup, refreshGroupCount } = require('../utils/customerSegments');

const router = express.Router();

/* ============================================================================
 * Customer groups / segments — all admin-only.
 * A group is a name + rules; members are evaluated live from Users + Orders.
 * ========================================================================== */

/** GET /api/customer-groups — list all groups with cached counts. */
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const groups = await CustomerGroup.find().sort({ updatedAt: -1 }).lean();
  res.json({ groups });
}));

/** POST /api/customer-groups — create. */
router.post('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const { name = '', description = '', rules = {} } = req.body || {};
  if (!String(name).trim()) return res.status(400).json({ message: 'Group name is required' });

  const group = await CustomerGroup.create({
    name: String(name).trim(),
    description: String(description || ''),
    rules: rules && typeof rules === 'object' ? rules : {},
    updatedByName: req.user?.name || req.user?.email || '',
  });

  // Initial member count so the list is useful immediately.
  await refreshGroupCount(group);
  res.status(201).json({ group });
}));

/** PUT /api/customer-groups/:id — update name/description/rules, refresh count. */
router.put('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const group = await CustomerGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const { name, description, rules } = req.body || {};
  if (name !== undefined && !String(name).trim()) return res.status(400).json({ message: 'Group name is required' });
  if (name !== undefined) group.name = String(name).trim();
  if (description !== undefined) group.description = String(description || '');
  if (rules !== undefined && rules && typeof rules === 'object') group.rules = rules;
  group.updatedByName = req.user?.name || req.user?.email || '';

  await refreshGroupCount(group);
  res.json({ group });
}));

/** DELETE /api/customer-groups/:id. */
router.delete('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const group = await CustomerGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });
  await group.deleteOne();
  res.json({ ok: true });
}));

/** GET /api/customer-groups/:id/members — live evaluation + full count. */
router.get('/:id/members', protect, adminOnly, asyncHandler(async (req, res) => {
  const group = await CustomerGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const members = await evaluateGroup(group.rules || {}, { limit });

  // Refresh the cached count so the list stays honest.
  if (group.memberCount !== members.length || !group.lastEvaluatedAt) {
    await refreshGroupCount(group);
  }

  res.json({
    group,
    members: members.map((m) => ({
      id: m.id, name: m.name, phone: m.phone, email: m.email,
      tags: m.tags, orders: m.counts.orders, spend: m.counts.spend,
      lastOrderAt: m.lastOrderAt, city: m.city, province: m.province,
    })),
    total: group.memberCount,
  });
}));

/** GET /api/customer-groups/preview — evaluate rules WITHOUT saving (builder preview). */
router.get('/preview', protect, adminOnly, asyncHandler(async (req, res) => {
  let rules = {};
  try { rules = JSON.parse(req.query.rules || '{}'); } catch { rules = {}; }
  const limit = Math.min(parseInt(req.query.limit || '20', 10), 50);
  const members = await evaluateGroup(rules, { limit });
  res.json({
    total: members.length,
    members: members.map((m) => ({ id: m.id, name: m.name, phone: m.phone, email: m.email, orders: m.counts.orders, spend: m.counts.spend })),
  });
}));

module.exports = router;
