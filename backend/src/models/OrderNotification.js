const mongoose = require('mongoose');

/**
 * Admin notification feed. The Orders screen polls this to show a badge count
 * and a toast for anything raised since the last poll.
 *
 * Deliberately not user-scoped: HUSHAE runs a single admin desk today, and a
 * `readBy` array keeps the door open for per-user read state later.
 */
const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'order.created', 'order.status', 'payment.received', 'payment.expiring',
      'payment.expired', 'issue.raised', 'print.done', 'bulk.done',
      'stock.low', 'review.new', 'question.new',
    ],
    required: true,
    index: true,
  },
  severity: { type: String, enum: ['info', 'success', 'warning', 'danger'], default: 'info' },

  title: { type: String, required: true },
  body: { type: String, default: '' },

  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
  orderNumber: { type: String, default: '' },

  /** Where the toast should navigate on click. */
  link: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },

  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date, default: null },
  readBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
}, { timestamps: { createdAt: true, updatedAt: false }, minimize: false });

notificationSchema.index({ read: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OrderNotification', notificationSchema);
