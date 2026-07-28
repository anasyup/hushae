const mongoose = require('mongoose');

/**
 * Customer-service record attached to an order: the complaint, the refund /
 * return / cancellation state it triggered, and the conversation around it.
 */
const messageSchema = new mongoose.Schema({
  /** 'note' = internal only, never shown to the customer. */
  kind: { type: String, enum: ['note', 'outbound', 'inbound'], default: 'note' },
  channel: { type: String, default: 'internal' },        // internal | whatsapp | email | sms | call
  body: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  authorName: { type: String, default: '' },
  at: { type: Date, default: Date.now },
}, { _id: false });

const issueSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderNumber: { type: String, required: true, index: true },

  issueType: {
    type: String,
    enum: ['Wrong Item', 'Damaged', 'Missing', 'Quality Issue', 'Late Delivery', 'Other'],
    required: true,
  },
  severity: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' },
  description: { type: String, default: '' },

  refundStatus: {
    type: String,
    enum: ['No Issue', 'Refund Requested', 'Refund Approved', 'Refund Sent', 'Completed', 'Rejected'],
    default: 'No Issue',
    index: true,
  },
  refundAmount: { type: Number, default: 0 },

  returnStatus: {
    type: String,
    enum: ['Not Required', 'Requested', 'Approved', 'Returned', 'Completed', 'Rejected'],
    default: 'Not Required',
  },
  returnTrackingNumber: { type: String, default: '' },

  cancellationStatus: {
    type: String,
    enum: ['No Cancellation', 'Requested', 'Approved', 'Cancelled', 'Rejected'],
    default: 'No Cancellation',
  },
  cancellationReason: { type: String, default: '' },

  status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open', index: true },
  resolvedAt: { type: Date, default: null },

  messages: { type: [messageSchema], default: [] },

  openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  openedByName: { type: String, default: '' },
}, { timestamps: true, minimize: false });

issueSchema.index({ order: 1, createdAt: -1 });
issueSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('OrderIssue', issueSchema);
