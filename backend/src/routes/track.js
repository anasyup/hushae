const express = require('express');
const PageView = require('../models/PageView');
const Order = require('../models/Order');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

const BOT = /bot|crawl|spider|slurp|curl|wget|python|headless|pingdom|uptime|lighthouse/i;

function deviceOf(ua) {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}
const decode = (v) => { try { return decodeURIComponent(String(v || '')); } catch { return String(v || ''); } };

// Public storefront tracking (generous limit — every page load calls this)
const trackLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 400, key: 'track' });
router.post('/', trackLimit, optionalAuth, asyncHandler(async (req, res) => {
  const ua = String(req.headers['user-agent'] || '');
  if (BOT.test(ua)) return res.json({ ok: true, skipped: true });
  const { sid, path, referrer, event } = req.body || {};
  if (typeof sid !== 'string' || !sid || sid.length > 64) return res.status(400).json({ message: 'Invalid session' });
  const ev = ['cart', 'checkout'].includes(event) ? event : 'pageview';
  const safePath = String(path || '/').slice(0, 200);
  const device = deviceOf(ua);
  await PageView.create({
    sid,
    event: ev,
    path: safePath,
    referrer: String(referrer || '').slice(0, 300),
    device,
    country: decode(req.headers['x-vercel-ip-country']),
    city: decode(req.headers['x-vercel-ip-city']),
  });

  /* Customer 360 only receives attributable, real storefront events. The
     anonymous PageView ledger remains anonymous; we never backfill a person
     onto old sessions. */
  if (req.user) {
    const { recordCustomerActivity } = require('../utils/customerActivity');
    let activity = null;
    const productPath = safePath.match(/^\/product\/([^/?#]+)/i);
    if (ev === 'checkout') {
      activity = { type: 'checkout_started', objectType: 'checkout', objectLabel: 'Checkout', source: 'checkout' };
    } else if (ev === 'cart') {
      activity = { type: 'added_to_cart', objectType: 'cart', objectLabel: 'Shopping bag', source: 'storefront' };
    } else if (productPath) {
      activity = {
        type: 'product_viewed', objectType: 'product',
        objectLabel: decode(productPath[1]).slice(0, 180), source: 'storefront',
      };
    }
    if (activity) {
      recordCustomerActivity({ customer: req.user._id, device, ...activity }).catch(() => {});
    }
  }
  res.json({ ok: true });
}));

// Admin — Live View data (visitors right now, today's funnel, feed, locations)
router.get('/admin/live', protect, adminOnly, asyncHandler(async (req, res) => {
  const now = Date.now();
  const since5 = new Date(now - 5 * 60 * 1000);
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
  const dayMatch = { createdAt: { $gte: dayStart } };

  const [nowSids, feed, sessionsSids, cartSids, checkoutSids, ordersToday, salesToday, byLocation, byDevice] = await Promise.all([
    PageView.distinct('sid', { createdAt: { $gte: since5 } }),
    PageView.find().sort({ createdAt: -1 }).limit(25).select('event path city country device createdAt').lean(),
    PageView.distinct('sid', dayMatch),
    PageView.distinct('sid', { ...dayMatch, event: 'cart' }),
    PageView.distinct('sid', { ...dayMatch, event: 'checkout' }),
    Order.countDocuments(dayMatch),
    Order.aggregate([
      { $match: { createdAt: { $gte: dayStart }, status: { $nin: ['Cancelled', 'Refunded'] } } },
      { $group: { _id: null, t: { $sum: '$total' } } },
    ]),
    PageView.aggregate([
      { $match: { ...dayMatch, city: { $ne: '' } } },
      { $group: { _id: { city: '$city', country: '$country' }, sids: { $addToSet: '$sid' }, views: { $sum: 1 } } },
      { $project: { sessions: { $size: '$sids' }, views: 1 } },
      { $sort: { sessions: -1, views: -1 } },
      { $limit: 8 },
    ]),
    PageView.aggregate([
      { $match: dayMatch },
      { $group: { _id: '$device', sids: { $addToSet: '$sid' } } },
      { $project: { sessions: { $size: '$sids' } } },
    ]),
  ]);

  res.json({
    visitorsNow: nowSids.length,
    feed,
    today: {
      sessions: sessionsSids.length,
      carts: cartSids.length,
      checkouts: checkoutSids.length,
      orders: ordersToday,
      sales: salesToday[0]?.t || 0,
    },
    byLocation: byLocation.map((l) => ({ city: l._id.city, country: l._id.country, sessions: l.sessions, views: l.views })),
    byDevice: byDevice.map((d) => ({ device: d._id, sessions: d.sessions })),
  });
}));

module.exports = router;
