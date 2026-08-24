const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const AbandonedCart = require('../models/AbandonedCart');
const LoyaltyAccount = require('../models/LoyaltyAccount');
const CustomerActivity = require('../models/CustomerActivity');
const CustomerNote = require('../models/CustomerNote');
const CustomerGroup = require('../models/CustomerGroup');
const { protect, adminOnly, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { normalizePhone } = require('../utils/validators');
const { logAction } = require('../utils/auditLogger');
const { normalizeTag, normalizeTags } = require('../utils/customerTags');
const {
  qualifyingOrderMatch,
  customerMetricsLookup,
  customerMetricsFields,
  getCustomerMetricsByIds,
  emptyCustomerMetrics,
} = require('../utils/customerMetrics');

const router = express.Router();

// Phase 4 is inside the admin, not a parallel public CRM. Every endpoint is
// authenticated, admin-gated and permission-gated before it sees customer PII.
router.use(protect, adminOnly, requirePermission('customers'));

const CUSTOMER_FIELDS = 'name email phone whatsApp country addresses wishlist isActive emailVerified deletedAt tags manualGroups consent createdAt updatedAt role';
const CONSENT_VALUES = ['OPTED_IN', 'OPTED_OUT', 'UNKNOWN'];
const NOTE_CATEGORIES = ['general', 'service', 'fit', 'order', 'other'];
const VIP_THRESHOLD = 500000;
const HIGH_VALUE_THRESHOLD = 100000;
const INACTIVE_DAYS = 180;
const NEW_DAYS = 30;

const isId = (value) => mongoose.Types.ObjectId.isValid(String(value || ''));
const asId = (value) => new mongoose.Types.ObjectId(String(value));
const clamp = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const csvEscape = (value) => {
  let text = String(value == null ? '' : value);
  // Spreadsheet formula injection guard.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

function accountStatus(customer) {
  if (customer.deletedAt) return 'DELETED';
  if (customer.isActive === false) return 'SUSPENDED';
  if (customer.emailVerified === false) return 'UNVERIFIED';
  return 'ACTIVE';
}

function engagementFor(customer) {
  const orders = Number(customer.orders || 0);
  const ltv = Number(customer.ltv || 0);
  const joined = customer.createdAt ? new Date(customer.createdAt) : null;
  const lastOrderAt = customer.lastOrderAt ? new Date(customer.lastOrderAt) : null;
  const inactiveCutoff = Date.now() - INACTIVE_DAYS * 86400000;
  const newCutoff = Date.now() - NEW_DAYS * 86400000;

  if (ltv > VIP_THRESHOLD) {
    return { key: 'vip', label: 'VIP', reason: `VIP because lifetime spend is above PKR ${VIP_THRESHOLD.toLocaleString('en-PK')}` };
  }
  if (ltv >= HIGH_VALUE_THRESHOLD) {
    return { key: 'high_value', label: 'High Value', reason: `High Value because lifetime spend is at least PKR ${HIGH_VALUE_THRESHOLD.toLocaleString('en-PK')}` };
  }
  if (orders >= 2) {
    return { key: 'repeat', label: 'Repeat', reason: `Repeat because they have ${orders} qualifying orders` };
  }
  if ((lastOrderAt && lastOrderAt.getTime() < inactiveCutoff) || (!orders && joined && joined.getTime() < inactiveCutoff)) {
    return {
      key: 'inactive', label: 'Inactive',
      reason: lastOrderAt ? `Inactive because the last qualifying order was over ${INACTIVE_DAYS} days ago` : `Inactive because the account has no qualifying order after ${INACTIVE_DAYS} days`,
    };
  }
  if (joined && joined.getTime() >= newCutoff && orders <= 1) {
    return { key: 'new', label: 'New', reason: `New because the account joined within ${NEW_DAYS} days` };
  }
  return { key: 'all', label: 'All', reason: orders ? 'Has qualifying commerce history' : 'No qualifying commerce history yet' };
}

function humanOrderRow(order) {
  const itemCount = (order.items || []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);
  const shipping = order.status === 'Delivered' ? 'DELIVERED'
    : order.status === 'Out for Delivery' ? 'OUT_FOR_DELIVERY'
      : order.status === 'Shipped' ? 'SHIPPED'
        : order.status === 'Ready to Ship' ? 'READY'
          : order.status === 'Cancelled' ? 'NONE'
            : order.status === 'Refunded' ? 'NONE'
              : 'PENDING';
  return {
    id: order._id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    itemCount,
    items: (order.items || []).map((item) => ({ name: item.name, sku: item.sku || '', quantity: item.quantity, image: item.image || '' })),
    total: Number(order.total || 0),
    paymentMethod: order.paymentMethod || '',
    paymentStatus: order.paymentStatus || order.paymentState || 'Pending',
    orderStatus: order.status || '',
    productionStatus: order.stage || '',
    shippingStatus: shipping,
  };
}

function publicActivity(row) {
  return {
    id: row._id,
    type: row.type,
    objectType: row.objectType || '',
    objectId: row.objectId || '',
    objectLabel: row.objectLabel || '',
    source: row.source || 'system',
    device: row.device || 'unknown',
    metadata: row.metadata || {},
    createdAt: row.createdAt,
  };
}

function publicNote(row) {
  return {
    id: row._id,
    content: row.content,
    category: row.category,
    createdAt: row.createdAt,
    createdByName: row.createdByName || 'Admin',
  };
}

function publicLoyalty(account) {
  if (!account) return null;
  return {
    id: account._id,
    tier: account.tier || '',
    points: Number(account.pointsBalance || 0),
    storeCredit: Number(account.creditBalance || 0),
    referralCode: account.referralCode || '',
    referralCount: Number(account.referralCount || 0),
    badges: account.badges || [],
    giftCards: [], // no customer-owned gift card relationship exists yet
    updatedAt: account.updatedAt || null,
  };
}

function defaultAddress(customer) {
  const addresses = Array.isArray(customer.addresses) ? customer.addresses : [];
  return addresses.find((address) => address.isDefault) || addresses[0] || null;
}

function publicCustomer(customer, metrics = emptyCustomerMetrics(), extras = {}) {
  const data = {
    id: customer._id || customer.id,
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    whatsApp: customer.whatsApp || '',
    country: customer.country || '',
    joinedAt: customer.createdAt || null,
    updatedAt: customer.updatedAt || null,
    accountStatus: accountStatus(customer),
    consent: {
      email: customer.consent?.email || 'UNKNOWN',
      whatsapp: customer.consent?.whatsapp || 'UNKNOWN',
      sms: customer.consent?.sms || 'UNKNOWN',
      updatedAt: customer.consent?.updatedAt || null,
    },
    tags: customer.tags || [],
    metrics: {
      orders: Number(metrics.orders || 0),
      ltv: Number(metrics.ltv || 0),
      aov: Number(metrics.aov || 0),
      firstOrderAt: metrics.firstOrderAt || null,
      lastOrderAt: metrics.lastOrderAt || null,
    },
  };
  data.engagement = engagementFor({ ...customer, ...data.metrics });
  return { ...data, ...extras };
}

async function searchOrderCustomerIds(query) {
  const term = String(query || '').trim();
  if (!term) return [];
  const rx = new RegExp(escapeRegex(term), 'i');
  const ids = await Order.distinct('customer', {
    customer: { $ne: null },
    $or: [
      { orderNumber: rx },
      { 'customerInfo.name': rx },
      { 'customerInfo.email': rx },
      { 'customerInfo.phone': rx },
    ],
  });
  return ids.filter(Boolean);
}

function segmentExpression(segment) {
  const now = Date.now();
  const inactiveCutoff = new Date(now - INACTIVE_DAYS * 86400000);
  const newCutoff = new Date(now - NEW_DAYS * 86400000);
  switch (String(segment || '').toLowerCase()) {
    case 'new':
      return { $and: [{ $gte: ['$createdAt', newCutoff] }, { $lte: ['$orders', 1] }] };
    case 'repeat':
      return { $gte: ['$orders', 2] };
    case 'vip':
      return { $gt: ['$ltv', VIP_THRESHOLD] };
    case 'high_value':
    case 'high-value':
      return { $and: [{ $gte: ['$ltv', HIGH_VALUE_THRESHOLD] }, { $lte: ['$ltv', VIP_THRESHOLD] }] };
    case 'inactive':
      return {
        $or: [
          { $and: [{ $gt: ['$orders', 0] }, { $lt: ['$lastOrderAt', inactiveCutoff] }] },
          { $and: [{ $eq: ['$orders', 0] }, { $lt: ['$createdAt', inactiveCutoff] }] },
        ],
      };
    default:
      return null;
  }
}

function directoryProjection() {
  return {
    _id: 1,
    name: 1,
    email: 1,
    phone: 1,
    whatsApp: 1,
    country: 1,
    createdAt: 1,
    updatedAt: 1,
    isActive: 1,
    emailVerified: 1,
    deletedAt: 1,
    tags: 1,
    consent: 1,
    orders: 1,
    ltv: 1,
    aov: 1,
    firstOrderAt: 1,
    lastOrderAt: 1,
    loyalty: { $arrayElemAt: ['$loyalty', 0] },
  };
}

function sortForDirectory(value, direction) {
  const desc = String(direction || '').toLowerCase() === 'asc' ? 1 : -1;
  const key = String(value || 'joined');
  if (key === 'name') return { name: 1, _id: 1 };
  if (key === 'revenue') return { ltv: desc, _id: 1 };
  if (key === 'aov') return { aov: desc, _id: 1 };
  if (key === 'orders') return { orders: desc, _id: 1 };
  if (key === 'lastOrder') return { lastOrderAt: desc, _id: 1 };
  return { createdAt: desc, _id: 1 };
}

function addDateFilter(where, field, from, to) {
  if (!from && !to) return;
  const range = {};
  if (from) {
    const date = new Date(from);
    if (!Number.isNaN(date.getTime())) range.$gte = date;
  }
  if (to) {
    const date = new Date(to);
    if (!Number.isNaN(date.getTime())) {
      date.setHours(23, 59, 59, 999);
      range.$lte = date;
    }
  }
  if (Object.keys(range).length) where[field] = range;
}

/** Build a safe, server-side customer directory pipeline. */
async function buildDirectoryStages(query = {}) {
  const base = { role: 'customer' };
  const search = String(query.search || query.q || '').trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const searchIds = await searchOrderCustomerIds(search);
    const clauses = [
      { name: rx }, { email: rx }, { phone: rx }, { whatsApp: rx },
      ...(isId(search) ? [{ _id: asId(search) }] : []),
      ...(searchIds.length ? [{ _id: { $in: searchIds } }] : []),
    ];
    base.$and = [...(base.$and || []), { $or: clauses }];
  }

  const country = String(query.country || '').trim().toUpperCase();
  if (country && country !== 'ALL') {
    base.country = country === 'UNKNOWN' ? '' : country;
  }

  const account = String(query.account || query.status || '').toLowerCase();
  if (account === 'active') Object.assign(base, { isActive: true, deletedAt: null });
  if (account === 'inactive' || account === 'suspended') base.isActive = false;
  if (account === 'unverified') Object.assign(base, { isActive: true, deletedAt: null, emailVerified: false });
  if (account === 'deleted') base.deletedAt = { $ne: null };

  const tagValues = String(query.tags || query.tag || '').split(',').map(normalizeTag).filter(Boolean);
  if (tagValues.length) base.tags = { $all: tagValues };

  if (query.groupId && isId(query.groupId)) base.manualGroups = asId(query.groupId);
  addDateFilter(base, 'createdAt', query.joinedFrom, query.joinedTo);

  const stages = [
    { $match: base },
    customerMetricsLookup(),
    customerMetricsFields(),
    {
      $set: {
        aov: { $cond: [{ $gt: ['$orders', 0] }, { $round: [{ $divide: ['$ltv', '$orders'] }, 2] }, 0] },
      },
    },
    {
      $lookup: {
        from: 'loyaltyaccounts',
        let: { customerId: '$_id', phone: '$phone' },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $eq: ['$user', '$$customerId'] },
                  { $and: [{ $eq: ['$user', null] }, { $eq: ['$phone', '$$phone'] }] },
                ],
              },
            },
          },
        ],
        as: 'loyalty',
      },
    },
  ];

  const post = [];
  const segment = segmentExpression(query.segment);
  if (segment) post.push({ $match: { $expr: segment } });

  const hasOrders = String(query.hasOrders || '').toLowerCase();
  if (hasOrders === 'yes' || hasOrders === 'true') post.push({ $match: { $expr: { $gt: ['$orders', 0] } } });
  if (hasOrders === 'no' || hasOrders === 'false') post.push({ $match: { $expr: { $eq: ['$orders', 0] } } });

  const minOrders = Number(query.minOrders || 0);
  const maxOrders = Number(query.maxOrders || 0);
  if (Number.isFinite(minOrders) && minOrders > 0) post.push({ $match: { $expr: { $gte: ['$orders', minOrders] } } });
  if (Number.isFinite(maxOrders) && maxOrders > 0) post.push({ $match: { $expr: { $lte: ['$orders', maxOrders] } } });

  const minSpend = Number(query.minSpend || 0);
  const maxSpend = Number(query.maxSpend || 0);
  if (Number.isFinite(minSpend) && minSpend > 0) post.push({ $match: { $expr: { $gte: ['$ltv', minSpend] } } });
  if (Number.isFinite(maxSpend) && maxSpend > 0) post.push({ $match: { $expr: { $lte: ['$ltv', maxSpend] } } });

  const lastOrderDays = clamp(query.lastOrderDays, 0, 3650, 0);
  if (lastOrderDays) post.push({ $match: { lastOrderAt: { $gte: new Date(Date.now() - lastOrderDays * 86400000) } } });

  const hasWishlist = String(query.hasWishlist || '').toLowerCase();
  if (hasWishlist === 'yes' || hasWishlist === 'true') post.push({ $match: { 'wishlist.0': { $exists: true } } });
  if (hasWishlist === 'no' || hasWishlist === 'false') post.push({ $match: { $or: [{ wishlist: { $exists: false } }, { wishlist: { $size: 0 } }] } });

  const loyalty = String(query.loyalty || '').toLowerCase();
  if (loyalty === 'yes' || loyalty === 'true') post.push({ $match: { 'loyalty.0': { $exists: true } } });
  if (loyalty === 'no' || loyalty === 'false') post.push({ $match: { $expr: { $eq: [{ $size: '$loyalty' }, 0] } } });

  const hasCart = String(query.hasAbandonedCart || query.hasCart || '').toLowerCase();
  if (hasCart === 'yes' || hasCart === 'true') {
    post.push({
      $lookup: {
        from: 'abandonedcarts', let: { customerId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$customer', '$$customerId'] }, recoveredOrderId: null } },
          { $limit: 1 },
        ], as: 'openAbandonedCart',
      },
    });
    post.push({ $match: { 'openAbandonedCart.0': { $exists: true } } });
  }
  if (hasCart === 'no' || hasCart === 'false') {
    post.push({
      $lookup: {
        from: 'abandonedcarts', let: { customerId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$customer', '$$customerId'] }, recoveredOrderId: null } },
          { $limit: 1 },
        ], as: 'openAbandonedCart',
      },
    });
    post.push({ $match: { $expr: { $eq: [{ $size: '$openAbandonedCart' }, 0] } } });
  }

  stages.push(...post);
  return { stages, sort: sortForDirectory(query.sort, query.direction) };
}

