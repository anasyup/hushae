const express = require('express');
const jwt = require('jsonwebtoken');
const { protect, signToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { normalizePhone, validEmail, verifyEmailDomain } = require('../utils/validators');

const router = express.Router();

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  addresses: u.addresses, createdAt: u.createdAt,
});

router.post('/register', asyncHandler(async (req, res) => {
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

  // Phone must be verified by SMS code first
  let verifiedPhone = null;
  try {
    const payload = jwt.verify(String(phoneToken || ''), process.env.JWT_SECRET);
    if (payload?.phv === 1 && payload?.phone === phoneNorm) verifiedPhone = payload.phone;
  } catch (e) { /* invalid token */ }
  if (!verifiedPhone) {
    return res.status(400).json({ field: 'phone', message: 'Verify your phone number first — tap "Send code" and enter the SMS code' });
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

router.post('/login', asyncHandler(async (req, res) => {
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

module.exports = router;
