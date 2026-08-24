const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const Order = require('../models/Order');
const Promotion = require('../models/Promotion');
const PromotionUse = require('../models/PromotionUse');
const Discount = require('../models/Discount');
const EmailCampaign = require('../models/EmailCampaign');
const AbandonedCart = require('../models/AbandonedCart');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');
const Banner = require('../models/Banner');

const router = express.Router();
router.use(protect, adminOnly);

/* ============================================================================
 * MARKETING DASHBOARD — Phase 6: Real-data only
 *
 * Every metric here is backed by a real database query. No fake open rates,
 * no fake ROAS, no fake conversion rates.
 * ========================================================================== */

router.get('/dashboard', asyncHandler(async (req, res) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 86400000);

  // ── Promotions ─────────────────────────────────────────────────────
  const [activePromos, scheduledPromos, pausedPromos, totalPromos] = await Promise.all([
    Promotion.countDocuments({ enabled: true, status: { $in: ['active', 'scheduled'] } }),
    Promotion.countDocuments({ status: 'scheduled' }),
    Promotion.countDocuments({ status: 'paused' }),
    Promotion.countDocuments({ status: { $ne: 'archived' } }),
  ]);

  // ── Promotion usage (redemptions) ──────────────────────────────────
  const promoUses = await PromotionUse.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: null, totalRedemptions: { $sum: 1 }, totalDiscount: { $sum: '$amount' } } },
  ]);
  const redemptions30d = promoUses[0]?.totalRedemptions || 0;
  const discountGiven30d = promoUses[0]?.totalDiscount || 0;

  // ── Coupons ────────────────────────────────────────────────────────
  const [activeCoupons, totalCouponUses] = await Promise.all([
    Discount.countDocuments({ active: true }),
    Discount.aggregate([{ $group: { _id: null, totalUsed: { $sum: '$usedCount' } } }]),
  ]);
  const totalCouponRedemptions = totalCouponUses[0]?.totalUsed || 0;

  // ── Campaigns ──────────────────────────────────────────────────────
  const campaignStats = await EmailCampaign.aggregate([
    { $group: {
      _id: null,
      totalCampaigns: { $sum: 1 },
      totalSent: { $sum: '$sent' },
      totalFailed: { $sum: '$failed' },
      totalSkipped: { $sum: '$skipped' },
      totalMatched: { $sum: '$matched' },
    }},
  ]);
  const cs = campaignStats[0] || {};
  const [draftCampaigns] = await Promise.all([
    EmailCampaign.countDocuments({ status: 'draft' }),
  ]);

  // ── Abandoned carts ────────────────────────────────────────────────
  const [openCarts, recoveredCarts, totalCarts] = await Promise.all([
    AbandonedCart.countDocuments({ recoveredOrderId: null }),
    AbandonedCart.countDocuments({ recoveredOrderId: { $ne: null } }),
    AbandonedCart.countDocuments(),
  ]);
  const recoveryRate = totalCarts > 0 ? Math.round((recoveredCarts / totalCarts) * 100) : 0;

  // ── Audience sizes ─────────────────────────────────────────────────
  const [subscribers, totalCustomers, vipCount] = await Promise.all([
    Subscriber.countDocuments(),
    User.countDocuments({ deletedAt: null }),
    User.countDocuments({ deletedAt: null, 'orderSummary.revenue': { $gte: 500000 } }),
  ]);

  // ── Banners ────────────────────────────────────────────────────────
  const [activeBanners] = await Promise.all([
    Banner.countDocuments({ status: 'active' }),
  ]);

  // ── Promotion-attributed orders (last 30d) ────────────────────────
  const promoOrders = await Order.countDocuments({
    createdAt: { $gte: thirtyDaysAgo },
    'promotions.0': { $exists: true },
    status: { $nin: ['Cancelled'] },
  });

  res.json({
    promotions: {
      active: activePromos,
      scheduled: scheduledPromos,
      paused: pausedPromos,
      total: totalPromos,
      redemptions30d,
      discountGiven30d,
      attributedOrders30d: promoOrders,
    },
    coupons: {
      active: activeCoupons,
      totalRedemptions: totalCouponRedemptions,
    },
    campaigns: {
      total: cs.totalCampaigns || 0,
      drafts: draftCampaigns,
      totalSent: cs.totalSent || 0,
      totalFailed: cs.totalFailed || 0,
      totalSkipped: cs.totalSkipped || 0,
      totalMatched: cs.totalMatched || 0,
    },
    abandonedCarts: {
      open: openCarts,
      recovered: recoveredCarts,
      total: totalCarts,
      recoveryRate,
    },
    audience: {
      subscribers,
      totalCustomers,
      vip: vipCount,
    },
    banners: {
      active: activeBanners,
    },
  });
}));

module.exports = router;
