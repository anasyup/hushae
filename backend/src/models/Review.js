const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  order:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Snapshot of who wrote it (so we can still show if the account is deleted)
  customerName: { type: String, required: true },
  customerEmail:{ type: String, default: '' },
  rating:       { type: Number, required: true, min: 1, max: 5 },
  title:        { type: String, default: '', maxlength: 120 },
  body:         { type: String, required: true, maxlength: 2000 },
  images:       [{ url: String }],
  // Media is images-only by merchant choice; the field exists so video can be
  // switched on later without a migration.
  videos:       [{ url: String }],
  verified:     { type: Boolean, default: false }, // true if linked to a real order
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  helpful:      { type: Number, default: 0 },
  /* Who found it helpful. Storing the voters — not just a counter — is what
     stops one person inflating a review by holding down the button. Guests are
     keyed by a hashed IP, signed-in shoppers by their user id. */
  helpfulBy:    { type: [String], default: [], select: false },
  reports:      { type: Number, default: 0 },
  reportedBy:   { type: [String], default: [], select: false },
  adminReply:   { type: String, default: '' },
  adminReplyAt: { type: Date, default: null },
  featured:     { type: Boolean, default: false, index: true },
  pinned:       { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