async function listDirectory(query = {}) {
  const page = clamp(query.page, 1, 100000, 1);
  const limit = clamp(query.limit, 1, 100, 25);
  const { stages, sort } = await buildDirectoryStages(query);
  const [result] = await User.aggregate([
    ...stages,
    { $sort: sort },
    {
      $facet: {
        rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: directoryProjection() }],
        meta: [{ $count: 'total' }],
      },
    },
  ]);
  const rows = result?.rows || [];
  const total = result?.meta?.[0]?.total || 0;
  return {
    customers: rows.map((row) => {
      const metrics = { orders: row.orders, ltv: row.ltv, aov: row.aov, firstOrderAt: row.firstOrderAt, lastOrderAt: row.lastOrderAt };
      return publicCustomer(row, metrics, { loyalty: publicLoyalty(row.loyalty) });
    }),
    total,
    page,
    perPage: limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

async function findCustomer(id) {
  if (!isId(id)) return null;
  return User.findOne({ _id: id, role: 'customer' }).select(CUSTOMER_FIELDS);
}

async function loadProfile(id) {
  const customer = await findCustomer(id);
  if (!customer) return null;
  const customerId = customer._id;
  const [metricsMap, orderSummaryRows, orders, activity, notes, reviews, cart, loyalty, wishlist] = await Promise.all([
    getCustomerMetricsByIds([customerId]),
    Order.aggregate([
      { $match: { customer: customerId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $in: ['$status', ['Delivered', 'Completed']] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$status', 'Refunded'] }, 1, 0] } },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]),
    Order.find({ customer: customerId }).sort({ createdAt: -1 }).limit(20)
      .select('orderNumber createdAt items total paymentMethod paymentStatus paymentState status stage').lean(),
    CustomerActivity.find({ customer: customerId }).sort({ createdAt: -1 }).limit(20).lean(),
    CustomerNote.find({ customer: customerId }).sort({ createdAt: -1 }).limit(20).lean(),
    Review.find({ user: customerId }).sort({ createdAt: -1 }).limit(20)
      .select('product customerName rating title body status createdAt').populate('product', 'name slug images').lean(),
    AbandonedCart.findOne({ customer: customerId }).sort({ lastSeenAt: -1 })
      .select('items subtotal itemCount lastSeenAt recoveredOrderId').lean(),
    LoyaltyAccount.findOne({
      $or: [{ user: customerId }, ...(customer.phone ? [{ user: null, phone: customer.phone }] : [])],
    }).lean(),
    customer.wishlist?.length
      ? Product.find({ _id: { $in: customer.wishlist } }).select('name slug images price isActive status').lean()
      : [],
  ]);

  const metrics = metricsMap.get(String(customerId)) || emptyCustomerMetrics();
  const summary = orderSummaryRows[0] || { total: 0, completed: 0, cancelled: 0, refunded: 0, lastOrderAt: null };
  const profile = publicCustomer(customer.toObject(), metrics, {
    deliveryAddress: defaultAddress(customer),
    orderSummary: {
      total: Number(summary.total || 0),
      completed: Number(summary.completed || 0),
      cancelled: Number(summary.cancelled || 0),
      refunded: Number(summary.refunded || 0),
      lastOrderAt: metrics.lastOrderAt || summary.lastOrderAt || null,
      revenue: metrics.ltv,
      aov: metrics.aov,
    },
  });

  return {
    customer: profile,
    orders: orders.map(humanOrderRow),
    activity: activity.map(publicActivity),
    wishlist: wishlist.map((product) => ({
      id: product._id, name: product.name, slug: product.slug, image: product.images?.[0]?.url || '',
      price: Number(product.price || 0), available: product.isActive !== false && product.status !== 'draft',
    })),
    cart: cart ? {
      id: cart._id, itemCount: cart.itemCount || 0, subtotal: Number(cart.subtotal || 0),
      lastSeenAt: cart.lastSeenAt, recoveredOrderId: cart.recoveredOrderId || null,
      items: (cart.items || []).map((item) => ({ name: item.name, quantity: item.quantity, price: item.price, image: item.image || '' })),
    } : null,
    reviews: reviews.map((review) => ({
      id: review._id, rating: review.rating, title: review.title || '', body: review.body || '', status: review.status,
      createdAt: review.createdAt,
      product: review.product ? { id: review.product._id, name: review.product.name, slug: review.product.slug } : null,
    })),
    loyalty: publicLoyalty(loyalty),
    notes: notes.map(publicNote),
  };
}

function cleanAddress(input = {}, current = {}) {
  const text = (key, limit) => String(input[key] !== undefined ? input[key] : (current[key] || '')).trim().slice(0, limit);
  const countryRaw = text('country', 2).toUpperCase();
  return {
    label: text('label', 24) || 'Home',
    name: text('name', 80),
    phone: text('phone', 20),
    address: text('address', 200),
    city: text('city', 60),
    province: text('province', 60),
    postalCode: text('postalCode', 12),
    country: /^[A-Z]{2}$/.test(countryRaw) ? countryRaw : '',
    isDefault: true,
  };
}

function safeProfileAudit(customer) {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    whatsApp: customer.whatsApp || '',
    country: customer.country || '',
    accountStatus: accountStatus(customer),
  };
}

function ownerOnly(req, res, next) {
  if (['admin', 'Owner'].includes(req.user?.role)) return next();
  return res.status(403).json({ message: 'Only an Administrator or Owner can perform this privacy action' });
}

/* ── Directory, search, facets and dashboard signals ───────────────────── */
router.get('/', asyncHandler(async (req, res) => {
  res.json(await listDirectory(req.query));
}));

router.get('/search', asyncHandler(async (req, res) => {
  const search = String(req.query.q || req.query.search || '').trim();
  if (search.length < 1) return res.json({ customers: [] });
  const result = await listDirectory({ search, limit: clamp(req.query.limit, 1, 20, 8), page: 1, sort: 'name', direction: 'asc' });
  res.json({ customers: result.customers, total: result.total });
}));

router.get('/segments', asyncHandler(async (req, res) => {
  const { stages } = await buildDirectoryStages({});
  const [result] = await User.aggregate([
    ...stages,
    {
      $facet: {
        all: [{ $count: 'count' }],
        new: [{ $match: { $expr: segmentExpression('new') } }, { $count: 'count' }],
        repeat: [{ $match: { $expr: segmentExpression('repeat') } }, { $count: 'count' }],
        vip: [{ $match: { $expr: segmentExpression('vip') } }, { $count: 'count' }],
        high_value: [{ $match: { $expr: segmentExpression('high_value') } }, { $count: 'count' }],
        inactive: [{ $match: { $expr: segmentExpression('inactive') } }, { $count: 'count' }],
      },
    },
  ]);
  const count = (key) => result?.[key]?.[0]?.count || 0;
  res.json({
    segments: {
      all: count('all'), new: count('new'), repeat: count('repeat'), vip: count('vip'),
      high_value: count('high_value'), inactive: count('inactive'),
    },
    definitions: {
      vip: `Lifetime spend above PKR ${VIP_THRESHOLD.toLocaleString('en-PK')}`,
      high_value: `Lifetime spend from PKR ${HIGH_VALUE_THRESHOLD.toLocaleString('en-PK')} to PKR ${VIP_THRESHOLD.toLocaleString('en-PK')}`,
      repeat: 'At least two qualifying orders',
      inactive: `No qualifying order for ${INACTIVE_DAYS} days, or no order after that account age`,
      new: `Joined within ${NEW_DAYS} days with no more than one qualifying order`,
    },
  });
}));

router.get('/facets', asyncHandler(async (req, res) => {
  const [countries, tags] = await Promise.all([
    User.aggregate([
      { $match: { role: 'customer' } },
      { $group: { _id: '$country', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    User.aggregate([
      { $match: { role: 'customer', tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 100 },
    ]),
  ]);
  res.json({
    countries: countries.map((row) => ({ value: row._id || 'UNKNOWN', count: row.count })),
    tags: tags.map((row) => ({ value: row._id, count: row.count })),
  });
}));

router.get('/tags', asyncHandler(async (req, res) => {
  const rows = await User.aggregate([
    { $match: { role: 'customer', tags: { $exists: true, $ne: [] } } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 200 },
  ]);
  res.json({ tags: rows.map((row) => ({ value: row._id, count: row.count })) });
}));

router.get('/export', asyncHandler(async (req, res) => {
  const { stages, sort } = await buildDirectoryStages(req.query);
  const rows = await User.aggregate([
    ...stages,
    { $sort: sort },
    { $limit: 10000 },
    { $project: directoryProjection() },
  ]);
  const header = ['customer_id', 'name', 'email', 'phone', 'whatsapp', 'country', 'orders', 'revenue_pkr', 'aov_pkr', 'segment', 'last_order', 'joined', 'account_status', 'tags'];
  const lines = rows.map((row) => {
    const customer = publicCustomer(row, { orders: row.orders, ltv: row.ltv, aov: row.aov, firstOrderAt: row.firstOrderAt, lastOrderAt: row.lastOrderAt });
    return [
      customer.id, customer.name, customer.email, customer.phone, customer.whatsApp, customer.country,
      customer.metrics.orders, customer.metrics.ltv, customer.metrics.aov, customer.engagement.label,
      customer.metrics.lastOrderAt ? new Date(customer.metrics.lastOrderAt).toISOString() : '',
      customer.joinedAt ? new Date(customer.joinedAt).toISOString() : '', customer.accountStatus,
      customer.tags.join(' | '),
    ].map(csvEscape).join(',');
  });
  logAction(req.user?.email, 'export', 'customer', 'directory', null, { count: rows.length, filters: Object.keys(req.query || {}) });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="hushae-customers.csv"');
  res.send(`${header.join(',')}\n${lines.join('\n')}`);
}));

router.post('/bulk', asyncHandler(async (req, res) => {
  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isId).map(String))];
  if (!ids.length) return res.status(400).json({ message: 'Select at least one customer' });
  if (ids.length > 200) return res.status(400).json({ message: 'Select no more than 200 customers at once' });
  const action = String(req.body?.action || '');
  const where = { _id: { $in: ids.map(asId) }, role: 'customer' };

  if (action === 'add_tag' || action === 'remove_tag') {
    const tag = normalizeTag(req.body?.tag);
    if (!tag) return res.status(400).json({ message: 'Enter a valid tag' });
    const update = action === 'add_tag' ? { $addToSet: { tags: tag } } : { $pull: { tags: tag } };
    const result = await User.updateMany(where, update);
    logAction(req.user?.email, action, 'customer', 'bulk', null, { count: result.modifiedCount, tag });
    return res.json({ ok: true, modified: result.modifiedCount, tag });
  }

  if (action === 'assign_group') {
    if (!isId(req.body?.groupId)) return res.status(400).json({ message: 'Choose a valid customer group' });
    const group = await CustomerGroup.findOne({ _id: req.body.groupId, archivedAt: null });
    if (!group) return res.status(404).json({ message: 'Customer group not found or archived' });
    const result = await User.updateMany(where, { $addToSet: { manualGroups: group._id } });
    // Dynamic rule evaluation remains intact; this is an intentional manual override.
    try { require('../utils/customerSegments').refreshGroupCount(group).catch(() => {}); } catch { /* noop */ }
    logAction(req.user?.email, 'assign_group', 'customer', 'bulk', null, { count: result.modifiedCount, groupId: String(group._id), group: group.name });
    return res.json({ ok: true, modified: result.modifiedCount, group: { id: group._id, name: group.name } });
  }

  return res.status(400).json({ message: 'Unsupported bulk action' });
}));

/* ── Customer 360 profile and related tabs ─────────────────────────────── */
router.get('/:id', asyncHandler(async (req, res) => {
  const profile = await loadProfile(req.params.id);
  if (!profile) return res.status(404).json({ message: 'Customer not found' });
  res.json(profile);
}));

router.get('/:id/orders', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const page = clamp(req.query.page, 1, 100000, 1);
  const limit = clamp(req.query.limit, 1, 100, 20);
  const where = { customer: customer._id };
  const [orders, total, metricsMap, stats] = await Promise.all([
    Order.find(where).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .select('orderNumber createdAt items total paymentMethod paymentStatus paymentState status stage').lean(),
    Order.countDocuments(where),
    getCustomerMetricsByIds([customer._id]),
    Order.aggregate([
      { $match: where },
      {
        $group: {
          _id: null,
          completed: { $sum: { $cond: [{ $in: ['$status', ['Delivered', 'Completed']] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } },
          refunded: { $sum: { $cond: [{ $eq: ['$status', 'Refunded'] }, 1, 0] } },
          lastOrderAt: { $max: '$createdAt' },
        },
      },
    ]),
  ]);
  const metrics = metricsMap.get(String(customer._id)) || emptyCustomerMetrics();
  const summary = stats[0] || {};
  res.json({
    orders: orders.map(humanOrderRow), total, page, perPage: limit, pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      total, completed: summary.completed || 0, cancelled: summary.cancelled || 0, refunded: summary.refunded || 0,
      lastOrderAt: metrics.lastOrderAt || summary.lastOrderAt || null, revenue: metrics.ltv, aov: metrics.aov,
    },
  });
}));

router.get('/:id/activity', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const page = clamp(req.query.page, 1, 100000, 1);
  const limit = clamp(req.query.limit, 1, 100, 20);
  const [rows, total] = await Promise.all([
    CustomerActivity.find({ customer: customer._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CustomerActivity.countDocuments({ customer: customer._id }),
  ]);
  res.json({ activity: rows.map(publicActivity), total, page, perPage: limit, pages: Math.max(1, Math.ceil(total / limit)) });
}));

router.get('/:id/notes', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const page = clamp(req.query.page, 1, 100000, 1);
  const limit = clamp(req.query.limit, 1, 100, 20);
  const [rows, total] = await Promise.all([
    CustomerNote.find({ customer: customer._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    CustomerNote.countDocuments({ customer: customer._id }),
  ]);
  res.json({ notes: rows.map(publicNote), total, page, perPage: limit, pages: Math.max(1, Math.ceil(total / limit)) });
}));

router.post('/:id/notes', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const content = String(req.body?.content || '').trim();
  const category = NOTE_CATEGORIES.includes(req.body?.category) ? req.body.category : 'general';
  if (!content) return res.status(400).json({ message: 'Note cannot be empty' });
  if (content.length > 2000) return res.status(400).json({ message: 'Note must be 2,000 characters or fewer' });
  const note = await CustomerNote.create({
    customer: customer._id, content, category, createdBy: req.user._id,
    createdByName: req.user.name || req.user.email || 'Admin',
  });
  logAction(req.user?.email, 'create_note', 'customer', customer._id, null, { noteId: String(note._id), category });
  res.status(201).json({ note: publicNote(note) });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const before = safeProfileAudit(customer);
  const body = req.body || {};

  if (body.name !== undefined) {
    const name = String(body.name || '').trim().slice(0, 120);
    if (name.length < 2) return res.status(400).json({ message: 'Enter a customer name' });
    customer.name = name;
  }
  if (body.email !== undefined) {
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    const existing = await User.findOne({ email, _id: { $ne: customer._id } }).select('_id').lean();
    if (existing) return res.status(409).json({ message: 'That email is already used by another account' });
    customer.email = email;
  }
  if (body.phone !== undefined) {
    const phone = String(body.phone || '').trim();
    if (phone) {
      const normalized = normalizePhone(phone);
      if (!normalized) return res.status(400).json({ message: 'Enter a valid Pakistani mobile number' });
      customer.phone = normalized;
    } else customer.phone = '';
  }
  if (body.whatsApp !== undefined) {
    const whatsApp = String(body.whatsApp || '').trim();
    if (whatsApp) {
      const normalized = normalizePhone(whatsApp);
      if (!normalized) return res.status(400).json({ message: 'Enter a valid WhatsApp number' });
      customer.whatsApp = normalized;
    } else customer.whatsApp = '';
  }
  if (body.country !== undefined) {
    const country = String(body.country || '').trim().toUpperCase();
    if (country && !/^[A-Z]{2}$/.test(country)) return res.status(400).json({ message: 'Country must use a two-letter ISO code' });
    customer.country = country;
  }
  if (body.accountStatus !== undefined) {
    const status = String(body.accountStatus || '').toUpperCase();
    if (!['ACTIVE', 'UNVERIFIED', 'SUSPENDED'].includes(status)) return res.status(400).json({ message: 'Invalid account status' });
    customer.deletedAt = null;
    customer.isActive = status !== 'SUSPENDED';
    customer.emailVerified = status !== 'UNVERIFIED';
  }
  if (body.address && typeof body.address === 'object') {
    const current = defaultAddress(customer) || {};
    const address = cleanAddress(body.address, current);
    if (address.address && address.address.length < 4) return res.status(400).json({ message: 'Enter a fuller delivery address' });
    const currentIndex = (customer.addresses || []).findIndex((item) => item.isDefault);
    if (currentIndex >= 0) customer.addresses[currentIndex] = { ...customer.addresses[currentIndex].toObject(), ...address };
    else if (customer.addresses?.length) customer.addresses[0] = { ...customer.addresses[0].toObject(), ...address };
    else customer.addresses.push(address);
    if (address.country) customer.country = address.country;
  }

  await customer.save();
  logAction(req.user?.email, 'update', 'customer', customer._id, before, safeProfileAudit(customer));
  const metricsMap = await getCustomerMetricsByIds([customer._id]);
  res.json({ customer: publicCustomer(customer.toObject(), metricsMap.get(String(customer._id)) || emptyCustomerMetrics(), { deliveryAddress: defaultAddress(customer) }) });
}));

router.put('/:id/consent', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const next = { ...(customer.consent?.toObject ? customer.consent.toObject() : customer.consent || {}) };
  for (const key of ['email', 'whatsapp', 'sms']) {
    if (req.body?.[key] === undefined) continue;
    const value = String(req.body[key]).toUpperCase();
    if (!CONSENT_VALUES.includes(value)) return res.status(400).json({ message: `Invalid ${key} consent value` });
    next[key] = value;
  }
  next.updatedAt = new Date();
  next.updatedBy = req.user.name || req.user.email || 'admin';
  customer.consent = next;
  // Legacy notification flags stay in sync only after an explicit consent
  // write; we do not infer consent from the existing legacy flags.
  customer.notify = {
    ...(customer.notify?.toObject ? customer.notify.toObject() : customer.notify || {}),
    marketingEmail: next.email === 'OPTED_IN',
    marketingSms: next.sms === 'OPTED_IN',
  };
  await customer.save();
  logAction(req.user?.email, 'consent_change', 'customer', customer._id, null, { email: next.email, whatsapp: next.whatsapp, sms: next.sms });
  res.json({ consent: { email: next.email, whatsapp: next.whatsapp, sms: next.sms, updatedAt: next.updatedAt } });
}));

router.post('/:id/tags', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const tag = normalizeTag(req.body?.tag);
  if (!tag) return res.status(400).json({ message: 'Enter a valid tag' });
  customer.tags = normalizeTags([...(customer.tags || []), tag]);
  await customer.save();
  logAction(req.user?.email, 'add_tag', 'customer', customer._id, null, { tag });
  res.json({ tags: customer.tags });
}));

