const express = require('express');
const Order = require('../models/Order');
const Settings = require('../models/Settings');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const gateways = require('../utils/paymentGateways');

const router = express.Router();

// Read a config slice from Settings.integrations.payments
async function loadCfg(provider) {
  const s = await Settings.findOne({ key: 'store' }).lean();
  return s?.integrations?.payments?.[provider] || null;
}

/* -------- Public: initiate a payment for an order --------
 * Called after the order is placed. Returns either:
 *   { type: 'form', fields, endpoint }  -> frontend auto-submits a POST form
 *   { type: 'redirect', url }           -> frontend navigates to this URL
 */
router.post('/initiate/:orderId', asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const method = req.body?.method || order.paymentMethod;

  if (method === 'JazzCash') {
    const cfg = await loadCfg('jazzcash');
    if (!gateways.jazzcash.isConfigured(cfg)) {
      return res.status(400).json({ message: 'JazzCash is not configured yet — please choose another method or COD' });
    }
    const cfgWithReturn = { ...cfg, returnUrl: `${req.headers.origin || ''}/order/${order.orderNumber}` };
    const result = gateways.jazzcash.initiate(order, cfgWithReturn);
    order.transactionId = result.ref;
    await order.save();
    return res.json({ type: 'form', fields: result.fields, endpoint: result.endpoint });
  }

  if (method === 'Visa' || method === 'Card') {
    const cfg = await loadCfg('safepay');
    if (!gateways.safepay.isConfigured(cfg)) {
      return res.status(400).json({ message: 'Card gateway is not configured yet — please choose another method or COD' });
    }
    const cfgWithReturn = { ...cfg, returnUrl: `${req.headers.origin || ''}/order/${order.orderNumber}` };
    const result = await gateways.safepay.initiate(order, cfgWithReturn);
    order.transactionId = result.ref;
    await order.save();
    return res.json({ type: 'redirect', url: result.redirectUrl });
  }

  return res.status(400).json({ message: 'Unsupported payment method for online initiation' });
}));

/* -------- Public: gateway callback / webhook --------
 * JazzCash posts form-encoded back to us. SafePay posts JSON.
 * Both endpoints verify signatures then flip the order to Paid.
 */
router.post('/callback/jazzcash', express.urlencoded({ extended: true }), asyncHandler(async (req, res) => {
  const cfg = await loadCfg('jazzcash');
  const result = gateways.jazzcash.verify(req.body, cfg);
  if (!result.ok) return res.status(400).json({ ok: false, reason: 'signature or response mismatch' });

  const order = await Order.findOne({ orderNumber: result.orderNumber });
  if (!order) return res.status(404).json({ ok: false });
  if (order.paymentStatus !== 'Paid') {
    order.paymentStatus = 'Paid';
    if (order.status === 'Pending') {
      order.status = 'Confirmed';
      order.statusHistory.push({ status: 'Confirmed', note: 'Auto-confirmed on JazzCash payment' });
    }
    await order.save();
    try { require('../utils/mailer').sendOrderConfirmation(order).catch(() => {}); } catch { /* noop */ }
  }
  res.json({ ok: true });
}));

router.post('/callback/safepay', asyncHandler(async (req, res) => {
  const cfg = await loadCfg('safepay');
  const tracker = req.body?.tracker || req.body?.data?.token;
  if (!tracker) return res.status(400).json({ ok: false });
  const result = await gateways.safepay.verify(tracker, cfg);
  if (!result.ok) return res.status(400).json({ ok: false });

  const order = await Order.findOne({ transactionId: tracker });
  if (order && order.paymentStatus !== 'Paid') {
    order.paymentStatus = 'Paid';
    if (order.status === 'Pending') {
      order.status = 'Confirmed';
      order.statusHistory.push({ status: 'Confirmed', note: 'Auto-confirmed on SafePay payment' });
    }
    await order.save();
    try { require('../utils/mailer').sendOrderConfirmation(order).catch(() => {}); } catch { /* noop */ }
  }
  res.json({ ok: true });
}));

/* -------- Admin: gateway configuration --------
 * Settings.integrations.payments = {
 *   jazzcash: { merchantId, password, integritySalt, sandbox },
 *   safepay:  { apiKey, secret, sandbox },
 * }
 * Returned with keys masked so the admin UI shows configured state without leaking secrets.
 */
router.get('/admin/config', protect, adminOnly, asyncHandler(async (req, res) => {
  const s = await Settings.findOne({ key: 'store' }).lean();
  const p = s?.integrations?.payments || {};
  const mask = (v) => v ? '••••••' + String(v).slice(-4) : '';
  res.json({
    jazzcash: {
      configured: gateways.jazzcash.isConfigured(p.jazzcash),
      merchantId: p.jazzcash?.merchantId ? mask(p.jazzcash.merchantId) : '',
      sandbox: !!p.jazzcash?.sandbox,
    },
    safepay: {
      configured: gateways.safepay.isConfigured(p.safepay),
      apiKey: p.safepay?.apiKey ? mask(p.safepay.apiKey) : '',
      sandbox: !!p.safepay?.sandbox,
    },
  });
}));

router.put('/admin/config', protect, adminOnly, asyncHandler(async (req, res) => {
  const { jazzcash, safepay } = req.body || {};
  const s = (await Settings.findOne({ key: 'store' })) || await Settings.create({ key: 'store' });
  s.integrations = s.integrations || {};
  s.integrations.payments = s.integrations.payments || {};

  if (jazzcash) {
    s.integrations.payments.jazzcash = {
      merchantId: (jazzcash.merchantId || '').trim(),
      password: (jazzcash.password || '').trim(),
      integritySalt: (jazzcash.integritySalt || '').trim(),
      sandbox: !!jazzcash.sandbox,
    };
  }
  if (safepay) {
    s.integrations.payments.safepay = {
      apiKey: (safepay.apiKey || '').trim(),
      secret: (safepay.secret || '').trim(),
      sandbox: !!safepay.sandbox,
    };
  }
  s.markModified('integrations');
  await s.save();
  res.json({ ok: true });
}));

module.exports = router;
