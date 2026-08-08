const mongoose = require('mongoose');

/**
 * Banner SLOTS — fixed positions across the storefront.
 * Seeded with the five predefined slots; the merchant can rename types and
 * add custom slots from the admin.
 */
const bannerSlotSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['hero', 'banner', 'sidebar', 'inline'], default: 'banner' },
  width: { type: Number, default: 1920 },
  height: { type: Number, default: 800 },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('BannerSlot', bannerSlotSchema);
