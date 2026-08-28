const mongoose = require('mongoose');

/* ===========================================================================
 * ORDER ACTIVITY — audit trail for staff edits on an order.
 * Boss requirement: customer info edits, item changes, payment updates
 * (COD → paid after support call) — sab save ho aur dashboard pe dikhe.
 * Status changes already live in order.statusHistory; this captures the
 * rest, and the order page merges both into one timeline.
 * ========================================================================== */
const orderActivitySchema = new mongoose.Schema({
  order:       { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: String, required: true, index: true },
  action:      { type: String, required: true }, // customer.updated | items.updated | payment.updated | status.updated
  summary:     { type: String, default: '' },
  actor:       { type: String, default: 'staff' },
  meta:        { type: mongoose.Schema.Types.Mixed, default: null },
  at:          { type: Date, default: Date.now, index: true },
}, { _id: true });

orderActivitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('OrderActivity', orderActivitySchema);
