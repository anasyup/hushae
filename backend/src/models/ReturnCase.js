const mongoose = require('mongoose');

const STAGES = [
  'requested', 'approved', 'label', 'in_transit', 'received',
  'inspected', 'exchange', 'refund', 'rejected', 'completed',
];

const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  sku: String,
  size: String,
  color: String,
  qty: { type: Number, default: 1, min: 1 },
  condition: { type: String, enum: ['unopened', 'used', 'damaged', 'wrong_item'], default: 'used' },
}, { _id: false });

const returnCaseSchema = new mongoose.Schema({
  rma: { type: String, required: true, unique: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: String, required: true, index: true },
  stage: { type: String, enum: STAGES, default: 'requested', index: true },
  reason: { type: String, required: true },
  notes: { type: String, default: '' },
  photos: [{ type: String }],
  items: { type: [itemSchema], default: [] },
  resolution: { type: String, enum: ['', 'refund', 'exchange', 'store_credit', 'reject'], default: '' },
  refundAmount: { type: Number, default: 0, min: 0 },
  refundShipping: { type: Boolean, default: false },
  refundTax: { type: Boolean, default: false },
  restock: { type: Boolean, default: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
  history: [{
    stage: String,
    at: { type: Date, default: Date.now },
    note: String,
    actor: String,
    _id: false,
  }],
}, { timestamps: true });

returnCaseSchema.statics.STAGES = STAGES;

module.exports = mongoose.model('ReturnCase', returnCaseSchema);
