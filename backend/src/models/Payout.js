const mongoose = require('mongoose');

/* ============================================================================
 * PAYOUT — money the payment gateway or courier owes the business, and
 * whether it has actually landed in the bank.
 *
 * The gap this fills: COD cash was already tracked (CODRecon), but prepaid
 * gateways were not. JazzCash / Safepay / EasyPaisa capture the payment, hold
 * it, then settle on their own schedule minus their fee. Without this the
 * merchant could not answer "kitna paisa andar aana baaki hai?" — and could
 * not notice when a settlement silently came up short.
 *
 * Two distinct moments are recorded on purpose:
 *   expected — what the gateway should send (gross less fee)
 *   received — what actually landed, entered at reconciliation
 * The difference is the reconciliation exception, and it is surfaced rather
 * than averaged away.
 * ========================================================================== */

const STATUSES = [
  'pending',      // captured, settlement not yet released by the gateway
  'in_transit',   // released, not yet credited
  'settled',      // credited in the bank
  'short',        // credited, but less than expected — needs a look
  'failed',       // never arrived / reversed
];

const payoutSchema = new mongoose.Schema({
  /* Which gateway or courier this settlement comes from. */
  gateway: { type: String, required: true, trim: true, index: true },

  /* The window this payout covers. Gateways batch many orders, so a payout is
   * a period, not a transaction. */
  periodFrom: { type: Date, required: true },
  periodTo: { type: Date, required: true },

  /* What the business expects, broken out so a shortfall is diagnosable
   * instead of being one unexplained number. */
  gross: { type: Number, required: true, min: 0 },
  fees: { type: Number, default: 0, min: 0 },
  refundsDeducted: { type: Number, default: 0, min: 0 },
  expected: { type: Number, required: true, min: 0 },

  /* Filled in at reconciliation. Null until then — which is meaningful:
   * null means "not yet checked", 0 means "checked, nothing arrived". */
  received: { type: Number, default: null },
  receivedAt: { type: Date },

  /* Shortfall is derived, never stored, so it can never drift out of sync
   * with the two numbers it comes from. */

  status: { type: String, enum: STATUSES, default: 'pending', index: true },

  /* How many orders sit inside this batch, and their ids where known. Lets
   * the merchant drill from a payout back to the orders without guessing. */
  orderCount: { type: Number, default: 0 },
  orderIds: [{ type: String }],

  /* Bank side, so a settlement can be matched to a statement line. */
  bankReference: { type: String, trim: true, default: '' },
  bankAccountLast4: { type: String, trim: true, default: '' },

  note: { type: String, trim: true, default: '' },

  isVoid: { type: Boolean, default: false },
  createdBy: { type: String, default: '' },
}, { timestamps: true });

payoutSchema.index({ gateway: 1, periodFrom: -1 });
payoutSchema.index({ status: 1 });

/* Shortfall / overage. Kept virtual so the stored document cannot disagree
 * with itself. */
payoutSchema.virtual('variance').get(function variance() {
  if (this.received === null || this.received === undefined) return null;
  return Math.round((this.received - this.expected) * 100) / 100;
});

payoutSchema.set('toJSON', { virtuals: true });
payoutSchema.set('toObject', { virtuals: true });

payoutSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Payout', payoutSchema);
