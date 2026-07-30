const express = require('express');
const Order = require('../models/Order');
const Upload = require('../models/Upload');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { normalizePhone } = require('../utils/validators');
const { getAccountPolicy } = require('../utils/accountPolicy');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();
router.use(protect);

/* Everything the account area needs about the signed-in customer, in the
   shape the UI expects. Kept in one helper so profile, address and avatar
   routes can never answer with different fields. */
const me = (u) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  addresses: u.addresses,
  avatar: u.avatar || '',
  emailVerified: !!u.emailVerified,
  notify: u.notify || {},
  createdAt: u.createdAt,
});

router.get('/orders', asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({ orders });
}));

router.get('/profile', asyncHandler(async (req, res) => {
  res.json({ user: me(req.user) });
}));

/* ---------------------------------------------------------------------------
 * Profile.
 *
 * Addresses are NOT accepted here any more. The old route replaced the whole
 * array on every profile save, so editing your name could silently wipe every
 * saved address. Addresses now have their own explicit routes below.
 * ------------------------------------------------------------------------- */
router.put('/profile', asyncHandler(async (req, res) => {
  const { name, phone } = req.body || {};
  const policy = await getAccountPolicy();

  if (name !== undefined) {
    const clean = String(name).trim();
    if (clean.length < 3) return res.status(400).json({ field: 'name', message: 'Please enter your full name' });
    req.user.name = clean;
  }

  if (phone !== undefined) {
    const raw = String(phone).trim();
    if (!raw && policy.phoneRequired) {
      return res.status(400).json({ field: 'phone', message: 'A mobile number is required' });
    }
    if (raw) {
      const norm = normalizePhone(raw);
      if (!norm) return res.status(400).json({ field: 'phone', message: 'Incorrect number — enter a Pakistani mobile (03XX-XXXXXXX)' });
      req.user.phone = norm;
    } else {
      req.user.phone = '';
    }
  }

  await req.user.save();
  res.json({ user: me(req.user) });
}));

/* ---------------------------------------------------------------------------
 * Addresses — one route per action, so a partial failure cannot destroy the
 * rest of the book.
 * ------------------------------------------------------------------------- */
const cleanAddress = (b = {}) => ({
  label: String(b.label || 'Home').trim().slice(0, 24),
  name: String(b.name || '').trim().slice(0, 80),
  phone: normalizePhone(b.phone) || String(b.phone || '').trim().slice(0, 20),
  address: String(b.address || '').trim().slice(0, 200),
  city: String(b.city || '').trim().slice(0, 60),
  province: String(b.province || '').trim().slice(0, 60),
  postalCode: String(b.postalCode || '').trim().slice(0, 10),
  isDefault: !!b.isDefault,
});

const addressValid = (a) => {
  if (a.address.length < 6) return 'Please enter the full street address';
  if (!a.city) return 'Please enter the city';
  if (!a.province) return 'Please choose the province';
  if (a.postalCode && !/^\d{5}$/.test(a.postalCode)) return 'Postal code must be 5 digits';
  return '';
};

router.post('/addresses', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  const max = Number(policy.maxAddresses) || 5;
  if ((req.user.addresses || []).length >= max) {
    return res.status(400).json({ message: `You can save up to ${max} addresses. Please remove one first.` });
  }
  const a = cleanAddress(req.body);
  const err = addressValid(a);
  if (err) return res.status(400).json({ message: err });

  // First address is always the default — the pre-save hook guarantees this,
  // but setting it here keeps the response honest without a refetch.
  if ((req.user.addresses || []).length === 0) a.isDefault = true;
  req.user.addresses.push(a);
  await req.user.save();
  res.status(201).json({ user: me(req.user) });
}));

router.put('/addresses/:id', asyncHandler(async (req, res) => {
  const target = req.user.addresses.id(req.params.id);
  if (!target) return res.status(404).json({ message: 'That address no longer exists' });

  const a = cleanAddress({ ...target.toObject(), ...req.body });
  const err = addressValid(a);
  if (err) return res.status(400).json({ message: err });

  Object.assign(target, a);
  // Promoting one address demotes the rest; the model hook settles ties.
  if (a.isDefault) req.user.addresses.forEach((x) => { x.isDefault = x._id.equals(target._id); });
  await req.user.save();
  res.json({ user: me(req.user) });
}));

