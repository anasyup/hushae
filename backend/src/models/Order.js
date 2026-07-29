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
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
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

  /** Set when an order was created or actioned as part of a bulk run. */
  isBulkOrder: { type: Boolean, default: false },
  lastBulkBatchId: { type: String, default: '' },
}, { timestamps: true, minimize: false });

// Indexes that back the new filter/sort surface
orderSchema.index({ createdAt: -1 });
orderSchema.index({ stage: 1, createdAt: -1 });
orderSchema.index({ paymentMethod: 1, paymentState: 1 });
orderSchema.index({ 'customerInfo.city': 1 });
orderSchema.index({ total: 1 });

orderSchema.statics.STATUSES = ORDER_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
