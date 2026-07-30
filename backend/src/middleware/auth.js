const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 90 days. The merchant signs in once and the admin console then opens
// straight from a bookmark for a quarter — the password is still the only way
// in, it is simply not asked for again on a device that already proved itself.
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '90d',
  });

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Account not found' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired session' });
  }
};

// Optional auth: attaches req.user if a valid token is present, never blocks.
const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(payload.id);
    }
  } catch (e) { /* ignore */ }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
};

module.exports = { protect, optionalAuth, adminOnly, signToken };
