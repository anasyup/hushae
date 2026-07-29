const mongoose = require('mongoose');

/**
 * A named filter combination on the order desk, e.g. "COD pending in
 * Rawalpindi". Stored server-side rather than in localStorage so the whole
 * team sees the same views and a link can be shared.
 */
const savedFilterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  /** The query string as it appears in the URL, minus the leading '?'. */
  query: { type: String, required: true, maxlength: 1200 },
  icon: { type: String, default: '' },
  /** Personal views are only listed for their owner. */
  shared: { type: Boolean, default: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ownerName: { type: String, default: '' },
  useCount: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: null },
}, { timestamps: true });

savedFilterSchema.index({ shared: 1, updatedAt: -1 });

module.exports = mongoose.model('SavedFilter', savedFilterSchema);
