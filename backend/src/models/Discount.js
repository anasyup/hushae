const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, default: 0, min: 0 }, // percent (1-100) or fixed PKR
  percent: { type: Number, default: 0 },       // convenience alias for percent-type
  minSubtotal: { type: Number, default: 0 },   // 0 = no minimum
  maxUses: { type: Number, default: 0 },       // 0 = unlimited
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  // Loyalty auto-issued codes
  isLoyalty: { type: Boolean, default: false },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  note: { type: String, default: '' },
}, { timestamps: true });

// Normalise: when percent is set but value is 0, mirror it into value + type
discountSchema.pre('save', function(next) {
  if (this.percent && !this.value) { this.type = 'percent'; this.value = this.percent; }
  if (this.type === 'percent' && this.value && !this.percent) this.percent = this.value;
  next();
});

module.exports = mongoose.model('Discount', discountSchema);
