const Order = require('../models/Order');

async function checkFraud(orderData) {
  const reasons = [];
  const c = orderData.customerInfo || {};
  const phone = String(c.phone || '').trim();
  const name = String(c.name || '').trim();
  const address = String(c.address || '').trim();
  const email = String(c.email || '').trim();

  // 1. Same phone, different names check
  if (phone) {
    const matchingPhone = await Order.find({ 'customerInfo.phone': phone }).limit(10);
    const names = new Set(matchingPhone.map(o => String(o.customerInfo?.name || '').trim().toLowerCase()));
    if (names.size > 0 && !names.has(name.toLowerCase())) {
      reasons.push(`Same phone number (${phone}) was previously used with different customer names.`);
    }
  }

  // 2. Same address within last 7 days check
  if (address) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentAddressOrder = await Order.findOne({
      'customerInfo.address': address,
      createdAt: { $gte: sevenDaysAgo }
    });
    if (recentAddressOrder) {
      reasons.push(`Another order (${recentAddressOrder.orderNumber}) was placed with this exact address in the last 7 days.`);
    }
  }

  // 3. Orders > PKR 10,000 from new customers check
  const totalVal = Number(orderData.total || 0);
  if (totalVal > 10000) {
    let orderCount = 0;
    if (email) {
      orderCount = await Order.countDocuments({ 'customerInfo.email': email, status: 'Delivered' });
    } else if (phone) {
      orderCount = await Order.countDocuments({ 'customerInfo.phone': phone, status: 'Delivered' });
    }
    if (orderCount === 0) {
      reasons.push(`Large order (> PKR 10,000) from a new customer with 0 delivered history.`);
    }
  }

  // 4. Duplicate names check (exact same name within 24 hours, potential duplicate double-submission)
  if (name) {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const duplicateOrder = await Order.findOne({
      'customerInfo.name': name,
      createdAt: { $gte: oneDayAgo },
      _id: { $ne: orderData._id }
    });
    if (duplicateOrder) {
      reasons.push(`Potential double-submission: Same customer name (${name}) ordered in the last 24 hours.`);
    }
  }

  return {
    isFlagged: reasons.length > 0,
    reasons,
    status: reasons.length > 0 ? 'pending' : 'approved'
  };
}

module.exports = { checkFraud };
