const mongoose = require('mongoose');

/* ============================================================================
 * WEBHOOK EVENT LOG — Phase 9 (Enhanced)
 *
 * Secure webhook processing with:
 * - Exponential backoff retry (1m, 5m, 25m, 2h, 10h)
 * - Dead-letter queue after max retries
 * - Idempotent processing via eventId deduplication
 * - Manual retry capability
 * ========================================================================== */

const MAX_RETRIES = 5;
const BACKOFF_MINUTES = [1, 5, 25, 120, 600]; // exponential: 1m, 5m, 25m, 2h, 10h

const webhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true, index: true },
  event: { type: String, required: true, index: true },
  eventId: { type: String, default: '', index: true },
  status: {
    type: String,
    enum: ['received', 'processing', 'processed', 'failed', 'retrying', 'dead_letter', 'duplicate', 'rejected'],
    default: 'received',
    index: true,
  },
  statusCode: { type: Number, default: 200 },
  responseTimeMs: { type: Number, default: 0 },

  // Retry system
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: MAX_RETRIES },
  nextRetryAt: { type: Date, default: null, index: true },
  lastRetryAt: { type: Date, default: null },
  retryHistory: [{
    at: { type: Date, default: Date.now },
    error: String,
    durationMs: Number,
    _id: false,
  }],

  // Error tracking
  errorSummary: { type: String, default: '' },
  errorCount: { type: Number, default: 0 },

  // Safe metadata only — never store raw secrets or full payloads with sensitive data
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  requestBody: { type: mongoose.Schema.Types.Mixed, default: null }, // stored for retry replay

  // Idempotency key — prevents duplicate processing
  idempotencyKey: { type: String, default: null, unique: true, sparse: true },

  // Dead letter
  deadLetteredAt: { type: Date, default: null },
  deadLetterReason: { type: String, default: '' },

  // Manual retry
  manuallyRetriedAt: { type: Date, default: null },
  manuallyRetriedBy: { type: String, default: '' },
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, createdAt: -1 });
webhookEventSchema.index({ eventId: 1, provider: 1 });
webhookEventSchema.index({ status: 1, nextRetryAt: 1 }); // for retry processor queries
webhookEventSchema.index({ status: 1, createdAt: -1 }); // for dead letter queries

/* ── Static helpers ─────────────────────────────────────────────────────── */

/**
 * Calculate next retry time using exponential backoff.
 */
webhookEventSchema.statics.getNextRetryTime = function(retryCount) {
  const minutes = BACKOFF_MINUTES[Math.min(retryCount, BACKOFF_MINUTES.length - 1)];
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Process a webhook event: record it, check idempotency, and queue for processing.
 * Returns { event, isDuplicate }.
 */
webhookEventSchema.statics.record = async function({ provider, event, eventId, metadata, requestBody }) {
  // Idempotency check
  const idempotencyKey = `${provider}:${eventId || Date.now()}:${event}`;
  const existing = await this.findOne({ idempotencyKey });
  if (existing && existing.status === 'processed') {
    return { event: existing, isDuplicate: true };
  }

  const doc = await this.create({
    provider, event, eventId: eventId || '',
    idempotencyKey,
    metadata: metadata || {},
    requestBody: requestBody || null,
    status: 'received',
  });
  return { event: doc, isDuplicate: false };
};

/**
 * Mark event as successfully processed.
 */
webhookEventSchema.methods.markProcessed = function(responseTimeMs) {
  this.status = 'processed';
  this.responseTimeMs = responseTimeMs || 0;
  this.nextRetryAt = null;
  return this.save();
};

/**
 * Mark event as failed and schedule retry or dead-letter.
 */
webhookEventSchema.methods.markFailed = function(error) {
  this.retryCount++;
  this.errorSummary = String(error || '').slice(0, 500);
  this.errorCount++;
  this.lastRetryAt = new Date();
  this.retryHistory.push({
    at: new Date(),
    error: String(error || '').slice(0, 200),
    durationMs: 0,
  });

  if (this.retryCount >= this.maxRetries) {
    this.status = 'dead_letter';
    this.deadLetteredAt = new Date();
    this.deadLetterReason = `Max retries (${this.maxRetries}) exceeded: ${this.errorSummary}`;
    this.nextRetryAt = null;
  } else {
    this.status = 'retrying';
    this.nextRetryAt = this.constructor.getNextRetryTime(this.retryCount);
  }
  return this.save();
};

/**
 * Reset for manual retry (from dead letter or failed state).
 */
webhookEventSchema.methods.resetForManualRetry = function(actor) {
  this.status = 'received';
  this.retryCount = 0;
  this.nextRetryAt = null;
  this.deadLetteredAt = null;
  this.deadLetterReason = '';
  this.manuallyRetriedAt = new Date();
  this.manuallyRetriedBy = actor || '';
  return this.save();
};

/**
 * Find events due for retry (retrying status + nextRetryAt in the past).
 */
webhookEventSchema.statics.findDueRetries = function(limit = 20) {
  return this.find({
    status: 'retrying',
    nextRetryAt: { $lte: new Date() },
  }).sort({ nextRetryAt: 1 }).limit(limit);
};

/**
 * Get dead letter queue.
 */
webhookEventSchema.statics.findDeadLetters = function(limit = 50) {
  return this.find({ status: 'dead_letter' })
    .sort({ deadLetteredAt: -1 }).limit(limit);
};

webhookEventSchema.statics.MAX_RETRIES = MAX_RETRIES;
webhookEventSchema.statics.BACKOFF_MINUTES = BACKOFF_MINUTES;

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
