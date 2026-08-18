const mongoose = require('mongoose');

const inventoryBalanceSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantKey: { type: String, default: '' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  onHand: { type: Number, default: 0, min: 0 },
  reserved: { type: Number, default: 0, min: 0 },
  incoming: { type: Number, default: 0, min: 0 },
  damaged: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

inventoryBalanceSchema.virtual('available').get(function available() {
  return Math.max(0, (this.onHand || 0) - (this.reserved || 0));
});

inventoryBalanceSchema.index({ product: 1, variantKey: 1, warehouse: 1 }, { unique: true });

module.exports = mongoose.model('InventoryBalance', inventoryBalanceSchema);