router.delete('/:id/tags/:tag', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const tag = normalizeTag(req.params.tag);
  customer.tags = (customer.tags || []).filter((value) => String(value).toLowerCase() !== tag.toLowerCase());
  await customer.save();
  logAction(req.user?.email, 'remove_tag', 'customer', customer._id, null, { tag });
  res.json({ tags: customer.tags });
}));

router.post('/:id/contact/email', asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const kind = req.body?.kind === 'transactional' ? 'transactional' : 'marketing';
  const subject = String(req.body?.subject || '').trim().slice(0, 180);
  const message = String(req.body?.message || '').trim().slice(0, 5000);
  if (!customer.email || !subject || !message) return res.status(400).json({ message: 'Email, subject and message are required' });
  if (kind === 'marketing' && customer.consent?.email !== 'OPTED_IN') {
    return res.status(409).json({ message: 'Marketing email is not permitted: this customer has not opted in' });
  }
  const mailer = require('../utils/mailer');
  const result = await mailer.sendMail({ to: customer.email, subject, text: message });
  const acceptedByProvider = result?.ok === true;
  logAction(req.user?.email, 'contact_email', 'customer', customer._id, null, { kind, acceptedByProvider, skipped: !!result?.skipped });
  // SMTP acceptance is not a delivery guarantee. The wording here is
  // intentionally precise for staff and tests.
  res.json({
    ok: acceptedByProvider,
    acceptedByProvider,
    skipped: !!result?.skipped,
    reason: result?.reason || result?.error || '',
    message: acceptedByProvider ? 'Accepted by the configured email provider; delivery is not yet confirmed.' : 'The message was not accepted by an email provider.',
  });
}));

