const mongoose = require('mongoose');

/*
 * A deliberately small, append-only Customer 360 activity ledger.
 *
 * It records only events the application actually persisted or processed.
 * Anonymous PageView rows are not retroactively attributed to a customer, so
 * this collection never fabricates a browsing history for an account.
 */
const customerActivitySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: [
      'product_viewed', 'added_to_cart', 'wishlist_added', 'checkout_started',
      'purchase', 'abandoned_cart',
    ],
    required: true,
    index: true,
  },
  objectType: { type: String, default: '' }, // product | order | cart
  objectId: { type: String, default: '' },
  objectLabel: { type: String, default: '' },
  source: {
    type: String,
    enum: ['storefront', 'checkout', 'admin', 'marketing', 'system'],
    default: 'storefront',
  },
  device: { type: String, enum: ['mobile', 'tablet', 'desktop', 'unknown'], default: 'unknown' },
  // A tiny, non-sensitive event snapshot (for example an item count). Never
  // use this field for email addresses, payment details, tokens or IPs.
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, minimize: false });

customerActivitySchema.index({ customer: 1, createdAt: -1 });
customerActivitySchema.index({ customer: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerActivity', customerActivitySchema);
