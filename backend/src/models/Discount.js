const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, required: true, min: 0 }, // percent (1-100) or fixed PKR
  minSubtotal: { type: Number, default: 0 },       // 0 = no minimum
  maxUses: { type: Number, default: 0 },           // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);
