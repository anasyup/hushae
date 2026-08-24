const mongoose = require('mongoose');

/* ============================================================================
 * EXTENSION EVENT SUBSCRIPTION — Phase 9
 *
 * Extensions subscribe to commerce events. When events fire, the system
 * delivers them to registered handlers (webhooks, internal hooks, etc).
 *
 * Event types follow the convention: domain.action
 * e.g., order.created, payment.paid, customer.updated, product.deleted
 * ========================================================================== */

const EVENT_TYPES = [
  // Orders
  'order.created', 'order.updated', 'order.cancelled', 'order.refunded',
  'order.status_changed', 'order.shipped', 'order.delivered',
  // Payments
  'payment.created', 'payment.paid', 'payment.failed', 'payment.refunded',
  // Products
  'product.created', 'product.updated', 'product.deleted',
  'product.stock_low', 'product.stock_out',
  // Customers
  'customer.created', 'customer.updated', 'customer.segment_changed',
  // Marketing
  'promotion.created', 'promotion.activated', 'promotion.expired',
  'campaign.sent', 'campaign.failed',
  'coupon.redeemed',
  // Extensions
  'extension.installed', 'extension.enabled', 'extension.disabled', 'extension.uninstalled',
];

const DELIVERY_METHODS = ['internal', 'webhook_url', 'log_only'];

const extensionEventSchema = new mongoose.Schema({
  // Which extension owns this subscription
  extensionId: { type: String, required: true, index: true },

  // What event to listen for
  eventType: { type: String, required: true, enum: EVENT_TYPES, index: true },

  // How to deliver the event
  deliveryMethod: { type: String, enum: DELIVERY_METHODS, default: 'internal' },
  webhookUrl: { type: String, default: '' },
  webhookSecret: { type: String, default: '' }, // HMAC secret for webhook signing

  // State
  active: { type: Boolean, default: true },

  // Delivery tracking
  lastDeliveredAt: { type: Date, default: null },
  lastDeliveryStatus: { type: String, enum: ['success', 'failed', null], default: null },
  deliveryCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },

  // Filter: only deliver if event metadata matches these conditions
  // e.g., { 'status': 'Delivered' } means only fire for delivered orders
  filter: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

extensionEventSchema.index({ eventType: 1, active: 1 });
extensionEventSchema.index({ extensionId: 1, eventType: 1 }, { unique: true });

extensionEventSchema.statics.EVENT_TYPES = EVENT_TYPES;
extensionEventSchema.statics.DELIVERY_METHODS = DELIVERY_METHODS;

module.exports = mongoose.model('ExtensionEvent', extensionEventSchema);
