const crypto = require('crypto');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

// HS-YYYYMMDD-XXXXXX
/* FINAL AUDIT. Placing a real COD order returned VL-20260801-ED770D: every
   order number still carried the legacy VELOURA prefix. That string is printed
   on the confirmation page, the tracking page, the packing slip and every
   customer email — the old brand was reaching the customer on the single most
   important document of the purchase.
   Existing VL- orders keep their numbers; `track` matches on the stored string,
   so historical orders are unaffected. Only newly generated numbers change. */
const orderNumber = () => {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `HS-${ymd}-${rand}`;
};

// Check a discount doc against a subtotal; returns { ok, amount } or { ok:false, message }
const evaluateDiscount = (discount, subtotal) => {
  if (!discount || !discount.active) return { ok: false, message: 'This code is not valid' };
  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) return { ok: false, message: 'This code has expired' };
  if (discount.maxUses > 0 && discount.usedCount >= discount.maxUses) return { ok: false, message: 'This code has reached its usage limit' };
  if (subtotal < discount.minSubtotal) return { ok: false, message: `This code needs a minimum order of PKR ${discount.minSubtotal.toLocaleString()}` };
  const amount = discount.type === 'percent'
    ? Math.round((subtotal * discount.value) / 100)
    : Math.min(discount.value, subtotal);
  if (amount <= 0) return { ok: false, message: 'This code is not valid' };
  return { ok: true, amount };
};

module.exports = { asyncHandler, slugify, orderNumber, evaluateDiscount };
