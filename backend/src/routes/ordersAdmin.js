const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const OrderTimeline = require('../models/OrderTimeline');
const OrderPayment = require('../models/OrderPayment');
const OrderIssue = require('../models/OrderIssue');
const OrderPrint = require('../models/OrderPrint');
const OrderNotification = require('../models/OrderNotification');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler, orderNumber } = require('../utils/helpers');
const { normalizePhone } = require('../utils/validators');
const { postalCheck } = require('../data/postalcodes');
const Settings = require('../models/Settings');
const rateLimit = require('../middleware/rateLimit');
const flow = require('../utils/orderFlow');
const Product = require('../models/Product');
const { scoreOrder, enrichItems } = require('../utils/orderQuality');
const { reliabilityMap } = require('../utils/customerReliability');

const router = express.Router();

/* ============================================================================
 * Order management v2 — mounted at /api/orders/manage
 *
 * The original /api/orders/admin endpoints are untouched, so existing screens
 * keep working. Everything new lives here.
 * ========================================================================== */

const bulkLimit = rateLimit({
  windowMs: 60 * 1000, max: 20, key: 'orders-bulk',
  message: 'Too many bulk operations — please wait a moment',
});

const esc = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));
const clampInt = (v, lo, hi, fb) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb;
};

/** Ensure every order carries a detailed stage before it leaves the API. */
function withStage(o) {
  const stage = o.stage && flow.STAGE_MAP.has(o.stage) ? o.stage : flow.stageFromLegacy(o);
  // Quality is derived on read so it always reflects the order's current state.
  return {
    ...o,
    stage,
    stageGroup: flow.groupFor(stage),
    allowedNext: flow.allowedNext(stage),
    quality: scoreOrder({ ...o, stage }),
  };
}

// ── Filter builder shared by the list, the export and the counts ───────────
function buildFilter(q) {
  const f = {};

  if (q.stage && q.stage !== 'all') {
    const stages = String(q.stage).split(',').map((s) => s.trim()).filter(Boolean);
    const valid = stages.filter((s) => flow.STAGE_MAP.has(s));
    if (valid.length) {
      // Match the detailed stage, or fall back to the legacy status for
      // orders written before the pipeline existed.
      const legacy = [...new Set(valid.map(flow.legacyFor))];
      f.$or = [{ stage: { $in: valid } }, { stage: { $in: ['', null] }, status: { $in: legacy } }];
    }
  }
  if (q.status && q.status !== 'all') {
    const statuses = String(q.status).split(',').map((s) => s.trim()).filter(Boolean);
    if (statuses.length) f.status = { $in: statuses };
  }
  if (q.group && q.group !== 'all') {
    const stages = flow.STAGES.filter((s) => s.group === q.group).map((s) => s.key);
    const legacy = [...new Set(stages.map(flow.legacyFor))];
    f.$or = [{ stage: { $in: stages } }, { stage: { $in: ['', null] }, status: { $in: legacy } }];
  }
  if (q.paymentMethod && q.paymentMethod !== 'all') {
    f.paymentMethod = { $in: String(q.paymentMethod).split(',').map((s) => s.trim()) };
  }
  if (q.paymentState && q.paymentState !== 'all') {
    const states = String(q.paymentState).split(',').map((s) => s.trim());
    // Legacy rows have no paymentState — derive from paymentStatus.
    const or = [{ paymentState: { $in: states } }];
    if (states.includes('Pending')) or.push({ paymentState: { $in: [null, ''] }, paymentStatus: 'Pending' });
    if (states.includes('Confirmed')) or.push({ paymentState: { $in: [null, ''] }, paymentStatus: 'Paid' });
    f.$and = [...(f.$and || []), { $or: or }];
  }
  if (q.from || q.to) {
    f.createdAt = {};
    if (q.from) f.createdAt.$gte = new Date(q.from);
    if (q.to) { const d = new Date(q.to); d.setHours(23, 59, 59, 999); f.createdAt.$lte = d; }
  }
  if (q.minTotal || q.maxTotal) {
    f.total = {};
    if (q.minTotal) f.total.$gte = Number(q.minTotal);
    if (q.maxTotal) f.total.$lte = Number(q.maxTotal);
  }
  if (q.city && q.city !== 'all') {
    const cities = String(q.city).split(',').map((s) => s.trim()).filter(Boolean);
    if (cities.length) f['customerInfo.city'] = { $in: cities.map((c) => new RegExp(`^${esc(c)}$`, 'i')) };
  }
  // Quick-filter presets — one click for the views the desk uses all day.
  if (q.preset) {
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    switch (q.preset) {
      case 'needs-attention':
        f.$and = [...(f.$and || []), {
          $or: [
            { paymentState: { $in: ['Pending', 'Expired', 'Failed'] } },
            { paymentState: { $in: [null, ''] }, paymentStatus: 'Pending' },
          ],
        }, { status: { $nin: ['Cancelled', 'Refunded', 'Delivered'] } }];
        break;
      case 'high-value':
        f.total = { ...(f.total || {}), $gte: 50000 };
        break;
      case 'problem':
        f['customerService.hasIssue'] = true;
        break;
      case 'ready-to-ship':
        f.$and = [...(f.$and || []), { stage: { $in: ['Packed', 'Manifested', 'To Handover'] } },
          { $or: [{ paymentState: { $in: ['Verified', 'Confirmed'] } }, { paymentStatus: 'Paid' }, { paymentMethod: 'COD' }] }];
        break;
      case 'delayed':
        f.$and = [...(f.$and || []), {
          $or: [{ stageUpdatedAt: { $lte: dayAgo } }, { stageUpdatedAt: null, createdAt: { $lte: dayAgo } }],
        }, { status: { $nin: ['Delivered', 'Cancelled', 'Refunded'] } }];
        break;
      default: break;
    }
  }
  if (q.printed === 'yes') f['printStatus.invoice.printed'] = true;
  if (q.printed === 'no') f['printStatus.invoice.printed'] = { $ne: true };
  if (q.hasIssue === 'yes') f['customerService.hasIssue'] = true;
  if (q.test === 'yes') f.isTestOrder = true;
  if (q.test === 'no') f.isTestOrder = { $ne: true };
  if (q.q) {
    const rx = new RegExp(esc(String(q.q).trim()), 'i');
    f.$and = [...(f.$and || []), {
      $or: [
        { orderNumber: rx }, { 'customerInfo.name': rx },
        { 'customerInfo.phone': rx }, { 'customerInfo.email': rx },
        { trackingNumber: rx }, { couponCode: rx },
      ],
    }];
  }
  return f;
}

