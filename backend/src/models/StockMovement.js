const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantKey: { type: String, default: '', index: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  type: {
    type: String,
    enum: ['receive', 'adjust', 'transfer_out', 'transfer_in', 'sale', 'return', 'count'],
    required: true,
    index: true,
  },
  qty: { type: Number, required: true },
  balanceAfter: { type: Number, default: 0 },
  refType: { type: String, default: '' },
  refId: { type: String, default: '' },
  note: { type: String, default: '' },
  actor: { type: String, default: '' },
}, { timestamps: true });

stockMovementSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StockMovement', stockMovementSchema);
