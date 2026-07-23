const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Discount = require('../models/Discount');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { asyncHandler, orderNumber, evaluateDiscount } = require('../utils/helpers');
const { postalCheck } = require('../data/postalcodes');
const { normalizePhone } = require('../utils/validators');

const router = express.Router();

const digits = (s) => String(s || '').replace(/\D/g, '');
const phoneTail = (s) => digits(s).slice(-10); // forgiving match: 0300... / +92300...

// ---- Place order (guest or logged-in) ----
router.post('/', optionalAuth, asyncHandler(async (req, res) => {
  const { customerInfo = {}, items = [], paymentMethod, transactionId = '', discountCode = '', discreetPackaging = true } = req.body || {};

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
      { _id: it.product, isActive: true, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );
    if (!product) {
      return res.status(409).json({ message: 'Sorry, an item in your cart is out of stock or no longer available' });
    }
    if (it.size && product.sizes.length && !product.sizes.includes(it.size)) {
      // restore stock then reject
      await Product.findByIdAndUpdate(product._id, { $inc: { stock: qty } });
      return res.status(400).json({ message: `Invalid size selected for ${product.name}` });
    }
    lineItems.push({
      product: product._id, name: product.name, slug: product.slug,
      image: product.images[0]?.url || '', size: it.size || product.sizes[0] || '',
      color: it.color || product.colors[0]?.name || '',
      price: product.price, quantity: qty, lineTotal: product.price * qty,
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

  const shippingCharge = subtotal >= settings.freeShippingThreshold ? 0 : settings.shippingFlatRate;
  const total = Math.max(0, subtotal - discountAmount) + shippingCharge;

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
    items: lineItems, subtotal, shippingCharge, discount: discountAmount, couponCode: appliedCode, total,
    paymentMethod, paymentStatus: 'Pending', transactionId: transactionId.trim(),
    status: 'Pending', statusHistory: [{ status: 'Pending' }],
    discreetPackaging: !!discreetPackaging,
  });

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
  const { status } = req.body || {};
  if (!Order.STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.status = status;
  order.statusHistory.push({ status });
  await order.save();
  res.json({ order });
}));

router.patch('/admin/:id/payment', protect, adminOnly, asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body || {};
  if (!['Pending', 'Paid', 'Failed', 'Refunded'].includes(paymentStatus)) {
    return res.status(400).json({ message: 'Invalid payment status' });
  }
  const order = await Order.findByIdAndUpdate(req.params.id, { paymentStatus }, { new: true });
  if (!order) return res.status(404).json({ message: 'Order not found' });
  res.json({ order });
}));

module.exports = router;
