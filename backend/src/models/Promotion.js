const mongoose = require('mongoose');

/**
 * A merchant-defined promotion.
 *
 * One collection covers every promotion type rather than a model each, because
 * the hard parts — scheduling, eligibility, usage limits, priority, conflict
 * resolution — are identical for all of them. Splitting by type would mean
 * writing that logic five times and having it drift four ways.
 *
 * WHAT THIS DOES NOT DO: it never writes a price. The engine reads these rows,
 * computes an amount, and the order route applies it. A promotion is a rule,
 * not money.
 */

const TYPES = [
  'flash',        // time-boxed % or fixed off a set of products
  'percent',      // % off a set of products
  'fixed',        // fixed PKR off a set of products
  'bxgy',         // buy X get Y (free or discounted)
  'bundle',       // buy these N together for a set price / discount
  'freeship',     // free shipping when conditions are met
  'tiered',       // spend more, save more
];

/* What a promotion applies to. Deliberately the same shape as the search
   facets, so "everything in the Bras category, Premium tier" is expressible
   without a new query language. An empty scope means the whole catalogue. */
const scopeSchema = new mongoose.Schema({
  mode: { type: String, enum: ['all', 'products', 'categories', 'collections', 'tags', 'rules'], default: 'all' },
  productIds:   { type: [mongoose.Schema.Types.ObjectId], default: [] },
  categorySlugs:{ type: [String], default: [] },
  collectionIds:{ type: [mongoose.Schema.Types.ObjectId], default: [] },
  tags:         { type: [String], default: [] },
  gender:       { type: String, default: '' },
  tiers:        { type: [String], default: [] },
  badges:       { type: [String], default: [] },
  minPrice:     { type: Number, default: null },
  maxPrice:     { type: Number, default: null },
  // Products explicitly held back, whatever else matches.
  excludeProductIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  // A markdown on top of a markdown is how margin disappears quietly.
  excludeOnSale: { type: Boolean, default: false },
}, { _id: false });

const promotionSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  // Shown to the shopper on the product card and in the cart. Empty = silent.
  publicLabel: { type: String, default: '' },
  internalNote:{ type: String, default: '' },
  type:        { type: String, enum: TYPES, required: true },

  /* ---- Status ----------------------------------------------------------
   * `enabled` is the merchant's switch. `isLive()` also weighs the schedule,
   * the budget and the usage cap — a promotion can be enabled and still not
   * running. Keeping those apart means turning one off for an hour does not
   * lose its dates. */
  enabled:   { type: Boolean, default: false },
  startsAt:  { type: Date, default: null },   // null = already started
  endsAt:    { type: Date, default: null },   // null = never ends

  /* Recurring windows, e.g. a flash sale every evening. Times are stored as
     minutes from midnight in the store's timezone so a DST change cannot
     shift a sale by an hour. */
  recurring: {
    enabled:    { type: Boolean, default: false },
    daysOfWeek: { type: [Number], default: [] },  // 0 = Sunday
    startMin:   { type: Number, default: 0 },
    endMin:     { type: Number, default: 1439 },
  },

  /* ---- Reward ---------------------------------------------------------- */
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountFixed:   { type: Number, default: 0, min: 0 },
  // Ceiling on a percentage promotion, so "50% off" on a PKR 20,000 basket
  // does not quietly become a PKR 10,000 giveaway.
  maxDiscount:     { type: Number, default: 0 },

  scope: { type: scopeSchema, default: () => ({}) },

  /* ---- Buy X Get Y ----------------------------------------------------- */
  bxgy: {
    buyQty:      { type: Number, default: 2 },
    getQty:      { type: Number, default: 1 },
    getPercent:  { type: Number, default: 100 },   // 100 = free
    // Empty = the free item comes from the same scope as the buy items.
    getScope:    { type: scopeSchema, default: () => ({}) },
    // How many times one order can claim it. 0 = unlimited.
    maxPerOrder: { type: Number, default: 1 },
    // Discount the CHEAPEST qualifying item, never the most expensive.
    cheapestFree:{ type: Boolean, default: true },
  },

  /* ---- Bundle ---------------------------------------------------------- */
  bundle: {
    productIds:  { type: [mongoose.Schema.Types.ObjectId], default: [] },
    requireAll:  { type: Boolean, default: true },  // false = any N of them
    minItems:    { type: Number, default: 2 },
    bundlePrice: { type: Number, default: 0 },      // 0 = use percent/fixed
  },

  /* ---- Tiered: spend more, save more ----------------------------------- */
  tiers: {
    type: [{
      _id: false,
      minSubtotal: { type: Number, default: 0 },
      percent:     { type: Number, default: 0 },
      fixed:       { type: Number, default: 0 },
    }],
    default: [],
  },

  /* ---- Who qualifies ---------------------------------------------------- */
  eligibility: {
    // all | first-order | returning | tier | phones
    audience:     { type: String, default: 'all' },
    loyaltyTiers: { type: [String], default: [] },
    phones:       { type: [String], default: [] },   // last 9 digits
    minCartTotal: { type: Number, default: 0 },
    minCartItems: { type: Number, default: 0 },
    // Named payment methods only, e.g. an online-payment incentive.
    paymentMethods: { type: [String], default: [] },
    // Restrict to certain cities, for a courier-limited offer.
    cities: { type: [String], default: [] },
  },

  /* ---- Limits ----------------------------------------------------------
   * usedCount is incremented with $inc, never read-modify-write: two orders
   * landing in the same millisecond must both count. */
  limits: {
    maxUses:         { type: Number, default: 0 },   // 0 = unlimited
    maxUsesPerPhone: { type: Number, default: 0 },
    // Stop a promotion once it has given away this much. 0 = no ceiling.
    maxTotalDiscount:{ type: Number, default: 0 },
  },
  usedCount:      { type: Number, default: 0 },
  totalDiscounted:{ type: Number, default: 0 },

  /* ---- Priority and stacking -------------------------------------------
   * Lower number wins. When two promotions could both apply to the same line,
   * the resolver takes the higher-priority one and, unless `stackable` is set
   * on BOTH, discards the other. That is what stops double discounts. */
  priority:  { type: Number, default: 100 },
  stackable: { type: Boolean, default: false },
  // An exclusive promotion suppresses every other promotion in the order.
  exclusive: { type: Boolean, default: false },
  // Runs alongside a coupon code, or refuses to.
  allowWithCoupon: { type: Boolean, default: true },

  /* ---- Display --------------------------------------------------------- */
  badge: {
    text:  { type: String, default: '' },
    color: { type: String, default: '#B3927E' },
    show:  { type: Boolean, default: true },
  },
  showInCart:  { type: Boolean, default: true },
  showOnCard:  { type: Boolean, default: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

/* Reporting and the engine both ask "what is live right now", so the index
   matches that question rather than being one index per field. */
promotionSchema.index({ enabled: 1, startsAt: 1, endsAt: 1, priority: 1 });
promotionSchema.index({ type: 1, enabled: 1 });

/**
 * Is this promotion actually running at `at`?
 *
 * Enabled is necessary but not sufficient: the schedule, the usage cap and the
 * spend ceiling all have to pass too. Returning the REASON rather than a bare
 * false is what lets the admin list say "budget spent" instead of "off".
 */
promotionSchema.methods.liveState = function liveState(at = new Date()) {
  if (!this.enabled) return { live: false, reason: 'disabled' };
  if (this.startsAt && at < this.startsAt) return { live: false, reason: 'scheduled' };
  if (this.endsAt && at > this.endsAt) return { live: false, reason: 'ended' };
  if (this.limits?.maxUses > 0 && this.usedCount >= this.limits.maxUses) {
    return { live: false, reason: 'limit-reached' };
  }
  if (this.limits?.maxTotalDiscount > 0 && this.totalDiscounted >= this.limits.maxTotalDiscount) {
    return { live: false, reason: 'budget-spent' };
  }
  if (this.recurring?.enabled) {
    const day = at.getDay();
    const days = this.recurring.daysOfWeek || [];
    if (days.length && !days.includes(day)) return { live: false, reason: 'not-today' };
    const mins = at.getHours() * 60 + at.getMinutes();
    const { startMin = 0, endMin = 1439 } = this.recurring;
    // A window that crosses midnight (22:00–02:00) is two ranges, not one.
    const inWindow = startMin <= endMin
      ? mins >= startMin && mins <= endMin
      : mins >= startMin || mins <= endMin;
    if (!inWindow) return { live: false, reason: 'outside-hours' };
  }
  return { live: true, reason: 'live' };
};

module.exports = mongoose.model('Promotion', promotionSchema);
module.exports.TYPES = TYPES;
