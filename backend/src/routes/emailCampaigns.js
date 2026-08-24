const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { protect, adminOnly } = require('../middleware/auth');
const EmailCampaign = require('../models/EmailCampaign');
const CustomerGroup = require('../models/CustomerGroup');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const { evaluateGroup } = require('../utils/customerSegments');
const { sendMail } = require('../utils/mailer');
const rateLimit = require('../middleware/rateLimit');
const crypto = require('crypto');

const router = express.Router();

const DAILY_CAP = 280;
const campaignLimit = rateLimit({
  windowMs: 24 * 3600 * 1000, max: 10, key: 'email-campaign',
  message: 'Too many campaigns today — email limits reached, try tomorrow',
});

function wrapBody(body) {
  const text = String(body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0E0E0E;max-width:560px;margin:0 auto;padding:32px 20px;line-height:1.6;background:#FFFFFF">
      <p style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#6E6E6B;margin:0 0 24px">HUSHAE</p>
      <div style="font-size:15px">${text}</div>
      <p style="font-size:11px;color:#6E6E6B;margin-top:32px;border-top:1px solid #E3E2DF;padding-top:16px">
        HUSHAE — Made in Pakistan · Worn worldwide soon.<br/>
        You received this because you are on the HUSHAE list.
      </p>
    </div>`;
}

/* ============================================================================
 * Phase 6: Enhanced recipient resolution with segment support + consent
 * ========================================================================== */

/** Resolve Customer 360 segment members */
async function resolveSegmentRecipients(segment) {
  const VIP_THRESHOLD = 500000;
  const INACTIVE_DAYS = 180;
  const NEW_DAYS = 30;
  const now = Date.now();
  const inactiveCutoff = new Date(now - INACTIVE_DAYS * 86400000);
  const newCutoff = new Date(now - NEW_DAYS * 86400000);

  let query = { deletedAt: null };
  switch (String(segment).toLowerCase()) {
    case 'vip':
      query = { ...query, 'orderSummary.revenue': { $gte: VIP_THRESHOLD } };
      break;
    case 'repeat':
      query = { ...query, 'orderSummary.orders': { $gte: 2 } };
      break;
    case 'new':
      query = { ...query, createdAt: { $gte: newCutoff }, 'orderSummary.orders': { $lte: 1 } };
      break;
    case 'inactive':
      query = { ...query, $or: [
        { lastOrderAt: { $lt: inactiveCutoff } },
        { 'orderSummary.orders': 0, createdAt: { $lt: inactiveCutoff } },
      ]};
      break;
    default:
      return [];
  }

  const users = await User.find(query).select('email name consent notify').lean().limit(5000);
  return users.filter(u => {
    if (!u.email) return false;
    const explicitOptIn = u.consent?.email === 'OPTED_IN';
    const legacyOptIn = (!u.consent?.email || u.consent.email === 'UNKNOWN') && u.notify?.marketingEmail === true;
    return explicitOptIn || legacyOptIn;
  }).map(u => ({
    customerId: String(u._id),
    email: String(u.email).toLowerCase(),
    name: u.name || '',
    audienceReason: `Segment: ${segment}`,
    consentAt: u.consent?.updatedAt || null,
  }));
}

/** Resolve recipients for a target. Returns array of { customerId, email, name, audienceReason, consentAt } */
async function resolveRecipients(target, groupId, segment) {
  if (target === 'subscribers') {
    const subs = await Subscriber.find({}).select('email').lean();
    return subs.filter(s => s.email).map(s => ({
      customerId: '',
      email: String(s.email).toLowerCase(),
      name: '',
      audienceReason: 'Newsletter subscriber',
      consentAt: null,
    }));
  }

  if (target === 'segment' && segment) {
    return resolveSegmentRecipients(segment);
  }

  // Group target
  const group = groupId ? await CustomerGroup.findById(groupId).lean() : null;
  const members = group ? await evaluateGroup(group.rules || {}, { limit: 5000 }) : [];
  const userIds = members.filter(m => m.user).map(m => m.user._id);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds }, deletedAt: null }).select('email name consent notify').lean()
    : [];

  return users.filter(u => {
    if (!u.email) return false;
    const explicitOptIn = u.consent?.email === 'OPTED_IN';
    const legacyOptIn = (!u.consent?.email || u.consent.email === 'UNKNOWN') && u.notify?.marketingEmail === true;
    return explicitOptIn || legacyOptIn;
  }).map(u => ({
    customerId: String(u._id),
    email: String(u.email).toLowerCase(),
    name: u.name || '',
    audienceReason: `Group: ${group?.name || 'selected'}`,
    consentAt: u.consent?.updatedAt || null,
  }));
}

/* ============================================================================
 * ADMIN — campaign CRUD (Phase 6: Draft → Ready → Send flow)
 * ========================================================================== */

/** POST /api/email-campaigns — create as DRAFT */
router.post('/', protect, adminOnly, campaignLimit, asyncHandler(async (req, res) => {
  const { name = '', internalNote = '', previewText = '', target = 'group', groupId = null, segment = '', subject = '', body = '' } = req.body || {};

  if (!String(subject).trim()) return res.status(400).json({ message: 'Subject is required' });
  if (!String(body).trim()) return res.status(400).json({ message: 'Message is required' });
  if (!['group', 'subscribers', 'segment'].includes(target)) return res.status(400).json({ message: 'Invalid target' });
  if (target === 'group' && !groupId) return res.status(400).json({ message: 'Choose a customer group' });
  if (target === 'segment' && !segment) return res.status(400).json({ message: 'Choose a segment' });

  const group = target === 'group' ? await CustomerGroup.findById(groupId).lean() : null;
  if (target === 'group' && !group) return res.status(404).json({ message: 'Group not found' });

  // Resolve audience preview
  const recipients = await resolveRecipients(target, groupId, segment);

  const campaign = await EmailCampaign.create({
    name: String(name).trim() || String(subject).trim(),
    internalNote: String(internalNote),
    previewText: String(previewText),
    subject: String(subject).trim(),
    body: String(body),
    target,
    groupId: group?._id || null,
    groupName: group?.name || (target === 'segment' ? `Segment: ${segment}` : target === 'subscribers' ? 'Newsletter subscribers' : ''),
    segment: segment || '',
    matched: recipients.length,
    optedIn: recipients.length,
    status: 'draft',
    sentByName: req.user?.name || req.user?.email || '',
    createdBy: req.user?._id || null,
    audienceRuleSnapshot: target === 'segment' ? `segment:${segment}` : target === 'group' ? `group:${group?.name}` : 'subscribers',
  });

  res.status(201).json({
    campaign,
    audiencePreview: recipients.slice(0, 20),
    message: `Draft created — ${recipients.length} eligible recipient${recipients.length === 1 ? '' : 's'} found.`,
  });
}));

/** POST /api/email-campaigns/:id/preview — preview audience without sending */
router.post('/:id/preview', protect, adminOnly, asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

  const recipients = await resolveRecipients(campaign.target, campaign.groupId, campaign.segment);
  res.json({
    matched: recipients.length,
    optedIn: recipients.length,
    audiencePreview: recipients.slice(0, 50),
    audienceRule: campaign.audienceRuleSnapshot,
  });
}));

/** POST /api/email-campaigns/:id/send — send a draft campaign */
router.post('/:id/send', protect, adminOnly, asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

  // Idempotency: prevent re-sending a completed campaign
  if (campaign.status === 'completed' || campaign.status === 'sending') {
    return res.status(409).json({ message: 'This campaign has already been sent. Create a new campaign to send again.' });
  }

  // Resolve recipients fresh (or use snapshot if already populated)
  let recipients;
  if (campaign.recipients && campaign.recipients.length > 0) {
    recipients = campaign.recipients.filter(r => r.status === 'pending' || !r.status);
  } else {
    const freshRecipients = await resolveRecipients(campaign.target, campaign.groupId, campaign.segment);
    campaign.recipients = freshRecipients.map(r => ({ ...r, status: 'pending' }));
    recipients = campaign.recipients;
  }

  if (!recipients.length) {
    campaign.status = 'completed';
    campaign.sentAt = new Date();
    await campaign.save();
    return res.json({ campaign, message: 'No eligible recipients.' });
  }

  campaign.status = 'sending';
  campaign.matched = campaign.recipients.length;
  campaign.optedIn = campaign.recipients.length;
  campaign.idempotencyKey = campaign.idempotencyKey || crypto.randomUUID();
  await campaign.save();

  // Send
  let sent = 0, failed = 0, smtpSkipped = 0, blocked = 0;
  const limited = recipients.slice(0, DAILY_CAP);

  for (let i = 0; i < limited.length; i++) {
    const r = limited[i];
    try {
      const result = await sendMail({ to: r.email, subject: campaign.subject, html: wrapBody(campaign.body) });
      if (result && result.skipped) {
        r.status = 'skipped';
        smtpSkipped++;
      } else {
        r.status = 'sent';
        r.sentAt = new Date();
        sent++;
      }
    } catch (e) {
      r.status = 'failed';
      r.error = e.message || 'Send failed';
      failed++;
    }
    // Update recipient in campaign
    campaign.recipients[i] = r;
  }

  // Mark excess as skipped
  for (let i = limited.length; i < recipients.length; i++) {
    campaign.recipients[i].status = 'skipped';
    campaign.recipients[i].error = 'Daily cap reached';
    blocked++;
  }

  campaign.sent = sent;
  campaign.failed = failed;
  campaign.skipped = smtpSkipped + blocked;
  campaign.sentAt = new Date();
  campaign.status = sent > 0 ? (failed > 0 || campaign.skipped > 0 ? 'completed' : 'completed') : 'failed';
  await campaign.save();

  res.json({
    campaign,
    message: `Sent to ${sent} recipient${sent === 1 ? '' : 's'}${failed ? ` · ${failed} failed` : ''}${campaign.skipped ? ` · ${campaign.skipped} skipped` : ''}`,
  });
}));

/** PATCH /api/email-campaigns/:id — update draft */
router.patch('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  if (campaign.status !== 'draft') return res.status(400).json({ message: 'Can only edit draft campaigns' });

  const b = req.body;
  if (b.name !== undefined) campaign.name = b.name;
  if (b.internalNote !== undefined) campaign.internalNote = b.internalNote;
  if (b.previewText !== undefined) campaign.previewText = b.previewText;
  if (b.subject !== undefined) campaign.subject = b.subject;
  if (b.body !== undefined) campaign.body = b.body;
  if (b.target !== undefined) campaign.target = b.target;
  if (b.groupId !== undefined) campaign.groupId = b.groupId;
  if (b.segment !== undefined) campaign.segment = b.segment;
  await campaign.save();
  res.json({ campaign });
}));

/** POST /api/email-campaigns/:id/cancel — cancel a draft */
router.post('/:id/cancel', protect, adminOnly, asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  if (campaign.status === 'completed') return res.status(400).json({ message: 'Cannot cancel a sent campaign' });
  campaign.status = 'cancelled';
  await campaign.save();
  res.json({ campaign });
}));

/** GET /api/email-campaigns — history. */
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const status = req.query.status || '';
  const filter = status ? { status } : {};
  const [total, campaigns] = await Promise.all([
    EmailCampaign.countDocuments(filter),
    EmailCampaign.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-recipients').lean(),
  ]);
  res.json({ campaigns, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

/** GET /api/email-campaigns/:id — detail. */
router.get('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const campaign = await EmailCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json({ campaign });
}));

module.exports = router;
