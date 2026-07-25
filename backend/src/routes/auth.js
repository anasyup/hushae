const express = require('express');
const jwt = require('jsonwebtoken');
const { protect, signToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { normalizePhone, validEmail, verifyEmailDomain } = require('../utils/validators');
const { isConfigured: isOtpConfigured } = require('../utils/sms');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Brute-force walls
const loginLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 12, key: 'login', message: 'Too many sign-in attempts — try again in a few minutes' });
const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, key: 'register', message: 'Too many accounts created from your connection — try later' });

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  addresses: u.addresses, createdAt: u.createdAt,
});

router.post('/register', registerLimit, asyncHandler(async (req, res) => {
  const { name, email, password, phone, phoneToken } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (cleanName.length < 3) return res.status(400).json({ field: 'name', message: 'Please enter your full name' });
  if (!validEmail(cleanEmail)) return res.status(400).json({ field: 'email', message: 'Incorrect email address' });
  const domainOk = await verifyEmailDomain(cleanEmail);
  if (!domainOk) return res.status(400).json({ field: 'email', message: "This email address doesn't exist — use a real email" });
  if (String(password).length < 6) return res.status(400).json({ field: 'password', message: 'Password must be at least 6 characters' });
  if (!/[a-zA-Z]/.test(String(password))) return res.status(400).json({ field: 'password', message: 'Password must include at least one letter — it cannot be only numbers' });

  const phoneNorm = normalizePhone(phone);
  if (!phoneNorm) return res.status(400).json({ field: 'phone', message: 'Incorrect number — enter a Pakistani mobile (03XX-XXXXXXX)' });

  // Phone SMS/OTP verification is enforced only once a provider (WhatsApp/SMS) is connected
  if (isOtpConfigured()) {
    let verifiedPhone = null;
    try {
      const payload = jwt.verify(String(phoneToken || ''), process.env.JWT_SECRET);
      if (payload?.phv === 1 && payload?.phone === phoneNorm) verifiedPhone = payload.phone;
    } catch (e) { /* invalid token */ }
    if (!verifiedPhone) {
      return res.status(400).json({ field: 'phone', message: 'Verify your phone number first — tap "Send code" and enter the SMS code' });
    }
  }

  // Anti-scam: one account per email
  const exists = await require('../models/User').findOne({ email: cleanEmail });
  if (exists) return res.status(409).json({ field: 'email', message: 'This email is already registered — sign in instead' });

  // Anti-scam: one account per verified phone number
  const phoneUsed = await require('../models/User').findOne({ phone: phoneNorm });
  if (phoneUsed) return res.status(409).json({ field: 'phone', message: 'An account already exists on this number — sign in instead' });

  const user = await require('../models/User').create({ name: cleanName, email: cleanEmail, password, phone: phoneNorm });
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

router.post('/login', loginLimit, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await require('../models/User').findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'This account has been disabled' });
  res.json({ token: signToken(user), user: publicUser(user) });
}));

router.get('/me', protect, asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

// Change password — signed-in user only (customer or admin).
// Requires current password to prevent hijacked-token abuse.
const changePwLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, key: 'chgpw', message: 'Too many password change attempts — try again later' });
router.post('/change-password', protect, changePwLimit, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  const newPw = String(newPassword);
  if (newPw.length < 8) {
    return res.status(400).json({ field: 'newPassword', message: 'New password must be at least 8 characters' });
  }
  if (!/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
    return res.status(400).json({ field: 'newPassword', message: 'New password must include letters and numbers' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ field: 'newPassword', message: 'New password must be different from the current one' });
  }

  // Reload user with password field (protect middleware excludes it)
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const ok = await user.comparePassword(String(currentPassword));
  if (!ok) return res.status(401).json({ field: 'currentPassword', message: 'Current password is incorrect' });

  user.password = newPw; // pre-save hook re-hashes
  await user.save();

  // Rotate token so old sessions on other devices stop working
  res.json({ message: 'Password changed successfully', token: signToken(user), user: publicUser(user) });
}));

module.exports = router;
