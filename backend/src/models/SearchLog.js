const mongoose = require('mongoose');

/**
 * One row per search a shopper actually performs.
 *
 * Kept as raw rows rather than a running counter for one reason: a counter can
 * answer "how often was this searched" and nothing else. Rows can answer
 * "which searches found nothing last week", "did anyone click the results",
 * and "did that click become an order" — which is what decides whether the
 * merchant should stock something.
 *
 * `normalized` is what the analytics group by: "Cotton Brief", "cotton brief "
 * and "COTTON  BRIEF" are one keyword, not three.
 *
 * Nothing here identifies a person. The session id is a random client-side
 * token used only to stitch a query to the click that followed it.
 */
const searchLogSchema = new mongoose.Schema({
  term:       { type: String, required: true },          // as typed
  normalized: { type: String, required: true, index: true },
  results:    { type: Number, default: 0 },
  // Denormalised so a zero-result report is one indexed query, not a scan.
  zeroResult: { type: Boolean, default: false, index: true },

  // Did this search lead anywhere?
  clicked:        { type: Boolean, default: false, index: true },
  clickedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
  clickedAt:      { type: Date, default: null },
  clickPosition:  { type: Number, default: 0 },          // 1-based rank clicked

  // Did the click become an order? Filled in by the order route.
  converted:   { type: Boolean, default: false, index: true },
  orderNumber: { type: String, default: '' },

  source:    { type: String, default: 'search' },        // search | suggest | assistant
  session:   { type: String, default: '', index: true }, // anonymous
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  device:    { type: String, default: '' },              // mobile | tablet | desktop
  usedFuzzy: { type: Boolean, default: false },
  usedSynonym: { type: Boolean, default: false },
}, { timestamps: true });

/* Reporting is always "recent first, grouped by term", so the index matches
   that shape rather than being one index per field. */
searchLogSchema.index({ createdAt: -1 });
searchLogSchema.index({ normalized: 1, createdAt: -1 });
searchLogSchema.index({ zeroResult: 1, createdAt: -1 });

module.exports = mongoose.model('SearchLog', searchLogSchema);
