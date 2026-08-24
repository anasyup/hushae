const mongoose = require('mongoose');

/* ============================================================================
 * DISCOUNT / COUPON MODEL — Phase 6 Enhanced
 *
 * Original fields preserved. Phase 6 additions:
 * - Product/category/collection targeting
 * - Customer segment/group targeting
 * - Country targeting
 * - Per-customer limit (maxUsesPerPhone)
 * - Schedule (startsAt/endsAt)
 * - Internal name + note
 * ========================================================================== */

const discountSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, default: 0, min: 0 },
  percent: { type: Number, default: 0 },
  minSubtotal: { type: Number, default: 0 },
  maxUses: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  isLoyalty: { type: Boolean, default: false },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  note: { type: String, default: '' },

  /* ---- Phase 6 additions ------------------------------------------------ */
  // Internal name for admin reference
  name: { type: String, default: '' },
  // Schedule
  startsAt: { type: Date, default: null },
  // Per-customer limit (by phone last 9 digits)
  maxUsesPerPhone: { type: Number, default: 0 },
  // Maximum discount amount (for percent type, caps the PKR value)
  maxDiscountAmount: { type: Number, default: 0 },

  // Product targeting
  productIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  categorySlugs: { type: [String], default: [] },
  collectionIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },

  // Customer targeting
  customerSegments: { type: [String], default: [] }, // VIP, Repeat, New, Inactive
  customerGroupIds: { type: [String], default: [] },

  // Geographic targeting
  countries: { type: [String], default: [] },

  // Stacking policy
  stacksWithPromotions: { type: Boolean, default: true },

  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

discountSchema.pre('save', function(next) {
  if (this.type === 'percent' && this.value > 0) this.percent = this.value;
  next();
});

discountSchema.index({ active: 1, expiresAt: 1 });
discountSchema.index({ code: 1 });

module.exports = mongoose.model('Discount', discountSchema);