const SORTS = {
  oldest: { createdAt: 1 },
  newest: { createdAt: -1 },
  'amount-desc': { total: -1 },
  'amount-asc': { total: 1 },
  'customer-asc': { 'customerInfo.name': 1 },
  'customer-desc': { 'customerInfo.name': -1 },
  'payment-unpaid': { paymentState: 1, createdAt: 1 },
};

/* ── CREATE ORDER (Draft / Phone order) ─────────────────────────────────────
 * Shopify-style: the merchant builds the order for a customer who ordered by
 * phone or WhatsApp. Pricing is computed SERVER-SIDE from the database — the
 * admin picks products, the server prices them, then applies the store's
 * shipping and tax rules. `manualDiscount` is the one number the admin can
 * type (a courtesy they promised on the call); everything else is honest.
 *
 * The order is created with source:'admin' and flows through the exact same
 * Pending → … pipeline as a web order, so the warehouse handles it like any
 * other order. Stock is decremented atomically; a confirmation email is
 * fired for orders with a customer email.
 * ------------------------------------------------------------------------- */
const draftLimit = rateLimit({ windowMs: 60 * 1000, max: 15, key: 'draft-order', message: 'Too many orders — wait a moment' });
router.post('/', protect, adminOnly, draftLimit, asyncHandler(async (req, res) => {
  const {
    customerInfo = {}, items = [], paymentMethod = 'COD', shippingMethod = 'standard',
    manualDiscount = 0, notes = '', discreetPackaging = true,
  } = req.body || {};

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

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Add at least one product' });
  }

  // ── Price + decrement stock from the DB (server is authoritative) ────────
  const lineItems = [];
  for (const it of items) {
    const qty = Math.max(1, Math.min(parseInt(it.quantity || '1', 10), 10));
    const product = await Product.findOneAndUpdate(
      { _id: it.product, isActive: true, status: { $ne: 'draft' }, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );
    if (!product) {
      const original = await Product.findById(it.product).select('name stock isActive status');
      const itemName = original?.name || it.name || 'an item';
      if (!original || !original.isActive || original.status === 'draft') {
        return res.status(409).json({ message: `"${itemName}" is no longer available.`, productId: it.product, reason: 'unavailable' });
      }
      return res.status(409).json({ message: `"${itemName}" is out of stock (only ${original.stock} left).`, productId: it.product, reason: 'out-of-stock', available: original.stock });
    }
    if (it.size && product.sizes.length && !product.sizes.includes(it.size)) {
      await Product.findByIdAndUpdate(product._id, { $inc: { stock: qty } });
      return res.status(400).json({ message: `Size "${it.size}" is no longer available for "${product.name}".`, productId: product._id, reason: 'size-unavailable' });
    }
    lineItems.push({
      product: product._id, name: product.name, slug: product.slug,
      image: product.images[0]?.url || '', size: it.size || product.sizes[0] || '',
      color: it.color || product.colors[0]?.name || '',
      price: product.price, costPrice: product.costPrice || 0,
      quantity: qty, lineTotal: product.price * qty,
    });
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
    orderNumber: orderNumber(),
    source: 'admin',
    adminCreatedById: req.user?._id || null,
    customer: customerInfo.userId || null,
    customerInfo: {
      name: String(customerInfo.name).trim(),
      email: String(customerInfo.email || '').trim(),
      phone: phoneNorm,
      address: String(customerInfo.address).trim(),
      city: String(customerInfo.city).trim(),
      province: String(customerInfo.province).trim(),
      postalCode: String(customerInfo.postalCode || '').trim(),
      notes: String(notes || customerInfo.notes || '').trim(),
    },
    items: lineItems,
    subtotal, discount, tax, taxPercent, shippingCharge,
    total,
    paymentMethod,
    paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Pending',
    status: 'Pending',
    statusHistory: [{ status: 'Pending', note: 'Created manually by staff' }],
    shippingMethod,
    discreetPackaging: !!discreetPackaging,
    adminNotes: String(notes || '').trim(),
  });

  // Notify the pipeline (new-order alerts, timeline, etc.)
  try { flow.notify({ type: 'order.created', severity: 'info', order, title: `New order ${order.orderNumber}`, body: `Created by ${req.user?.name || 'staff'} — ${paymentMethod} · PKR ${total.toLocaleString()}` }).catch(() => {}); } catch { /* noop */ }
  try { await OrderTimeline.create({ order: order._id, action: 'created', note: `Created manually by ${req.user?.name || req.user?.email || 'staff'}` }); } catch { /* noop */ }

  // Confirmation email when we have an address (fire-and-forget, never blocks)
  if (order.customerInfo.email) {
    try { require('../utils/mailer').sendOrderConfirmation(order).catch(() => {}); } catch { /* noop */ }
  }

  res.status(201).json({ order: withStage(order.toObject ? order.toObject() : order) });
}));

