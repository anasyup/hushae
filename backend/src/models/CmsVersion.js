const mongoose = require('mongoose');

/**
 * A snapshot of a page, taken on every publish.
 *
 * Separate collection rather than an array on the page, for the reason the
 * loyalty ledger and search logs are also separate: an embedded array grows
 * without bound and rewrites the whole parent document on every save. A page
 * published twice a week for two years is 200 revisions of a section tree
 * being rewritten each time someone fixes a typo.
 *
 * Snapshots are immutable. Restoring copies a version back onto the page as a
 * DRAFT rather than publishing it — an accidental restore should not change
 * what a customer is reading.
 */
const cmsVersionSchema = new mongoose.Schema({
  page:      { type: mongoose.Schema.Types.ObjectId, ref: 'CmsPage', required: true, index: true },
  // Snapshotted so a version stays readable after the page is renamed.
  pageSlug:  { type: String, default: '' },
  pageTitle: { type: String, default: '' },
  label:     { type: String, default: '' },

  doc:  { type: mongoose.Schema.Types.Mixed, default: null },
  body: { type: String, default: '' },
  seo:  { type: mongoose.Schema.Types.Mixed, default: {} },

  createdBy: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false }, minimize: false });

cmsVersionSchema.index({ page: 1, createdAt: -1 });

module.exports = mongoose.model('CmsVersion', cmsVersionSchema);
