const mongoose = require('mongoose');

/* Internal-only CRM notes. There is intentionally no public route for these. */
const customerNoteSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  category: {
    type: String,
    enum: ['general', 'service', 'fit', 'order', 'other'],
    default: 'general',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdByName: { type: String, default: '' },
}, { timestamps: true });

customerNoteSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model('CustomerNote', customerNoteSchema);
