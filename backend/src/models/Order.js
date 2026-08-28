const mongoose = require('mongoose');

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const PAYMENT_METHODS = ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer', 'Visa'];

const itemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String,
  slug: String,
  image: String,
  size: String,
  color: String,
  price: Number,
  // Snapshot of cost at time of order — protects historical profit from later cost edits
  costPrice: { type: Number, default: 0 },
  quantity: Number,
  lineTotal: Number,
  reservedQty: { type: Number, default: 0 },
  fulfilledQty: { type: Number, default: 0 },
  cancelledQty: { type: Number, default: 0 },
  returnedQty: { type: Number, default: 0 },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  /* Where the order came from. 'web' = customer checkout, 'admin' = created
     manually by staff (Shopify's "create order" / phone orders). Kept out of
     the status workflow — an admin-created order flows through the exact same
     Pending → … pipeline, so the warehouse treats it like any other order. */
  source: { type: String, enum: ['web', 'admin'], default: 'web', index: true },
  adminCreatedById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // Set when the order was recovered from an abandoned cart (admin recover flow).
  abandonedCartId: { type: mongoose.Schema.Types.ObjectId, ref: 'AbandonedCart', default: null, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    postalCode: { type: String, default: '' },
    notes: { type: String, default: '' },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      mapsLink: { type: String, default: '' },
      _id: false,
    },
  },
  items: { type: [itemSchema], required: true },
  subtotal: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  // Tax charged on this order. Snapshotted as an amount AND a rate so a later
  // change to settings.cart.taxPercent can never rewrite the history of an
  // order that has already been placed. 0 on every pre-existing order, which
  // is exactly what they were charged.
  tax: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 0 },
  shippingMethod: { type: String, default: 'standard' },

  /* ---- Rewards applied at checkout -------------------------------------
   * Snapshotted as amounts, not as "the customer had X points". What was
   * taken off THIS order must survive any later change to the point value,
   * exactly like tax above. Every one of these is computed by the server
   * from the ledger; the client can ask to redeem, never state a value.
   *
   * They are recorded separately from `discount` on purpose: a coupon is
   * marketing spend, points are a liability being settled, and store credit
   * is money already owed. Merging them makes the accounts unreadable. */
  /* Automatic promotions applied to this order. Snapshotted as an amount plus
     the rules that produced it: the promotion may be edited or deleted later,
     and what THIS order was charged must not change with it. Kept apart from
     `discount` (a coupon) for the same reason points and credit are — three
     different things on the merchant's books. */
  promotionDiscount: { type: Number, default: 0 },
  promotions: {
    type: [{
      _id: false,
      promotion: { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
      name:   { type: String, default: '' },
      type:   { type: String, default: '' },
      amount: { type: Number, default: 0 },
    }],
    default: [],
  },
  promotionFreeShipping: { type: Boolean, default: false },

  pointsRedeemed:     { type: Number, default: 0 },   // points spent
  pointsDiscount:     { type: Number, default: 0 },   // PKR they were worth
  creditUsed:         { type: Number, default: 0 },   // PKR of store credit
  giftCardUsed:       { type: Number, default: 0 },   // PKR of gift card
  giftCardLast4:      { type: String, default: '' },
  giftCard:           { type: mongoose.Schema.Types.ObjectId, ref: 'GiftCard', default: null },
  /* Set once the rewards have actually been debited, so a retry or a replayed
     webhook can never charge the same balances twice. */
  rewardsSettled:     { type: Boolean, default: false },

  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Pending' },
  transactionId: { type: String, default: '' },
  status: { type: String, enum: ORDER_STATUSES, default: 'Pending' },
  statusHistory: [{
    status: String,
    at: { type: Date, default: Date.now },
    note: { type: String, default: '' },
    _id: false,
  }],
  // COD phone-verification flag — set when admin clicks "Confirm by Call"
  verifiedByCall: { type: Boolean, default: false },
  // Courier / tracking info — filled during "Ready to Ship" or "Shipped" stage
  courierName: { type: String, default: '' },
  trackingNumber: { type: String, default: '' },
  trackingUrl: { type: String, default: '' },
  // Free-form admin notes (internal only, not shown to customer)
  adminNotes: { type: String, default: '' },
  discreetPackaging: { type: Boolean, default: true },

  // ==========================================================================
  // Fulfilment pipeline (v2). `status` above stays the coarse, backward
  // compatible value; `stage` is the detailed step the warehouse works in.
  // Existing orders are migrated lazily by utils/orderFlow.stageFromLegacy().
  // ==========================================================================
  stage: { type: String, default: '', index: true },
  stageUpdatedAt: { type: Date, default: null },
  /** { 'To Pack': Date, 'Shipped': Date, ... } — when each stage was reached. */
  stageTimestamps: { type: mongoose.Schema.Types.Mixed, default: {} },

  // --- Payment verification -------------------------------------------------
  /** Pending -> Verified -> Confirmed (mirrors the latest OrderPayment row). */
  paymentState: {
    type: String,
    enum: ['Pending', 'Verified', 'Confirmed', 'Failed', 'Expired', 'Refunded'],
    default: 'Pending',
    index: true,
  },
  paymentVerifiedAt: { type: Date, default: null },
  paymentVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  /** COD holds expire after 48h so stale orders surface instead of rotting. */
  paymentExpiresAt: { type: Date, default: null, index: true },

  // --- Print state (cached from OrderPrint so lists need no join) -----------
  printStatus: {
    invoice:      { printed: { type: Boolean, default: false }, at: { type: Date, default: null }, count: { type: Number, default: 0 } },
    packing_slip: { printed: { type: Boolean, default: false }, at: { type: Date, default: null }, count: { type: Number, default: 0 } },
    pick_list:    { printed: { type: Boolean, default: false }, at: { type: Date, default: null }, count: { type: Number, default: 0 } },
  },

  // --- Customer service (cached summary; detail lives in OrderIssue) --------
  customerService: {
    hasIssue: { type: Boolean, default: false, index: true },
    issueType: { type: String, default: '' },
    refundStatus: { type: String, default: 'No Issue' },
    returnStatus: { type: String, default: 'Not Required' },
    cancellationStatus: { type: String, default: 'No Cancellation' },
    openIssues: { type: Number, default: 0 },
  },

  /** Structured internal notes — the legacy free-text `adminNotes` still works. */
  internalNotes: {
    type: [{
      _id: false,
      body: String,
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      authorName: { type: String, default: '' },
      at: { type: Date, default: Date.now },
    }],
    default: [],
  },

  // --- Warehouse workflow ---------------------------------------------------
  /** '' | 'passed' | 'review' — set by the bulk quality-check action. */
  qcStatus: { type: String, default: '' },
  qcAt: { type: Date, default: null },
  qcBy: { type: String, default: '' },
  /** '' | 'rush' | 'hold' — merchant-set, separate from the derived priority. */
  priorityFlag: { type: String, default: '', index: true },
  /** Free-text owner: a packer, a courier desk, whoever. */
  assignedTo: { type: String, default: '' },

  /* Test order — set manually, or auto-set when a staff member places an
     order while signed in. Excluded from every analytics widget by default
     (Settings → includeTestOrders re-includes them). */
  isTestOrder: { type: Boolean, default: false, index: true },

  /* Why this order was cancelled — captured by the required dropdown when
     staff cancel. Feeds the Cancellation Reasons analytics widget. */
  cancelReason: { type: String, default: '' },

  /* Call-queue verification attempts — each "No Answer" click increments the
     counter and stamps the time; 3+ auto-flags the order for review. */
  noAnswer: {
    attempts: { type: Number, default: 0 },
    lastAt: { type: Date, default: null },
    _id: false,
  },

  /** Set when an order was created or actioned as part of a bulk run. */
  isBulkOrder: { type: Boolean, default: false },
  lastBulkBatchId: { type: String, default: '' },

  // --- Per-order economics --------------------------------------------------
  // null = "use the Settings default". Filling any of these in overrides the
  // estimate for that order only; utils/orderEconomics.js resolves the fallback.
  courierCost:       { type: Number, default: null },
  paymentGatewayFee: { type: Number, default: null },
  packagingCost:     { type: Number, default: null },
  // --- Fraud Filter ---
  fraudFilter: {
    isFlagged: { type: Boolean, default: false, index: true },
    reasons: { type: [String], default: [] },
    score: { type: Number, default: 0 },
    band: { type: String, default: 'low' },
    status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'], index: true }
  }
}, { timestamps: true, minimize: false });

// Indexes that back the new filter/sort surface
orderSchema.index({ createdAt: -1 });
// Customer 360 uses the persistent customer id, never a fuzzy client-side
// phone match. These indexes keep profile timelines and LTV aggregates fast.
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ customer: 1, status: 1, createdAt: -1 });
orderSchema.index({ stage: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, paymentState: 1 });
orderSchema.index({ 'customerInfo.city': 1 });
orderSchema.index({ total: 1 });

orderSchema.statics.STATUSES = ORDER_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
