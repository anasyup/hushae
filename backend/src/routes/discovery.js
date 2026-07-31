const express = require('express');
const { asyncHandler } = require('../utils/helpers');
const { optionalAuth } = require('../middleware/auth');
const rateLimit = require('../middleware/rateLimit');
const Product = require('../models/Product');
const E = require('../utils/searchEngine');

const router = express.Router();

const CARD = 'name slug price compareAtPrice stock images gender categorySlug tier '
  + 'ratingAvg ratingCount sizes colors tags badges isFeatured isBestSeller createdAt';

const assistLimit = rateLimit({ windowMs: 60 * 1000, max: 40, key: 'assistant', message: 'One moment — try again shortly' });

/* ---------------------------------------------------------------------------
 * SIMILAR — content-based, computed from the catalogue itself.
 * ------------------------------------------------------------------------- */
router.get('/similar/:slug', asyncHandler(async (req, res) => {
  const dcfg = await E.discoveryConfig();
  if (!dcfg.enabled || !dcfg.similar.enabled) return res.json({ products: [], title: '' });

  const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
  if (!product) return res.status(404).json({ message: 'Not found' });

  const limit = Math.min(24, parseInt(req.query.limit || dcfg.similar.count || 8, 10));
  const products = await E.similarProducts(product, dcfg, limit);
  res.json({ products, title: dcfg.similar.title });
}));

/* ---------------------------------------------------------------------------
 * OFTEN BOUGHT TOGETHER — from real orders, not a guess.
 *
 * Only pairs that appear in at least `minCoOccur` separate orders are shown:
 * a single coincidental pairing is not a recommendation, it is noise.
 * ------------------------------------------------------------------------- */
router.get('/bought-together/:slug', asyncHandler(async (req, res) => {
  const dcfg = await E.discoveryConfig();
  if (!dcfg.enabled || !dcfg.boughtTogether.enabled) return res.json({ products: [], title: '' });

  const product = await Product.findOne({ slug: req.params.slug }).select('_id').lean();
  if (!product) return res.status(404).json({ message: 'Not found' });

  const Order = require('../models/Order');
  const since = new Date(Date.now() - (Number(dcfg.boughtTogether.windowDays) || 180) * 86400000);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $nin: ['Cancelled', 'Refunded'] }, 'items.product': product._id } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $ne: product._id } } },
    { $group: { _id: '$items.product', n: { $sum: 1 } } },
    { $match: { n: { $gte: Number(dcfg.boughtTogether.minCoOccur) || 2 } } },
    { $sort: { n: -1 } },
    { $limit: Math.min(12, Number(dcfg.boughtTogether.count) || 4) },
  ]);

  if (!rows.length) return res.json({ products: [], title: dcfg.boughtTogether.title });

  const found = await Product.find({ _id: { $in: rows.map((r) => r._id) }, isActive: true, status: { $ne: 'draft' } })
    .select(CARD).lean();
  // Preserve the co-occurrence ranking; a plain $in returns insertion order.
  const order = new Map(rows.map((r, i) => [String(r._id), i]));
  found.sort((a, b) => (order.get(String(a._id)) ?? 99) - (order.get(String(b._id)) ?? 99));

  res.json({ products: found, title: dcfg.boughtTogether.title });
}));

/* ---------------------------------------------------------------------------
 * POPULAR — recent sales, falling back to ratings on a quiet week.
 * ------------------------------------------------------------------------- */
