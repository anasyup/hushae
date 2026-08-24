const mongoose = require('mongoose');

/* ============================================================================
 * WEBHOOK EVENT LOG — Phase 9: Secure webhook processing with audit trail
 * ========================================================================== */

const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true }, // jazzcash, safepay, whatsapp, etc.
  event: { type: String, required: true, index: true }, // payment.paid, payment.failed, etc.
  eventId: { type: String, default: '', index: true }, // provider's unique event ID for idempotency
  status: { type: String, enum: ['received', 'processed', 'failed', 'duplicate', 'rejected'], default: 'received', index: true },
  statusCode: { type: Number, default: 200 },
  responseTimeMs: { type: Number, default: 0 },
  retryCount: { type: Number, default: 0 },
  errorSummary: { type: String, default: '' },
  // Safe metadata only — never store raw secrets or full payloads with sensitive data
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  // Idempotency key — prevents duplicate processing
  idempotencyKey: { type: String, default: null, unique: true, sparse: true },
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, createdAt: -1 });
webhookEventSchema.index({ eventId: 1, provider: 1 });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
