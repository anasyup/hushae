const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const OrderIssue = require('../models/OrderIssue');
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


/* ===========================================================================
 * ORDERS — detail, invoice, reorder, cancel, return
 *
 * All of these are gated on settings.account switches that shipped in Part 1,
 * so the merchant can withdraw any of them without a deploy.
 *
 * Cancellations and returns are written into the EXISTING OrderIssue model —
 * the same records the admin order desk already reads. Giving customer
 * requests their own table would have left the merchant with two inboxes.
 * ========================================================================= */

/** Find an order that genuinely belongs to the caller. Accepts either the
 *  Mongo id or the human order number, because the account list links by
 *  number and a deep link may carry either. */
async function findOwnOrder(req, key) {
  const or = [{ orderNumber: String(key) }];
  if (/^[a-f0-9]{24}$/i.test(String(key))) or.push({ _id: key });
  return Order.findOne({ $or: or, customer: req.user._id });
}

router.get('/orders/:key', asyncHandler(async (req, res) => {
  const order = await findOwnOrder(req, req.params.key);
  if (!order) return res.status(404).json({ message: 'We could not find that order on your account' });

  // Any open cancellation/return the customer already raised, so the UI can
  // show its state instead of offering the button again.
  const issue = await OrderIssue.findOne({ order: order._id }).sort({ createdAt: -1 }).lean();
  res.json({
    order,
    request: issue ? {
      id: issue._id,
      cancellationStatus: issue.cancellationStatus,
      returnStatus: issue.returnStatus,
      refundStatus: issue.refundStatus,
      status: issue.status,
      createdAt: issue.createdAt,
    } : null,
  });
}));

/* Invoice — plain JSON. The storefront renders and prints it, so no PDF
   library ships to shoppers. The merchant's own print view is unchanged. */
router.get('/orders/:key/invoice', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  if (!policy.allowInvoice) return res.status(403).json({ message: 'Invoices are not available from here' });

  const order = await findOwnOrder(req, req.params.key);
  if (!order) return res.status(404).json({ message: 'We could not find that order on your account' });

  const Settings = require('../models/Settings');
  const st = await Settings.findOne({ key: 'store' }).lean();
  res.json({
    invoice: {
      orderNumber: order.orderNumber,
      placedAt: order.createdAt,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customer: order.customerInfo,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      couponCode: order.couponCode,
      shippingCharge: order.shippingCharge,
      tax: order.tax || 0,
      total: order.total,
      store: {
        name: st?.storeName || 'HUSHAE',
        email: st?.contactEmail || '',
        phone: st?.contactPhone || '',
      },
    },
  });
}));

/* Reorder — returns lines the storefront can add to the live cart.
   Prices come from the CURRENT product, never the historical line, or an old
   order would let someone re-buy at a stale price. Sold-out and deleted
   products are reported instead of silently dropped. */
router.post('/orders/:key/reorder', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  if (!policy.allowReorder) return res.status(403).json({ message: 'Reordering is switched off' });

  const order = await findOwnOrder(req, req.params.key);
  if (!order) return res.status(404).json({ message: 'We could not find that order on your account' });

  const lines = [];
  const unavailable = [];
  for (const it of order.items) {
    const p = await Product.findById(it.product);
    if (!p || p.isActive === false) { unavailable.push({ name: it.name, reason: 'no longer sold' }); continue; }
    if ((p.stock ?? 0) <= 0) { unavailable.push({ name: p.name, reason: 'out of stock' }); continue; }
    const sizeOk = !it.size || !(p.sizes || []).length || p.sizes.includes(it.size);
    lines.push({
      id: String(p._id),
      slug: p.slug,
      name: p.name,
      price: p.price,                       // today's price, not the old one
      image: (p.images || [])[0]?.url || '',
      size: sizeOk ? it.size : ((p.sizes || [])[0] || ''),
      color: it.color || ((p.colors || [])[0]?.name || ''),
      qty: Math.min(it.quantity, p.stock),
      sizeChanged: !sizeOk,
      priceChanged: p.price !== it.price,
    });
  }
  res.json({ lines, unavailable });
}));

/* Cancel request.
   Only offered before the parcel leaves. After dispatch the honest action is
   a return, so the server refuses rather than letting the UI promise it. */
const CANCELLABLE = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship'];

