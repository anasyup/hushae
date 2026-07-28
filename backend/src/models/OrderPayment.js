const mongoose = require('mongoose');

/**
 * Payment verification ledger — one row per verification attempt or state
 * change, so finance can reconstruct exactly how a payment was confirmed.
 *
 * The order document still carries the *current* payment state; this
 * collection carries the *history* and the evidence.
 */
const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: String, required: true, index: true },

  method: { type: String, required: true },              // COD | JazzCash | EasyPaisa | Bank Transfer | Visa
  amount: { type: Number, required: true },

  /** Pending -> Verified -> Confirmed, or Failed / Expired / Refunded. */
  state: {
    type: String,
    enum: ['Pending', 'Verified', 'Confirmed', 'Failed', 'Expired', 'Refunded'],
    default: 'Pending',
    index: true,
  },

  /** Evidence supplied by the merchant or the gateway. */
  transactionId: { type: String, default: '' },
  gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  reference: { type: String, default: '' },
  note: { type: String, default: '' },

  verifiedAt: { type: Date, default: null },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedByName: { type: String, default: '' },

  /** COD holds expire so stale orders surface instead of rotting silently. */
  expiresAt: { type: Date, default: null, index: true },
  expiredNotifiedAt: { type: Date, default: null },
}, { timestamps: true, minimize: false });

paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index({ state: 1, expiresAt: 1 });

module.exports = mongoose.model('OrderPayment', paymentSchema);
