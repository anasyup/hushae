const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Settings = require('../models/Settings');
const Discount = require('../models/Discount');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');
const { asyncHandler, orderNumber, evaluateDiscount } = require('../utils/helpers');
const { postalCheck, CITY_POSTAL } = require('../data/postalcodes');
const { normalizePhone } = require('../utils/validators');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Order-spam wall: a real customer never needs more than a few attempts
const placeOrderLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 8, key: 'place-order', message: 'Too many order attempts — please wait a few minutes and try again' });

const digits = (s) => String(s || '').replace(/\D/g, '');
const phoneTail = (s) => digits(s).slice(-10); // forgiving match: 0300... / +92300...

// ---- Place order (guest or logged-in) ----
router.post('/', placeOrderLimit, optionalAuth, asyncHandler(async (req, res) => {
  const {
    customerInfo = {}, items = [], paymentMethod, transactionId = '', discountCode = '',
    discreetPackaging = true, shippingMethod = 'standard',
    /* Rewards. The client states INTENT only — how many points to spend, and
       whether to apply credit or a card. It never sends a rupee value; every
       amount below is computed from the server's own ledger. */
    redeemPoints = 0, useCredit = false, giftCardCode = '',
  } = req.body || {};

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

  // Postal code: auto-resolve from city/province or verify
  const cityTrim = String(customerInfo.city || '').trim();
  const provTrim = String(customerInfo.province || '').trim();
  const fallbackPc = CITY_POSTAL[cityTrim] || {
    'Punjab': '54000',
    'Sindh': '74200',
    'Islamabad (ICT)': '44000',
    'Khyber Pakhtunkhwa': '25000',
    'Balochistan': '87300',
    'Azad Kashmir': '13100',
    'Gilgit-Baltistan': '15100',
  }[provTrim] || '54000';

  if (!customerInfo.postalCode || customerInfo.postalCode === '00000' || !/^\d{5}$/.test(String(customerInfo.postalCode).trim())) {
    customerInfo.postalCode = fallbackPc;
  } else {
    const pc = postalCheck(customerInfo.postalCode, provTrim, cityTrim);
    if (!pc.ok) {
      customerInfo.postalCode = pc.suggestion || fallbackPc;
    }
  }

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

  const settings = (await Settings.findOne({ key: 'store' })) || (await Settings.create({ key: 'store' }));

  /* Payment method must be one the merchant has actually switched ON.
     Reading the registry instead of a hardcoded list means adding a provider
     in the admin panel does not require a code change here — and a method the
     merchant disabled cannot be ordered through a crafted request. Falls back
     to the legacy booleans for stores that have not migrated yet. */
  // Payment method validation & normalization
  let normPaymentMethod = paymentMethod;
  if (String(paymentMethod).toLowerCase() === 'cod') normPaymentMethod = 'COD';
  else if (String(paymentMethod).toLowerCase() === 'jazzcash') normPaymentMethod = 'JazzCash';
  else if (String(paymentMethod).toLowerCase() === 'easypaisa') normPaymentMethod = 'EasyPaisa';
  else if (String(paymentMethod).toLowerCase().includes('bank')) normPaymentMethod = 'Bank Transfer';

  {
    const list = (settings.checkout && settings.checkout.paymentList) || [];
    const migrated = !!(settings.checkout && settings.checkout.checkoutMigrated);
    const legacy = settings.paymentMethods || {};
    const legacyMap = { COD: 'cod', JazzCash: 'jazzcash', EasyPaisa: 'easypaisa', 'Bank Transfer': 'bank' };
    const allowed = list.length
      ? list.filter((m) => {
        if (m.comingSoon) return false;
        if (!migrated && legacyMap[m.id] !== undefined && legacy[legacyMap[m.id]] !== undefined) {
          return !!legacy[legacyMap[m.id]];
        }
        return !!m.enabled;
      }).map((m) => m.id)
      : Object.keys(legacyMap).filter((k) => legacy[legacyMap[k]]);
    if (!allowed.includes(normPaymentMethod) && !allowed.map((a) => a.toLowerCase()).includes(String(paymentMethod).toLowerCase())) {
      return res.status(400).json({ message: 'That payment method is not available. Please choose another.' });
    }
  }

  const { allocateOrderLines, releaseOrderLines, variantKeyOf, pickVariant } = require('../utils/inventoryEngine');
  const reservedNumber = orderNumber();
  const lineItems = [];
  const productMap = new Map();
  for (const it of items) {
    const qty = Math.max(1, Math.min(parseInt(it.quantity || '1', 10), 10));
    const product = await Product.findOne({ _id: it.product, isActive: true, status: { $ne: 'draft' } });
    if (!product) {
      return res.status(409).json({
        message: 'An item is no longer available.',
        productId: it.product,
        reason: 'unavailable',
      });
    }
    if (it.size && product.sizes.length && !product.sizes.includes(it.size)) {
      return res.status(400).json({
        message: `Size "${it.size}" is no longer available for "${product.name}".`,
        productId: product._id,
        reason: 'size-unavailable',
        itemName: product.name,
      });
    }
    const size = it.size || product.sizes[0] || '';
    const color = it.color || product.colors[0]?.name || '';
    const v = pickVariant(product, size, color);
    const unit = (v && v.price != null) ? Number(v.price) : product.price;
    const cost = (v && v.costPrice != null) ? Number(v.costPrice) : (product.costPrice || 0);
    productMap.set(String(product._id), product.toObject ? product.toObject() : product);
    lineItems.push({
      product: product._id, name: product.name, slug: product.slug,
      image: (v && v.image) || product.images[0]?.url || '', size, color,
      price: unit, costPrice: cost, quantity: qty, lineTotal: unit * qty,
    });
  }

  try {
    await allocateOrderLines({ lines: lineItems, orderNumber: reservedNumber, actor: 'checkout' });
  } catch (e) {
    return res.status(e.status || 409).json({
      message: e.message || 'Not enough stock',
      reason: 'out-of-stock',
    });
  }
  const releaseReserved = async () => {
    await releaseOrderLines({ lines: lineItems, orderNumber: reservedNumber, actor: 'checkout-rollback' }).catch(() => {});
  };

  const subtotal = lineItems.reduce((s, li) => s + li.lineTotal, 0);

  // Coupon (validated server-side; on failure restore stock and stop)
  let discountAmount = 0;
  let appliedCode = '';
  if (discountCode && String(discountCode).trim()) {
    const d = await Discount.findOne({ code: String(discountCode).trim().toUpperCase() });
    const r = evaluateDiscount(d, subtotal);
    if (!r.ok) {
      await releaseReserved();
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

  /* --------------------------------------------------------------------
   * AUTOMATIC PROMOTIONS
   *
   * Sits between the coupon and the tax on purpose:
   *   · after the coupon, so the coupon keeps the behaviour it always had
   *   · before tax and shipping, because a promotion discounts GOODS, and
   *     tax has always been charged on the discounted goods total
   *
   * The whole block is wrapped: settings.marketing ships disabled, and if the
   * engine throws for any reason the order proceeds at the price it would
   * have had before this sprint. A promotion failing must never cost a sale.
   *
   * Nothing is recorded here. Usage is written after the order row exists,
   * the same discipline the loyalty debits follow.
   * ------------------------------------------------------------------ */
  let promoTotal = 0;
  let promoApplied = [];
  let promoFreeShipping = false;
  try {
    const PE = require('../utils/promotionEngine');
    const mcfg = await PE.marketingConfig();
    if (mcfg.enabled) {
      // Products were already loaded above for stock and pricing; reuse them
      // rather than issuing a second read.
      const promoLines = lineItems.map((li) => ({
        key: `${li.product}:${li.size || ''}:${li.color || ''}`,
        productId: li.product,
        price: li.price,
        qty: li.quantity,
        product: productMap.get(String(li.product)) || null,
      })).filter((l) => l.product);

      // orderCount is counted from real orders, never trusted from the
      // request — otherwise "first order only" is a free-for-all.
      const Order = require('../models/Order');
      const priorOrders = await Order.countDocuments({
        'customerInfo.phone': { $regex: `${String(phoneNorm).replace(/\D/g, '').slice(-9)}$` },
        status: { $nin: ['Cancelled'] },
      });

      const r = await PE.evaluateCart({
        lines: promoLines,
        ctx: {
          phone: phoneNorm,
          city: customerInfo.city,
          paymentMethod,
          orderCount: priorOrders,
          hasCoupon: !!appliedCode,
        },
      });

      /* Per-customer caps are checked here rather than inside evaluateCart:
         the engine is pure and synchronous over its inputs, and this needs a
         query per promotion. Filtering after keeps the engine testable. */
      if (r.discounts.length) {
        const Promotion = require('../models/Promotion');
        const kept = [];
        for (const d of r.discounts) {
          const promo = await Promotion.findById(d.id).lean().catch(() => null);
          if (promo && await PE.overPerCustomerLimit(promo, phoneNorm)) continue;
          kept.push(d);
        }
        promoApplied = kept;
        promoTotal = Math.min(kept.reduce((s, d) => s + (d.amount || 0), 0), afterDiscount);
        promoFreeShipping = kept.some((d) => d.freeShipping);
      }
    }
  } catch (e) {
    console.error('promotion evaluation skipped:', e.message);
  }

  const afterPromotions = Math.max(0, afterDiscount - promoTotal);

  // Chosen shipping method, validated against the merchant's own list.
  const shipMethods = (settings.checkout && settings.checkout.shippingMethods) || [];
  const chosenShip = shipMethods.find((m) => m.id === shippingMethod && m.enabled);
  const baseShipping = (promoFreeShipping || afterPromotions >= settings.freeShippingThreshold)
    ? 0 : settings.shippingFlatRate;
  // A method's own rate replaces the flat rate; free-shipping still wins when
  // the method allows it (Express deliberately does not).
  const shippingCharge = chosenShip
    ? (chosenShip.freeEligible !== false && baseShipping === 0 ? 0 : Number(chosenShip.rate) || 0)
    : baseShipping;


  const taxPercent = Number(settings.cart && settings.cart.taxPercent) || 0;
  const tax = taxPercent > 0 ? Math.round((afterPromotions * taxPercent) / 100) : 0;

  /* --------------------------------------------------------------------
   * REWARDS APPLIED AT CHECKOUT
   *
   * Three rules, all enforced here and nowhere else:
   *
   *  1. THE CLIENT NEVER SETS A VALUE. It may ask to spend 500 points; what
   *     those points are worth is read from settings, and whether the
   *     customer HAS them is read from the ledger.
   *  2. NOTHING IS DEBITED YET. Amounts are calculated, then the balances are
   *     actually taken after the order row exists — so a failed order cannot
   *     eat someone's points.
   *  3. THE ORDER CAN NEVER GO BELOW ZERO. Each reward is capped by what is
   *     still payable at that point in the sequence.
   *
   * Order of application: points (capped by the merchant's percentage), then
   * store credit, then gift card. Points first because they are the most
   * restricted; credit and cards can cover anything that is left.
   * ------------------------------------------------------------------ */
  const LE = require('../utils/loyaltyEngine');
  const lcfg = await LE.loyaltyConfig();

  let pointsToSpend = 0;
  let pointsDiscount = 0;
  let creditToUse = 0;
  let giftCardToUse = 0;
  let giftCardDoc = null;
  let loyaltyAcc = null;

  if (lcfg.enabled) {
    const wantPoints = Math.max(0, Math.floor(Number(redeemPoints) || 0));
    const wantCredit = !!useCredit;
    const wantCard = String(giftCardCode || '').trim();

    if (wantPoints || wantCredit || wantCard) {
      // Payable before rewards: goods after coupon, plus shipping and tax.
      let payable = afterPromotions + shippingCharge + tax;

      if (wantPoints || wantCredit) {
        loyaltyAcc = await LE.getAccount({ phone: phoneNorm, email: customerInfo.email, name: customerInfo.name, user: req.user ? req.user._id : null }, lcfg);
      }

      if (loyaltyAcc && !loyaltyAcc.blocked) {
        if (wantPoints > 0 && lcfg.redeem.enabled) {
          // maxRedeemable applies the minimum, the step and the % cap.
          const q = LE.maxRedeemable(loyaltyAcc.pointsBalance, afterPromotions, lcfg);
          const step = Number(lcfg.redeem.step) || 1;
          // Honour the customer's smaller request, snapped to the step.
          let use = Math.min(wantPoints, q.points);
          use = Math.floor(use / step) * step;
          if (use >= (Number(lcfg.redeem.minPoints) || 0) && use > 0) {
            const value = Math.min(use * (Number(lcfg.redeem.pointValue) || 1), payable);
            pointsToSpend = use;
            pointsDiscount = value;
            payable -= value;
          }
        }

        if (wantCredit && lcfg.credit.enabled && lcfg.credit.allowAtCheckout && payable > 0) {
          creditToUse = Math.min(loyaltyAcc.creditBalance, payable);
          payable -= creditToUse;
        }
      }

      if (wantCard && lcfg.giftCards.enabled && payable > 0) {
        const crypto = require('crypto');
        const GiftCard = require('../models/GiftCard');
        const hash = crypto.createHash('sha256').update(wantCard.trim().toUpperCase()).digest('hex');
        const card = await GiftCard.findOne({ codeHash: hash });
        const usable = card && card.active && card.balance > 0
          && (!card.expiresAt || card.expiresAt >= new Date());
        if (usable) {
          giftCardDoc = card;
          giftCardToUse = Math.min(card.balance, payable);
          payable -= giftCardToUse;
        } else if (wantCard) {
          // An invalid card is worth saying out loud — silently ignoring it
          // means the customer is charged more than the screen promised.
          await releaseReserved();
          if (appliedCode) await Discount.findOneAndUpdate({ code: appliedCode }, { $inc: { usedCount: -1 } });
          return res.status(400).json({ field: 'giftCardCode', message: 'That gift card is not valid or has no balance left' });
        }
      }
    }
  }

  const rewardsTotal = pointsDiscount + creditToUse + giftCardToUse;
  const total = Math.max(0, afterPromotions + shippingCharge + tax - rewardsTotal);

  let fraudFilter = { isFlagged: false, reasons: [], status: 'approved' };
  try {
    const { scoreRisk } = require('../utils/riskEngine');
    const risk = await scoreRisk({
      customerInfo: {
        name: customerInfo.name.trim(), email: (customerInfo.email || '').trim(),
        phone: phoneNorm, address: customerInfo.address.trim(),
      },
      total,
      paymentMethod,
    });
    fraudFilter = {
      isFlagged: risk.isFlagged,
      reasons: risk.factors.map((f) => f.label),
      score: risk.score,
      band: risk.band,
      status: risk.status,
    };
  } catch (err) {
    console.error('Fraud filter check failed:', err.message);
  }

  let order;
  try {
  order = await Order.create({
    orderNumber: reservedNumber,
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
    promotionDiscount: promoTotal,
    promotions: promoApplied.map((d) => ({ promotion: d.id, name: d.name, type: d.type, amount: d.amount })),
    promotionFreeShipping: promoFreeShipping,
    pointsRedeemed: pointsToSpend,
    pointsDiscount,
    creditUsed: creditToUse,
    giftCardUsed: giftCardToUse,
    giftCardLast4: giftCardDoc ? giftCardDoc.last4 : '',
    giftCard: giftCardDoc ? giftCardDoc._id : null,
    paymentMethod, paymentStatus: 'Pending', transactionId: transactionId.trim(),
    status: 'Pending', statusHistory: [{ status: 'Pending' }],
    discreetPackaging: !!discreetPackaging,
    fraudFilter,
  });
  } catch (e) {
    await releaseReserved();
    throw e;
  }

  /* Debit the balances only now that the order exists.
   *
   * Doing this AFTER the write is the whole point: if the order had failed,
   * the customer's points would already be gone with nothing to show for it.
   * Each debit carries an idempotency key built from the order id, so a retry
   * of this request cannot take the same points twice.
   *
   * A failure here is logged and swallowed. An order that is placed but whose
   * points were not deducted is a small accounting problem the merchant can
   * see in the ledger; an order that vanishes at the last step is a lost sale. */
  /* Promotion usage is recorded only now that the order exists. Counting a
     promotion against its budget for an order that then failed would quietly
     burn the merchant's allowance. Each write carries an idempotency key so a
     retry cannot count twice. */
  if (promoApplied.length) {
    try {
      await require('../utils/promotionEngine')
        .recordUsage({ discounts: promoApplied, order, phone: phoneNorm });
    } catch (e) {
      console.error('promotion usage record failed for', order.orderNumber, e.message);
    }
  }

  if (rewardsTotal > 0) {
    try {
      if (pointsToSpend > 0) {
        await LE.award({
          phone: phoneNorm, kind: 'points', amount: -pointsToSpend,
          reason: 'redeem', note: `Spent on ${order.orderNumber}`,
          order: order._id, orderNumber: order.orderNumber,
          idempotencyKey: `redeem:${order._id}`,
        });
      }
      if (creditToUse > 0) {
        await LE.award({
          phone: phoneNorm, kind: 'credit', amount: -creditToUse,
          reason: 'redeem', note: `Applied to ${order.orderNumber}`,
          order: order._id, orderNumber: order.orderNumber,
          idempotencyKey: `credit:${order._id}`,
        });
      }
      if (giftCardDoc && giftCardToUse > 0) {
        // $inc, not a read-modify-write: two orders redeeming the same card at
        // the same moment must not both see the original balance.
        await require('../models/GiftCard').updateOne(
          { _id: giftCardDoc._id, balance: { $gte: giftCardToUse } },
          {
            $inc: { balance: -giftCardToUse },
            $push: { redemptions: { amount: giftCardToUse, order: order._id, orderNumber: order.orderNumber, at: new Date() } },
          },
        );
      }
      await Order.updateOne({ _id: order._id }, { $set: { rewardsSettled: true } });
    } catch (e) {
      console.error('Rewards settlement failed for', order.orderNumber, e.message);
    }
  }

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
  const { reliabilityMap } = require('../utils/customerReliability');
  const hist = await Order.find({ 'customerInfo.phone': order.customerInfo?.phone })
    .select('customerInfo.phone status customerService').lean();
  const reliability = reliabilityMap(hist).get(String(order.customerInfo?.phone || '').replace(/\D/g, '').slice(-10)) || null;
  res.json({ order, reliability });
}));

router.patch('/admin/:id/status', protect, adminOnly, asyncHandler(async (req, res) => {
  const { status, note = '', cancelReason = '' } = req.body || {};
  if (!Order.STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  const prevStatus = order.status;
  order.status = status;
  if (status === 'Cancelled' && cancelReason) order.cancelReason = String(cancelReason).trim().slice(0, 80);
  order.statusHistory.push({ status, note: String(note).slice(0, 200) });
  await order.save();
  if (status === 'Cancelled' && prevStatus !== 'Cancelled') {
    try {
      const { releaseOrderLines } = require('../utils/inventoryEngine');
      const lines = order.items.map((i) => ({
        product: i.product, size: i.size, color: i.color,
        quantity: Math.max(0, (i.reservedQty || i.quantity || 0) - (i.fulfilledQty || 0) - (i.cancelledQty || 0)),
      })).filter((l) => l.quantity > 0);
      if (lines.length) {
        await releaseOrderLines({ lines, orderNumber: order.orderNumber, actor: req.user?.email || 'admin' });
        order.items.forEach((i) => {
          const left = Math.max(0, (i.reservedQty || i.quantity || 0) - (i.fulfilledQty || 0) - (i.cancelledQty || 0));
          i.cancelledQty = (i.cancelledQty || 0) + left;
          i.reservedQty = i.fulfilledQty || 0;
        });
        await order.save();
      }
    } catch (e) { console.error('stock release on cancel failed', e.message); }
  }

  if (['Ready to Ship', 'Shipped'].includes(status) && !['Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered'].includes(prevStatus)) {
    try {
      const { fulfillOrderLines } = require('../utils/inventoryEngine');
      const lines = order.items.map((i) => ({
        product: i.product, size: i.size, color: i.color,
        quantity: Math.max(0, (i.reservedQty || 0) - (i.fulfilledQty || 0)),
        fromQty: i.fulfilledQty || 0,
      })).filter((l) => l.quantity > 0);
      if (lines.length) {
        await fulfillOrderLines({ lines, orderNumber: order.orderNumber, actor: req.user?.email || 'admin' });
        order.items.forEach((i) => {
          const n = Math.max(0, (i.reservedQty || 0) - (i.fulfilledQty || 0));
          i.fulfilledQty = (i.fulfilledQty || 0) + n;
        });
        await order.save();
      }
    } catch (e) { console.error('fulfill on ship failed', e.message); }
  }
  try { require('../utils/auditLogger').logAction(req.user?.email, 'status', 'order', order.orderNumber, prevStatus, status); } catch { /* noop */ }

  // Fire-and-forget status-update email to customer for meaningful transitions
  if (prevStatus !== status) {
    try {
      const mailer = require('../utils/mailer');
      mailer.sendStatusUpdate(order).catch(() => {});
      // Review request fires once on the transition INTO Delivered
      if (order.status === 'Delivered' && prevStatus !== 'Delivered') {
        mailer.sendReviewRequest(order).catch(() => {});
      }
    } catch { /* noop */ }
  }

  /* ------------------------------------------------------------------
   * Loyalty. Fires once, on the transition INTO the merchant's chosen
   * award status (Delivered by default). Paying earlier would pay for
   * orders that get cancelled.
   *
   * Everything below is best-effort: a loyalty failure must never stop a
   * merchant from marking an order delivered. Awards are idempotent, so a
   * status set twice — or a retried request — cannot pay twice.
   * ---------------------------------------------------------------- */
  if (status !== prevStatus) {
    try {
      const Settings = require('../models/Settings');
      const settings = await Settings.findOne({});
      const E = require('../utils/loyaltyEngine');
      const cfg = await E.loyaltyConfig();

      const awardStatus = cfg.earn?.awardOnStatus || 'Delivered';

      if (cfg.enabled && status === awardStatus && prevStatus !== awardStatus) {
        const info = order.customerInfo || {};
        const acc = await E.getAccount({ phone: info.phone, email: info.email, name: info.name }, cfg);

        if (acc) {
          // Tier first — the multiplier for THIS order is the tier the
          // customer already holds, not the one this order pushes them into.
          const spendBefore = await E.spendForTier(acc.phone, cfg);
          const tierNow = E.resolveTier(spendBefore, cfg).current;
          const multiplier = (cfg.tiers?.enabled && tierNow?.multiplier) || 1;

          const pts = E.pointsForOrder(order, cfg, multiplier);
          if (pts > 0) {
            await E.award({
              phone: info.phone, email: info.email, name: info.name,
              amount: pts, reason: 'purchase',
              note: `Order ${order.orderNumber}${multiplier !== 1 ? ` · ${multiplier}× ${tierNow.name}` : ''}`,
              order: order._id, orderNumber: order.orderNumber,
              idempotencyKey: `purchase:${order._id}`,
            });
          }

          // First-order bonus, once in a lifetime.
          if (cfg.earn?.firstOrderEnabled && !acc.claimed?.firstOrder && cfg.earn.firstOrderPoints > 0) {
            const r = await E.award({
              phone: info.phone, amount: cfg.earn.firstOrderPoints, reason: 'first-order',
              note: 'Welcome bonus on your first order',
              order: order._id, orderNumber: order.orderNumber,
              idempotencyKey: `first-order:${acc._id}`,
            });
            if (r.ok) await require('../models/LoyaltyAccount').findByIdAndUpdate(acc._id, { $set: { 'claimed.firstOrder': true } });
          }

          // Referral payout — held until the friend's order actually lands,
          // otherwise a ring of cancelled orders mints points.
          if (cfg.referral?.enabled && acc.referredBy && status === (cfg.referral.payOnStatus || 'Delivered')) {
            const LoyaltyAccount = require('../models/LoyaltyAccount');
            const referrer = await LoyaltyAccount.findOne({ referralCode: acc.referredBy });
            const bigEnough = (Number(order.total) || 0) >= (Number(cfg.referral.minOrderValue) || 0);
            const notSelf = referrer && String(referrer._id) !== String(acc._id);

            if (referrer && bigEnough && notSelf) {
              const paid = await E.award({
                phone: referrer.phone, amount: cfg.referral.referrerPoints, reason: 'referral',
                note: `${acc.name || 'A friend'} placed their first order`,
                order: order._id, orderNumber: order.orderNumber,
                idempotencyKey: `referral:${acc._id}`,
              });
              if (paid.ok) await LoyaltyAccount.findByIdAndUpdate(referrer._id, { $inc: { referralCount: 1 } });

              await E.award({
                phone: acc.phone, amount: cfg.referral.refereePoints, reason: 'referred',
                note: 'Thanks for joining through a friend',
                order: order._id, orderNumber: order.orderNumber,
                idempotencyKey: `referred:${acc._id}`,
              });
            }
          }

          // Re-read the tier AFTER this order counts.
          await E.syncTier(acc, cfg);
        }
      }

      // The original coupon rule still runs. It is now one earn rule among
      // several rather than the whole programme.
      if (status === 'Delivered' && prevStatus !== 'Delivered') {
        const { tryReward } = require('../utils/loyalty');
        tryReward(order, { settings });
      }
    } catch (e) {
      console.error('[loyalty] award failed:', e.message);
    }
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
      if (order.status === 'Delivered' && prevStatus !== 'Delivered') {
        mailer.sendReviewRequest(order).catch(() => {});
      }
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
