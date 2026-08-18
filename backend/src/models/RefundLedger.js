const mongoose = require('mongoose');

const refundLedgerSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: String,
  returnCase: { type: mongoose.Schema.Types.ObjectId, ref: 'ReturnCase', default: null },
  method: { type: String, enum: ['manual', 'store_credit', 'gateway', 'cod_adjust'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'PKR' },
  includesShipping: { type: Boolean, default: false },
  includesTax: { type: Boolean, default: false },
  note: { type: String, default: '' },
  actor: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('RefundLedger', refundLedgerSchema);