/* ── LIST ─────────────────────────────────────────────────────────────────── */
router.get('/', protect, adminOnly, asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const page = clampInt(req.query.page, 1, 10000, 1);
  const limit = clampInt(req.query.limit, 1, 200, 50);
  const sort = SORTS[req.query.sort] || SORTS.oldest;

  const [rows, total] = await Promise.all([
    Order.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  // Warehouse hints for the whole page in a single query — resolving stock per
  // order would be an N+1 against a collection we already know the ids for.
  const productIds = [...new Set(rows.flatMap((o) => (o.items || []).map((i) => String(i.product)).filter(Boolean)))];
  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } }).select('sku stock categorySlug').lean()
    : [];
  const stockMap = new Map(products.map((p) => [String(p._id), p]));

  // Customer reliability — computed server-side from each row's FULL history,
  // so the badge reflects every order, not just the 50 on this page.
  const phones = [...new Set(rows.map((o) => String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean))];
  let rel = new Map();
  if (phones.length) {
    const hist = await Order.find({ 'customerInfo.phone': { $regex: new RegExp(`(${phones.join('|')})$`) } })
      .select('customerInfo.phone status customerService').lean();
    rel = reliabilityMap(hist);
  }

  res.json({
    orders: rows.map((o) => {
      const key = String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10);
      return { ...withStage(o), items: enrichItems(o, stockMap), reliability: rel.get(key) || null };
    }),
    page, limit, total, pages: Math.ceil(total / limit) || 1,
  });
}));

/* ── COUNTS for the tab strip ─────────────────────────────────────────────── */
router.get('/counts', protect, adminOnly, asyncHandler(async (req, res) => {
  const base = buildFilter({ ...req.query, stage: undefined, group: undefined });
  const rows = await Order.find(base).select('stage status paymentMethod paymentState paymentStatus total').lean();

  const byStage = {}; const byGroup = {}; const byMethod = {}; const byPaymentState = {};
  let revenue = 0;
  for (const o of rows) {
    const stage = o.stage && flow.STAGE_MAP.has(o.stage) ? o.stage : flow.stageFromLegacy(o);
    const group = flow.groupFor(stage);
    const pState = o.paymentState || (o.paymentStatus === 'Paid' ? 'Confirmed' : 'Pending');
    byStage[stage] = (byStage[stage] || 0) + 1;
    byGroup[group] = (byGroup[group] || 0) + 1;
    byMethod[o.paymentMethod] = (byMethod[o.paymentMethod] || 0) + 1;
    byPaymentState[pState] = (byPaymentState[pState] || 0) + 1;
    revenue += o.total || 0;
  }
  res.json({ total: rows.length, revenue, byStage, byGroup, byMethod, byPaymentState });
}));

/* ── FACETS (cities) for the filter UI ────────────────────────────────────── */
router.get('/facets', protect, adminOnly, asyncHandler(async (req, res) => {
  const cities = await Order.aggregate([
    { $group: { _id: '$customerInfo.city', count: { $sum: 1 } } },
    { $sort: { count: -1 } }, { $limit: 60 },
  ]);
  res.json({
    cities: cities.filter((c) => c._id).map((c) => ({ city: c._id, count: c.count })),
    stages: flow.STAGES.map(({ key, label, group }) => ({ key, label, group })),
  });
}));

/* ── VERIFICATION QUEUE — every order awaiting payment verification for 24h+,
     oldest first. Backs the dedicated worklist (was: a passive alert). ────── */
router.get('/verification-queue', protect, adminOnly, asyncHandler(async (req, res) => {
  const cutoff = new Date(Date.now() - 24 * 3600000);
  const orders = await Order.find({
    status: { $nin: ['Cancelled', 'Refunded', 'Delivered'] },
    $or: [
      { paymentState: 'Pending' },
      { paymentState: { $in: [null, ''] }, paymentStatus: 'Pending' },
    ],
    createdAt: { $lte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(200)
    .select('orderNumber createdAt total status stage paymentMethod paymentState customerInfo.name customerInfo.phone customerInfo.city noAnswer cancelReason')
    .lean();

  // Reliability per customer (server-side, keyed by phone).
  const phones = [...new Set(orders.map((o) => String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10)).filter(Boolean))];
  let rel = new Map();
  if (phones.length) {
    const hist = await Order.find({ 'customerInfo.phone': { $regex: new RegExp(`(${phones.join('|')})$`) } })
      .select('customerInfo.phone status customerService').lean();
    rel = reliabilityMap(hist);
  }
  const enriched = orders.map((o) => ({
    ...o,
    reliability: rel.get(String(o.customerInfo?.phone || '').replace(/\D/g, '').slice(-10)) || null,
  }));

  res.json({ orders: enriched, count: enriched.length });
}));

/* ── VERIFY ACTION — one endpoint for the Call Queue buttons. ─────────────── */
router.patch('/:id/verify-action', protect, adminOnly, asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid order id' });
  const { action } = req.body || {};
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  if (action === 'verified') {
    order.paymentState = 'Verified';
    order.paymentVerifiedAt = new Date();
    order.paymentVerifiedBy = req.user._id;
    order.paymentExpiresAt = null;
    order.noAnswer = { attempts: 0, lastAt: null };
  } else if (action === 'no-answer') {
    order.noAnswer = {
      attempts: (order.noAnswer?.attempts || 0) + 1,
      lastAt: new Date(),
    };
  } else if (action === 'cancel') {
    const reason = String(req.body?.reason || '').trim() || 'Other';
    order.cancelReason = reason;
    const from = flow.stageFromLegacy(order);
    const r = flow.applyStage(order, 'Cancelled', { note: `Cancelled from verification queue — ${reason}`, actor: req.user });
    if (!r.ok) return res.status(400).json({ message: r.reason });
    await flow.recordTransition(order, { from, to: 'Cancelled', note: `Verification queue — ${reason}`, actor: req.user });
  } else {
    return res.status(400).json({ message: 'Unknown action' });
  }

  await order.save();
  res.json({ ok: true, noAnswer: order.noAnswer, paymentState: order.paymentState, status: order.status });
}));

