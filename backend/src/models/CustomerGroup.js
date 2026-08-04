const mongoose = require('mongoose');

/**
 * A saved customer segment (Shopify-style "customer group").
 *
 * A group is a NAME + a set of RULES. Members are never stored — they are
 * evaluated live from Users + Orders when the admin opens the group, so a
 * group always reflects the current state of the store. This keeps groups
 * cheap to maintain and impossible to go stale, at the cost of a couple of
 * aggregation queries on open (which is exactly when you want fresh numbers).
 *
 * Rules are all optional. A group with no rules matches every customer
 * ("All customers"). A rule is AND-ed with the others (a customer must satisfy
 * every rule that is set). `anyTag` / `allTags` are the only OR-ish ones and
 * work inside their own rule.
 *
 * Evaluation lives in utils/customerSegments.js so both the API and future
 * marketing screens can reuse it.
 */

const RULE_FIELDS = ['minSpend', 'minOrders', 'lastOrderDays', 'noOrders', 'city', 'province', 'anyTag', 'allTags'];

const customerGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  /* Rules — see RULE_FIELDS. minSpend/minOrders are PKR/count thresholds,
     lastOrderDays is "ordered within the last N days", noOrders is a boolean
     meaning "has never placed an order", city/province are exact matches,
     anyTag/allTags are string arrays of user tags. */
  rules: {
    minSpend:      { type: Number, default: 0 },      // lifetime spend ≥ this (PKR)
    minOrders:     { type: Number, default: 0 },      // order count ≥ this
    lastOrderDays: { type: Number, default: 0 },      // 0 = ignore; N = ordered within N days
    noOrders:      { type: Boolean, default: false }, // true = has never ordered
    city:          { type: String, default: '' },
    province:      { type: String, default: '' },
    anyTag:        { type: [String], default: [] },   // has ANY of these tags
    allTags:       { type: [String], default: [] },   // has ALL of these tags
  },

  /* Cached member count — refreshed on every evaluation and on save. Lets the
     groups LIST render counts without re-running aggregations. */
  memberCount: { type: Number, default: 0 },
  lastEvaluatedAt: { type: Date, default: null },

  updatedByName: { type: String, default: '' },
}, { timestamps: true });

customerGroupSchema.index({ updatedAt: -1 });

customerGroupSchema.methods.hasAnyRules = function hasAnyRules() {
  const r = this.rules || {};
  return RULE_FIELDS.some((f) => {
    const v = r[f];
    if (f === 'noOrders') return !!v;
    if (Array.isArray(v)) return v.length > 0;
    return Number(v) > 0 || String(v || '').trim() !== '';
  });
};

module.exports = mongoose.model('CustomerGroup', customerGroupSchema);
module.exports.RULE_FIELDS = RULE_FIELDS;
