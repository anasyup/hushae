const jwt = require('jsonwebtoken');
const User = require('../models/User');

let currentSecret = process.env.JWT_SECRET || 'hushae-default-jwt-secret';

const setJwtSecretCached = (secret) => {
  currentSecret = secret;
};

const getJwtSecretSync = () => currentSecret;

const signToken = (user) => {
  const secret = getJwtSecretSync();
  return jwt.sign({ id: user._id, role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES || '90d',
  });
};

const ADMIN_ROLES = ['admin', 'Owner', 'Manager', 'Staff', 'Warehouse', 'Support'];

const PERMISSIONS = {
  admin: ['orders', 'products', 'content', 'discounts', 'reviews', 'customers', 'settings', 'security', 'backup'],
  Owner: ['orders', 'products', 'content', 'discounts', 'reviews', 'customers', 'settings', 'security', 'backup'],
  Manager: ['orders', 'products', 'content', 'discounts', 'reviews', 'customers'],
  Staff: ['orders', 'reviews', 'customers'],
  Warehouse: ['orders', 'products'],
  Support: ['orders', 'customers', 'reviews']
};

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });
    const secret = getJwtSecretSync();
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.id);
    if (!user || !user.isActive) return res.status(401).json({ message: 'Account not found' });

    if (payload.share) {
      const Settings = require('../models/Settings');
      const s = await Settings.findOne({ key: 'store' }).select('adminShare').lean();
      const live = s?.adminShare?.linkId === payload.share
        && s.adminShare.expiresAt && new Date(s.adminShare.expiresAt) > new Date();
      if (!live) return res.status(401).json({ message: 'This share link has been turned off' });
      req.isShare = true;
    }

    if (payload.jti) {
      const live = (user.sessions || []).some((x) => x.jti === payload.jti);
      if (!live) return res.status(401).json({ message: 'This device was signed out' });
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

const optionalAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const secret = getJwtSecretSync();
      const payload = jwt.verify(token, secret);
      req.user = await User.findById(payload.id);
    }
  } catch (e) { /* ignore */ }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user && ADMIN_ROLES.includes(req.user.role)) return next();
  return res.status(403).json({ message: 'Admin access required' });
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const userPermissions = PERMISSIONS[req.user.role] || [];
    if (userPermissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ message: `Access denied: missing permission for ${permission}` });
  };
};

module.exports = { protect, optionalAuth, adminOnly, requirePermission, signToken, ADMIN_ROLES, PERMISSIONS, setJwtSecretCached, getJwtSecretSync };