/* ── CANCELLATION REASONS — ranked reasons over the window, for the
     analytics widget + the "cancelled this week" alert. ───────────────────── */
router.get('/cancellation-reasons', protect, adminOnly, asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days || '30', 10)));
  const since = new Date(Date.now() - days * 86400000);
  const rows = await Order.aggregate([
    { $match: { status: { $in: ['Cancelled', 'Refunded'] }, updatedAt: { $gte: since } } },
    { $group: { _id: { $ifNull: ['$cancelReason', 'Not specified'] }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const total = rows.reduce((n, r) => n + r.count, 0);
  res.json({
    reasons: rows.map((r) => ({ reason: r._id, count: r.count, pct: total ? Math.round((r.count / total) * 1000) / 10 : 0 })),
    total,
  });
}));

/* ── SINGLE ORDER (with timeline, payments, issues, prints) ───────────────── */
router.get('/:id', protect, adminOnly, asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid order id' });
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const pIds = (order.items || []).map((i) => i.product).filter(Boolean);
  const prods = pIds.length ? await Product.find({ _id: { $in: pIds } }).select('sku stock categorySlug').lean() : [];
  order.items = enrichItems(order, new Map(prods.map((p) => [String(p._id), p])));

  const [timeline, payments, issues, prints, hist] = await Promise.all([
    OrderTimeline.find({ order: order._id }).sort({ createdAt: 1 }).lean(),
    OrderPayment.find({ order: order._id }).sort({ createdAt: -1 }).lean(),
    OrderIssue.find({ order: order._id }).sort({ createdAt: -1 }).lean(),
    OrderPrint.find({ order: order._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Order.find({ 'customerInfo.phone': order.customerInfo?.phone })
      .select('customerInfo.phone status customerService').lean(),
  ]);
  const reliability = reliabilityMap(hist).get(String(order.customerInfo?.phone || '').replace(/\D/g, '').slice(-10)) || null;

  res.json({ order: withStage(order), timeline, payments, issues, prints, reliability });
}));

/* ── STAGE TRANSITION ─────────────────────────────────────────────────────── */
router.patch('/:id/stage', protect, adminOnly, asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid order id' });
  const { stage, note = '', cancelReason = '' } = req.body || {};
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const from = flow.stageFromLegacy(order);
  const result = flow.applyStage(order, stage, { note, actor: req.user });
  if (!result.ok) return res.status(400).json({ message: result.reason, allowed: result.allowed });

  // Cancellation reasons are captured for the analytics widget.
  if (stage === 'Cancelled' && cancelReason) order.cancelReason = String(cancelReason).trim().slice(0, 80);

  await order.save();
  try { require('../utils/auditLogger').logAction(req.user?.email, 'stage', 'order', order.orderNumber, from, stage); } catch { /* noop */ }
  await flow.recordTransition(order, { from, to: stage, note, actor: req.user });
  await flow.notify({
    type: 'order.status', severity: 'info', order,
    title: `${order.orderNumber} → ${stage}`,
    body: note || `Moved from ${from}`,
  });

  // Keep the existing customer email behaviour on meaningful legacy changes
  if (flow.legacyFor(from) !== order.status) {
    try { require('../utils/mailer').sendStatusUpdate(order).catch(() => {}); } catch { /* noop */ }
  }

  // Review request — fires once when an order reaches Delivered so we do not
  // spam the customer on every later admin action on the same order.
  if (order.status === 'Delivered' && flow.legacyFor(from) !== 'Delivered') {
    try { require('../utils/mailer').sendReviewRequest(order).catch(() => {}); } catch { /* noop */ }
  }
  res.json({ order: withStage(order.toObject()) });
}));

/* ── PAYMENT VERIFICATION ─────────────────────────────────────────────────── */
router.patch('/:id/payment/verify', protect, adminOnly, asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) return res.status(400).json({ message: 'Invalid order id' });
  const { state, transactionId = '', note = '', gatewayResponse = null } = req.body || {};
  const allowed = ['Pending', 'Verified', 'Confirmed', 'Failed', 'Expired', 'Refunded'];
  if (!allowed.includes(state)) return res.status(400).json({ message: 'Invalid payment state' });

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const now = new Date();
  order.paymentState = state;
  if (transactionId) order.transactionId = String(transactionId).trim().slice(0, 120);
  if (state === 'Verified' || state === 'Confirmed') {
    order.paymentVerifiedAt = now;
    order.paymentVerifiedBy = req.user._id;
    order.paymentExpiresAt = null;
  }
  if (state === 'Confirmed') order.paymentStatus = 'Paid';
  if (state === 'Failed' || state === 'Expired') order.paymentStatus = 'Failed';
  if (state === 'Refunded') order.paymentStatus = 'Refunded';

  // Auto-advance a fresh order once money is confirmed.
  let advanced = null;
  if (state === 'Confirmed' && flow.stageFromLegacy(order) === 'New') {
    const from = 'New';
    const r = flow.applyStage(order, 'To Pack', { note: 'Auto-confirmed on payment', actor: req.user });
    if (r.ok) advanced = { from, to: 'To Pack' };
  }

  await order.save();

  await OrderPayment.create({
    order: order._id, orderNumber: order.orderNumber,
    method: order.paymentMethod, amount: order.total,
    state, transactionId: order.transactionId, gatewayResponse,
    note: String(note).slice(0, 300),
    verifiedAt: (state === 'Verified' || state === 'Confirmed') ? now : null,
    verifiedBy: req.user._id, verifiedByName: req.user.name || req.user.email || '',
  });

  if (advanced) await flow.recordTransition(order, { ...advanced, note: 'Auto-confirmed on payment', actor: req.user, actorType: 'system' });

  await flow.notify({
    type: 'payment.received',
    severity: state === 'Failed' || state === 'Expired' ? 'danger' : 'success',
    order,
    title: `Payment ${state} — ${order.orderNumber}`,
    body: `${order.paymentMethod} · PKR ${Number(order.total).toLocaleString('en-PK')}`,
  });

  res.json({ order: withStage(order.toObject()) });
}));

