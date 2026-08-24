const User = require('../models/User');
const Order = require('../models/Order');
const { qualifyingOrderMatch } = require('./customerMetrics');

/**
 * Customer group evaluation.
 *
 * Rules remain live and AND-ed. For compatibility with older orders that were
 * created before Order.customer existed, this evaluator may read an UNLINKED
 * order by its phone tail. New Customer 360 metrics never do that: all new
 * checkout/manual orders carry a persistent User id.
 */

function phoneKey(value) {
  return String(value || '').replace(/\D/g, '').slice(-9);
}

function evalRules(customer, rules = {}) {
  const r = rules || {};
  const counts = customer.counts || { orders: 0, spend: 0 };

  if (r.noOrders === true && counts.orders > 0) return false;
  if (r.noOrders !== true && counts.orders === 0 && (r.minOrders > 0 || r.minSpend > 0 || r.lastOrderDays > 0)) return false;
  if (r.minOrders > 0 && counts.orders < r.minOrders) return false;
  if (r.minSpend > 0 && (counts.spend || 0) < r.minSpend) return false;

  if (r.lastOrderDays > 0) {
    if (!customer.lastOrderAt) return false;
    if (new Date(customer.lastOrderAt).getTime() < Date.now() - Number(r.lastOrderDays) * 86400000) return false;
  }

  if (r.city && String(customer.city || '').toLowerCase() !== String(r.city).toLowerCase()) return false;
  if (r.province && String(customer.province || '').toLowerCase() !== String(r.province).toLowerCase()) return false;

  const tags = (customer.tags || []).map((tag) => String(tag).toLowerCase());
  if (Array.isArray(r.anyTag) && r.anyTag.length && !r.anyTag.map((tag) => String(tag).toLowerCase()).some((tag) => tags.includes(tag))) return false;
  if (Array.isArray(r.allTags) && r.allTags.length && !r.allTags.map((tag) => String(tag).toLowerCase()).every((tag) => tags.includes(tag))) return false;
  return true;
}

function ruleReasons(customer, rules = {}) {
  const r = rules || {};
  const out = [];
  if (r.minSpend > 0) out.push(`Lifetime spend PKR ${(customer.counts?.spend || 0).toLocaleString('en-PK')} meets PKR ${Number(r.minSpend).toLocaleString('en-PK')}`);
  if (r.minOrders > 0) out.push(`${customer.counts?.orders || 0} orders meets minimum ${r.minOrders}`);
  if (r.lastOrderDays > 0) out.push(`Ordered within ${r.lastOrderDays} days`);
  if (r.noOrders === true) out.push('No qualifying orders');
  if (r.city) out.push(`City is ${r.city}`);
  if (r.province) out.push(`Province is ${r.province}`);
  if (Array.isArray(r.anyTag) && r.anyTag.length) out.push(`Has a matching tag: ${(customer.tags || []).filter((t) => r.anyTag.map((x) => String(x).toLowerCase()).includes(String(t).toLowerCase())).join(', ')}`);
  if (Array.isArray(r.allTags) && r.allTags.length) out.push(`Has all required tags: ${r.allTags.join(', ')}`);
  return out.length ? out : ['Matches this group’s live rules'];
}

function describeRules(rules = {}) {
  const r = rules || {};
  const parts = [];
  if (r.minSpend > 0) parts.push(`lifetime spend ≥ PKR ${Number(r.minSpend).toLocaleString('en-PK')}`);
  if (r.minOrders > 0) parts.push(`orders ≥ ${r.minOrders}`);
  if (r.lastOrderDays > 0) parts.push(`ordered within ${r.lastOrderDays} days`);
  if (r.noOrders === true) parts.push('no orders');
  if (r.city) parts.push(`city is ${r.city}`);
  if (r.province) parts.push(`province is ${r.province}`);
  if (Array.isArray(r.anyTag) && r.anyTag.length) parts.push(`any tag: ${r.anyTag.join(', ')}`);
  if (Array.isArray(r.allTags) && r.allTags.length) parts.push(`all tags: ${r.allTags.join(', ')}`);
  return parts.length ? parts.join(' AND ') : 'All registered customers';
}

async function collectMatches(rules, { groupId = null, scanLimit = 10000 } = {}) {
  const useOrders = Number(rules?.minOrders || 0) > 0 || Number(rules?.minSpend || 0) > 0
    || Number(rules?.lastOrderDays || 0) > 0 || rules?.noOrders || rules?.city || rules?.province;

  const users = await User.find({ role: 'customer', deletedAt: null })
    .select('name email phone tags addresses manualGroups createdAt')
    .sort({ createdAt: -1 }).limit(scanLimit).lean();

  const phoneStats = {};
  if (useOrders) {
    const rows = await Order.aggregate([
      { $match: qualifyingOrderMatch() },
      {
        $group: {
          _id: '$customerInfo.phone', orders: { $sum: 1 }, spend: { $sum: '$total' },
          lastOrderAt: { $max: '$createdAt' }, city: { $last: '$customerInfo.city' },
          province: { $last: '$customerInfo.province' }, name: { $last: '$customerInfo.name' },
        },
      },
    ]);
    for (const row of rows) {
      const key = phoneKey(row._id);
      if (!key) continue;
      phoneStats[key] = row;
    }
  }

  const wantedGroup = groupId ? String(groupId) : '';
  const matches = [];
  for (const user of users) {
    const stats = phoneStats[phoneKey(user.phone)] || { orders: 0, spend: 0, lastOrderAt: null, city: '', province: '' };
    const manual = wantedGroup && (user.manualGroups || []).some((id) => String(id) === wantedGroup);
    const customer = {
      id: user._id, user,
      name: user.name || stats.name || 'Unknown', phone: user.phone || '', email: user.email || '', tags: user.tags || [],
      counts: { orders: Number(stats.orders || 0), spend: Number(stats.spend || 0) },
      lastOrderAt: stats.lastOrderAt || null,
      city: stats.city || user.addresses?.find((a) => a.isDefault)?.city || user.addresses?.[0]?.city || '',
      province: stats.province || user.addresses?.find((a) => a.isDefault)?.province || user.addresses?.[0]?.province || '',
      manual,
    };
    if (!manual && !evalRules(customer, rules || {})) continue;
    customer.why = manual ? ['Manually assigned by staff'] : ruleReasons(customer, rules || {});
    matches.push(customer);
  }

  matches.sort((a, b) => (b.counts.spend - a.counts.spend) || (b.counts.orders - a.counts.orders) || a.name.localeCompare(b.name));
  return { matches, truncated: users.length >= scanLimit };
}

async function evaluateGroupDetailed(rules, { limit = 500, skip = 0, groupId = null, scanLimit = 10000 } = {}) {
  const { matches, truncated } = await collectMatches(rules || {}, { groupId, scanLimit });
  const start = Math.max(0, Number(skip) || 0);
  const end = limit == null ? undefined : start + Math.max(0, Number(limit) || 0);
  return { members: matches.slice(start, end), total: matches.length, truncated };
}

async function evaluateGroup(rules, { limit = 500, skip = 0, groupId = null } = {}) {
  const result = await evaluateGroupDetailed(rules, { limit, skip, groupId });
  return result.members;
}

async function refreshGroupCount(group) {
  const result = await evaluateGroupDetailed(group.rules || {}, { groupId: group._id, limit: null });
  group.memberCount = result.total;
  group.lastEvaluatedAt = new Date();
  await group.save();
  return result.total;
}

module.exports = {
  evaluateGroup,
  evaluateGroupDetailed,
  refreshGroupCount,
  evalRules,
  ruleReasons,
  describeRules,
};