router.post('/orders/:key/cancel', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  if (!policy.allowCancelRequest) return res.status(403).json({ message: 'Cancellation requests are switched off' });

  const order = await findOwnOrder(req, req.params.key);
  if (!order) return res.status(404).json({ message: 'We could not find that order on your account' });

  if (order.status === 'Cancelled') return res.status(400).json({ message: 'This order is already cancelled' });
  if (!CANCELLABLE.includes(order.status)) {
    return res.status(400).json({ message: 'This order has already left our warehouse. Please request a return instead.' });
  }

  const existing = await OrderIssue.findOne({ order: order._id, cancellationStatus: { $in: ['Requested', 'Approved'] } });
  if (existing) return res.status(400).json({ message: 'You have already asked us to cancel this order — we are on it.' });

  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  const issue = await OrderIssue.create({
    order: order._id,
    orderNumber: order.orderNumber,
    issueType: 'Other',
    description: reason || 'Customer requested cancellation from their account',
    cancellationStatus: 'Requested',
    cancellationReason: reason,
    status: 'Open',
    openedBy: req.user._id,
    openedByName: req.user.name,
    messages: [{ kind: 'inbound', channel: 'internal', body: reason || 'Please cancel this order.', authorId: req.user._id, authorName: req.user.name }],
  });
  res.status(201).json({ ok: true, requestId: issue._id, message: 'We have received your cancellation request. Our team will confirm shortly.' });
}));

/* Return request — only makes sense once the parcel has actually arrived. */
router.post('/orders/:key/return', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  if (!policy.allowReturnRequest) return res.status(403).json({ message: 'Return requests are switched off' });

  const order = await findOwnOrder(req, req.params.key);
  if (!order) return res.status(404).json({ message: 'We could not find that order on your account' });
  if (order.status !== 'Delivered') {
    return res.status(400).json({ message: 'Returns can be requested once your order has been delivered.' });
  }

  const existing = await OrderIssue.findOne({ order: order._id, returnStatus: { $in: ['Requested', 'Approved', 'Returned'] } });
  if (existing) return res.status(400).json({ message: 'A return is already in progress for this order.' });

  const ALLOWED = ['Wrong Item', 'Damaged', 'Missing', 'Quality Issue', 'Other'];
  const issueType = ALLOWED.includes(req.body?.issueType) ? req.body.issueType : 'Other';
  const reason = String(req.body?.reason || '').trim().slice(0, 500);
  if (reason.length < 5) return res.status(400).json({ field: 'reason', message: 'Please tell us briefly what went wrong' });

  const issue = await OrderIssue.create({
    order: order._id,
    orderNumber: order.orderNumber,
    issueType,
    description: reason,
    returnStatus: 'Requested',
    status: 'Open',
    openedBy: req.user._id,
    openedByName: req.user.name,
    messages: [{ kind: 'inbound', channel: 'internal', body: reason, authorId: req.user._id, authorName: req.user.name }],
  });
  res.status(201).json({ ok: true, requestId: issue._id, message: 'Your return request is with our team. We will be in touch.' });
}));

/* ===========================================================================
 * SESSIONS / DEVICES
 * ========================================================================= */
router.get('/sessions', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  if (!policy.showSessions) return res.status(403).json({ message: 'Not available' });
  const list = (req.user.sessions || [])
    .map((s) => ({
      jti: s.jti, device: s.device, browser: s.browser, ipHint: s.ipHint,
      createdAt: s.createdAt, lastSeen: s.lastSeen,
      current: s.jti === req.jti,
    }))
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
  res.json({ sessions: list, currentKnown: !!req.jti });
}));

router.delete('/sessions/:jti', asyncHandler(async (req, res) => {
  req.user.sessions = (req.user.sessions || []).filter((s) => s.jti !== req.params.jti);
  await req.user.save();
  res.json({ ok: true });
}));

/** Sign out every device except this one. Keeping the current jti is what
 *  stops the customer logging themselves out by tidying up. */
router.post('/sessions/revoke-others', asyncHandler(async (req, res) => {
  if (!req.jti) {
    return res.status(400).json({ message: 'Please sign in again on this device first, then try.' });
  }
  const before = (req.user.sessions || []).length;
  req.user.sessions = (req.user.sessions || []).filter((s) => s.jti === req.jti);
  await req.user.save();
  res.json({ ok: true, revoked: Math.max(0, before - req.user.sessions.length) });
}));


module.exports = router;
