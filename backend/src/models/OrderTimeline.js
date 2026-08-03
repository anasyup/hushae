const mongoose = require('mongoose');

/**
 * Immutable audit trail of every status transition an order goes through.
 *
 * Written by `recordTransition()` in utils/orderFlow.js — never edited in place,
 * so the timeline is always a truthful history even if an order is later
 * corrected or rolled back.
 */
const timelineSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: String, required: true, index: true },

  /** Detailed pipeline stage this entry moved the order INTO. */
  status: { type: String, required: true },
  /** Stage the order was in before. Empty for the very first entry. */
  fromStatus: { type: String, default: '' },

  /** Coarse legacy status kept in sync so old screens keep working. */
  legacyStatus: { type: String, default: '' },

  note: { type: String, default: '' },
  /** 'admin' | 'system' | 'customer' | 'gateway' */
  actorType: { type: String, default: 'admin' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorName: { type: String, default: '' },

  /** Free-form extras: courier, tracking number, bulk-operation id, etc. */
  meta: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false }, minimize: false });

timelineSchema.index({ order: 1, createdAt: 1 });
timelineSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OrderTimeline', timelineSchema);
