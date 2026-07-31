const mongoose = require('mongoose');

/**
 * A customer's loyalty balance and standing.
 *
 * Deliberately its OWN collection rather than fields on User, for two reasons:
 *   1. Guests order without accounts. Loyalty is keyed on the phone number the
 *      order carries, so a shopper accrues points before they ever register
 *      and keeps them when they do.
 *   2. Balances are written far more often than user profiles. Keeping them
 *      apart stops every points change touching the auth document.
 *
 * The balance here is a CACHE. LoyaltyLedger is the source of truth — every
 * change is an immutable row, and the balance is the sum of those rows. If the
 * two ever disagree the ledger wins, and recalc() rebuilds the cache.
 */
const loyaltyAccountSchema = new mongoose.Schema({
  // Identity. phone is the durable key (guests have no user id).
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  phone: { type: String, required: true, unique: true, index: true },
  email: { type: String, default: '', index: true },
  name:  { type: String, default: '' },

  // ---- Points (cached; the ledger is authoritative) ----
  pointsBalance:  { type: Number, default: 0, min: 0 },
  pointsEarned:   { type: Number, default: 0 },   // lifetime, never decreases
  pointsRedeemed: { type: Number, default: 0 },
  pointsExpired:  { type: Number, default: 0 },

  // ---- Store credit, in PKR. Kept apart from points on purpose: credit is
  // money the merchant already owes, points are a promise. Mixing them makes
  // refunds impossible to reason about.
  creditBalance:  { type: Number, default: 0, min: 0 },

  // ---- Tier ----
  tier:           { type: String, default: '' },      // resolved from settings
  tierSpend:      { type: Number, default: 0 },       // qualifying spend in the window
  tierSince:      { type: Date, default: null },
  tierReviewedAt: { type: Date, default: null },

  // ---- Referral ----
  referralCode:   { type: String, default: '', unique: true, sparse: true, index: true },
  referredBy:     { type: String, default: '' },      // the code they signed up with
  referralCount:  { type: Number, default: 0 },

  // ---- One-time awards. Recorded as flags so a rule can never pay twice,
  // even if the triggering event is replayed.
  claimed: {
    signup:     { type: Boolean, default: false },
    firstOrder: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: false },
    profile:    { type: Boolean, default: false },
  },
  birthday:       { type: Date, default: null },
  lastBirthdayAward: { type: Number, default: 0 },     // year, so it fires once a year

  // ---- Achievements the shopper has unlocked (ids from settings) ----
  badges: { type: [String], default: [] },

  // ---- Abuse controls ----
  blocked:        { type: Boolean, default: false },
  blockedReason:  { type: String, default: '' },
  lastEarnAt:     { type: Date, default: null },
}, { timestamps: true });

loyaltyAccountSchema.index({ pointsBalance: -1 });
loyaltyAccountSchema.index({ tier: 1, tierSpend: -1 });

module.exports = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