router.post('/:id/anonymize', ownerOnly, asyncHandler(async (req, res) => {
  const customer = await findCustomer(req.params.id);
  if (!customer) return res.status(404).json({ message: 'Customer not found' });
  const before = safeProfileAudit(customer);
  const stamp = `${Date.now()}-${String(customer._id).slice(-6)}`;
  customer.name = 'Deleted customer';
  customer.email = `deleted.${stamp}@redacted.invalid`;
  customer.phone = '';
  customer.whatsApp = '';
  customer.country = '';
  customer.addresses = [];
  customer.wishlist = [];
  customer.tags = [];
  customer.manualGroups = [];
  customer.sessions = [];
  customer.isActive = false;
  customer.deletedAt = new Date();
  customer.consent = { email: 'OPTED_OUT', whatsapp: 'OPTED_OUT', sms: 'OPTED_OUT', updatedAt: new Date(), updatedBy: req.user.email || 'admin' };
  await customer.save();
  // Orders, invoices, refunds and activity retain their persistent customer id
  // for referential integrity; historical customerInfo snapshots are untouched.
  logAction(req.user?.email, 'anonymize', 'customer', customer._id, before, { accountStatus: 'DELETED' });
  res.json({ ok: true, customer: { id: customer._id, accountStatus: 'DELETED' } });
}));

module.exports = router;
module.exports._internal = { buildDirectoryStages, engagementFor, accountStatus, loadProfile };
