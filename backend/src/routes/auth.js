const express = require('express');
const { protect, signToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  addresses: u.addresses, createdAt: u.createdAt,
});

router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
  if (String(password).length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const exists = await require('../models/User').findOne({ email: String(email).toLowerCase() });
  if (exists) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await require('../models/User').create({ name, email, password, phone: phone || '' });
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
