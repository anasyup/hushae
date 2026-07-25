const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, default: '' },
}, { _id: false });

const colorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hex: { type: String, required: true },
  image: { type: String, default: '' }, // optional per-color photo URL
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  sku: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['women', 'men'], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  categorySlug: { type: String, required: true },
  tier: { type: String, enum: ['Economy', 'Standard', 'Premium'], required: true },
  price: { type: Number, required: true, min: 0 },
  compareAtPrice: { type: Number, default: null },
  // Cost / wholesale price per unit — used for profit calculation.
  // Never shown to customers. Only visible to admin.
  costPrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  images: { type: [imageSchema], validate: v => v.length >= 1 },
  video: { type: String, default: '' }, // optional product video (MP4 URL or YouTube link)
  shortDescription: { type: String, default: '' },
  description: { type: String, default: '' },
  sizes: [{ type: String }],
  colors: [colorSchema],
  fabric: { type: String, default: '' },
  badges: [{ type: String }],
  care: [{ type: String }],
  ratingAvg: { type: Number, default: 4.5 },
  ratingCount: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'draft'], default: 'active' }, // draft = hidden from store, work in progress
}, { timestamps: true });

productSchema.index({ name: 'text', shortDescription: 'text' });

module.exports = mongoose.model('Product', productSchema);
