const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Discount = require('../models/Discount');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { asyncHandler, orderNumber, evaluateDiscount } = require('../utils/helpers');
const { postalCheck } = require('../data/postalcodes');
const { normalizePhone } = require('../utils/validators');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Order-spam wall: a real customer never needs more than a few attempts
const placeOrderLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 8, key: 'place-order', message: 'Too many order attempts — please wait a few minutes and try again' });

const digits = (s) => String(s || '').replace(/\D/g, '');
const phoneTail = (s) => digits(s).slice(-10); // forgiving match: 0300... / +92300...

// ---- Place order (guest or logged-in) ----
router.post('/', placeOrderLimit, optionalAuth, asyncHandler(async (req, res) => {
  const { customerInfo = {}, items = [], paymentMethod, transactionId = '', discountCode = '', discreetPackaging = true, shippingMethod = 'standard' } = req.body || {};

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

  // Postal code: province/city ke hisaab se verify (delivery isi par depend karti hai)
  const pc = postalCheck(customerInfo.postalCode, customerInfo.province.trim(), customerInfo.city.trim());
  if (!pc.ok) return res.status(400).json({ message: pc.message, suggestion: pc.suggestion || '' });

  // Pin location (optional) — agar hai to Pakistan ke andar honi chahiye
  let location = { lat: null, lng: null, mapsLink: '' };
  if (customerInfo.location && customerInfo.location.lat != null && customerInfo.location.lng != null) {
    const lat = Number(customerInfo.location.lat); const lng = Number(customerInfo.location.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ message: 'The map location is invalid' });
    }
    if (lat < 23.4 || lat > 37.2 || lng < 60.4 || lng > 78) {
      return res.status(400).json({ message: 'That location is outside Pakistan' });
    }
    location = { lat, lng, mapsLink: `https://www.google.com/maps?q=${lat},${lng}` };
  }
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Your cart is empty' });
  if (!['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer'].includes(paymentMethod)) {
    return res.status(400).json({ message: 'Please choose a payment method' });
  }

  const settings = (await Settings.findOne({ key: 'store' })) || (await Settings.create({ key: 'store' }));

  // Validate + price from DB, decrement stock atomically per line
  const lineItems = [];
  for (const it of items) {
    const qty = Math.max(1, Math.min(parseInt(it.quantity || '1', 10), 10));
    const product = await Product.findOneAndUpdate(
      { _id: it.product, isActive: true, status: { $ne: 'draft' }, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );
    if (!product) {
      // Fetch the product to give a specific error message
      const original = await Product.findById(it.product).select('name stock isActive status');
      const itemName = original?.name || it.name || 'an item';
      if (!original || !original.isActive || original.status === 'draft') {
        return res.status(409).json({
          message: `"${itemName}" is no longer available.`,
          productId: it.product,
          reason: 'unavailable',
          itemName,
        });
      }
      return res.status(409).json({
        message: `"${itemName}" is out of stock (only ${original.stock} left, you have ${qty} in your cart).`,
        productId: it.product,
        reason: 'out-of-stock',
        itemName,
        available: original.stock,
      });
    }
    if (it.size && product.sizes.length && !product.sizes.includes(it.size)) {
      await Product.findByIdAndUpdate(product._id, { $inc: { stock: qty } });
      return res.status(400).json({
        message: `Size "${it.size}" is no longer available for "${product.name}".`,
        productId: product._id,
        reason: 'size-unavailable',
        itemName: product.name,
      });
    }
    lineItems.push({
      product: product._id, name: product.name, slug: product.slug,
      image: product.images[0]?.url || '', size: it.size || product.sizes[0] || '',
      color: it.color || product.colors[0]?.name || '',
      price: product.price,
      costPrice: product.costPrice || 0, // snapshot cost for profit tracking
      quantity: qty, lineTotal: product.price * qty,
    });
  }

  const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);

  // Coupon (validated server-side; on failure restore stock and stop)
  let discountAmount = 0;
  let appliedCode = '';
  if (discountCode && String(discountCode).trim()) {
    const d = await Discount.findOne({ code: String(discountCode).trim().toUpperCase() });
    const r = evaluateDiscount(d, subtotal);
    if (!r.ok) {
      for (const li of lineItems) await Product.findByIdAndUpdate(li.product, { $inc: { stock: li.quantity } });
      return res.status(400).json({ message: r.message });
    }
    discountAmount = r.amount;
    appliedCode = d.code;
    await Discount.findByIdAndUpdate(d._id, { $inc: { usedCount: 1 } });
  }

  /* --------------------------------------------------------------------
   * Money. The SERVER is authoritative — the client sends what the customer
   * chose, never what they should be charged.
   *
   * Order of operations must match the storefront's useCartPricing exactly:
   *   discount applies to goods only, free shipping is judged AFTER discount,
   *   tax is a percentage of the discounted goods total.
   * A mismatch here is a live money bug: before this, the client added tax
   * and the server did not, so switching tax on would have quoted a total
   * the server never charged.
   * ------------------------------------------------------------------ */
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // Chosen shipping method, validated against the merchant's own list.
  const shipMethods = (settings.checkout && settings.checkout.shippingMethods) || [];
  const chosenShip = shipMethods.find((m) => m.id === shippingMethod && m.enabled);
  const baseShipping = afterDiscount >= settings.freeShippingThreshold ? 0 : settings.shippingFlatRate;
  // A method's own rate replaces the flat rate; free-shipping still wins when
  // the method allows it (Express deliberately does not).
  const shippingCharge = chosenShip
    ? (chosenShip.freeEligible !== false && baseShipping === 0 ? 0 : Number(chosenShip.rate) || 0)
    : baseShipping;

  const taxPercent = Number(settings.cart && settings.cart.taxPercent) || 0;
  const tax = taxPercent > 0 ? Math.round((afterDiscount * taxPercent) / 100) : 0;

  const total = afterDiscount + shippingCharge + tax;

  const order = await Order.create({
    orderNumber: orderNumber(),
    customer: req.user ? req.user._id : null,
    customerInfo: {
      name: customerInfo.name.trim(), email: (customerInfo.email || '').trim(),
      phone: phoneNorm, address: customerInfo.address.trim(),
      city: customerInfo.city.trim(), province: customerInfo.province.trim(),
      postalCode: customerInfo.postalCode.trim(), notes: (customerInfo.notes || '').trim(),
      location,
    },
    items: lineItems, subtotal, shippingCharge, discount: discountAmount, couponCode: appliedCode,
    tax, taxPercent, shippingMethod: chosenShip ? chosenShip.id : 'standard', total,
    paymentMethod, paymentStatus: 'Pending', transactionId: transactionId.trim(),
    status: 'Pending', statusHistory: [{ status: 'Pending' }],
    discreetPackaging: !!discreetPackaging,
  });

  // Fire-and-forget emails: customer confirmation + admin new-order alert.
  // Never blocks the checkout response — errors are swallowed inside mailer.
  try {
    const mailer = require('../utils/mailer');
    const adminEmail = settings.contactEmail || process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER;
    mailer.sendOrderConfirmation(order).catch(() => {});
    mailer.sendNewOrderAlert(order, { adminEmail }).catch(() => {});
  } catch { /* mailer errors must never fail an order */ }

  // Fire-and-forget WhatsApp alert (uses wa.me link or webhook — never blocks)
  try {
    const { notifyNewOrder } = require('../utils/whatsapp');
    notifyNewOrder(order, { settings });
  } catch { /* ignore */ }

  res.status(201).json({ order });
}));

