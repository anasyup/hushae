/**
 * Loyalty — auto reward returning customers.
 *
 * Rule: any customer whose delivered/paid order count reaches THRESHOLD
 * automatically receives a coupon code by email + WhatsApp (if enabled).
 *
 * The rule fires from orders.js whenever an order enters "Delivered" status,
 * after which we count that customer's total delivered orders and — if the
 * threshold has just been reached — mint a unique one-time coupon and mail it.
 *
 * Configurable in settings.integrations.loyalty:
 *   { enabled, threshold (default 2), discountPercent (default 10), validDays (default 60) }
 */
const Discount = require('../models/Discount');
const Order = require('../models/Order');

function randomCode(prefix = 'HUSHAE') {
  return prefix + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
}

async function tryReward(order, { settings } = {}) {
  try {
    const cfg = settings?.integrations?.loyalty || {};
    if (!cfg.enabled) return;
    const threshold = Math.max(2, parseInt(cfg.threshold || 2, 10));
    const percent = Math.max(1, Math.min(50, parseInt(cfg.discountPercent || 10, 10)));
    const validDays = Math.max(7, Math.min(365, parseInt(cfg.validDays || 60, 10)));

    const phone = (order.customerInfo?.phone || '').replace(/\D/g, '');
    const email = (order.customerInfo?.email || '').trim().toLowerCase();
    if (!phone && !email) return;

    // Count delivered orders for this customer
    const or = [];
    if (phone) or.push({ 'customerInfo.phone': { $regex: phone.slice(-9) + '$' } });
    if (email) or.push({ 'customerInfo.email': email });
    const deliveredCount = await Order.countDocuments({
      $or: or,
      status: { $in: ['Delivered'] },
    });

    // Fires once per threshold crossing (2nd, 4th, 6th …)
    if (deliveredCount < threshold) return;
    if (deliveredCount % threshold !== 0) return;

    // Skip if the same customer got a loyalty code in the last 30 days
    const recent = await Discount.findOne({
      $or: [{ email }, { phone }].filter(o => Object.values(o)[0]),
      isLoyalty: true,
      createdAt: { $gte: new Date(Date.now() - 30 * 86400 * 1000) },
    });
    if (recent) return;

    const code = randomCode('HUSH');
    const expiresAt = new Date(Date.now() + validDays * 86400 * 1000);
    const discount = await Discount.create({
      code,
      percent,
      active: true,
      minSubtotal: 0,
      maxUses: 1,
      usedCount: 0,
      expiresAt,
      isLoyalty: true,
      email,
      phone,
      note: `Loyalty reward — ${deliveredCount} orders`,
    });

    // Email the customer
    try {
      const mailer = require('./mailer');
      if (typeof mailer.sendLoyaltyReward === 'function') {
        mailer.sendLoyaltyReward(order, discount).catch(() => {});
      }
    } catch { /* ignore */ }

    return discount;
  } catch (e) {
    console.warn('[loyalty] tryReward failed:', e.message);
  }
}

module.exports = { tryReward };
