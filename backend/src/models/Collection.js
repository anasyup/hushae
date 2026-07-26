const mongoose = require('mongoose');

/*
 * Collection — a curated grouping of products (e.g. "Wedding Season",
 * "Summer Essentials", "Bridal"). Two modes:
 *   - manual: admin picks specific product IDs
 *   - smart:  admin defines rules (matching tags / category / tier / gender)
 *
 * Public URL: /collection/:slug
 * Admin CRUD lives at /admin/collections.
 */

const collectionSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  description: { type: String, default: '' },
  image:       { type: String, default: '' },   // Banner image for the collection page + homepage tile

  // Manual mode: explicit product references
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

  // Smart mode: rules resolved at query time (products/routes.js applies these)
  smart: {
    enabled:  { type: Boolean, default: false },
    tags:     [{ type: String, lowercase: true, trim: true }], // any-of match
    category: { type: String, default: '' },
    tier:     { type: String, default: '' },
    gender:   { type: String, default: '' },
    onSale:   { type: Boolean, default: false },
    minPrice: { type: Number, default: null },
    maxPrice: { type: Number, default: null },
  },

  // Display
  featuredOnHome: { type: Boolean, default: false }, // Show tile on homepage
  sortOrder:      { type: Number, default: 100 },
  isActive:       { type: Boolean, default: true },
}, { timestamps: true });

collectionSchema.index({ featuredOnHome: 1, sortOrder: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