/** Start a COD hold — 48h to confirm by call, then it expires. */
router.post('/:id/payment/cod-hold', protect, adminOnly, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.paymentMethod !== 'COD') return res.status(400).json({ message: 'Not a COD order' });
  const hours = clampInt(req.body?.hours, 1, 168, 48);
  order.paymentExpiresAt = new Date(Date.now() + hours * 3600 * 1000);
  await order.save();
  res.json({ order: withStage(order.toObject()) });
}));

/* ── PRINT ────────────────────────────────────────────────────────────────── */
router.post('/:id/print', protect, adminOnly, asyncHandler(async (req, res) => {
  const { docType, batchId = '' } = req.body || {};
  if (!['invoice', 'packing_slip', 'pick_list'].includes(docType)) {
    return res.status(400).json({ message: 'Invalid document type' });
  }
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const prev = order.printStatus?.[docType]?.count || 0;
  // Set the nested path directly — spreading the sub-document would leave the
  // sibling doc types as `undefined` and fail Mongoose casting.
  order.set(`printStatus.${docType}.printed`, true);
  order.set(`printStatus.${docType}.at`, new Date());
  order.set(`printStatus.${docType}.count`, prev + 1);
  await order.save();

  await OrderPrint.create({
    order: order._id, orderNumber: order.orderNumber, docType, copy: prev + 1,
    printedBy: req.user._id, printedByName: req.user.name || req.user.email || '', batchId,
  });

  res.json({ order: withStage(order.toObject()) });
}));

/* ── INTERNAL NOTES ───────────────────────────────────────────────────────── */
router.post('/:id/note', protect, adminOnly, asyncHandler(async (req, res) => {
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ message: 'Note cannot be empty' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.internalNotes.push({
    body: body.slice(0, 2000),
    authorId: req.user._id,
    authorName: req.user.name || req.user.email || '',
  });
  await order.save();
  res.json({ order: withStage(order.toObject()) });
}));

/* ── CUSTOMER SERVICE ─────────────────────────────────────────────────────── */
router.post('/:id/issue', protect, adminOnly, asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const {
    issueType, description = '', severity = 'Normal',
    refundStatus, returnStatus, cancellationStatus, refundAmount = 0,
  } = req.body || {};

  const types = ['Wrong Item', 'Damaged', 'Missing', 'Quality Issue', 'Late Delivery', 'Other'];
  if (!types.includes(issueType)) return res.status(400).json({ message: 'Invalid issue type' });

  const issue = await OrderIssue.create({
    order: order._id, orderNumber: order.orderNumber,
    issueType, description: String(description).slice(0, 2000), severity,
    refundStatus: refundStatus || 'No Issue',
    returnStatus: returnStatus || 'Not Required',
    cancellationStatus: cancellationStatus || 'No Cancellation',
    refundAmount: Number(refundAmount) || 0,
    openedBy: req.user._id, openedByName: req.user.name || req.user.email || '',
  });

  const openCount = await OrderIssue.countDocuments({ order: order._id, status: { $in: ['Open', 'In Progress'] } });
  order.customerService = {
    hasIssue: true, issueType,
    refundStatus: issue.refundStatus,
    returnStatus: issue.returnStatus,
    cancellationStatus: issue.cancellationStatus,
    openIssues: openCount,
  };
  await order.save();

  await flow.notify({
    type: 'issue.raised', severity: 'warning', order,
    title: `Issue raised — ${order.orderNumber}`, body: `${issueType}${description ? `: ${description.slice(0, 80)}` : ''}`,
  });

  res.json({ issue, order: withStage(order.toObject()) });
}));

router.patch('/issue/:issueId', protect, adminOnly, asyncHandler(async (req, res) => {
  const issue = await OrderIssue.findById(req.params.issueId);
  if (!issue) return res.status(404).json({ message: 'Issue not found' });

  ['refundStatus', 'returnStatus', 'cancellationStatus', 'status', 'severity',
    'refundAmount', 'returnTrackingNumber', 'cancellationReason', 'description'].forEach((k) => {
    if (req.body?.[k] !== undefined) issue[k] = req.body[k];
  });
  if (req.body?.message) {
    issue.messages.push({
      kind: req.body.messageKind || 'note',
      channel: req.body.channel || 'internal',
      body: String(req.body.message).slice(0, 2000),
      authorId: req.user._id, authorName: req.user.name || req.user.email || '',
    });
  }
  if (issue.status === 'Resolved' || issue.status === 'Closed') issue.resolvedAt = issue.resolvedAt || new Date();
  await issue.save();

  const order = await Order.findById(issue.order);
  if (order) {
    const openCount = await OrderIssue.countDocuments({ order: order._id, status: { $in: ['Open', 'In Progress'] } });
    order.customerService = {
      hasIssue: openCount > 0, issueType: issue.issueType,
      refundStatus: issue.refundStatus, returnStatus: issue.returnStatus,
      cancellationStatus: issue.cancellationStatus, openIssues: openCount,
    };
    await order.save();
  }
  res.json({ issue });
}));

