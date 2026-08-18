const Order = require('../models/Order');

async function scoreRisk(orderData) {
  const factors = [];
  let score = 0;
  const c = orderData.customerInfo || {};
  const phone = String(c.phone || '').replace(/\D/g, '');
  const address = String(c.address || '').trim().toLowerCase();
  const email = String(c.email || '').trim().toLowerCase();
  const total = Number(orderData.total || 0);
  const method = orderData.paymentMethod || '';

  if (method === 'COD') { score += 15; factors.push({ code: 'cod', points: 15, label: 'Cash on delivery' }); }

  if (phone) {
    const recent = await Order.countDocuments({
      'customerInfo.phone': new RegExp(`${phone.slice(-10)}$`),
      createdAt: { $gte: new Date(Date.now() - 24 * 3600000) },
    });
    if (recent >= 2) { score += 25; factors.push({ code: 'dup_phone', points: 25, label: `${recent} orders same phone in 24h` }); }
    const names = await Order.distinct('customerInfo.name', { 'customerInfo.phone': new RegExp(`${phone.slice(-10)}$`) });
    if (names.filter(Boolean).length > 1) { score += 20; factors.push({ code: 'name_mismatch', points: 20, label: 'Same phone, different names' }); }
  }

  if (address) {
    const addrHits = await Order.countDocuments({
      'customerInfo.address': new RegExp(address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      createdAt: { $gte: new Date(Date.now() - 7 * 86400000) },
    });
    if (addrHits >= 2) { score += 15; factors.push({ code: 'dup_address', points: 15, label: 'Repeat address this week' }); }
  }

  const delivered = phone
    ? await Order.countDocuments({ 'customerInfo.phone': new RegExp(`${phone.slice(-10)}$`), status: 'Delivered' })
    : 0;
  if (total >= 10000 && delivered === 0) { score += 20; factors.push({ code: 'new_high', points: 20, label: 'High value, no delivered history' }); }
  if (total >= 25000) { score += 10; factors.push({ code: 'very_high', points: 10, label: 'Very high order value' }); }

  const cancelled = phone
    ? await Order.countDocuments({ 'customerInfo.phone': new RegExp(`${phone.slice(-10)}$`), status: { $in: ['Cancelled', 'Refunded'] } })
    : 0;
  if (cancelled >= 2) { score += 20; factors.push({ code: 'cancel_hist', points: 20, label: 'Multiple past cancels/refunds' }); }

  if (!email) { score += 5; factors.push({ code: 'no_email', points: 5, label: 'No email on order' }); }

  score = Math.min(100, score);
  const band = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return {
    score,
    band,
    factors,
    hold: score >= 60,
    isFlagged: score >= 30,
    status: score >= 60 ? 'pending' : 'approved',
  };
}

module.exports = { scoreRisk };
