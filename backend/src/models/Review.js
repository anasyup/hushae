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
  verified:     { type: Boolean, default: false }, // true if linked to a real order
  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  helpful:      { type: Number, default: 0 },
  adminReply:   { type: String, default: '' },
}, { timestamps: true });

reviewSchema.index({ product: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
