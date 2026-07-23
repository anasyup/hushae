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
    'shippingFlatRate', 'freeShippingThreshold', 'paymentMethods', 'theme', 'offerBar', 'integrations'].forEach((f) => {
    if (b[f] !== undefined) s[f] = b[f];
  });
  await s.save();
  res.json({ settings: s });
}));

module.exports = router;
