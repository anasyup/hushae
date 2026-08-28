const express = require('express');
const AbandonedCart = require('../models/AbandonedCart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { asyncHandler, orderNumber } = require('../utils/helpers');
const { normalizePhone } = require('../utils/validators');
const { postalCheck } = require('../data/postalcodes');
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

/* Admin: recover a cart — turn it into a real order in one step.
   The merchant called (or messaged) the customer and they agreed; this
   converts the abandoned cart into a Pending order (source: admin), closes
   the cart, and it immediately shows up on the order desk. */
router.post('/admin/:id/recover', protect, adminOnly, asyncHandler(async (req, res) => {
  const cart = await AbandonedCart.findById(req.params.id);
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  if (cart.recoveredOrderId) return res.status(400).json({ message: 'This cart is already recovered' });

  const { customerInfo = {}, paymentMethod = 'COD', shippingMethod = 'standard', manualDiscount = 0, discreetPackaging = true } = req.body || {};

  // ── Customer identity ────────────────────────────────────────────────────
  const required = ['name', 'phone', 'address', 'city', 'province', 'postalCode'];
  for (const f of required) {
    if (!customerInfo[f] || !String(customerInfo[f]).trim()) {
      return res.status(400).json({ message: `Please provide ${f}` });
    }
  }
  const phoneNorm = normalizePhone(customerInfo.phone);
  if (!phoneNorm) {
    return res.status(400).json({ message: 'Invalid phone number — enter a Pakistani mobile number (03XX-XXXXXXX)' });
  }
  const pc = postalCheck(customerInfo.postalCode, String(customerInfo.province || '').trim(), String(customerInfo.city || '').trim());
  if (!pc.ok) return res.status(400).json({ message: pc.message, suggestion: pc.suggestion || '' });

  if (!cart.items || cart.items.length === 0) {
    return res.status(400).json({ message: 'This cart has no items — nothing to recover' });
  }

  // ── Line items — re-validate price/variant/stock against the catalogue ──
  const { allocateOrderLines, pickVariant } = require('../utils/inventoryEngine');
  const OrderTimeline = require('../models/OrderTimeline');
  const flow = require('../utils/orderFlow');
  const reservedNumber = orderNumber();
  const lineItems = [];
  for (const it of cart.items) {
    const qty = Math.max(1, Math.min(parseInt(it.quantity || '1', 10), 10));
    const product = await Product.findOne({ _id: it.product, isActive: true, status: { $ne: 'draft' } });
    if (!product) {
      return res.status(409).json({ message: `"${it.name || 'An item'}" is no longer available.`, reason: 'unavailable' });
    }
    if (it.size && product.sizes.length && !product.sizes.includes(it.size)) {
      return res.status(400).json({ message: `Size "${it.size}" is no longer available for "${product.name}".`, reason: 'size-unavailable' });
    }
    const size = it.size || product.sizes[0] || '';
    const color = it.color || product.colors[0]?.name || '';
    const v = pickVariant(product, size, color);
    const unit = (v && v.price != null) ? Number(v.price) : product.price;
    lineItems.push({
      product: product._id, name: product.name, slug: product.slug,
      image: (v && v.image) || product.images[0]?.url || '', size, color,
      price: unit, costPrice: (v && v.costPrice != null) ? Number(v.costPrice) : (product.costPrice || 0),
      quantity: qty, lineTotal: unit * qty,
      reservedQty: qty, fulfilledQty: 0, cancelledQty: 0, returnedQty: 0,
    });
  }
  try {
    await allocateOrderLines({ lines: lineItems, orderNumber: reservedNumber, actor: req.user?.email || 'admin' });
  } catch (e) {
    return res.status(e.status || 409).json({ message: e.message || 'Not enough stock', reason: 'out-of-stock' });
  }

  const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);

  // ── Shipping + tax from the store's own settings ─────────────────────────
  const settings = (await Settings.findOne({ key: 'store' })) || (await Settings.create({ key: 'store' }));
  const shipMethods = (settings.checkout && settings.checkout.shippingMethods) || [];
  const chosenShip = shipMethods.find((m) => m.id === shippingMethod && m.enabled);
  const free = subtotal >= (settings.freeShippingThreshold || 0);
  const shippingCharge = chosenShip
    ? (chosenShip.freeEligible !== false && free ? 0 : Number(chosenShip.rate) || 0)
    : (free ? 0 : settings.shippingFlatRate || 0);
  const taxPercent = Number(settings.cart && settings.cart.taxPercent) || 0;
  const tax = taxPercent > 0 ? Math.round((subtotal * taxPercent) / 100) : 0;
  const discount = Math.min(Math.max(0, Number(manualDiscount) || 0), subtotal);
  const total = Math.max(0, subtotal - discount + shippingCharge + tax);

  // ── Allowed payment method (mirror of the public checkout rule) ──────────
  const list = (settings.checkout && settings.checkout.paymentList) || [];
  const migrated = !!(settings.checkout && settings.checkout.checkoutMigrated);
  const legacy = settings.paymentMethods || {};
  const legacyMap = { COD: 'cod', JazzCash: 'jazzcash', EasyPaisa: 'easypaisa', 'Bank Transfer': 'bank' };
  const allowed = list.length
    ? list.filter((m) => m.comingSoon ? false : !migrated && legacyMap[m.id] !== undefined && legacy[legacyMap[m.id]] !== undefined ? !!legacy[legacyMap[m.id]] : !!m.enabled).map((m) => m.id)
    : Object.keys(legacyMap).filter((k) => legacy[legacyMap[k]]);
  if (!allowed.includes(paymentMethod)) {
    return res.status(400).json({ message: 'That payment method is not available. Please choose another.' });
  }

  const order = await Order.create({
    orderNumber: reservedNumber,
    source: 'admin',
    adminCreatedById: req.user?._id || null,
    abandonedCartId: cart._id,
    customer: cart.customer || null,
    customerInfo: {
      name: String(customerInfo.name).trim(),
      email: String(customerInfo.email || cart.email || '').trim(),
      phone: phoneNorm,
      address: String(customerInfo.address).trim(),
      city: String(customerInfo.city).trim(),
      province: String(customerInfo.province).trim(),
      postalCode: String(customerInfo.postalCode || '').trim(),
      notes: String(customerInfo.notes || '').trim(),
    },
    items: lineItems,
    subtotal, discount, tax, taxPercent, shippingCharge,
    total,
    paymentMethod,
    paymentStatus: 'Pending',
    status: 'Pending',
    statusHistory: [{ status: 'Pending', note: 'Recovered from abandoned cart by staff' }],
    shippingMethod,
    discreetPackaging: !!discreetPackaging,
    adminNotes: String(customerInfo.notes || '').trim(),
  });

  // Close the cart — it is now a real order.
  cart.recoveredOrderId = order._id;
  await cart.save();

  // Events (fire-and-forget where safe)
  if (order.customer) {
    require('../utils/customerActivity').recordCustomerActivity({
      customer: order.customer,
      type: 'purchase',
      objectType: 'order',
      objectId: order._id,
      objectLabel: order.orderNumber,
      source: 'admin',
      metadata: { total: Number(order.total || 0), itemCount: (order.items || []).reduce((n, item) => n + (item.quantity || 0), 0) },
    }).catch(() => {});
  }
  try { flow.notify({ type: 'order.created', severity: 'info', order, title: `New order ${order.orderNumber}`, body: `Recovered from abandoned cart by ${req.user?.name || 'staff'} — ${paymentMethod} · PKR ${total.toLocaleString()}` }).catch(() => {}); } catch { /* noop */ }
  try { await OrderTimeline.create({ order: order._id, action: 'created', note: `Recovered from abandoned cart by ${req.user?.name || req.user?.email || 'staff'}` }); } catch { /* noop */ }
  if (order.customerInfo.email) {
    try { require('../utils/mailer').sendOrderConfirmation(order).catch(() => {}); } catch { /* noop */ }
  }

  res.status(201).json({ order, cart });
}));

/* Admin: link an already-placed order to this cart. Use when the customer
   ordered through checkout after we started chasing them — the cart then
   closes against that order and the recovery stats count it. */
router.post('/admin/:id/link-order', protect, adminOnly, asyncHandler(async (req, res) => {
  const cart = await AbandonedCart.findById(req.params.id);
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  if (cart.recoveredOrderId) return res.status(400).json({ message: 'This cart is already recovered' });

  const on = String(req.body?.orderNumber || '').trim();
  if (!on) return res.status(400).json({ message: 'Enter an order number' });
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const order = await Order.findOne({ orderNumber: { $regex: new RegExp(`^${esc(on)}$`, 'i') } });
  if (!order) return res.status(404).json({ message: `Order "${on}" not found` });

  cart.recoveredOrderId = order._id;
  await cart.save();
  res.json({
    ok: true,
    order: { _id: order._id, orderNumber: order.orderNumber, total: order.total, status: order.status },
    cart,
  });
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