router.get('/popular', asyncHandler(async (req, res) => {
  const dcfg = await E.discoveryConfig();
  if (!dcfg.enabled || !dcfg.popular.enabled) return res.json({ products: [], title: '' });

  const limit = Math.min(24, parseInt(req.query.limit || dcfg.popular.count || 8, 10));
  const Order = require('../models/Order');
  const since = new Date(Date.now() - (Number(dcfg.popular.windowDays) || 30) * 86400000);

  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: since }, status: { $nin: ['Cancelled', 'Refunded'] } } },
    { $unwind: '$items' },
    { $group: { _id: '$items.product', units: { $sum: '$items.quantity' } } },
    { $sort: { units: -1 } },
    { $limit: limit * 2 },
  ]);

  let products = [];
  if (rows.length) {
    const found = await Product.find({ _id: { $in: rows.map((r) => r._id) }, isActive: true, status: { $ne: 'draft' } })
      .select(CARD).lean();
    const order = new Map(rows.map((r, i) => [String(r._id), i]));
    products = found.sort((a, b) => (order.get(String(a._id)) ?? 999) - (order.get(String(b._id)) ?? 999)).slice(0, limit);
  }

  /* A store with no recent orders must not render an empty carousel. Top-rated
     is an honest stand-in and the response says which one was used. */
  let source = 'sales';
  if (products.length < limit) {
    source = products.length ? 'mixed' : 'rated';
    const have = new Set(products.map((p) => String(p._id)));
    const filler = await Product.find({ isActive: true, status: { $ne: 'draft' }, stock: { $gt: 0 }, _id: { $nin: [...have] } })
      .select(CARD).sort({ isBestSeller: -1, ratingCount: -1, ratingAvg: -1 }).limit(limit - products.length).lean();
    products = [...products, ...filler];
  }

  res.json({ products, title: dcfg.popular.title, source });
}));

/* ---------------------------------------------------------------------------
 * PICKED FOR YOU — from what this shopper has actually looked at or bought.
 *
 * Recently-viewed slugs are held on the device and posted here; the server
 * never stores a browsing profile. That keeps the feature working for guests
 * and keeps the store out of the business of tracking people.
 * ------------------------------------------------------------------------- */
router.post('/for-you', optionalAuth, asyncHandler(async (req, res) => {
  const dcfg = await E.discoveryConfig();
  if (!dcfg.enabled || !dcfg.personalized.enabled) return res.json({ products: [], title: '' });

  const limit = Math.min(24, parseInt(req.body?.limit || dcfg.personalized.count || 8, 10));
  const slugs = Array.isArray(req.body?.recent) ? req.body.recent.slice(0, 20).map(String) : [];

  const seeds = [];
  if (dcfg.personalized.useRecentlyViewed && slugs.length) {
    const viewed = await Product.find({ slug: { $in: slugs }, isActive: true }).select(CARD).lean();
    seeds.push(...viewed);
  }
  if (dcfg.personalized.useOrderHistory && req.user?.phone) {
    const Order = require('../models/Order');
    const key = String(req.user.phone).replace(/\D/g, '').slice(-9);
    if (key) {
      const orders = await Order.find({ 'customerInfo.phone': { $regex: `${key}$` } })
        .select('items.product').sort({ createdAt: -1 }).limit(10).lean();
      const ids = [...new Set(orders.flatMap((o) => (o.items || []).map((i) => String(i.product))))].slice(0, 12);
      if (ids.length) seeds.push(...await Product.find({ _id: { $in: ids }, isActive: true }).select(CARD).lean());
    }
  }

  if (!seeds.length) {
    const products = await Product.find({ isActive: true, status: { $ne: 'draft' }, stock: { $gt: 0 } })
      .select(CARD).sort({ isFeatured: -1, ratingCount: -1 }).limit(limit).lean();
    return res.json({ products, title: dcfg.personalized.title, source: 'featured' });
  }

  /* Score every candidate against every seed and keep the best total. Products
     the shopper has already seen are excluded — recommending what they just
     looked at is the classic failure of this feature. */
  const seen = new Set(seeds.map((s) => String(s._id)));
  const tally = new Map();
  for (const seed of seeds) {
    const sims = await E.similarProducts(seed, dcfg, limit);
    sims.forEach((p, i) => {
      const id = String(p._id);
      if (seen.has(id)) return;
      const prev = tally.get(id);
      const score = (limit - i) + (prev?.score || 0);
      tally.set(id, { p, score });
    });
  }

  const products = [...tally.values()].sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.p);
  res.json({ products, title: dcfg.personalized.title, source: 'personal' });
}));

/* ---------------------------------------------------------------------------
 * SHOPPING ASSISTANT
 *
 * Rule-based and entirely server-side. No third-party AI service is called, so
 * nothing about a customer leaves the store, there is no per-query cost, and
 * the merchant can read and edit every rule from the admin panel.
 *
 * It reads a sentence for four things — budget, occasion, who it is for, and
 * product words — then hands all of them to the same search engine the search
 * box uses. The reply explains what it understood, so a wrong answer is
 * obvious rather than mysterious.
 * ------------------------------------------------------------------------- */