/* ── BULK OPERATIONS ──────────────────────────────────────────────────────── */
router.post('/bulk', protect, adminOnly, bulkLimit, asyncHandler(async (req, res) => {
  const { action, ids = [], payload = {} } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ message: 'No orders selected' });
  if (ids.length > 200) return res.status(400).json({ message: 'Select at most 200 orders at once' });
  const valid = ids.filter(isId);
  if (!valid.length) return res.status(400).json({ message: 'No valid order ids' });

  const batchId = `bulk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const orders = await Order.find({ _id: { $in: valid } });
  const results = { ok: [], failed: [] };

  for (const order of orders) {
    try {
      const from = flow.stageFromLegacy(order);

      if (action === 'stage' || action === 'approve') {
        const target = action === 'approve'
          ? (flow.allowedNext(from).find((s) => flow.FORWARD.indexOf(s) === flow.FORWARD.indexOf(from) + 1) || null)
          : payload.stage;
        if (!target) { results.failed.push({ id: order._id, orderNumber: order.orderNumber, reason: 'No next stage' }); continue; }
        const r = flow.applyStage(order, target, { note: payload.note || '', actor: req.user });
        if (!r.ok) { results.failed.push({ id: order._id, orderNumber: order.orderNumber, reason: r.reason }); continue; }
        order.lastBulkBatchId = batchId;
        await order.save();
        await flow.recordTransition(order, { from, to: target, note: payload.note || 'Bulk action', actor: req.user, meta: { batchId } });
        results.ok.push({ id: order._id, orderNumber: order.orderNumber, stage: target });

      } else if (action === 'reject' || action === 'cancel') {
        const r = flow.applyStage(order, 'Cancelled', { note: payload.reason || 'Bulk cancellation', actor: req.user });
        if (!r.ok) { results.failed.push({ id: order._id, orderNumber: order.orderNumber, reason: r.reason }); continue; }
        order.lastBulkBatchId = batchId;
        await order.save();
        await flow.recordTransition(order, { from, to: 'Cancelled', note: payload.reason || 'Bulk cancellation', actor: req.user, meta: { batchId } });
        results.ok.push({ id: order._id, orderNumber: order.orderNumber, stage: 'Cancelled' });

      } else if (action === 'mark-paid') {
        order.paymentState = 'Confirmed';
        order.paymentStatus = 'Paid';
        order.paymentVerifiedAt = new Date();
        order.paymentVerifiedBy = req.user._id;
        order.paymentExpiresAt = null;
        order.lastBulkBatchId = batchId;
        if (from === 'New') flow.applyStage(order, 'To Pack', { note: 'Bulk mark paid', actor: req.user });
        await order.save();
        await OrderPayment.create({
          order: order._id, orderNumber: order.orderNumber, method: order.paymentMethod,
          amount: order.total, state: 'Confirmed', note: 'Bulk mark as paid',
          verifiedAt: new Date(), verifiedBy: req.user._id, verifiedByName: req.user.name || '',
        });
        results.ok.push({ id: order._id, orderNumber: order.orderNumber });

      } else if (action === 'print') {
        const docType = payload.docType || 'invoice';
        if (!['invoice', 'packing_slip', 'pick_list'].includes(docType)) {
          results.failed.push({ id: order._id, orderNumber: order.orderNumber, reason: 'Bad doc type' }); continue;
        }
        const prev = order.printStatus?.[docType]?.count || 0;
        order.set(`printStatus.${docType}.printed`, true);
        order.set(`printStatus.${docType}.at`, new Date());
        order.set(`printStatus.${docType}.count`, prev + 1);
        order.lastBulkBatchId = batchId;
        await order.save();
        await OrderPrint.create({
          order: order._id, orderNumber: order.orderNumber, docType, copy: prev + 1,
          printedBy: req.user._id, printedByName: req.user.name || '', batchId,
        });
        results.ok.push({ id: order._id, orderNumber: order.orderNumber });

      } else if (action === 'note') {
        const body = String(payload.note || '').trim();
        if (!body) { results.failed.push({ id: order._id, orderNumber: order.orderNumber, reason: 'Empty note' }); continue; }
        order.internalNotes.push({
          body: body.slice(0, 2000),
          authorId: req.user._id,
          authorName: req.user.name || req.user.email || '',
        });
        order.lastBulkBatchId = batchId;
        await order.save();
        results.ok.push({ id: order._id, orderNumber: order.orderNumber });

      } else if (action === 'qc') {
        // Quality check is recorded as a structured note plus a flag, so it
        // shows in the timeline and can be filtered on later.
        const passed = payload.result !== 'fail';
        order.qcStatus = passed ? 'passed' : 'review';
        order.qcAt = new Date();
        order.qcBy = req.user.name || req.user.email || '';
        order.internalNotes.push({
          body: `QC ${passed ? 'passed' : 'needs review'}${payload.note ? ` — ${String(payload.note).slice(0, 300)}` : ''}`,
          authorId: req.user._id,
          authorName: req.user.name || req.user.email || '',
        });
        order.lastBulkBatchId = batchId;
        await order.save();
        results.ok.push({ id: order._id, orderNumber: order.orderNumber });

      } else if (action === 'priority') {
        order.priorityFlag = payload.flag === 'clear' ? '' : String(payload.flag || 'rush').slice(0, 20);
        order.lastBulkBatchId = batchId;
        await order.save();
        results.ok.push({ id: order._id, orderNumber: order.orderNumber });

      } else if (action === 'assign') {
        order.assignedTo = String(payload.assignee || '').slice(0, 80);
        order.lastBulkBatchId = batchId;
        await order.save();
        results.ok.push({ id: order._id, orderNumber: order.orderNumber });

      } else {
        return res.status(400).json({ message: `Unknown bulk action "${action}"` });
      }
    } catch (e) {
      results.failed.push({ id: order._id, orderNumber: order.orderNumber, reason: e.message });
    }
  }

  await flow.notify({
    type: 'bulk.done',
    severity: results.failed.length ? 'warning' : 'success',
    title: `Bulk ${action}: ${results.ok.length} succeeded`,
    body: results.failed.length ? `${results.failed.length} failed` : 'All selected orders updated',
    meta: { batchId, action },
  });

  res.json({ batchId, ...results, okCount: results.ok.length, failedCount: results.failed.length });
}));

/* ── CSV EXPORT ───────────────────────────────────────────────────────────── */
router.get('/export/csv', protect, adminOnly, asyncHandler(async (req, res) => {
  const filter = buildFilter(req.query);
  const rows = await Order.find(filter).sort(SORTS[req.query.sort] || SORTS.oldest).limit(5000).lean();

  const cols = [
    'orderNumber', 'createdAt', 'stage', 'status', 'paymentMethod', 'paymentState',
    'paymentStatus', 'total', 'subtotal', 'shippingCharge', 'discount',
    'customerName', 'customerPhone', 'customerEmail', 'city', 'province',
    'address', 'items', 'courierName', 'trackingNumber', 'invoicePrinted',
  ];
  const cell = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [cols.join(',')];
  for (const o of rows) {
    const stage = o.stage || flow.stageFromLegacy(o);
    lines.push([
      o.orderNumber, new Date(o.createdAt).toISOString(), stage, o.status,
      o.paymentMethod, o.paymentState || '', o.paymentStatus,
      o.total, o.subtotal, o.shippingCharge, o.discount,
      o.customerInfo?.name, o.customerInfo?.phone, o.customerInfo?.email,
      o.customerInfo?.city, o.customerInfo?.province, o.customerInfo?.address,
      (o.items || []).map((i) => `${i.name} x${i.quantity}`).join(' | '),
      o.courierName, o.trackingNumber,
      o.printStatus?.invoice?.printed ? 'Yes' : 'No',
    ].map(cell).join(','));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hushae-orders-${stamp}.csv"`);
  res.send('\uFEFF' + lines.join('\n'));   // BOM so Excel reads UTF-8
}));



