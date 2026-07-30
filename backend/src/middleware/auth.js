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

    // Share-link tokens carry the id of the link that minted them. Revoking
    // the link clears that id, which kills every token issued from it at once
    // — without touching the owner's own session.
    if (payload.share) {
      const Settings = require('../models/Settings');
      const s = await Settings.findOne({ key: 'store' }).select('adminShare').lean();
      const live = s?.adminShare?.linkId === payload.share
        && s.adminShare.expiresAt && new Date(s.adminShare.expiresAt) > new Date();
      if (!live) return res.status(401).json({ message: 'This share link has been turned off' });
      req.isShare = true;
    }

    /* Session revocation.
       A token that carries a `jti` is only valid while that jti is still in
       the user's session list. This is what makes "sign out my other devices"
       real — without it the button would clear a list and change nothing.

       Tokens minted before this shipped have no jti; they stay valid so
       nobody is signed out by the deploy itself. */
    if (payload.jti) {
      const live = (user.sessions || []).some((x) => x.jti === payload.jti);
      if (!live) return res.status(401).json({ message: 'This device was signed out' });
      // Touch lastSeen at most once a minute — this runs on every request.
      const s = user.sessions.find((x) => x.jti === payload.jti);
      if (s && Date.now() - new Date(s.lastSeen).getTime() > 60000) {
        s.lastSeen = new Date();
        user.save().catch(() => {});
      }
      req.jti = payload.jti;
    }

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
