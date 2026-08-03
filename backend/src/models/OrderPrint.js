const mongoose = require('mongoose');

/**
 * Print history — every invoice, packing slip and pick list that was
 * generated, by whom and when. The order document caches the latest state per
 * document type so the list view can badge without a join.
 */
const printSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: String, required: true, index: true },

  docType: { type: String, enum: ['invoice', 'packing_slip', 'pick_list'], required: true, index: true },
  /** Increments each time the same document is reprinted. */
  copy: { type: Number, default: 1 },

  printedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  printedByName: { type: String, default: '' },

  /** Set when the document was produced as part of a bulk run. */
  batchId: { type: String, default: '', index: true },
  note: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false } });

printSchema.index({ order: 1, docType: 1, createdAt: -1 });

module.exports = mongoose.model('OrderPrint', printSchema);
