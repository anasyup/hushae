const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly, requirePermission } = require('../middleware/auth');
const CustomerGroup = require('../models/CustomerGroup');
const User = require('../models/User');
const { evaluateGroupDetailed, refreshGroupCount, describeRules } = require('../utils/customerSegments');
const { normalizeTags } = require('../utils/customerTags');
const { logAction } = require('../utils/auditLogger');

const router = express.Router();
const clamp = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function cleanRules(input = {}) {
  const number = (key) => Math.max(0, Math.min(100000000, Number(input?.[key]) || 0));
  return {
    minSpend: number('minSpend'),
    minOrders: number('minOrders'),
    lastOrderDays: Math.min(3650, number('lastOrderDays')),
    noOrders: input?.noOrders === true,
    city: String(input?.city || '').trim().slice(0, 60),
    province: String(input?.province || '').trim().slice(0, 60),
    anyTag: normalizeTags(input?.anyTag || []),
    allTags: normalizeTags(input?.allTags || []),
  };
}

function publicGroup(group) {
  return {
    id: group._id,
    _id: group._id, // existing UI compatibility
    name: group.name,
    description: group.description || '',
    rules: group.rules || {},
    rulesSummary: describeRules(group.rules || {}),
    memberCount: Number(group.memberCount || 0),
    lastEvaluatedAt: group.lastEvaluatedAt || null,
    updatedAt: group.updatedAt,
    updatedByName: group.updatedByName || '',
    archivedAt: group.archivedAt || null,
    archivedByName: group.archivedByName || '',
  };
}

function publicMember(member) {
  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    email: member.email,
    tags: member.tags || [],
    orders: member.counts?.orders || 0,
    spend: member.counts?.spend || 0,
    lastOrderAt: member.lastOrderAt || null,
    city: member.city || '',
    province: member.province || '',
    manual: !!member.manual,
    why: member.why || [],
  };
}

// All groups live inside customer permission scope. Existing staff roles that
// can manage customers retain access; warehouse-only users do not see PII.
router.use(protect, adminOnly, requirePermission('customers'));

router.get('/', asyncHandler(async (req, res) => {
  const includeArchived = String(req.query.includeArchived || '').toLowerCase() === 'true';
  const where = includeArchived ? {} : { archivedAt: null };
  const groups = await CustomerGroup.find(where).sort({ updatedAt: -1 }).lean();
  res.json({ groups: groups.map(publicGroup) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 100);
  if (!name) return res.status(400).json({ message: 'Group name is required' });
  const group = await CustomerGroup.create({
    name,
    description: String(req.body?.description || '').trim().slice(0, 500),
    rules: cleanRules(req.body?.rules || {}),
    updatedByName: req.user?.name || req.user?.email || '',
  });
  await refreshGroupCount(group);
  logAction(req.user?.email, 'create', 'customer_group', group._id, null, { name: group.name, rules: group.rules });
  res.status(201).json({ group: publicGroup(group) });
}));

router.get('/preview', asyncHandler(async (req, res) => {
  let requested = {};
  try { requested = JSON.parse(req.query.rules || '{}'); } catch { requested = {}; }
  const limit = clamp(req.query.limit, 1, 50, 20);
  const result = await evaluateGroupDetailed(cleanRules(requested), { limit });
  res.json({
    // “estimated” makes the 10k scan guard honest for unusually large stores.
    estimatedMembers: result.total,
    total: result.total, // compatibility with existing builder
    truncated: result.truncated,
    rulesSummary: describeRules(cleanRules(requested)),
    members: result.members.map(publicMember),
  });
}));

router.get('/:id/members', asyncHandler(async (req, res) => {
  const group = await CustomerGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });
  const page = clamp(req.query.page, 1, 100000, 1);
  const limit = clamp(req.query.limit, 1, 200, 50);
  const result = await evaluateGroupDetailed(group.rules || {}, { groupId: group._id, skip: (page - 1) * limit, limit });
  if (group.memberCount !== result.total || !group.lastEvaluatedAt) {
    group.memberCount = result.total;
    group.lastEvaluatedAt = new Date();
    await group.save();
  }
  res.json({
    group: publicGroup(group), members: result.members.map(publicMember), total: result.total,
    estimatedMembers: result.total, truncated: result.truncated,
    page, perPage: limit, pages: Math.max(1, Math.ceil(result.total / limit)),
  });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const group = await CustomerGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });
  if (req.body?.name !== undefined) {
    const name = String(req.body.name || '').trim().slice(0, 100);
    if (!name) return res.status(400).json({ message: 'Group name is required' });
    group.name = name;
  }
  if (req.body?.description !== undefined) group.description = String(req.body.description || '').trim().slice(0, 500);
  if (req.body?.rules !== undefined) group.rules = cleanRules(req.body.rules || {});
  group.updatedByName = req.user?.name || req.user?.email || '';
  await refreshGroupCount(group);
  logAction(req.user?.email, 'update', 'customer_group', group._id, null, { name: group.name, rules: group.rules });
  res.json({ group: publicGroup(group) });
}));

router.post('/:id/archive', asyncHandler(async (req, res) => {
  const group = await CustomerGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });
  group.archivedAt = group.archivedAt ? null : new Date();
  group.archivedByName = group.archivedAt ? (req.user?.name || req.user?.email || '') : '';
  await group.save();
  logAction(req.user?.email, group.archivedAt ? 'archive' : 'restore', 'customer_group', group._id, null, { name: group.name });
  res.json({ group: publicGroup(group) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const group = await CustomerGroup.findById(req.params.id);
  if (!group) return res.status(404).json({ message: 'Group not found' });
  // Safe deletion: remove only explicit manual membership references. Orders
  // and customer records are never deleted with a group.
  await User.updateMany({ manualGroups: group._id }, { $pull: { manualGroups: group._id } });
  await group.deleteOne();
  logAction(req.user?.email, 'delete', 'customer_group', req.params.id, null, { name: group.name });
  res.json({ ok: true });
}));

module.exports = router;