/** Pull "under 2000", "below 1.5k", "2000-4000", "budget 3000" out of a sentence. */
function readBudget(text, dcfg) {
  const t = text.toLowerCase().replace(/,/g, '');
  const k = (s) => (/k$/.test(s) ? Number(s.replace('k', '')) * 1000 : Number(s));

  let m = t.match(/(?:between\s*)?(\d+(?:\.\d+)?k?)\s*(?:-|to|and)\s*(\d+(?:\.\d+)?k?)/);
  if (m) { const a = k(m[1]); const b = k(m[2]); if (a && b) return { min: Math.min(a, b), max: Math.max(a, b) }; }

  m = t.match(/(?:under|below|less than|upto|up to|max|maximum|within|se kam)\s*(?:rs\.?|pkr)?\s*(\d+(?:\.\d+)?k?)/);
  if (m) { const v = k(m[1]); if (v) return { min: 0, max: v }; }

  m = t.match(/(?:over|above|more than|minimum|at least|se zyada)\s*(?:rs\.?|pkr)?\s*(\d+(?:\.\d+)?k?)/);
  if (m) { const v = k(m[1]); if (v) return { min: v, max: 0 }; }

  m = t.match(/(?:budget|around|about|near)\s*(?:rs\.?|pkr)?\s*(\d+(?:\.\d+)?k?)/);
  if (m) { const v = k(m[1]); if (v) return { min: Math.round(v * 0.7), max: Math.round(v * 1.3) }; }

  // A bare "rs 2000" / "pkr 2000" reads as a ceiling, which is how people mean it.
  m = t.match(/(?:rs\.?|pkr)\s*(\d+(?:\.\d+)?k?)/);
  if (m) { const v = k(m[1]); if (v) return { min: 0, max: v }; }

  // Fall back to a named band the merchant configured.
  for (const b of dcfg.assistant?.budgets || []) {
    if (b.label && t.includes(String(b.label).toLowerCase())) return { min: b.min || 0, max: b.max || 0 };
  }
  return null;
}

function readGender(text) {
  const t = ` ${text.toLowerCase()} `;
  if (/\b(men|man|mens|male|husband|boyfriend|brother|father|dad|him|his|bhai|shohar)\b/.test(t)) return 'men';
  if (/\b(women|woman|womens|female|wife|girlfriend|sister|mother|mom|her|she|bibi|behen)\b/.test(t)) return 'women';
  return '';
}

function readOccasions(text, dcfg) {
  const t = text.toLowerCase();
  const hits = [];
  for (const o of dcfg.assistant?.occasions || []) {
    if (!o.id) continue;
    if (t.includes(String(o.label || '').toLowerCase()) || t.includes(String(o.id).toLowerCase())
      || (o.terms || []).some((term) => term && t.includes(String(term).toLowerCase()))) {
      hits.push(o);
    }
  }
  return hits;
}

