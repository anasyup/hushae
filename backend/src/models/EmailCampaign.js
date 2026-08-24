const mongoose = require('mongoose');

/* ============================================================================
 * EMAIL CAMPAIGN MODEL — Phase 6 Enhanced
 *
 * Original fields preserved. Phase 6 additions:
 * - Campaign name + internal note + preview text
 * - DRAFT/READY/SENDING/COMPLETED/FAILED/CANCELLED states
 * - Recipient snapshot (prevents segment changes affecting sent campaigns)
 * - Audience rule snapshot
 * - Idempotency tracking
 * ========================================================================== */

const recipientSchema = new mongoose.Schema({
  customerId: { type: String, default: '' },
  email: { type: String, default: '' },
  name: { type: String, default: '' },
  audienceReason: { type: String, default: '' },
  consentAt: { type: Date, default: null },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped', 'blocked'], default: 'pending' },
  error: { type: String, default: '' },
  sentAt: { type: Date, default: null },
}, { _id: true });

const emailCampaignSchema = new mongoose.Schema({
  // Phase 6: Campaign identity
  name: { type: String, default: '', trim: true },
  internalNote: { type: String, default: '' },
  previewText: { type: String, default: '' },

  subject: { type: String, required: true, trim: true },
  body: { type: String, required: true },

  // Target: group (CustomerGroup), subscribers, segment (Customer 360)
  target: { type: String, enum: ['group', 'subscribers', 'segment'], default: 'group' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerGroup', default: null },
  groupName: { type: String, default: '' },
  // Phase 6: Customer 360 segment targeting
  segment: { type: String, default: '' }, // VIP, Repeat, New, Inactive

  // Phase 6: Lifecycle states
  status: { type: String, enum: ['draft', 'ready', 'sending', 'completed', 'failed', 'cancelled'], default: 'draft', index: true },

  // Original metrics (preserved)
  matched:     { type: Number, default: 0 },
  optedIn:     { type: Number, default: 0 },
  skipped:     { type: Number, default: 0 },
  sent:        { type: Number, default: 0 },
  failed:      { type: Number, default: 0 },

  // Phase 6: Recipient snapshot
  recipients: { type: [recipientSchema], default: [] },
  // Snapshot of the audience rule at send time
  audienceRuleSnapshot: { type: String, default: '' },

  sentByName: { type: String, default: '' },
  sentAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Phase 6: Idempotency — prevents duplicate sends
  idempotencyKey: { type: String, default: null, unique: true, sparse: true },
}, { timestamps: true });

emailCampaignSchema.index({ sentAt: -1 });
emailCampaignSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
