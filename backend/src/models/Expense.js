const mongoose = require('mongoose');

/* ============================================================================
 * EXPENSE MODEL — Phase 7: Lightweight commerce expense tracking
 *
 * NOT a full accounting journal. Records business expenses for P&L estimation.
 * ========================================================================== */

const CATEGORIES = [
  'packaging', 'courier', 'marketing', 'software', 'rent',
  'utilities', 'salary', 'payment_fees', 'returns', 'other',
];

const expenseSchema = new mongoose.Schema({
  category: { type: String, enum: CATEGORIES, required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'PKR' },
  date: { type: Date, default: Date.now, index: true },
  note: { type: String, default: '' },
  recurring: { type: Boolean, default: false },
  reference: { type: String, default: '' }, // invoice #, receipt, etc.
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdByName: { type: String, default: '' },
}, { timestamps: true });

expenseSchema.index({ category: 1, date: -1 });
expenseSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Expense', expenseSchema);