router.post('/assistant', assistLimit, optionalAuth, asyncHandler(async (req, res) => {
  const dcfg = await E.discoveryConfig();
  if (!dcfg.enabled || !dcfg.assistant.enabled) return res.status(403).json({ message: 'The assistant is switched off' });

  const cfg = await E.searchConfig();
  const text = String(req.body?.message || '').trim().slice(0, 300);
  if (!text) return res.status(400).json({ field: 'message', message: 'Tell me what you are looking for' });

  const budget = readBudget(text, dcfg);
  const gender = req.body?.gender || readGender(text);
  const occasions = readOccasions(text, dcfg);

  /* Build the query the search engine will actually run.
   *
   * MEASURED BUG: occasion terms were concatenated onto the shopper's own
   * words, and runSearch treats a multi-term query as an AND. So
   * "cotton vest under 1500" became "cotton vest cooling breathable cotton
   * mesh" — a product had to match all six words. Live proof:
   *
   *     /search?q=cotton vest                     -> 11
   *     /search?q=cooling breathable cotton mesh  ->  0
   *     assistant "cotton vest under 1500"        ->  widened=true
   *
   * Every single assistant question was falling through to the generic
   * fallback, so it looked like it understood nothing while actually parsing
   * budget, gender and occasion perfectly.
   *
   * The fix is to try the narrowest sensible query first and widen in steps,
   * rather than fusing everything into one impossible AND. */
  const occTerms = occasions.flatMap((o) => o.terms || []);
  const stripped = text
    .replace(/(?:under|below|less than|upto|up to|max|maximum|over|above|more than|budget|around|about|between|within)\s*(?:rs\.?|pkr)?\s*\d+(?:\.\d+)?k?/gi, ' ')
    .replace(/\d+(?:\.\d+)?k?\s*(?:-|to|and)\s*\d+(?:\.\d+)?k?/gi, ' ')
    .replace(/\b(i|need|want|looking|for|show|me|find|get|some|something|please|a|an|the|my|is|are|help|choose|buy|chahiye|chahie|liye|mere|mujhe)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();

  const filters = {};
  if (gender) filters.gender = gender;
  if (budget) {
    filters.price = {};
    if (budget.min) filters.price.$gte = budget.min;
    if (budget.max) filters.price.$lte = budget.max;
    if (!Object.keys(filters.price).length) delete filters.price;
  }

  const limit = Math.min(12, Number(dcfg.assistant.maxResults) || 6);
  let products = [];
  let widened = false;
  let usedQuery = '';

  /* Ladder, most specific first. Each rung is a complete, sensible search on
     its own; the first one that returns anything wins. */
  const attempts = [];
  if (stripped) attempts.push(stripped);                 // what they actually typed
  for (const t of occTerms) attempts.push(t);            // one occasion word at a time
  if (stripped) {
    // Individual words from a phrase that found nothing as a whole.
    for (const w of stripped.split(' ')) if (w.length > 2) attempts.push(w);
  }

  for (const attempt of [...new Set(attempts)]) {
    const r = await E.runSearch({ query: attempt, filters, cfg, limit, skip: 0 });
    if (r.products.length) { products = r.products; usedQuery = attempt; break; }
  }

  /* Nothing found? Drop the text and keep the hard constraints. Someone who
     asked for "a gift under 2000" is better served by good products under
     2000 than by an apology. */
  if (!products.length) {
    widened = true;
    const where = { isActive: true, status: { $ne: 'draft' }, stock: { $gt: 0 }, ...filters };
    products = await Product.find(where).select(CARD)
      .sort({ isBestSeller: -1, isFeatured: -1, ratingAvg: -1 }).limit(limit).lean();
  }

  /* Say what was understood. A recommendation the shopper cannot audit is a
     recommendation they will not trust. */
  const understood = [];
  if (gender) understood.push(gender === 'men' ? 'for men' : 'for women');
  if (budget) {
    if (budget.min && budget.max) understood.push(`PKR ${budget.min.toLocaleString('en-PK')}–${budget.max.toLocaleString('en-PK')}`);
    else if (budget.max) understood.push(`under PKR ${budget.max.toLocaleString('en-PK')}`);
    else if (budget.min) understood.push(`over PKR ${budget.min.toLocaleString('en-PK')}`);
  }
  for (const o of occasions) understood.push(String(o.label || '').toLowerCase());

  let reply;
  if (!products.length) {
    reply = 'I could not find anything matching that. Try a wider budget, or tell me the kind of piece you need.';
  } else if (widened) {
    reply = understood.length
      ? `I could not match those exact words, so here are our best pieces ${understood.join(', ')}.`
      : 'Here are some of our most popular pieces to start you off.';
  } else {
    reply = understood.length
      ? `Here is what I found ${understood.join(', ')}.`
      : `Here is what I found for "${text}".`;
  }

  res.json({
    reply,
    understood: { gender, budget, occasions: occasions.map((o) => o.label), query: usedQuery },
    products,
    widened,
    // Sensible next steps, generated from what the shopper actually asked.
    followUps: [
      ...(budget ? [] : [{ label: 'Under PKR 1,500', message: `${text} under 1500` }]),
      ...(gender ? [] : [{ label: 'For men', message: `${text} for men` }, { label: 'For women', message: `${text} for women` }]),
      ...(occasions.length ? [] : (dcfg.assistant.occasions || []).slice(0, 2).map((o) => ({ label: o.label, message: `${text} ${o.label}` }))),
    ].slice(0, 3),
  });
}));

module.exports = router;
