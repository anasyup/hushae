const CustomerActivity = require('../models/CustomerActivity');

function deviceFromUserAgent(userAgent = '') {
  const ua = String(userAgent || '');
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  if (ua) return 'desktop';
  return 'unknown';
}

/**
 * Best-effort event append. Activity must never block checkout, wishlist or
 * tracking. There is intentionally no update/delete counterpart: corrections
 * are new facts, not rewrites of a customer's audit trail.
 */
async function recordCustomerActivity({
  customer,
  type,
  objectType = '',
  objectId = '',
  objectLabel = '',
  source = 'storefront',
  device = 'unknown',
  metadata = {},
} = {}) {
  if (!customer || !type) return null;
  try {
    return await CustomerActivity.create({
      customer,
      type,
      objectType: String(objectType || '').slice(0, 40),
      objectId: String(objectId || '').slice(0, 120),
      objectLabel: String(objectLabel || '').slice(0, 180),
      source,
      device,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    });
  } catch (err) {
    // Keep an event write from becoming a customer-facing commerce failure.
    console.error('[customer-activity] append failed:', err.message);
    return null;
  }
}

module.exports = { recordCustomerActivity, deviceFromUserAgent };