router.delete('/addresses/:id', asyncHandler(async (req, res) => {
  const target = req.user.addresses.id(req.params.id);
  if (!target) return res.status(404).json({ message: 'That address no longer exists' });
  const wasDefault = target.isDefault;
  target.deleteOne();
  // Never leave the book without a default.
  if (wasDefault && req.user.addresses.length) req.user.addresses[0].isDefault = true;
  await req.user.save();
  res.json({ user: me(req.user) });
}));

router.post('/addresses/:id/default', asyncHandler(async (req, res) => {
  const target = req.user.addresses.id(req.params.id);
  if (!target) return res.status(404).json({ message: 'That address no longer exists' });
  req.user.addresses.forEach((x) => { x.isDefault = x._id.equals(target._id); });
  await req.user.save();
  res.json({ user: me(req.user) });
}));

/* ---------------------------------------------------------------------------
 * Avatar.
 *
 * The shared /uploads route is admin-only, so customers get their own narrow
 * door: images only, 2 MB, rate limited. Stored as an /api/uploads/:id
 * reference like every other image on the site — never a base64 blob on the
 * user document, which would bloat every single /me response.
 * ------------------------------------------------------------------------- */
const AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR = 2 * 1024 * 1024;
const avatarLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 12, key: 'avatar', message: 'Too many uploads — try again later' });

router.post('/avatar', avatarLimit, asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  if (!policy.avatarEnabled) return res.status(403).json({ message: 'Profile photos are switched off for this store' });

  const { mime, dataBase64 } = req.body || {};
  if (!AVATAR_MIME.includes(mime)) return res.status(400).json({ message: 'Please choose a JPG, PNG or WebP image' });
  if (typeof dataBase64 !== 'string' || !/^[A-Za-z0-9+/=\s]+$/.test(dataBase64)) {
    return res.status(400).json({ message: 'That file could not be read' });
  }
  const data = Buffer.from(dataBase64, 'base64');
  if (!data.length) return res.status(400).json({ message: 'That file is empty' });
  if (data.length > MAX_AVATAR) return res.status(400).json({ message: 'Please choose an image under 2 MB' });

  const up = await Upload.create({ mime, data, size: data.length });
  req.user.avatar = `/api/uploads/${up._id}`;
  await req.user.save();
  res.status(201).json({ user: me(req.user) });
}));

router.delete('/avatar', asyncHandler(async (req, res) => {
  req.user.avatar = '';
  await req.user.save();
  res.json({ user: me(req.user) });
}));

/* ---------------------------------------------------------------------------
 * Notification preferences.
 * ------------------------------------------------------------------------- */
router.put('/notifications', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const cur = req.user.notify || {};
  req.user.notify = {
    orderEmail: b.orderEmail !== undefined ? !!b.orderEmail : cur.orderEmail !== false,
    orderSms: b.orderSms !== undefined ? !!b.orderSms : cur.orderSms !== false,
    marketingEmail: b.marketingEmail !== undefined ? !!b.marketingEmail : !!cur.marketingEmail,
    marketingSms: b.marketingSms !== undefined ? !!b.marketingSms : !!cur.marketingSms,
  };
  await req.user.save();
  res.json({ user: me(req.user) });
}));

/* ---------------------------------------------------------------------------
 * Close account.
 *
 * SOFT delete. A hard delete would orphan every order this customer placed,
 * and those orders are the merchant's financial records — they must survive.
 * The email is released (suffixed) so the person can register again later.
 * ------------------------------------------------------------------------- */
router.post('/delete-account', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  if (!policy.allowDeleteAccount) {
    return res.status(403).json({ message: 'Accounts cannot be closed from here. Please contact us.' });
  }
  const { password } = req.body || {};
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('+password');
  if (!password || !(await user.comparePassword(password))) {
    return res.status(401).json({ field: 'password', message: 'Please enter your current password to confirm' });
  }

  const stamp = Date.now();
  user.deletedAt = new Date();
  user.isActive = false;
  user.email = `${user.email}.deleted.${stamp}`;
  user.phone = '';
  user.avatar = '';
  user.addresses = [];
  user.wishlist = [];
  await user.save();

  res.json({ ok: true, message: 'Your account has been closed. Your past orders remain with the store for its records.' });
}));

module.exports = router;
