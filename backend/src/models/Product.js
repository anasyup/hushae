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
  /* ── Sale windows (v2) ────────────────────────────────────────────────────
     A product is ON SALE only when ALL of these hold:
       1. onSale === true           (explicit merchant opt-in — default OFF)
       2. compareAtPrice > price    (a real "was" price exists)
       3. saleStart unset or <= now (sale window opened)
       4. saleEnd   unset or >= now (sale window not closed)

     compareAtPrice alone no longer means "on sale". New products default to
     onSale:false, so a fresh launch is NEVER automatically discounted — the
     merchant must switch the sale on in the product form. This kills the
     "everything is permanently 30% off" state that destroyed price anchoring.
  ──────────────────────────────────────────────────────────────────────── */
  onSale: { type: Boolean, default: false },
  saleStart: { type: Date, default: null },
  saleEnd: { type: Date, default: null },
  // Cost / wholesale price per unit — used for profit calculation.
  // Never shown to customers. Only visible to admin.
  costPrice: { type: Number, default: 0, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  /* Low-stock reorder workflow — 'pending' while a reorder is outstanding so
     staff don't duplicate it; cleared by "mark received". */
  reorderStatus: { type: String, default: '', enum: ['', 'pending'] },
  reorderRequestedAt: { type: Date, default: null },
  targetStock: { type: Number, default: null },   // null → Settings.reorderTargetStock
  images: { type: [imageSchema], validate: v => v.length >= 1 },
  video: { type: String, default: '' }, // optional product video (MP4 URL or YouTube link)
  shortDescription: { type: String, default: '' },
  description: { type: String, default: '' },
  sizes: [{ type: String }],
  colors: [colorSchema],
  fabric: { type: String, default: '' },
  badges: [{ type: String }],
  // Freeform tags for filtering + curation (lowercased for search)
  tags: [{ type: String, lowercase: true, trim: true }],
  care: [{ type: String }],
  ratingAvg: { type: Number, default: 4.5 },
  ratingCount: { type: Number, default: 0 },
  isFeatured: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['active', 'draft'], default: 'active' }, // draft = hidden from store, work in progress
}, { timestamps: true });

productSchema.index({ name: 'text', shortDescription: 'text' });

/* Mongo predicate for "currently on sale" — used by /products?sale=true,
   search, smart collections and anywhere else that filters the catalogue.
   Returns a $and block so callers can merge it safely. */
productSchema.statics.saleFilter = function saleFilter(now = new Date()) {
  return {
    $and: [
      { onSale: true },
      { $expr: { $gt: ['$compareAtPrice', '$price'] } },
      { $or: [{ saleStart: null }, { saleStart: { $lte: now } }] },
      { $or: [{ saleEnd: null }, { saleEnd: { $gte: now } }] },
    ],
  };
};

/* Instance check — mirrors saleFilter for in-memory documents. */
productSchema.methods.isOnSale = function isOnSale(now = new Date()) {
  if (this.onSale !== true) return false;
  if (!(this.compareAtPrice > this.price)) return false;
  if (this.saleStart && new Date(this.saleStart) > now) return false;
  if (this.saleEnd && new Date(this.saleEnd) < now) return false;
  return true;
};

module.exports = mongoose.model('Product', productSchema);
