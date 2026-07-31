const mongoose = require('mongoose');

/**
 * A customer question about a product, plus the answers under it.
 *
 * Answers are embedded rather than a separate collection: a question rarely
 * carries more than a handful, and they are never read without their question,
 * so a second round-trip would buy nothing.
 */
const answerSchema = new mongoose.Schema({
  body:        { type: String, required: true, maxlength: 1500 },
  authorName:  { type: String, default: '' },
  /* Merchant answers carry the store's voice and sort to the top. */
  isMerchant:  { type: Boolean, default: false },
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  helpful:     { type: Number, default: 0 },
  helpfulBy:   { type: [String], default: [], select: false },
  createdAt:   { type: Date, default: Date.now },
}, { _id: true });

const questionSchema = new mongoose.Schema({
  product:      { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerName: { type: String, required: true },
  customerEmail:{ type: String, default: '' },
  body:         { type: String, required: true, maxlength: 500 },

  answers:      { type: [answerSchema], default: [] },

  status:       { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  featured:     { type: Boolean, default: false },

  /* Same one-vote-per-person guard the reviews use: a bare counter can be
     driven to any number by one person holding the button. */
  helpful:      { type: Number, default: 0 },
  helpfulBy:    { type: [String], default: [], select: false },
  reports:      { type: Number, default: 0 },
  reportedBy:   { type: [String], default: [], select: false },
}, { timestamps: true });

questionSchema.index({ product: 1, status: 1, createdAt: -1 });
// Backs the question search box without a full collection scan.
questionSchema.index({ body: 'text' });

module.exports = mongoose.model('Question', questionSchema);
