const express = require('express');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

const getSettings = async () =>
  (await Settings.findOne({ key: 'store' })) || (await Settings.create({ key: 'store' }));

router.get('/', asyncHandler(async (req, res) => {
  const s = await getSettings();
  res.json({ settings: s });
}));

router.put('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const b = req.body || {};
  const s = await getSettings();
  ['storeName', 'tagline', 'contactEmail', 'contactPhone', 'hero', 'trustBadges',
    'shippingFlatRate', 'freeShippingThreshold', 'cart', 'checkout', 'account', 'customerExperience', 'reviews', 'loyalty', 'paymentMethods', 'theme', 'offerBar', 'integrations', 'storefrontLock', 'cookiePopup', 'media', 'marquee', 'promoPopup', 'faq', 'operatingCosts', 'signatureSplit', 'productSections', 'header', 'footer',
    'monthlyRevenueGoal', 'marginThresholdPercent'].forEach((f) => {
    if (b[f] !== undefined) s[f] = b[f];
  });
  await s.save();
  /* The search engine holds the settings document for a few seconds to avoid
     a database round-trip on every query. Drop it here so the merchant sees
     their own change take effect immediately rather than up to 8s later. */
  try { require('../utils/searchEngine').invalidateSettingsCache(); } catch { /* optional */ }
  try { require('../utils/promotionEngine').invalidateCache(); } catch { /* optional */ }
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