// ---- Public tracking: order number + phone ----
router.get('/track', asyncHandler(async (req, res) => {
  const { orderNumber: on, phone } = req.query;
  if (!on || !phone) return res.status(400).json({ message: 'Order number and phone number are required' });
  const order = await Order.findOne({ orderNumber: String(on).trim().toUpperCase() });
  if (!order || phoneTail(order.customerInfo.phone) !== phoneTail(phone)) {
    return res.status(404).json({ message: 'No order found with this number and phone combination' });
  }
  res.json({ order });
}));

// ---- Admin ----
router.get('/admin', protect, adminOnly, asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.paymentStatus) q.paymentStatus = req.query.paymentStatus;
  if (req.query.customer) q.customer = req.query.customer;
  if (req.query.q) {
    const rx = new RegExp(String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ orderNumber: rx }, { 'customerInfo.name': rx }, { 'customerInfo.phone': rx }];
  }
  const orders = await Order.find(q).sort({ createdAt: -1 }).limit(300);
  res.json({ orders });
}));

router.get('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
}));

router.patch('/admin/:id/status', protect, adminOnly, asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body || {};
  if (!Order.STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const prevStatus = order.status;
  order.status = status;
  order.statusHistory.push({ status, note: String(note).slice(0, 200) });
  await order.save();

  // Fire-and-forget status-update email to customer for meaningful transitions
  if (prevStatus !== status) {
    try {
      const mailer = require('../utils/mailer');
      mailer.sendStatusUpdate(order).catch(() => {});
    } catch { /* noop */ }
  }

  // Loyalty auto-reward: when an order flips to Delivered, count the
  // customer's total delivered orders and mint a coupon if threshold hit.
  if (status === 'Delivered' && prevStatus !== 'Delivered') {
    try {
      const { tryReward } = require('../utils/loyalty');
      const Settings = require('../models/Settings');
      const settings = await Settings.findOne({});
      tryReward(order, { settings });
    } catch { /* noop */ }
  }
  res.json({ order });
}));

router.patch('/admin/:id/payment', protect, adminOnly, asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body || {};
  if (!['Pending', 'Paid', 'Failed', 'Refunded'].includes(paymentStatus)) {
    return res.status(400).json({ message: 'Invalid payment status' });
  }
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const prevStatus = order.status;
  order.paymentStatus = paymentStatus;

  // AUTO-CONFIRM RULE (existing)
  if (paymentStatus === 'Paid' && order.status === 'Pending' && order.paymentMethod !== 'COD') {
    order.status = 'Confirmed';
    order.statusHistory.push({ status: 'Confirmed', note: 'Auto-confirmed on payment received' });
  }
  await order.save();

  if (prevStatus !== order.status) {
    try {
      const mailer = require('../utils/mailer');
      mailer.sendStatusUpdate(order).catch(() => {});
    } catch { /* noop */ }
  }
  res.json({ order });
}));

