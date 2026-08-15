const express = require('express');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const getSettings = async () =>
  (await Settings.findOne({ key: 'store' })) || (await Settings.create({ key: 'store' }));

/* ---------------------------------------------------------------------------
 * PUBLIC READ — REDACTED
 *
 * MEASURED, Sprint 2M security audit: GET /api/settings is public (the
 * storefront needs the store name, shipping thresholds, theme, CMS config) and
 * it returned the ENTIRE document, 23 KB, with no redaction whatsoever.
 * Probing the live payload for secret-shaped keys found:
 *
 *   integrations.payments.jazzcash.password
 *   integrations.payments.jazzcash.integritySalt
 *   integrations.payments.safepay.apiKey
 *   integrations.payments.safepay.secret
 *   integrations.email.pass
 *   integrations.whatsapp.webhookUrl
 *   storefrontLock.password
 *
 * All EMPTY today, which is the only reason this is not already an incident.
 * The moment the merchant pastes a live SafePay secret into the admin panel it
 * is served to every visitor of the shop.
 *
 * storefrontLock.password is worse than the others: StoreLock.jsx compares the
 * typed password against this value IN THE BROWSER, so publishing it makes the
 * gate decorative — anyone can read the password out of the API and walk in.
 * Redacting it here also fixes that, because the client now never sees it.
 *
 * The shape is PRESERVED: a redacted secret becomes '' rather than being
 * deleted, so no frontend read of `integrations.email.pass` becomes undefined
 * and no optional-chain suddenly changes branch. Booleans like `sandbox` stay,
 * because the storefront legitimately shows a test-mode notice.
 *
 * Admins are unaffected: PUT still accepts these fields, and an authenticated
 * admin reads them through GET /admin (below) which returns the full document.
 * ------------------------------------------------------------------------- */
const SECRET_PATHS = [
  'storefrontLock.password',
  'integrations.email.pass',
  'integrations.email.user',
  'integrations.whatsapp.webhookUrl',
  'integrations.payments.jazzcash.password',
  'integrations.payments.jazzcash.integritySalt',
  'integrations.payments.jazzcash.merchantId',
  'integrations.payments.safepay.apiKey',
  'integrations.payments.safepay.secret',
];

function redactPublic(doc) {
  // Plain deep clone. The document is a Mongoose doc; toObject() first so we
  // are not mutating anything cached by getSettings().
  const s = JSON.parse(JSON.stringify(doc?.toObject ? doc.toObject() : doc || {}));
  for (const path of SECRET_PATHS) {
    const parts = path.split('.');
    let node = s;
    for (let i = 0; i < parts.length - 1; i += 1) {
      node = node?.[parts[i]];
      if (!node || typeof node !== 'object') { node = null; break; }
    }
    const leaf = parts[parts.length - 1];
    // Replace with an empty string of the SAME TYPE, never delete the key —
    // a missing key changes optional-chain behaviour on the storefront.
    if (node && Object.prototype.hasOwnProperty.call(node, leaf)) node[leaf] = '';
  }
  /* A storefront still needs to know a gateway is CONFIGURED without being
     told the credentials, so expose booleans derived from the real values. */
  try {
    const p = doc?.integrations?.payments || {};
    s.integrations = s.integrations || {};
    s.integrations.payments = s.integrations.payments || {};
    s.integrations.payments.jazzcash = { ...(s.integrations.payments.jazzcash || {}), configured: !!(p.jazzcash?.merchantId && p.jazzcash?.password) };
    s.integrations.payments.safepay = { ...(s.integrations.payments.safepay || {}), configured: !!(p.safepay?.apiKey && p.safepay?.secret) };
    s.storefrontLock = { ...(s.storefrontLock || {}), hasPassword: !!doc?.storefrontLock?.password };
  } catch { /* shape guard only — never block a settings read */ }
  return s;
}

router.get('/', asyncHandler(async (req, res) => {
  const s = await getSettings();
  res.json({ settings: redactPublic(s) });
}));

/** Full document, including secrets. Admin only. */
router.get('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const s = await getSettings();
  res.json({ settings: s });
}));

/**
 * Storefront gate check.
 *
 * The password is no longer sent to the browser (see redactPublic above), so
 * the comparison has to happen here. Rate limited because this is now a
 * guessable endpoint — 10 tries per 10 minutes per IP is generous for someone
 * who was given the password and slow for someone who was not.
 *
 * Returns only a boolean. It never echoes the password back.
 */
const lockLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 10, key: 'storelock', message: 'Too many attempts — try again in a few minutes' });

router.post('/unlock', lockLimit, asyncHandler(async (req, res) => {
  const s = await getSettings();
  const real = String(s?.storefrontLock?.password || '');
  const given = String(req.body?.password || '');
  if (!real) return res.json({ ok: true });          // no gate configured
  res.json({ ok: given === real });
}));

router.put('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const b = req.body || {};
  const s = await getSettings();
  const oldValue = s.toObject ? s.toObject() : {};
  ['storeName', 'tagline', 'contactEmail', 'contactPhone', 'hero', 'trustBadges',
    'shippingFlatRate', 'freeShippingThreshold', 'cart', 'checkout', 'account', 'customerExperience', 'reviews', 'loyalty', 'paymentMethods', 'theme', 'offerBar', 'integrations', 'storefrontLock', 'cookiePopup', 'media', 'marquee', 'promoPopup', 'faq', 'operatingCosts', 'signatureSplit', 'productSections', 'header', 'footer', 'cms',
    'monthlyRevenueGoal', 'marginThresholdPercent', 'automation',
    'includeTestOrders', 'reorderTargetStock'].forEach((f) => {
    if (b[f] !== undefined) s[f] = b[f];
  });
  await s.save();
  try {
    const { logAction } = require('../utils/auditLogger');
    await logAction(req.user?.email, 'update', 'settings', s._id, oldValue, s.toObject ? s.toObject() : s);
  } catch (err) { /* ignore */ }
  /* The search engine holds the settings document for a few seconds to avoid
     a database round-trip on every query. Drop it here so the merchant sees
     their own change take effect immediately rather than up to 8s later. */
  try { require('../utils/searchEngine').invalidateSettingsCache(); } catch { /* optional */ }
  try { require('../utils/promotionEngine').invalidateCache(); } catch { /* optional */ }
  try { require('../utils/cmsEngine').invalidateCache(); } catch { /* optional */ }
  res.json({ settings: s });
}));

/** Focused endpoint for the goal / threshold widgets — avoids a full settings PUT. */
router.post('/goals', protect, adminOnly, asyncHandler(async (req, res) => {
  const s = await getSettings();
  const { monthlyRevenueGoal, marginThresholdPercent } = req.body || {};
  if (monthlyRevenueGoal !== undefined) s.monthlyRevenueGoal = Math.max(0, Number(monthlyRevenueGoal) || 0);
  if (marginThresholdPercent !== undefined) {
    s.marginThresholdPercent = Math.min(100, Math.max(0, Number(marginThresholdPercent) || 0));
  }
  await s.save();
  res.json({
    monthlyRevenueGoal: s.monthlyRevenueGoal,
    marginThresholdPercent: s.marginThresholdPercent,
  });
}));

// Test-email endpoint — admin can verify SMTP config works
router.post('/test-email', protect, adminOnly, asyncHandler(async (req, res) => {
  const to = (req.body?.to || '').trim();
  if (!to) return res.status(400).json({ ok: false, reason: 'Recipient email required' });
  const mailer = require('../utils/mailer');
  const result = await mailer.sendTest(to);
  res.json(result);
}));

module.exports = router;
