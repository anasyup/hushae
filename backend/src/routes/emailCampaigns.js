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

const router = express.Router();

/* Daily cap — Brevo free plan allows 300 emails/day and the loop below must
   never blow past it silently. 280 keeps headroom for transactional emails. */
const DAILY_CAP = 280;
const campaignLimit = rateLimit({
  windowMs: 24 * 3600 * 1000, max: 10, key: 'email-campaign',
  message: 'Too many campaigns today — email limits reached, try tomorrow',
});

/* Wrap a plain-text body in the store's quiet editorial shell. Reused by every
   campaign so the merchant writes words, not HTML. */
function wrapBody(body) {
  const text = String(body || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0E0E0E;max-width:560px;margin:0 auto;padding:32px 20px;line-height:1.6;background:#F7F5F1">
      <p style="font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#6E6E6B;margin:0 0 24px">HUSHAE</p>
      <div style="font-size:15px">${text}</div>
      <p style="font-size:11px;color:#6E6E6B;margin-top:32px;border-top:1px solid #E3E2DF;padding-top:16px">
        HUSHAE — Made in Pakistan · Worn worldwide soon.<br/>
        You received this because you are on the HUSHAE list.
      </p>
    </div>`;
}

/** Resolve the recipient candidate list for a target. Returns { emails: Set } */
async function resolveRecipients(target, groupId) {
  const emails = new Set();

  if (target === 'subscribers') {
    const subs = await Subscriber.find({}).select('email').lean();
    for (const s of subs) if (s.email) emails.add(String(s.email).toLowerCase());
    return emails;
  }

  // Group target — evaluate live rules, keep registered users who opted in.
  const group = groupId ? await CustomerGroup.findById(groupId).lean() : null;
  const members = group ? await evaluateGroup(group.rules || {}, { limit: 5000 }) : [];
  const userIds = members.filter((m) => m.user).map((m) => m.user._id);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds }, deletedAt: null }).select('email notify emailVerified').lean()
    : [];
  for (const u of users) {
    if (u.email && u.notify?.marketingEmail === true) emails.add(String(u.email).toLowerCase());
  }
  return emails;
}

/* ============================================================================
 * ADMIN — campaign CRUD. All routes protected.
 * ========================================================================== */

/** POST /api/email-campaigns — create + send. */
router.post('/', protect, adminOnly, campaignLimit, asyncHandler(async (req, res) => {
  const { target = 'group', groupId = null, subject = '', body = '' } = req.body || {};

  if (!String(subject).trim()) return res.status(400).json({ message: 'Subject is required' });
  if (!String(body).trim()) return res.status(400).json({ message: 'Message is required' });
  if (!['group', 'subscribers'].includes(target)) return res.status(400).json({ message: 'Invalid target' });
  if (target === 'group' && !groupId) return res.status(400).json({ message: 'Choose a customer group' });

  const group = target === 'group' ? await CustomerGroup.findById(groupId).lean() : null;
  if (target === 'group' && !group) return res.status(404).json({ message: 'Group not found' });

  const emails = await resolveRecipients(target, groupId);
  const recipients = [...emails];

  const campaign = await EmailCampaign.create({
    subject: String(subject).trim(),
    body: String(body),
    target,
    groupId: group?._id || null,
    groupName: group?.name || (target === 'subscribers' ? 'Newsletter subscribers' : ''),
    matched: recipients.length,
    optedIn: recipients.length,
    status: recipients.length ? 'sent' : 'empty',
    sentByName: req.user?.name || req.user?.email || '',
  });

  if (recipients.length === 0) {
    return res.json({ campaign, message: 'No eligible recipients — nobody opted into marketing emails in this group (or the list is empty).' });
  }

  // Send sequentially (SMTP), cap per run, count results.
  // mailer.sendMail returns { skipped: true } when no SMTP is configured or
  // the recipient is invalid — that is NOT a send, so it must not inflate `sent`.
  let sent = 0, failed = 0, smtpSkipped = 0, capped = 0;
  const limited = recipients.slice(0, DAILY_CAP);
  capped = recipients.length - limited.length;

  for (const email of limited) {
    try {
      const r = await sendMail({ to: email, subject: campaign.subject, html: wrapBody(campaign.body) });
      if (r && r.skipped) smtpSkipped += 1;
      else sent += 1;
    } catch {
      failed += 1;
    }
  }
  campaign.skipped = smtpSkipped + capped;
  if (sent === 0 && (failed > 0 || smtpSkipped > 0)) campaign.status = 'error';
  else if (failed > 0 || capped > 0 || smtpSkipped > 0) campaign.status = 'partial';
  else campaign.status = 'sent';
  campaign.sent = sent;
  campaign.failed = failed;
  await campaign.save();

  res.status(201).json({
    campaign,
    message: `Sent to ${sent} recipient${sent === 1 ? '' : 's'}${failed ? ` · ${failed} failed` : ''}${capped ? ` · ${capped} skipped (daily cap)` : ''}`,
  });
}));

/** GET /api/email-campaigns — history. */
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
  const [total, campaigns] = await Promise.all([
    EmailCampaign.countDocuments(),
    EmailCampaign.find().sort({ sentAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
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
