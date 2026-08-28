const express = require('express');
const AbandonedCart = require('../models/AbandonedCart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

/*
 * Abandoned-cart tracking + recovery.
 * The storefront calls POST /track whenever a customer enters their email at
 * checkout AND their cart has items. Duplicate emails update the same doc
 * (upsert on email).
 * Admin can list, send recovery emails, delete, and see stats.
 */

const trackLimit = rateLimit({ windowMs: 60 * 1000, max: 30, key: 'ab-cart', message: 'Too many requests' });

router.post('/track', trackLimit, optionalAuth, asyncHandler(async (req, res) => {
  const { email = '', name = '', phone = '', items = [] } = req.body || {};
  const cleanEmail = String(email).trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return res.status(400).json({ message: 'Invalid email' });
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'No items' });

  // Snapshot items from DB (server-side truth for price)
  const snap = [];
  let subtotal = 0;
  for (const it of items) {
    const qty = Math.max(1, Math.min(parseInt(it.quantity || '1', 10), 10));
    const p = await Product.findById(it.product).select('name slug price images');
    if (!p) continue;
    snap.push({
      product: p._id, name: p.name, slug: p.slug,
      image: p.images?.[0]?.url || '',
      size: it.size || '', color: it.color || '',
      price: p.price, quantity: qty,
    });
    subtotal += p.price * qty;
  }

  const previous = await AbandonedCart.findOne({ email: cleanEmail, recoveredOrderId: null })
    .select('_id lastSeenAt customer').lean();
  const doc = await AbandonedCart.findOneAndUpdate(
    { email: cleanEmail, recoveredOrderId: null },
    {
      $set: {
        // Only an authenticated session may claim a cart. Existing anonymous
        // carts remain anonymous unless that same signed-in flow updates it.
        ...(req.user ? { customer: req.user._id } : {}),
        email: cleanEmail,
        name: name.trim(),
        phone: phone.trim(),
        items: snap,
        subtotal,
        itemCount: snap.reduce((n, x) => n + x.quantity, 0),
        lastSeenAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );

  // Append no more than one “abandoned cart” fact every 30 minutes. It is an
  // actual checkout capture either way; this guard simply prevents refreshes
  // from overwhelming a human-readable timeline.
  const wasRecent = previous?.lastSeenAt && (Date.now() - new Date(previous.lastSeenAt).getTime()) < 30 * 60 * 1000;
  if (req.user && !wasRecent) {
    require('../utils/customerActivity').recordCustomerActivity({
      customer: req.user._id,
      type: 'abandoned_cart',
      objectType: 'cart',
      objectId: doc._id,
      objectLabel: `${doc.itemCount || 0} item${doc.itemCount === 1 ? '' : 's'} · PKR ${Number(doc.subtotal || 0).toLocaleString('en-PK')}`,
      source: 'checkout',
      metadata: { itemCount: doc.itemCount || 0 },
    }).catch(() => {});
  }

  res.json({ ok: true, id: doc._id });
}));

/* Admin: list abandoned carts (paginated, filterable) */
router.get('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const status = req.query.status || 'open'; // open | recovered | all
  const q = {};
  if (status === 'open') q.recoveredOrderId = null;
  else if (status === 'recovered') q.recoveredOrderId = { $ne: null };

  const carts = await AbandonedCart.find(q).sort({ lastSeenAt: -1 }).limit(200).lean();
  const total = await AbandonedCart.countDocuments(q);

  // Compute aggregates
  const [openAgg, recoveredAgg, allAgg] = await Promise.all([
    AbandonedCart.aggregate([
      { $match: { recoveredOrderId: null } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$subtotal' } } },
    ]),
    AbandonedCart.aggregate([
      { $match: { recoveredOrderId: { $ne: null } } },
      { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$subtotal' } } },
    ]),
    AbandonedCart.aggregate([
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
  ]);
  const open = openAgg[0] || { count: 0, value: 0 };
  const recovered = recoveredAgg[0] || { count: 0, value: 0 };
  const all = allAgg[0] || { count: 0 };
  const recoveryRate = all.count > 0 ? Math.round((recovered.count / all.count) * 1000) / 10 : 0;

  res.json({
    carts, total,
    stats: {
      openCount: open.count, openValue: open.value,
      recoveredCount: recovered.count, recoveredValue: recovered.value,
      recoveryRate,
    },
  });
}));

/* Admin: single cart detail (detail page) — populated with the recovered
   order (number/total/status) and the linked customer profile. */
router.get('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const cart = await AbandonedCart.findById(req.params.id)
    .populate('recoveredOrderId', 'orderNumber total status paymentMethod createdAt')
    .populate('customer', 'name email phone')
    .lean();
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  res.json({ cart });
}));

/* Admin: send one recovery email */
router.post('/admin/:id/send', protect, adminOnly, asyncHandler(async (req, res) => {
  const cart = await AbandonedCart.findById(req.params.id);
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  if (cart.recoveredOrderId) return res.status(400).json({ message: 'This cart already converted' });

  const mailer = require('../utils/mailer');
  const result = await mailer.sendAbandonedCartRecovery(cart);
  cart.recoveryEmailSentAt = new Date();
  if (result?.ok) cart.discountCodeIssued = 'COMEBACK10'; // hint code
  await cart.save();
  res.json({ ok: true, mail: result, cart });
}));

/* Admin: delete a cart */
router.delete('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  await AbandonedCart.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

/* Admin: bulk auto-send to carts older than N hours (default 24h) without a send */
router.post('/admin/auto-send', protect, adminOnly, asyncHandler(async (req, res) => {
  const hours = Math.min(168, Math.max(1, parseInt(req.body?.hours || '24', 10)));
  const cutoff = new Date(Date.now() - hours * 3600000);
  const carts = await AbandonedCart.find({
    recoveredOrderId: null,
    recoveryEmailSentAt: null,
    lastSeenAt: { $lte: cutoff },
    email: { $ne: '' },
  }).limit(50);

  const mailer = require('../utils/mailer');
  let sent = 0, failed = 0;
  for (const cart of carts) {
    const r = await mailer.sendAbandonedCartRecovery(cart).catch(() => null);
    if (r?.ok) {
      cart.recoveryEmailSentAt = new Date();
      cart.discountCodeIssued = 'COMEBACK10';
      await cart.save();
      sent += 1;
    } else {
      failed += 1;
    }
  }
  res.json({ sent, failed, considered: carts.length });
}));

module.exports = router;
