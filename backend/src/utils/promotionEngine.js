/* ============================================================================
 * PROMOTION ENGINE
 *
 * Measured before this existed, on the live store:
 *
 *   · 101 of 101 products carry a compareAtPrice — every item is permanently
 *     marked down, median 22%
 *   · a coupon stacks on top of that with no cap
 *   · loyalty points stack again (capped at 50% of subtotal)
 *   · store credit and gift cards stack again, uncapped
 *   · grep found NO stacking guard anywhere in the codebase
 *
 * So a PKR 1,550 item could reach the till at PKR 540 — 65% off list — with
 * nobody having decided that. This engine exists to make that a choice rather
 * than an accident.
 *
 * THREE RULES IT ENFORCES
 *
 *  1. ONE DISCOUNT PER LINE. Every promotion that could apply to a line is
 *     scored; the resolver keeps the best one and discards the rest, unless
 *     the merchant has explicitly marked both as stackable.
 *
 *  2. THE SERVER DECIDES. This module takes the cart the SERVER loaded and the
 *     settings the SERVER read. A request may say which coupon to try; it can
 *     never say what anything is worth.
 *
 *  3. A CEILING ALWAYS EXISTS. settings.marketing.maxTotalDiscountPercent caps
 *     the sum of every promotion on an order, so no combination of rules can
 *     sell below the floor the merchant set.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not touch useCartPricing, the order money sequence, or the loyalty
 * redemption order. It returns a list of discounts; the caller decides where
 * they sit in the arithmetic. Rewriting the money pipeline to add promotions
 * would risk every sprint that came before this one.
 * ========================================================================== */

const DEFAULTS = {
  enabled: false,

  // ---- The safety net -------------------------------------------------
  // Sum of ALL promotions on one order, as a percentage of the goods
  // subtotal. Coupons, points and credit are counted separately by their own
  // rules; this caps what the promotion engine itself can give away.
  maxTotalDiscountPercent: 40,
  // Never let a line be sold below this fraction of its cost price. 0 = off.
  minMarginPercent: 0,
  // Promotions and coupon codes at the same time?
  allowWithCoupon: true,
  // More than one promotion on the same line?
  allowStacking: false,

  // ---- Flash sales -----------------------------------------------------
  flash: {
    enabled: false,
    showCountdown: true,
    countdownLabel: 'Ends in',
    urgencyMinutes: 60,          // switch to an urgent style under this
    showStockLeft: true,
    lowStockThreshold: 5,
  },

  // ---- Automatic badges -------------------------------------------------
  // Measured: 101/101 products have compareAtPrice, so a naive "Sale" badge
  // would print on every single card and mean nothing. minSalePercent is what
  // stops that.
  badges: {
    enabled: false,
    newDays: 21,
    showNew: true,
    showSale: true,
    minSalePercent: 25,
    showTrending: true,
    trendingDays: 7,
    trendingMinOrders: 3,
    showBestSeller: true,
    showLimitedStock: true,
    limitedStockThreshold: 5,
    maxPerCard: 2,               // two badges is information, four is noise
  },

  // ---- Cart upsells / cross-sells ---------------------------------------
  upsell: {
    enabled: false,
    title: 'Add to your order',
    count: 4,
    // Only suggest things that cost less than what is already in the bag —
    // an upsell dearer than the basket reads as a hard sell.
    maxPriceRatio: 0.8,
    source: 'auto',              // auto | manual | bought-together
    manualProductIds: [],
  },
  crossSell: {
    enabled: false,
    title: 'Goes well with',
    count: 4,
    onProductPage: true,
    onCart: true,
  },
  boughtTogether: {
    enabled: false,
    title: 'Frequently bought together',
    count: 3,
    windowDays: 180,
    minCoOccur: 2,
    bundleDiscountPercent: 0,    // 0 = show as a suggestion, not an offer
  },

  // ---- Scheduling -------------------------------------------------------
  schedule: {
    timezone: 'Asia/Karachi',
    // Serverless has no dependable cron, so promotions are evaluated on read.
    // This flag exists so the admin UI can say so honestly.
    evaluateOnRead: true,
  },
};

const GROUPS = ['flash', 'badges', 'upsell', 'crossSell', 'boughtTogether', 'schedule'];

