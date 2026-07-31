const crypto = require('crypto');
const LoyaltyAccount = require('../models/LoyaltyAccount');
const LoyaltyLedger = require('../models/LoyaltyLedger');

/* ============================================================================
 * LOYALTY ENGINE
 *
 * Every points and credit movement in the application goes through award().
 * Nothing else writes a balance. That single doorway is what makes the system
 * auditable, idempotent and race-safe.
 *
 * Three rules this file exists to enforce:
 *
 *  1. THE LEDGER IS THE TRUTH. The balance on the account is a cache. If they
 *     ever disagree, recalc() rebuilds the cache from the rows.
 *
 *  2. NOTHING IS PAID TWICE. Every award carries an idempotency key. Two
 *     concurrent requests for the same event both attempt the same key; the
 *     unique index lets exactly one through and the loser is discarded
 *     quietly. This is why "order delivered" can fire twice without paying
 *     twice.
 *
 *  3. THE CLIENT IS NEVER TRUSTED. Amounts are computed here from the order
 *     the SERVER loaded and the settings the SERVER read. A request can ask to
 *     redeem points; it cannot say how many rupees they are worth.
 * ========================================================================== */

const DEFAULTS = {
  enabled: false,
  earn: {
    perCurrency: 0.01, roundingMode: 'floor', awardOnStatus: 'Delivered',
    earnOnDiscounted: true, earnOnShipping: false,
    signupPoints: 100, signupEnabled: true,
    firstOrderPoints: 200, firstOrderEnabled: true,
    reviewPoints: 50, reviewEnabled: true,
    newsletterPoints: 25, newsletterEnabled: true,
    profilePoints: 25, profileEnabled: true,
    birthdayPoints: 250, birthdayEnabled: true,
  },
  redeem: { enabled: true, pointValue: 1, minPoints: 200, maxPercentOfOrder: 50, step: 50 },
  expiry: { enabled: true, months: 12, warnDays: 30 },
  tiers: { enabled: true, windowMonths: 12, levels: [] },
  referral: { enabled: true, referrerPoints: 300, refereePoints: 150, payOnStatus: 'Delivered', minOrderValue: 1500, maxPerMonth: 10, codePrefix: 'HUS' },
  credit: { enabled: true, allowAtCheckout: true },
  giftCards: { enabled: true, minAmount: 500, maxAmount: 50000, expiryMonths: 12, codePrefix: 'HUSGC' },
  achievements: { enabled: true, list: [] },
  limits: { maxPointsPerOrder: 5000, maxPointsPerDay: 10000, minSecondsBetweenEarns: 2, blockSelfReferral: true },
  notify: { onEarn: true, onTierUp: true, onExpiring: true },
};

