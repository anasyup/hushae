const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Customer segment evaluation.
 *
 * A group's members are computed live from Users + Orders. The heavy lifting
 * is one aggregation over Orders grouped by customer phone/email (guest orders
 * are linked by the phone the order was placed with — the same join the
 * dashboard's top-customers view uses), merged with registered users.
 *
 * Order document shape used below:
 *   customerInfo: { name, phone, email, city, province }
 *   total, status, createdAt
 *
 * Cancelled/Refunded orders are excluded from spend/counts — a refunded order
 * is not a customer's spend.
 */

function evalRules(customer, rules = {}) {
  const r = rules || {};
  const noOrders = r.noOrders === true;
  const counts = customer.counts || { orders: 0, spend: 0 };

  // Never-ordered rule.
  if (noOrders && counts.orders > 0) return false;
  if (!noOrders && counts.orders === 0 && (r.minOrders > 0 || r.minSpend > 0 || r.lastOrderDays > 0)) return false;

  if (r.minOrders > 0 && counts.orders < r.minOrders) return false;
  if (r.minSpend > 0 && (counts.spend || 0) < r.minSpend) return false;

  // Last order within N days.
  if (r.lastOrderDays > 0) {
    if (!customer.lastOrderAt) return false;
    const cutoff = Date.now() - r.lastOrderDays * 86400000;
    if (new Date(customer.lastOrderAt).getTime() < cutoff) return false;
  }

  // City / province — match against the customer's LAST order address, falling
  // back to their profile address if they registered but never ordered.
  if (r.city) {
    const c = (customer.city || '').toLowerCase();
    if (!c || c !== String(r.city).toLowerCase()) return false;
  }
  if (r.province) {
    const p = (customer.province || '').toLowerCase();
    if (!p || p !== String(r.province).toLowerCase()) return false;
  }

  // Tags.
  const tags = (customer.tags || []).map((t) => String(t).toLowerCase());
  if (Array.isArray(r.anyTag) && r.anyTag.length) {
    const wants = r.anyTag.map((t) => String(t).toLowerCase());
    if (!wants.some((t) => tags.includes(t))) return false;
  }
  if (Array.isArray(r.allTags) && r.allTags.length) {
    const wants = r.allTags.map((t) => String(t).toLowerCase());
    if (!wants.every((t) => tags.includes(t))) return false;
  }

  return true;
}

/**
 * Evaluate a group's rules → list of matching customers.
 * Returns an array of { user, id, name, phone, email, tags, orders, spend,
 * lastOrderAt, city, province } — user may be null for guest-only matches.
 */
async function evaluateGroup(rules, { limit = 500 } = {}) {
  const r = rules || {};
  const useOrders = r.minOrders > 0 || r.minSpend > 0 || r.lastOrderDays > 0 || r.noOrders || r.city || r.province;
  const useTags = (r.anyTag && r.anyTag.length) || (r.allTags && r.allTags.length);

  /* Registered users with their order stats (phone-keyed). */
  const users = await User.find({ role: 'customer', deletedAt: null })
    .select('name email phone tags addresses')
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();

  // Aggregate order stats per phone (guests + registered share the phone key).
  const phoneStats = {};
  if (useOrders) {
    const rows = await Order.aggregate([
      { $match: { status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: {
        _id: '$customerInfo.phone',
        orders: { $sum: 1 },
        spend: { $sum: '$total' },
        lastOrderAt: { $max: '$createdAt' },
        city: { $last: '$customerInfo.city' },
        province: { $last: '$customerInfo.province' },
        name: { $last: '$customerInfo.name' },
      } },
    ]);
    for (const row of rows) {
      const key = String(row._id || '').replace(/\D/g, '').slice(-9);
      if (!key) continue;
      phoneStats[key] = { orders: row.orders, spend: row.spend, lastOrderAt: row.lastOrderAt, city: row.city, province: row.province, name: row.name };
    }
  }

  const matches = [];

  for (const u of users) {
    const key = String(u.phone || '').replace(/\D/g, '').slice(-9);
    const stats = phoneStats[key] || { orders: 0, spend: 0, lastOrderAt: null, city: '', province: '' };
    const customer = {
      id: u._id,
      user: u,
      name: u.name || stats.name || 'Unknown',
      phone: u.phone,
      email: u.email || '',
      tags: u.tags || [],
      counts: { orders: stats.orders, spend: stats.spend },
      lastOrderAt: stats.lastOrderAt,
      city: stats.city || u.addresses?.[0]?.city || '',
      province: stats.province || u.addresses?.[0]?.province || '',
    };
    if (evalRules(customer, r)) matches.push(customer);
  }

  // Sort: biggest spenders first, then most orders — a merchant opens a group
  // to act on it, and the customers worth acting on lead.
  matches.sort((a, b) => (b.counts.spend - a.counts.spend) || (b.counts.orders - a.counts.orders));

  return matches.slice(0, limit);
}

/** Refresh memberCount + lastEvaluatedAt on a group document. */
async function refreshGroupCount(group) {
  const members = await evaluateGroup(group.rules || {}, { limit: 5000 });
  group.memberCount = members.length;
  group.lastEvaluatedAt = new Date();
  await group.save();
  return members.length;
}

module.exports = { evaluateGroup, refreshGroupCount, evalRules };