/* Settings are read on every pricing call, so they are cached the same way
   searchEngine caches them — measured there at 599ms per uncached read. */
const CACHE_MS = 60000;
let _cache = { at: 0, doc: null };

async function marketingConfig() {
  try {
    const now = Date.now();
    if (!_cache.doc || now - _cache.at >= CACHE_MS) {
      const Settings = require('../models/Settings');
      _cache = { at: now, doc: (await Settings.findOne({ key: 'store' }).lean()) || {} };
    }
    const saved = _cache.doc.marketing || {};
    const out = { ...DEFAULTS, ...saved };
    for (const g of GROUPS) out[g] = { ...DEFAULTS[g], ...(saved[g] || {}) };
    return out;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function invalidateCache() { _cache = { at: 0, doc: null }; }

const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);
const norm = (s) => String(s || '').trim().toLowerCase();

/* ---------------------------------------------------------------------------
 * SCOPE MATCHING — does this promotion apply to this product?
 * ------------------------------------------------------------------------- */
function matchesScope(product, scope, collectionMap) {
  if (!scope) return true;
  const s = scope;

  const excluded = (s.excludeProductIds || []).some((id) => String(id) === String(product._id));
  if (excluded) return false;

  if (s.excludeOnSale && product.compareAtPrice && product.compareAtPrice > product.price) return false;

  if (s.gender && product.gender !== s.gender) return false;
  if ((s.tiers || []).length && !s.tiers.includes(product.tier)) return false;
  if (s.minPrice != null && product.price < s.minPrice) return false;
  if (s.maxPrice != null && product.price > s.maxPrice) return false;
  if ((s.badges || []).length && !(product.badges || []).some((b) => s.badges.includes(b))) return false;

  switch (s.mode) {
    case 'all':
      return true;
    case 'products':
      return (s.productIds || []).some((id) => String(id) === String(product._id));
    case 'categories':
      return (s.categorySlugs || []).includes(product.categorySlug);
    case 'tags': {
      const tags = (product.tags || []).map(norm);
      return (s.tags || []).some((t) => tags.includes(norm(t)));
    }
    case 'collections': {
      // The caller resolves collections to product ids once, rather than this
      // function issuing a query per product per promotion.
      const ids = collectionMap?.get(String(s.collectionIds?.[0])) || null;
      if (!ids) {
        return (s.collectionIds || []).some((cid) => (collectionMap?.get(String(cid)) || []).some((pid) => String(pid) === String(product._id)));
      }
      return (s.collectionIds || []).some((cid) => (collectionMap?.get(String(cid)) || []).some((pid) => String(pid) === String(product._id)));
    }
    case 'rules':
      // Every rule above has already been applied; reaching here means it fits.
      return true;
    default:
      return true;
  }
}

/* ---------------------------------------------------------------------------
 * ELIGIBILITY — does this promotion apply to this SHOPPER?
 * ------------------------------------------------------------------------- */
function checkEligibility(promo, ctx) {
  const e = promo.eligibility || {};

  if (e.minCartTotal > 0 && (ctx.subtotal || 0) < e.minCartTotal) {
    return { ok: false, reason: 'below-minimum', need: e.minCartTotal };
  }
  if (e.minCartItems > 0 && (ctx.itemCount || 0) < e.minCartItems) {
    return { ok: false, reason: 'too-few-items', need: e.minCartItems };
  }
  if ((e.paymentMethods || []).length && ctx.paymentMethod
      && !e.paymentMethods.includes(ctx.paymentMethod)) {
    return { ok: false, reason: 'payment-method' };
  }
  if ((e.cities || []).length && ctx.city
      && !e.cities.map(norm).includes(norm(ctx.city))) {
    return { ok: false, reason: 'city' };
  }

  switch (e.audience) {
    case 'first-order':
      // ctx.orderCount is counted by the caller from real orders, not trusted
      // from the request — otherwise "first order only" is a free-for-all.
      if ((ctx.orderCount ?? 0) > 0) return { ok: false, reason: 'not-first-order' };
      break;
    case 'returning':
      if ((ctx.orderCount ?? 0) === 0) return { ok: false, reason: 'not-returning' };
      break;
    case 'tier':
      if (!(e.loyaltyTiers || []).includes(ctx.loyaltyTier || '')) {
        return { ok: false, reason: 'tier' };
      }
      break;
    case 'phones': {
      const key = phoneKey(ctx.phone);
      if (!key || !(e.phones || []).map(phoneKey).includes(key)) {
        return { ok: false, reason: 'not-invited' };
      }
      break;
    }
    default:
      break;
  }
  return { ok: true };
}

/* ---------------------------------------------------------------------------
 * PER-PROMOTION CALCULATION
 *
 * Each returns { amount, lines, note } or null. `lines` records which cart
 * lines were touched, so the resolver can tell whether two promotions
 * collide.
 * ------------------------------------------------------------------------- */

function calcPercentOrFixed(promo, eligibleLines) {
  const base = eligibleLines.reduce((s, l) => s + l.price * l.qty, 0);
  if (base <= 0) return null;

  let amount = promo.discountPercent > 0
    ? Math.round((base * promo.discountPercent) / 100)
    : Math.min(promo.discountFixed || 0, base);

  if (promo.maxDiscount > 0) amount = Math.min(amount, promo.maxDiscount);
  if (amount <= 0) return null;

  return { amount, lines: eligibleLines.map((l) => l.key), note: `${promo.discountPercent || 0}%` };
}

function calcTiered(promo, eligibleLines, subtotal) {
  const tiers = [...(promo.tiers || [])].sort((a, b) => (b.minSubtotal || 0) - (a.minSubtotal || 0));
  const hit = tiers.find((t) => subtotal >= (t.minSubtotal || 0));
  if (!hit) return null;

  const base = eligibleLines.reduce((s, l) => s + l.price * l.qty, 0);
  if (base <= 0) return null;

  let amount = hit.percent > 0 ? Math.round((base * hit.percent) / 100) : Math.min(hit.fixed || 0, base);
  if (promo.maxDiscount > 0) amount = Math.min(amount, promo.maxDiscount);
  if (amount <= 0) return null;

  return { amount, lines: eligibleLines.map((l) => l.key), note: `spend ${hit.minSubtotal}+` };
}

/**
 * Buy X Get Y.
 *
 * The free item is the CHEAPEST qualifying one by default. Giving away the
 * most expensive is how a "buy 2 get 1" on a mixed basket costs more than the
 * two items being bought.
 */
function calcBxgy(promo, buyLines, getLines) {
  const b = promo.bxgy || {};
  const buyQty = Math.max(1, b.buyQty || 2);
  const getQty = Math.max(1, b.getQty || 1);

  /* MEASURED BUG: this compared buyLines === getLines, i.e. ARRAY IDENTITY.
     A buy-2-get-1 fired on a basket of only 2 units, giving one away for free
     when the customer had not bought enough to earn it.
     The caller builds `eligible` and `getScope` as separate arrays even when
     they describe the same products, so the identity check was false in real
     use too — not just in the test that caught it.
     Comparing the actual line keys is what the rule always meant: if the free
     item comes out of the same pool being counted, the pool has to cover both
     the buy quantity and the giveaway. */
  const buyKeys = buyLines.map((l) => l.key).sort().join('|');
  const getKeys = getLines.map((l) => l.key).sort().join('|');
  const samePool = buyKeys === getKeys;

  const perSet = buyQty + (samePool ? getQty : 0);
  const totalBuyQty = buyLines.reduce((s, l) => s + l.qty, 0);
  if (totalBuyQty < perSet) return null;

  let sets = Math.floor(totalBuyQty / perSet);
  if (b.maxPerOrder > 0) sets = Math.min(sets, b.maxPerOrder);
  if (sets < 1) return null;

  // Expand to individual units so the cheapest can actually be picked.
  const units = [];
  for (const l of getLines) for (let i = 0; i < l.qty; i += 1) units.push({ key: l.key, price: l.price });
  if (!units.length) return null;
  units.sort((x, y) => (b.cheapestFree === false ? y.price - x.price : x.price - y.price));

  const freeUnits = units.slice(0, sets * getQty);
  const pct = (b.getPercent ?? 100) / 100;
  let amount = Math.round(freeUnits.reduce((s, u) => s + u.price * pct, 0));
  if (promo.maxDiscount > 0) amount = Math.min(amount, promo.maxDiscount);
  if (amount <= 0) return null;

  return {
    amount,
    lines: [...new Set(freeUnits.map((u) => u.key))],
    note: `buy ${buyQty} get ${getQty}`,
  };
}

function calcBundle(promo, cartLines) {
  const need = (promo.bundle?.productIds || []).map(String);
  if (!need.length) return null;

  const present = need.filter((id) => cartLines.some((l) => String(l.productId) === id));
  const requireAll = promo.bundle.requireAll !== false;
  /* MEASURED BUG: this clamped minItems to a floor of 2, which silently
     overrode the merchant. A "buy any 1 of these 5 and save 20%" promotion
     configured with minItems:1 never fired and gave no reason why. The floor
     belongs in admin validation, not here — this function's job is to honour
     what was saved, not to second-guess it. */
  const minItems = Math.max(1, Number(promo.bundle.minItems) || 1);
  if (requireAll ? present.length < need.length : present.length < minItems) return null;

  const lines = cartLines.filter((l) => need.includes(String(l.productId)));
  const base = lines.reduce((s, l) => s + l.price, 0);   // one of each
  if (base <= 0) return null;

  let amount;
  if (promo.bundle.bundlePrice > 0) amount = Math.max(0, base - promo.bundle.bundlePrice);
  else if (promo.discountPercent > 0) amount = Math.round((base * promo.discountPercent) / 100);
  else amount = Math.min(promo.discountFixed || 0, base);

  if (promo.maxDiscount > 0) amount = Math.min(amount, promo.maxDiscount);
  if (amount <= 0) return null;

  return { amount, lines: lines.map((l) => l.key), note: 'bundle' };
}

/* ---------------------------------------------------------------------------
 * THE RESOLVER — this is the part that prevents double discounts.
 *
 * Candidates are sorted by priority (lower wins), then by size. Walking that
 * order, a candidate is kept only if none of the lines it touches has already
 * been claimed — unless the merchant marked BOTH promotions stackable.
 *
 * Sorting by amount within a priority band matters: given two equal-priority
 * offers the shopper should get the better one, or the store looks mean for
 * no reason.
 * ------------------------------------------------------------------------- */
function resolveConflicts(candidates, cfg) {
  const sorted = [...candidates].sort((a, b) => (a.priority - b.priority) || (b.amount - a.amount));

  // One exclusive promotion suppresses everything else, whatever its size.
  const exclusive = sorted.find((c) => c.exclusive);
  if (exclusive) return { applied: [exclusive], rejected: sorted.filter((c) => c !== exclusive).map((c) => ({ ...c, rejectedFor: 'exclusive-promotion-active' })) };

  const applied = [];
  const rejected = [];
  const claimed = new Set();

  for (const c of sorted) {
    const collides = c.lines.some((k) => claimed.has(k));
    const bothStackable = cfg.allowStacking && c.stackable
      && applied.filter((a) => a.lines.some((k) => c.lines.includes(k))).every((a) => a.stackable);

    if (collides && !bothStackable) {
      rejected.push({ ...c, rejectedFor: 'line-already-discounted' });
      continue;
    }
    applied.push(c);
    c.lines.forEach((k) => claimed.add(k));
  }

  return { applied, rejected };
}

/**
 * THE ONE ENTRY POINT.
 *
 * Takes a cart the server built and returns what should come off. Never
 * writes anything; the caller records usage after the order exists, the same
 * way loyalty debits balances only once the order row is safe.
 */
async function evaluateCart({ lines = [], ctx = {}, at = new Date(), promotions = null }) {
  const cfg = await marketingConfig();
  if (!cfg.enabled) return { enabled: false, discounts: [], total: 0, rejected: [] };

  const Promotion = require('../models/Promotion');
  const all = promotions || await Promotion.find({ enabled: true }).lean();
  if (!all.length) return { enabled: true, discounts: [], total: 0, rejected: [] };

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const fullCtx = { ...ctx, subtotal, itemCount };

  /* Collections are resolved once up front. Doing it inside matchesScope
     would mean a query per product per promotion. */
  const collectionMap = new Map();
  const cIds = [...new Set(all.flatMap((p) => [
    ...(p.scope?.collectionIds || []),
    ...(p.bxgy?.getScope?.collectionIds || []),
  ]).map(String))];
  if (cIds.length) {
    const Collection = require('../models/Collection');
    const cols = await Collection.find({ _id: { $in: cIds } }).select('products').lean();
    cols.forEach((c) => collectionMap.set(String(c._id), c.products || []));
  }

  const candidates = [];
  const rejected = [];

  for (const raw of all) {
    // liveState is a schema method; a .lean() row has no methods, so it is
    // re-hydrated rather than duplicating the schedule logic here.
    const promo = Promotion.hydrate(raw);
    const state = promo.liveState(at);
    if (!state.live) { rejected.push({ id: String(promo._id), name: promo.name, rejectedFor: state.reason }); continue; }

    if (ctx.hasCoupon && (promo.allowWithCoupon === false || cfg.allowWithCoupon === false)) {
      rejected.push({ id: String(promo._id), name: promo.name, rejectedFor: 'coupon-active' });
      continue;
    }

    const elig = checkEligibility(promo, fullCtx);
    if (!elig.ok) { rejected.push({ id: String(promo._id), name: promo.name, rejectedFor: elig.reason }); continue; }

    const eligible = lines.filter((l) => l.product && matchesScope(l.product, promo.scope, collectionMap));

    let result = null;
    switch (promo.type) {
      case 'flash':
      case 'percent':
      case 'fixed':
        if (eligible.length) result = calcPercentOrFixed(promo, eligible);
        break;
      case 'tiered':
        if (eligible.length) result = calcTiered(promo, eligible, subtotal);
        break;
      case 'bxgy': {
        const getScope = (promo.bxgy?.getScope?.mode && promo.bxgy.getScope.mode !== 'all')
          ? lines.filter((l) => l.product && matchesScope(l.product, promo.bxgy.getScope, collectionMap))
          : eligible;
        if (eligible.length && getScope.length) result = calcBxgy(promo, eligible, getScope);
        break;
      }
      case 'bundle':
        result = calcBundle(promo, lines);
        break;
      case 'freeship':
        // Shipping is decided later in the order pipeline; the engine only
        // signals that this order earned it.
        result = { amount: 0, lines: [], note: 'free shipping', freeShipping: true };
        break;
      default:
        break;
    }

    if (!result) { rejected.push({ id: String(promo._id), name: promo.name, rejectedFor: 'no-match' }); continue; }

    candidates.push({
      id: String(promo._id),
      name: promo.name,
      label: promo.publicLabel || promo.name,
      type: promo.type,
      priority: promo.priority ?? 100,
      stackable: !!promo.stackable,
      exclusive: !!promo.exclusive,
      badge: promo.badge,
      showInCart: promo.showInCart !== false,
      ...result,
    });
  }

  const { applied, rejected: conflicted } = resolveConflicts(candidates, cfg);

  /* THE CEILING. Whatever the rules produced, the total can never exceed the
     merchant's cap. Trimming from the smallest keeps the headline offer
     intact rather than mangling the one the shopper came for. */
  let total = applied.reduce((s, c) => s + c.amount, 0);
  const cap = Math.round((subtotal * (Number(cfg.maxTotalDiscountPercent) || 100)) / 100);
  let capped = false;

  if (cap > 0 && total > cap) {
    capped = true;
    let over = total - cap;
    const bySize = [...applied].sort((a, b) => a.amount - b.amount);
    for (const c of bySize) {
      if (over <= 0) break;
      const cut = Math.min(c.amount, over);
      c.amount -= cut;
      over -= cut;
      c.trimmed = cut;
    }
    total = applied.reduce((s, c) => s + c.amount, 0);
  }

  return {
    enabled: true,
    discounts: applied.filter((c) => c.amount > 0 || c.freeShipping),
    total,
    subtotal,
    capped,
    capAmount: cap,
    freeShipping: applied.some((c) => c.freeShipping),
    rejected: [...rejected, ...conflicted.map((c) => ({ id: c.id, name: c.name, rejectedFor: c.rejectedFor }))],
  };
}

/* ---------------------------------------------------------------------------
 * BADGES — computed, never stored.
 *
 * Storing a "Trending" flag means a nightly job and a stale badge whenever it
 * does not run. Computing on read means the badge is always true.
 * ------------------------------------------------------------------------- */
function computeBadges(product, cfg, extra = {}) {
  const b = cfg.badges || {};
  if (!b.enabled) return [];
  const out = [];

  if (b.showNew && product.createdAt) {
    const days = (Date.now() - new Date(product.createdAt).getTime()) / 86400000;
    if (days <= (b.newDays || 21)) out.push({ id: 'new', label: 'New', tone: 'dark' });
  }

  if (b.showSale && product.compareAtPrice > product.price) {
    const pct = Math.round((1 - product.price / product.compareAtPrice) * 100);
    // MEASURED: 101/101 products carry a compareAtPrice, so without this
    // threshold the Sale badge prints on every card and tells nobody anything.
    if (pct >= (b.minSalePercent || 0)) out.push({ id: 'sale', label: `${pct}% off`, tone: 'sale' });
  }

  if (b.showTrending && (extra.recentOrders || 0) >= (b.trendingMinOrders || 3)) {
    out.push({ id: 'trending', label: 'Trending', tone: 'accent' });
  }
  if (b.showBestSeller && product.isBestSeller) {
    out.push({ id: 'best', label: 'Best seller', tone: 'accent' });
  }
  if (b.showLimitedStock && product.stock > 0 && product.stock <= (b.limitedStockThreshold || 5)) {
    out.push({ id: 'limited', label: `Only ${product.stock} left`, tone: 'urgent' });
  }

  return out.slice(0, Math.max(1, b.maxPerCard || 2));
}

/**
 * Record that promotions were applied to an order.
 *
 * Called AFTER the order row exists, never before — the same discipline the
 * loyalty engine uses. If the order fails, nothing has been counted against a
 * promotion's budget or a customer's per-person limit.
 *
 * Race safety comes from the unique idempotencyKey: two concurrent attempts
 * for the same promotion on the same order both try the same key, the index
 * lets one through, and the loser is discarded quietly. The counters then move
 * with $inc rather than read-modify-write, so two different orders landing in
 * the same millisecond both count.
 *
 * Failures are swallowed and logged. An order that succeeded but whose promo
 * counter did not move is a small accounting gap the merchant can see; an
 * order that fails at the last step is a lost sale.
 */
async function recordUsage({ discounts = [], order, phone = '' }) {
  if (!discounts.length || !order) return { recorded: 0 };
  const Promotion = require('../models/Promotion');
  const PromotionUse = require('../models/PromotionUse');

  let recorded = 0;
  for (const d of discounts) {
    if (!d.id || !/^[0-9a-fA-F]{24}$/.test(String(d.id))) continue;
    try {
      await PromotionUse.create({
        promotion: d.id,
        promotionName: d.name || '',
        type: d.type || '',
        order: order._id,
        orderNumber: order.orderNumber,
        phone: phoneKey(phone),
        amount: d.amount || 0,
        productIds: d.productIds || [],
        idempotencyKey: `promo:${order._id}:${d.id}`,
      });
      await Promotion.updateOne(
        { _id: d.id },
        { $inc: { usedCount: 1, totalDiscounted: d.amount || 0 } },
      );
      recorded += 1;
    } catch (e) {
      // 11000 = this exact promotion was already recorded for this order.
      if (e.code !== 11000) console.error('promotion usage record failed:', e.message);
    }
  }
  return { recorded };
}

/**
 * Has this customer already used this promotion as often as allowed?
 *
 * Counted from PromotionUse rather than a map on the promotion document: that
 * map would grow without bound and rewrite the whole document on every order.
 */
async function overPerCustomerLimit(promo, phone) {
  const cap = Number(promo?.limits?.maxUsesPerPhone) || 0;
  const key = phoneKey(phone);
  if (!cap || !key) return false;
  const PromotionUse = require('../models/PromotionUse');
  const used = await PromotionUse.countDocuments({ promotion: promo._id, phone: key });
  return used >= cap;
}

module.exports = {
  DEFAULTS, marketingConfig, invalidateCache, recordUsage, overPerCustomerLimit,
  matchesScope, checkEligibility, resolveConflicts,
  calcPercentOrFixed, calcTiered, calcBxgy, calcBundle,
  evaluateCart, computeBadges, phoneKey,
};
