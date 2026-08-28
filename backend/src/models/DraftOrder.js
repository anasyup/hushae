const mongoose = require('mongoose');

/* ===========================================================================
 * DRAFT ORDER — a saved, not-yet-placed order built by staff (Shopify-style).
 * Holds the exact payload the manual-order endpoint accepts, so converting a
 * draft runs the same validation + stock allocation as a typed order.
 * estimatedTotal is a display snapshot (recalculated on every save).
 * ========================================================================== */
const draftOrderSchema = new mongoose.Schema({
  customerInfo: {
    name:       { type: String, required: true, trim: true },
    phone:      { type: String, required: true, trim: true },
    email:      { type: String, default: '', trim: true },
    address:    { type: String, default: '', trim: true },
    city:       { type: String, default: '', trim: true },
    province:   { type: String, default: '', trim: true },
    postalCode: { type: String, default: '', trim: true },
  },
  items: {
    type: [{
      _id: false,
      product:  { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      name:     { type: String, default: '' },
      size:     { type: String, default: '' },
      quantity: { type: Number, default: 1, min: 1, max: 10 },
      price:    { type: Number, default: 0 },
    }],
    validate: [(v) => Array.isArray(v) && v.length > 0, 'Add at least one product'],
  },
  notes:          { type: String, default: '' },
  manualDiscount: { type: Number, default: 0, min: 0 },
  paymentMethod:  { type: String, default: 'COD' },
  estimatedTotal: { type: Number, default: 0 },
  createdBy:      { type: String, default: '' },
}, { timestamps: true });

draftOrderSchema.index({ updatedAt: -1 });
draftOrderSchema.index({ 'customerInfo.name': 1 });
draftOrderSchema.index({ 'customerInfo.phone': 1 });

module.exports = mongoose.model('DraftOrder', draftOrderSchema);
