const mongoose = require('mongoose');

/**
 * An email campaign sent from the admin (Shopify-style "send email to segment").
 *
 * The recipient list is NOT stored — it is evaluated at send time (from the
 * group's live rules, or the newsletter subscriber list), and this document
 * records what actually happened: how many matched, how many were eligible
 * (opted into marketing), and how many sends succeeded/failed.
 *
 * Only registered users who EXPLICITLY opted into marketing emails
 * (notify.marketingEmail === true) are eligible — the store's own promise is
 * "no spam, ever", and this model keeps that promise in code. Guests and
 * non-opted users are counted but skipped.
 */

const emailCampaignSchema = new mongoose.Schema({
  subject: { type: String, required: true, trim: true },
  body: { type: String, required: true }, // plain text — wrapped in a minimal HTML shell on send

  /* What we targeted. groupId is null for a newsletter-subscriber campaign. */
  target: { type: String, enum: ['group', 'subscribers'], default: 'group' },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerGroup', default: null },
  groupName: { type: String, default: '' },

  /* Outcome numbers — populated by the send route. */
  matched:     { type: Number, default: 0 }, // people the target matched (after dedupe)
  optedIn:     { type: Number, default: 0 }, // eligible (marketing opt-in)
  skipped:     { type: Number, default: 0 }, // matched but not eligible / no email
  sent:        { type: Number, default: 0 },
  failed:      { type: Number, default: 0 },
  status:      { type: String, enum: ['sent', 'partial', 'error', 'empty'], default: 'sent' },

  sentByName: { type: String, default: '' },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });

emailCampaignSchema.index({ sentAt: -1 });

module.exports = mongoose.model('EmailCampaign', emailCampaignSchema);
