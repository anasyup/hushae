const mongoose = require('mongoose');

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Refunded'];
const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded'];
const PAYMENT_METHODS = ['COD', 'JazzCash', 'EasyPaisa', 'Bank Transfer'];

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
}, { timestamps: true });

orderSchema.statics.STATUSES = ORDER_STATUSES;

module.exports = mongoose.model('Order', orderSchema);