// Confirm a COD order after phone verification — moves Pending -> Confirmed
router.patch('/admin/:id/verify-cod', protect, adminOnly, asyncHandler(async (req, res) => {
  const { note = '' } = req.body || {};
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentMethod !== 'COD') return res.status(400).json({ message: 'This is not a COD order' });
  const prevStatus = order.status;
  order.verifiedByCall = true;
  if (order.status === 'Pending') {
    order.status = 'Confirmed';
    order.statusHistory.push({ status: 'Confirmed', note: note ? `COD verified by call: ${note}` : 'COD verified by call' });
  }
  await order.save();

  if (prevStatus !== order.status) {
    try {
      const mailer = require('../utils/mailer');
      mailer.sendStatusUpdate(order).catch(() => {});
    } catch { /* noop */ }
  }
  res.json({ order });
}));

// Update courier + tracking info (used at "Ready to Ship" / "Shipped" stages)
router.patch('/admin/:id/tracking', protect, adminOnly, asyncHandler(async (req, res) => {
  const { courierName = '', trackingNumber = '', trackingUrl = '' } = req.body || {};
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    {
      courierName: String(courierName).trim().slice(0, 60),
      trackingNumber: String(trackingNumber).trim().slice(0, 80),
      trackingUrl: String(trackingUrl).trim().slice(0, 300),
    },
    { new: true }
  );
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
}));

// Update free-form admin notes
router.patch('/admin/:id/notes', protect, adminOnly, asyncHandler(async (req, res) => {
  const { adminNotes = '' } = req.body || {};
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { adminNotes: String(adminNotes).slice(0, 2000) },
    { new: true }
  );
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
}));

// Permanently delete an order record (admin only — test/junk orders)
router.delete('/admin/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ message: 'Order deleted' });
}));

// Edit order items (admin) — add/remove products, change qty/size/color; bill + stock recalculate
router.patch('/admin/:id/items', protect, adminOnly, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (!['Pending', 'Confirmed', 'Processing', 'Ready to Ship'].includes(order.status)) {
    return res.status(400).json({ message: `Items can no longer be edited — order is ${order.status}` });
  }
  const incoming = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!incoming.length) return res.status(400).json({ message: 'Order must have at least one item' });

  // Rebuild line items with live DB prices
  const newItems = [];
  for (const it of incoming) {
    const qty = Math.max(1, Math.min(parseInt(it.quantity || '1', 10), 10));
    const p = await Product.findById(it.product);
    if (!p || !p.isActive || p.status === 'draft') return res.status(400).json({ message: 'A selected product is no longer available' });
    if (it.size && p.sizes.length && !p.sizes.includes(it.size)) return res.status(400).json({ message: `Invalid size for ${p.name}` });
    newItems.push({
      product: p._id, name: p.name, slug: p.slug, image: p.images[0]?.url || '',
      size: it.size || p.sizes[0] || '', color: it.color || p.colors[0]?.name || '',
      price: p.price, quantity: qty, lineTotal: p.price * qty,
    });
  }

  // Net stock delta per product (+diff means we need that much more stock)
  const oldQty = {}; order.items.forEach((i) => { const k = String(i.product); oldQty[k] = (oldQty[k] || 0) + i.quantity; });
  const newQty = {}; newItems.forEach((i) => { const k = String(i.product); newQty[k] = (newQty[k] || 0) + i.quantity; });
  const touched = [];
  for (const pid of new Set([...Object.keys(oldQty), ...Object.keys(newQty)])) {
    const diff = (newQty[pid] || 0) - (oldQty[pid] || 0);
    if (!diff) continue;
    const p = await Product.findOneAndUpdate({ _id: pid, stock: { $gte: diff } }, { $inc: { stock: -diff } }, { new: true });
    if (!p) { // rollback and report
      for (const t of touched) await Product.findByIdAndUpdate(t.pid, { $inc: { stock: t.diff } });
      return res.status(409).json({ message: 'Not enough stock for the added quantity' });
    }
    touched.push({ pid, diff });
  }

  order.items = newItems;
  order.subtotal = newItems.reduce((a, i) => a + i.lineTotal, 0);
  // Recompute tax from the rate SNAPSHOTTED on the order, not from current
  // settings — editing an old order must not silently re-tax it at today's rate.
  {
    const after = Math.max(0, order.subtotal - (order.discount || 0));
    const rate = Number(order.taxPercent) || 0;
    order.tax = rate > 0 ? Math.round((after * rate) / 100) : 0;
    order.total = after + (order.shippingCharge || 0) + order.tax;
  }
  await order.save();
  res.json({ order });
}));

module.exports = router;