/** Deep-ish merge: one level of sub-objects, which is the shape of this block. */
async function loyaltyConfig() {
  try {
    const Settings = require('../models/Settings');
    const st = await Settings.findOne({ key: 'store' }).lean();
    const saved = (st && st.loyalty) || {};
    const out = { ...DEFAULTS, ...saved };
    for (const k of ['earn', 'redeem', 'expiry', 'tiers', 'referral', 'credit', 'giftCards', 'achievements', 'limits', 'notify']) {
      out[k] = { ...DEFAULTS[k], ...(saved[k] || {}) };
    }
    return out;
  } catch {
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

/** Last nine digits — the same forgiving match the order lookups use. */
const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);

function makeReferralCode(prefix) {
  return `${prefix || 'HUS'}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Find or create the account for a phone number. Guests get an account too —
 * loyalty is earned before anyone registers, and claimed later.
 */
async function getAccount({ phone, email = '', name = '', user = null }, cfg) {
  const key = phoneKey(phone);
  if (!key) return null;

  let acc = await LoyaltyAccount.findOne({ phone: key });
  if (acc) {
    // Backfill identity as it becomes known, without overwriting what is set.
    let dirty = false;
    if (user && !acc.user) { acc.user = user; dirty = true; }
    if (email && !acc.email) { acc.email = email; dirty = true; }
    if (name && !acc.name) { acc.name = name; dirty = true; }
    if (!acc.referralCode) { acc.referralCode = makeReferralCode(cfg?.referral?.codePrefix); dirty = true; }
    if (dirty) await acc.save();
    return acc;
  }

  try {
    return await LoyaltyAccount.create({
      phone: key, email, name, user,
      referralCode: makeReferralCode(cfg?.referral?.codePrefix),
    });
  } catch (e) {
    // Lost a create race — the other writer won, just read theirs.
    if (e.code === 11000) return LoyaltyAccount.findOne({ phone: key });
    throw e;
  }
}

/**
 * The one doorway. Writes a ledger row and updates the cached balance.
 *
 * Returns { ok, skipped?, reason?, ledger?, balance? } — never throws for an
 * expected refusal, because callers award points as a side effect of
 * something more important (an order) and must not fail because of it.
 */
async function award({
  phone, email, name, user,
  kind = 'points', amount, reason, note = '',
  order = null, orderNumber = '', idempotencyKey = null,
  actor = 'system', actorId = null, skipLimits = false,
}) {
  const cfg = await loyaltyConfig();
  if (!cfg.enabled) return { ok: false, skipped: true, reason: 'programme-off' };

  const value = Math.round(Number(amount) || 0);
  if (!value) return { ok: false, skipped: true, reason: 'zero' };

  const acc = await getAccount({ phone, email, name, user }, cfg);
  if (!acc) return { ok: false, skipped: true, reason: 'no-phone' };
  if (acc.blocked) return { ok: false, skipped: true, reason: 'blocked' };

  /* ---- Abuse guards. Only on earning, never on spending or corrections:
     a customer must always be able to redeem or be refunded. ---- */
  if (value > 0 && kind === 'points' && !skipLimits) {
    const limits = cfg.limits || {};
    if (limits.maxPointsPerOrder && value > limits.maxPointsPerOrder) {
      return { ok: false, skipped: true, reason: 'over-per-order-cap' };
    }
    if (limits.maxPointsPerDay) {
      const since = new Date(Date.now() - 86400000);
      const rows = await LoyaltyLedger.aggregate([
        { $match: { account: acc._id, kind: 'points', amount: { $gt: 0 }, createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      if ((rows[0]?.total || 0) + value > limits.maxPointsPerDay) {
        return { ok: false, skipped: true, reason: 'over-daily-cap' };
      }
    }
  }

  // Spending cannot go below zero — the balance is the authority, not the client.
  if (value < 0) {
    const have = kind === 'credit' ? acc.creditBalance : acc.pointsBalance;
    if (have + value < 0) return { ok: false, skipped: true, reason: 'insufficient' };
  }

  const expiresAt = (kind === 'points' && value > 0 && cfg.expiry?.enabled)
    ? new Date(Date.now() + (Number(cfg.expiry.months) || 12) * 30 * 86400000)
    : null;

  let ledger;
  try {
    ledger = await LoyaltyLedger.create({
      account: acc._id, phone: acc.phone, kind, amount: value, reason, note,
      order, orderNumber, expiresAt, actor, actorId, idempotencyKey,
      balanceAfter: (kind === 'credit' ? acc.creditBalance : acc.pointsBalance) + value,
    });
  } catch (e) {
    // Duplicate key = this exact event was already paid. Not an error.
    if (e.code === 11000) return { ok: false, skipped: true, reason: 'already-awarded' };
    throw e;
  }

  /* $inc rather than read-modify-write: two concurrent awards must both land,
     and Mongo's atomic increment is what guarantees that. */
  const inc = kind === 'credit'
    ? { creditBalance: value }
    : { pointsBalance: value, ...(value > 0 ? { pointsEarned: value } : { pointsRedeemed: -value }) };

  const updated = await LoyaltyAccount.findByIdAndUpdate(
    acc._id,
    { $inc: inc, $set: { lastEarnAt: new Date() } },
    { new: true },
  );

  return {
    ok: true,
    ledger,
    balance: kind === 'credit' ? updated.creditBalance : updated.pointsBalance,
    account: updated,
  };
}

/** Rebuild the cached balances from the ledger. The ledger always wins. */
async function recalc(accountId) {
  const rows = await LoyaltyLedger.aggregate([
    { $match: { account: accountId } },
    { $group: { _id: '$kind', total: { $sum: '$amount' } } },
  ]);
  const points = rows.find((r) => r._id === 'points')?.total || 0;
  const credit = rows.find((r) => r._id === 'credit')?.total || 0;
  return LoyaltyAccount.findByIdAndUpdate(
    accountId,
    { $set: { pointsBalance: Math.max(0, points), creditBalance: Math.max(0, credit) } },
    { new: true },
  );
}

/** Points an order is worth. Server-side only; the client never sends this. */
function pointsForOrder(order, cfg, multiplier = 1) {
  const earn = cfg.earn || {};
  let base = Number(order.subtotal) || 0;
  if (!earn.earnOnDiscounted) base = Math.max(0, base - (Number(order.discount) || 0));
  if (earn.earnOnShipping) base += Number(order.shippingCharge) || 0;

  const raw = base * (Number(earn.perCurrency) || 0) * (Number(multiplier) || 1);
  const mode = earn.roundingMode || 'floor';
  return mode === 'ceil' ? Math.ceil(raw) : mode === 'round' ? Math.round(raw) : Math.floor(raw);
}

/** Which tier a spend figure lands in, plus the next rung and the gap. */
function resolveTier(spend, cfg) {
  const levels = [...((cfg.tiers && cfg.tiers.levels) || [])]
    .filter((l) => l && l.id)
    .sort((a, b) => (a.minSpend || 0) - (b.minSpend || 0));
  if (!levels.length) return { current: null, next: null, progress: 0, toNext: 0 };

  let current = levels[0];
  for (const l of levels) if (spend >= (l.minSpend || 0)) current = l;

  const idx = levels.findIndex((l) => l.id === current.id);
  const next = levels[idx + 1] || null;
  const floor = current.minSpend || 0;
  const ceiling = next ? next.minSpend : floor;
  const progress = next && ceiling > floor
    ? Math.min(100, Math.max(0, ((spend - floor) / (ceiling - floor)) * 100))
    : 100;

  return { current, next, progress: Math.round(progress), toNext: next ? Math.max(0, ceiling - spend) : 0 };
}

/** Qualifying spend over the merchant's rolling window. */
async function spendForTier(phone, cfg) {
  const Order = require('../models/Order');
  const key = phoneKey(phone);
  if (!key) return 0;
  const months = Number(cfg.tiers?.windowMonths) || 0;
  const where = {
    'customerInfo.phone': { $regex: `${key}$` },
    status: { $in: ['Delivered'] },
  };
  if (months > 0) where.createdAt = { $gte: new Date(Date.now() - months * 30 * 86400000) };
  const rows = await Order.aggregate([{ $match: where }, { $group: { _id: null, total: { $sum: '$total' } } }]);
  return rows[0]?.total || 0;
}

/** Recompute and persist a customer's tier. Returns { changed, from, to }. */
async function syncTier(account, cfg) {
  if (!cfg.tiers?.enabled) return { changed: false };
  const spend = await spendForTier(account.phone, cfg);
  const { current } = resolveTier(spend, cfg);
  const to = current ? current.id : '';
  const from = account.tier || '';
  const changed = to !== from;

  await LoyaltyAccount.findByIdAndUpdate(account._id, {
    $set: {
      tierSpend: spend,
      tier: to,
      tierReviewedAt: new Date(),
      ...(changed ? { tierSince: new Date() } : {}),
    },
  });
  return { changed, from, to, spend };
}

/**
 * How much of a basket can be paid with points, in PKR.
 * Enforces the minimum, the step and the percentage cap — all merchant values.
 */
function maxRedeemable(pointsBalance, orderSubtotal, cfg) {
  const r = cfg.redeem || {};
  if (!r.enabled) return { points: 0, value: 0, reason: 'off' };

  const pointValue = Number(r.pointValue) || 1;
  const minPoints = Number(r.minPoints) || 0;
  if (pointsBalance < minPoints) return { points: 0, value: 0, reason: 'below-minimum', minPoints };

  const capValue = Math.floor((Number(orderSubtotal) || 0) * ((Number(r.maxPercentOfOrder) || 100) / 100));
  const capPoints = Math.floor(capValue / pointValue);
  let usable = Math.min(pointsBalance, capPoints);

  const step = Number(r.step) || 1;
  usable = Math.floor(usable / step) * step;
  if (usable < minPoints) return { points: 0, value: 0, reason: 'below-minimum', minPoints };

  return { points: usable, value: usable * pointValue, pointValue, step, minPoints };
}

/* ---------------------------------------------------------------------------
 * ACHIEVEMENTS
 *
 * settings.loyalty.achievements shipped in Part 1 with four badges configured,
 * but nothing ever evaluated them — a setting the merchant can edit that
 * changes nothing is worse than no setting at all. This is the evaluator.
 *
 * The counts come from the SERVER's own collections, never from a request.
 * A badge can only be unlocked once: the id is added to account.badges and
 * the bonus is awarded under an idempotency key built from that id.
 * ------------------------------------------------------------------------- */

/** Real progress for one customer, measured against the live collections. */
async function achievementStats(account, cfg) {
  const Order = require('../models/Order');
  const Review = require('../models/Review');
  const key = account.phone;

  const [orderAgg, reviews] = await Promise.all([
    Order.aggregate([
      { $match: { 'customerInfo.phone': { $regex: `${key}$` }, status: { $nin: ['Cancelled'] } } },
      { $group: { _id: null, n: { $sum: 1 }, spend: { $sum: '$total' } } },
    ]),
    // Reviews carry no phone, so they are counted by the account behind them.
    account.user
      ? Review.countDocuments({ user: account.user, status: 'approved' })
      : Promise.resolve(0),
  ]);

  return {
    orders: orderAgg[0]?.n || 0,
    spend: orderAgg[0]?.spend || 0,
    reviews,
    referrals: account.referralCount || 0,
    points: account.pointsEarned || 0,
  };
}

/**
 * Evaluate every configured badge for one account.
 *
 * Returns the full list with progress so the dashboard can show "2 of 5
 * orders" rather than a locked padlock with no explanation — a badge you
 * cannot see the distance to is not motivating, it is decoration.
 *
 * `award: false` makes this a pure read, which is what the dashboard uses.
 */
async function evaluateAchievements(account, cfg, { grant = false } = {}) {
  if (!cfg.achievements?.enabled) return { list: [], unlocked: [] };
  const list = (cfg.achievements.list || []).filter((a) => a && a.id);
  if (!list.length) return { list: [], unlocked: [] };

  const stats = await achievementStats(account, cfg);
  const have = new Set(account.badges || []);
  const out = [];
  const newlyUnlocked = [];

  for (const a of list) {
    const current = Number(stats[a.metric] || 0);
    const target = Math.max(1, Number(a.target) || 1);
    const earned = current >= target;
    out.push({
      id: a.id,
      name: a.name,
      note: a.note,
      icon: a.icon,
      metric: a.metric,
      target,
      current: Math.min(current, target),
      progress: Math.min(100, Math.round((current / target) * 100)),
      earned,
      alreadyHeld: have.has(a.id),
      points: Number(a.points) || 0,
    });
    if (earned && !have.has(a.id)) newlyUnlocked.push(a);
  }

  if (grant && newlyUnlocked.length) {
    for (const a of newlyUnlocked) {
      // Record the badge first. If the points award then fails for any reason
      // the customer still keeps the badge, which is the honest failure mode.
      await LoyaltyAccount.findByIdAndUpdate(account._id, { $addToSet: { badges: a.id } });
      if (Number(a.points) > 0) {
        await award({
          phone: account.phone,
          kind: 'points',
          amount: Number(a.points),
          reason: 'achievement',
          note: a.name,
          idempotencyKey: `badge:${account.phone}:${a.id}`,
          skipLimits: true,
        });
      }
    }
  }

  return { list: out, unlocked: newlyUnlocked.map((a) => a.id), stats };
}

/* ---------------------------------------------------------------------------
 * EXPIRY
 *
 * Points carry an expiresAt. Nothing enforced it, so "points expire after 12
 * months" was a promise on a settings page and nothing more.
 *
 * Rather than deleting rows — which would destroy the audit trail — an expiry
 * writes a NEGATIVE ledger row through the same award() doorway and marks the
 * original consumed. The statement then reads honestly: earned, then expired.
 * ------------------------------------------------------------------------- */
async function expireDuePoints({ limit = 500 } = {}) {
  const cfg = await loyaltyConfig();
  if (!cfg.enabled || !cfg.expiry?.enabled) return { skipped: true, reason: 'off' };

  const due = await LoyaltyLedger.find({
    kind: 'points',
    amount: { $gt: 0 },
    expired: { $ne: true },
    expiresAt: { $ne: null, $lte: new Date() },
  }).limit(limit).lean();

  let expiredPoints = 0;
  let rows = 0;

  for (const row of due) {
    const remaining = Math.max(0, (row.amount || 0) - (row.consumed || 0));
    // Mark it first so a crash mid-loop cannot expire the same row twice.
    await LoyaltyLedger.updateOne({ _id: row._id }, { $set: { expired: true } });
    if (remaining <= 0) continue;

    const r = await award({
      phone: row.phone,
      kind: 'points',
      amount: -remaining,
      reason: 'expiry',
      note: `Points from ${new Date(row.createdAt).toISOString().slice(0, 10)} expired`,
      idempotencyKey: `expire:${row._id}`,
      actor: 'system',
    });
    if (r.ok) { expiredPoints += remaining; rows += 1; }
  }

  return { rows, expiredPoints, considered: due.length };
}

module.exports = {
  DEFAULTS, loyaltyConfig, phoneKey, getAccount, award, recalc,
  pointsForOrder, resolveTier, spendForTier, syncTier, maxRedeemable, makeReferralCode,
  achievementStats, evaluateAchievements, expireDuePoints,
};
