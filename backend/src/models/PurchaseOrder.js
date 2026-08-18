const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantKey: { type: String, default: '' },
  name: String,
  sku: String,
  qtyOrdered: { type: Number, required: true, min: 1 },
  qtyReceived: { type: Number, default: 0, min: 0 },
  unitCost: { type: Number, default: 0, min: 0 },
}, { _id: false });

const purchaseOrderSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  status: { type: String, enum: ['draft', 'sent', 'partial', 'received', 'cancelled'], default: 'draft', index: true },
  lines: { type: [lineSchema], default: [] },
  expectedAt: { type: Date, default: null },
  notes: { type: String, default: '' },
  receivedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