/* ── WHATSAPP MESSAGE LINKS ───────────────────────────────────────────────
 * Returns a ready-to-open wa.me link per order with the template filled in.
 * The merchant clicks through, so no gateway credentials or send quota are
 * involved and the message always comes from their own number.
 * ------------------------------------------------------------------------ */
router.post('/bulk/whatsapp', protect, adminOnly, bulkLimit, asyncHandler(async (req, res) => {
  const ids = (req.body?.ids || []).filter(isId);
  if (!ids.length) return res.status(400).json({ message: 'No orders selected' });
  if (ids.length > 50) return res.status(400).json({ message: 'Send to at most 50 customers at a time' });

  const template = String(req.body?.template || 'Hi {name}, your order {id} is {status}.').slice(0, 600);
  const orders = await Order.find({ _id: { $in: ids } })
    .select('orderNumber customerInfo stage status total').lean();

  const links = orders.map((o) => {
    const stage = o.stage || flow.stageFromLegacy(o);
    const body = template
      .replace(/\{name\}/g, o.customerInfo?.name || 'there')
      .replace(/\{id\}/g, o.orderNumber)
      .replace(/\{status\}/g, flow.STAGE_MAP.get(stage)?.label || stage)
      .replace(/\{total\}/g, `PKR ${Number(o.total || 0).toLocaleString('en-PK')}`)
      .replace(/\{link\}/g, `https://hushae1.vercel.app/track?order=${encodeURIComponent(o.orderNumber)}`);
    const phone = String(o.customerInfo?.phone || '').replace(/\D/g, '').replace(/^0/, '92');
    return {
      id: o._id,
      orderNumber: o.orderNumber,
      name: o.customerInfo?.name || '',
      url: `https://wa.me/${phone}?text=${encodeURIComponent(body)}`,
      preview: body,
    };
  });

  res.json({ links, count: links.length });
}));

/* ── BATCH PRINT DATA ─────────────────────────────────────────────────────
 * One call returns everything needed to lay out N documents in a single print
 * window. Used by "select all → Print", so the merchant gets one browser
 * dialog rather than one tab per order.
 * ------------------------------------------------------------------------ */
router.get('/print/batch', protect, adminOnly, asyncHandler(async (req, res) => {
  const docType = String(req.query.doc || 'packing_slip').replace(/-/g, '_');
  if (!['invoice', 'packing_slip', 'pick_list'].includes(docType)) {
    return res.status(400).json({ message: 'Invalid document type' });
  }

  // Either an explicit id list, or every order matching the current filters.
  let orders;
  if (req.query.ids) {
    const ids = String(req.query.ids).split(',').map((x) => x.trim()).filter(isId);
    if (!ids.length) return res.status(400).json({ message: 'No valid order ids' });
    if (ids.length > 500) return res.status(400).json({ message: 'Print at most 500 orders at once' });
    const rows = await Order.find({ _id: { $in: ids } }).lean();
    const rank = new Map(ids.map((id, i) => [id, i]));
    orders = rows.sort((a, b) => (rank.get(String(a._id)) ?? 0) - (rank.get(String(b._id)) ?? 0));
  } else {
    orders = await Order.find(buildFilter(req.query)).sort(SORTS[req.query.sort] || SORTS.oldest).limit(500).lean();
  }

  const settings = await require('../models/Settings').findOne({ key: 'store' }).lean();

  res.json({
    docType,
    count: orders.length,
    store: {
      name: settings?.storeName || 'HUSHAE',
      tagline: settings?.tagline || '',
      phone: settings?.contactPhone || '',
      email: settings?.contactEmail || '',
    },
    orders: orders.map((o) => ({
      ...withStage(o),
      // Pre-computed so the print view stays dumb and fast
      itemCount: (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0),
      lineCount: (o.items || []).length,
      paymentLabel: (o.paymentState === 'Confirmed' || o.paymentStatus === 'Paid')
        ? 'PAID'
        : (o.paymentMethod === 'COD' ? 'COD' : o.paymentMethod.toUpperCase()),
    })),
  });
}));

