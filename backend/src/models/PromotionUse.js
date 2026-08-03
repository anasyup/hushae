const mongoose = require('mongoose');

/**
 * One row per promotion actually applied to an order.
 *
 * Two jobs, and the second is the reason this is a collection rather than a
 * counter on the promotion:
 *
 *  1. ANALYTICS. "This flash sale ran 40 times and gave away PKR 32,000" can
 *     only be answered from rows. A counter loses the per-order detail the
 *     moment you want to know which products moved.
 *
 *  2. RACE SAFETY. `idempotencyKey` is a unique index. Two concurrent requests
 *     for the same promotion on the same order both attempt the same key; the
 *     index lets exactly one through and the loser is discarded. This is what
 *     makes "apply promotion" safe to retry — the same pattern the loyalty
 *     ledger uses, for the same reason.
 *
 * Per-customer caps are counted from here too. Storing a map of phone numbers
 * on the promotion document would grow without bound and rewrite the whole
 * document on every order.
 */
const promotionUseSchema = new mongoose.Schema({
  promotion:   { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion', required: true, index: true },
  promotionName: { type: String, default: '' },   // snapshot: the name may change later
  type:        { type: String, default: '' },

  order:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  orderNumber: { type: String, default: '' },
  phone:       { type: String, default: '', index: true },   // last 9 digits

  // What it actually cost the merchant, in PKR.
  amount:      { type: Number, default: 0 },
  // Which lines it touched, so a report can say which products a promo moved.
  productIds:  { type: [mongoose.Schema.Types.ObjectId], default: [] },

  idempotencyKey: { type: String, default: null, unique: true, sparse: true },
}, { timestamps: true });

promotionUseSchema.index({ promotion: 1, createdAt: -1 });
promotionUseSchema.index({ promotion: 1, phone: 1 });

module.exports = mongoose.model('PromotionUse', promotionUseSchema);
