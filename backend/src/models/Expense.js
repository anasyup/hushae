const mongoose = require('mongoose');

/* ============================================================================
 * EXPENSE — money that left the business but is not tied to a single order.
 *
 * Why this model exists: before it, the only way to record rent, salaries, a
 * photoshoot or a one-off purchase was the monthly lump sums in
 * Settings.operatingCosts (monthlyMarketing / monthlySeo / monthlyOther).
 * Those are estimates entered in advance, so net profit could never be more
 * than an estimate either. This is the actual record.
 *
 * It sits alongside — not on top of — the order-level costs in
 * utils/orderEconomics.js. COGS, packaging, courier and gateway fees stay
 * per order, because they genuinely are. Everything else lands here.
 * ========================================================================== */

/* Categories are a fixed list rather than free text so the P&L can group
 * reliably and the merchant cannot end up with "Rent", "rent" and "RENT" as
 * three separate lines. `other` is the escape hatch and asks for a label. */
const CATEGORIES = [
  'marketing',        // ads, influencer, boosted posts
  'seo',              // SEO tools, content, backlinks
  'rent',             // office / warehouse / shop
  'salaries',         // staff, freelancers on retainer
  'utilities',        // electricity, internet, phone
  'software',         // SaaS, hosting, domains, apps
  'packaging',        // bulk material buys (not the per-order rate)
  'logistics',        // courier account fees, warehouse handling
  'photoshoot',       // photography, models, studio
  'legal',            // registration, accountant, legal
  'bank',             // account fees, transfer charges
  'maintenance',      // repairs, equipment
  'other',
];

const expenseSchema = new mongoose.Schema({
  /* When the money actually left. Not createdAt — an expense is often entered
   * days after it happened, and the P&L has to file it in the right period. */
  date: { type: Date, required: true, index: true },

  category: { type: String, enum: CATEGORIES, default: 'other', index: true },
  /* Free label for the row, and mandatory in practice for `other`. */
  label: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },

  amount: { type: Number, required: true, min: 0 },

  /* How it was paid — kept separate from the customer-facing payment methods
   * because these are the business's own accounts. */
  paidVia: {
    type: String,
    enum: ['cash', 'bank', 'card', 'jazzcash', 'easypaisa', 'other'],
    default: 'bank',
  },

  /* Vendor / payee, and any reference the bank or receipt shows. These are
   * what make the row findable during reconciliation. */
  payee: { type: String, trim: true, default: '' },
  reference: { type: String, trim: true, default: '' },

  /* Recurring expenses are stored as one row per occurrence, not as a rule
   * that generates rows. A rule would silently invent history the merchant
   * never confirmed, and would keep firing after the contract ended. */
  recurring: {
    isRecurring: { type: Boolean, default: false },
    /* Human note only — "every 1st", "quarterly". Never used to generate rows. */
    note: { type: String, trim: true, default: '' },
  },

  /* Soft delete. An expense is an accounting record; hard-deleting one would
   * quietly change a P&L somebody may already have exported. */
  isVoid: { type: Boolean, default: false },
  voidReason: { type: String, trim: true, default: '' },
  voidedAt: { type: Date },

  createdBy: { type: String, default: '' },
}, { timestamps: true });

expenseSchema.index({ date: -1, category: 1 });

expenseSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Expense', expenseSchema);