/* ── SPEC ALIASES ─────────────────────────────────────────────────────────
 * Thin wrappers so the documented endpoint names resolve. They delegate to the
 * same handlers as /bulk so behaviour can never drift between the two.
 * ------------------------------------------------------------------------ */
router.post('/bulk-update-status', protect, adminOnly, bulkLimit, (req, res, next) => {
  req.body = { action: 'stage', ids: req.body?.ids || [], payload: { stage: req.body?.stage, note: req.body?.note } };
  req.url = '/bulk';
  router.handle(req, res, next);
});

router.post('/mark-paid', protect, adminOnly, bulkLimit, (req, res, next) => {
  req.body = { action: 'mark-paid', ids: req.body?.ids || [], payload: {} };
  req.url = '/bulk';
  router.handle(req, res, next);
});

/* ── ANALYTICS ────────────────────────────────────────────────────────────── */
router.get('/analytics/summary', protect, adminOnly, asyncHandler(async (req, res) => {
  const days = clampInt(req.query.days, 1, 365, 30);
  const since = new Date(Date.now() - days * 86400000);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(Date.now() - 7 * 86400000);
  const startOfMonth = new Date(Date.now() - 30 * 86400000);

  const all = await Order.find({ createdAt: { $gte: since } })
    .select('total createdAt status stage paymentMethod paymentState paymentStatus stageTimestamps customerService')
    .lean();

  const live = all.filter((o) => !['Cancelled', 'Refunded'].includes(o.status));
  const sum = (rows) => rows.reduce((a, o) => a + (o.total || 0), 0);
  const inRange = (from) => live.filter((o) => new Date(o.createdAt) >= from);

  // Fulfilment speed: order creation → Shipped
  const shipped = all.filter((o) => o.stageTimestamps?.Shipped);
  const avgShipHours = shipped.length
    ? shipped.reduce((a, o) => a + (new Date(o.stageTimestamps.Shipped) - new Date(o.createdAt)) / 3600000, 0) / shipped.length
    : 0;

  const verified = all.filter((o) => ['Verified', 'Confirmed'].includes(o.paymentState) || o.paymentStatus === 'Paid').length;
  const cancelled = all.filter((o) => ['Cancelled', 'Refunded'].includes(o.status)).length;

  // Daily series
  const daily = {};
  for (const o of live) {
    const k = new Date(o.createdAt).toISOString().slice(0, 10);
    if (!daily[k]) daily[k] = { date: k, orders: 0, revenue: 0 };
    daily[k].orders += 1;
    daily[k].revenue += o.total || 0;
  }
  // Hourly distribution
  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0 }));
  for (const o of live) hourly[new Date(o.createdAt).getHours()].orders += 1;

  const group = (key) => live.reduce((acc, o) => {
    const k = key === 'stage' ? (o.stage || flow.stageFromLegacy(o)) : o[key] || 'Unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  res.json({
    kpis: {
      today: { orders: inRange(startOfDay).length, revenue: sum(inRange(startOfDay)) },
      week: { orders: inRange(startOfWeek).length, revenue: sum(inRange(startOfWeek)) },
      month: { orders: inRange(startOfMonth).length, revenue: sum(inRange(startOfMonth)) },
      aov: live.length ? Math.round(sum(live) / live.length) : 0,
      avgShipHours: Math.round(avgShipHours * 10) / 10,
      paymentVerifiedRate: all.length ? Math.round((verified / all.length) * 100) : 0,
      cancelRate: all.length ? Math.round((cancelled / all.length) * 100) : 0,
      totalOrders: all.length,
      totalRevenue: sum(live),
    },
    byMethod: group('paymentMethod'),
    byStage: group('stage'),
    daily: Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)),
    hourly,
    days,
  });
}));

/* ── NOTIFICATIONS ────────────────────────────────────────────────────────── */
router.get('/notifications/list', protect, adminOnly, asyncHandler(async (req, res) => {
  const limit = clampInt(req.query.limit, 1, 100, 30);
  const [items, unread] = await Promise.all([
    OrderNotification.find({}).sort({ createdAt: -1 }).limit(limit).lean(),
    OrderNotification.countDocuments({ read: false }),
  ]);
  res.json({ notifications: items, unread });
}));

router.patch('/notifications/read', protect, adminOnly, asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(isId) : null;
  const q = ids?.length ? { _id: { $in: ids } } : { read: false };
  await OrderNotification.updateMany(q, { $set: { read: true, readAt: new Date() } });
  res.json({ ok: true });
}));

/* ── COD EXPIRY SWEEP (idempotent; called by the client or a cron) ────────── */
router.post('/maintenance/expire-cod', protect, adminOnly, asyncHandler(async (req, res) => {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 3600 * 1000);

  const expiring = await Order.find({
    paymentMethod: 'COD',
    paymentState: 'Pending',
    paymentExpiresAt: { $gt: now, $lte: soon },
  }).select('orderNumber paymentExpiresAt').lean();

  const expired = await Order.find({
    paymentMethod: 'COD',
    paymentState: 'Pending',
    paymentExpiresAt: { $ne: null, $lte: now },
  });

  for (const order of expired) {
    order.paymentState = 'Expired';
    await order.save();
    await flow.notify({
      type: 'payment.expired', severity: 'danger', order,
      title: `COD hold expired — ${order.orderNumber}`,
      body: 'Not confirmed within the hold window',
    });
  }
  for (const o of expiring) {
    await flow.notify({
      type: 'payment.expiring', severity: 'warning',
      order: { _id: o._id, orderNumber: o.orderNumber },
      title: `COD expiring soon — ${o.orderNumber}`,
      body: 'Confirm by call within 24 hours',
    });
  }

  res.json({ expired: expired.length, expiringSoon: expiring.length });
}));

module.exports = router;
