const mongoose = require('mongoose');

/**
 * Every points and credit movement, forever.
 *
 * This is the source of truth. Rows are IMMUTABLE — a mistake is corrected by
 * writing a reversing row, never by editing history. That is what makes the
 * balance auditable: you can always answer "why does this customer have 340
 * points?" by reading the rows.
 *
 * `idempotencyKey` is what makes awards race-safe. Two simultaneous requests
 * for the same event (a double-tapped button, a retried webhook, an order
 * status set twice) both try to insert the same key; the unique index lets
 * exactly one through and the second fails harmlessly.
 */
const ledgerSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'LoyaltyAccount', required: true, index: true },
  phone:   { type: String, required: true, index: true },

  // points | credit — one ledger, two currencies, never mixed in a sum
  kind:    { type: String, enum: ['points', 'credit'], default: 'points', index: true },

  // Positive earns, negative spends. Never zero.
  amount:  { type: Number, required: true },

  reason: {
    type: String,
    enum: [
      'purchase', 'signup', 'first-order', 'review', 'referral', 'referred',
      'birthday', 'newsletter', 'profile', 'achievement', 'welcome',
      'redeem', 'expire', 'refund', 'manual', 'gift-card', 'order-cancelled',
    ],
    required: true,
    index: true,
  },

  note:    { type: String, default: '' },
  order:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  orderNumber: { type: String, default: '' },

  /* Points expire; credit does not. Null means "never". */
  expiresAt: { type: Date, default: null, index: true },
  expired:   { type: Boolean, default: false, index: true },
  // How much of THIS earning row has already been spent or expired. Lets
  // redemption consume oldest-first without rewriting history.
  consumed:  { type: Number, default: 0 },

  balanceAfter: { type: Number, default: 0 },   // snapshot, for the statement view

  // Who caused it — an admin adjustment must name the admin.
  actor:     { type: String, default: 'system' },
  actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  idempotencyKey: { type: String, default: null },
}, { timestamps: true });

// The race guard. `sparse` so rows without a key (manual adjustments) are fine.
ledgerSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
ledgerSchema.index({ account: 1, createdAt: -1 });
// Backs the expiry sweep: unexpired earning rows past their date.
ledgerSchema.index({ expired: 1, expiresAt: 1, kind: 1 });

module.exports = mongoose.model('LoyaltyLedger', ledgerSchema);
