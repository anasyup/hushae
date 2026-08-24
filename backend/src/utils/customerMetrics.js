/*
 * Customer commerce metrics.
 *
 * This is the ONE authoritative definition used by Customer 360, the
 * customer directory and groups. A cancelled or fully refunded order is not
 * customer value; counting it in one screen but not another makes LTV and AOV
 * impossible to trust.
 *
 * Customer ↔ order joins use Order.customer (a persistent User id). Legacy
 * phone-only orders remain visible in the old operational screens, but are
 * deliberately not guessed into a Customer 360 record here.
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');

const QUALIFYING_ORDER_EXCLUDED_STATUSES = Object.freeze(['Cancelled', 'Refunded']);

function qualifyingOrderMatch(extra = {}) {
  return {
    ...extra,
    status: { $nin: QUALIFYING_ORDER_EXCLUDED_STATUSES },
  };
}

function isQualifyingOrder(order) {
  return !!order && !QUALIFYING_ORDER_EXCLUDED_STATUSES.includes(String(order.status || ''));
}

/** A reusable aggregation lookup for a User document. */
function customerMetricsLookup({ as = 'commerce' } = {}) {
  return {
    $lookup: {
      from: 'orders',
      let: { customerId: '$_id' },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ['$customer', '$$customerId'] },
            status: { $nin: QUALIFYING_ORDER_EXCLUDED_STATUSES },
          },
        },
        {
          $group: {
            _id: null,
            orders: { $sum: 1 },
            ltv: { $sum: { $ifNull: ['$total', 0] } },
            firstOrderAt: { $min: '$createdAt' },
            lastOrderAt: { $max: '$createdAt' },
          },
        },
      ],
      as,
    },
  };
}

/** Flatten the lookup output into scalar values suitable for list filters. */
function customerMetricsFields({ as = 'commerce' } = {}) {
  return {
    $set: {
      orders: { $ifNull: [{ $arrayElemAt: [`$${as}.orders`, 0] }, 0] },
      ltv: { $ifNull: [{ $arrayElemAt: [`$${as}.ltv`, 0] }, 0] },
      firstOrderAt: { $arrayElemAt: [`$${as}.firstOrderAt`, 0] },
      lastOrderAt: { $arrayElemAt: [`$${as}.lastOrderAt`, 0] },
    },
  };
}

function customerMetricsProject() {
  return {
    orders: 1,
    ltv: 1,
    firstOrderAt: 1,
    lastOrderAt: 1,
    aov: {
      $cond: [
        { $gt: ['$orders', 0] },
        { $round: [{ $divide: ['$ltv', '$orders'] }, 2] },
        0,
      ],
    },
  };
}

/**
 * Get qualifying metrics for one or many persistent customer ids.
 * Returns a Map keyed by String(User._id), so callers cannot accidentally
 * calculate LTV/AOV from raw UI data.
 */
async function getCustomerMetricsByIds(customerIds = []) {
  const ids = [...new Set((customerIds || []).filter(Boolean).map(String))];
  const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  if (!objectIds.length) return new Map();

  const rows = await Order.aggregate([
    { $match: qualifyingOrderMatch({ customer: { $in: objectIds } }) },
    {
      $group: {
        _id: '$customer',
        orders: { $sum: 1 },
        ltv: { $sum: { $ifNull: ['$total', 0] } },
        firstOrderAt: { $min: '$createdAt' },
        lastOrderAt: { $max: '$createdAt' },
      },
    },
  ]);

  const map = new Map();
  for (const row of rows) {
    const orders = Number(row.orders || 0);
    const ltv = Number(row.ltv || 0);
    map.set(String(row._id), {
      orders,
      ltv,
      aov: orders ? Math.round((ltv / orders) * 100) / 100 : 0,
      firstOrderAt: row.firstOrderAt || null,
      lastOrderAt: row.lastOrderAt || null,
    });
  }
  return map;
}

function emptyCustomerMetrics() {
  return { orders: 0, ltv: 0, aov: 0, firstOrderAt: null, lastOrderAt: null };
}

module.exports = {
  QUALIFYING_ORDER_EXCLUDED_STATUSES,
  qualifyingOrderMatch,
  isQualifyingOrder,
  customerMetricsLookup,
  customerMetricsFields,
  customerMetricsProject,
  getCustomerMetricsByIds,
  emptyCustomerMetrics,
};
