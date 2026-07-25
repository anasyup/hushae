const mongoose = require('mongoose');

/*
 * AbandonedCart — recorded when a customer reaches Checkout with an email
 * but has not yet placed the order. Used for recovery emails and analytics.
 *
 * `recoveredOrderId` is set (by the Order.create flow) when we detect the
 * customer eventually placed the order using the same email, so we can
 * separate "recovered" vs "still open" abandons.
 */
const abandonedCartSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    slug: String,
    image: String,
    size: String,
    color: String,
    price: Number,
    quantity: Number,
    _id: false,
  }],
  subtotal: { type: Number, default: 0 },
  itemCount: { type: Number, default: 0 },
  lastSeenAt: { type: Date, default: Date.now, index: true },
  recoveryEmailSentAt: { type: Date, default: null },
  recoveredOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  discountCodeIssued: { type: String, default: '' },
}, { timestamps: true });

abandonedCartSchema.index({ email: 1, recoveredOrderId: 1 });

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);
