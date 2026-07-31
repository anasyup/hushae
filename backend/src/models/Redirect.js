const mongoose = require('mongoose');

/**
 * A URL redirect.
 *
 * The reason this exists at all: renaming a page's slug silently breaks every
 * link to it — Google's index, a WhatsApp message a customer saved, an
 * influencer's bio. The slug manager writes one of these automatically on
 * every rename, so the old address keeps working. That is the difference
 * between a CMS and a text box.
 *
 * `hits` is incremented so a merchant can see which redirects are load-bearing
 * and which are dead weight.
 */
const redirectSchema = new mongoose.Schema({
  // Both stored without a leading slash and lowercased, so /Privacy, /privacy
  // and privacy are one entry rather than three.
  from: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  to:   { type: String, required: true, trim: true },

  /* 301 tells search engines the move is permanent and passes ranking; 302
     says it is temporary. Getting this wrong is the classic SEO own-goal, so
     the default is the safe permanent one for slug renames. */
  code: { type: Number, default: 301, enum: [301, 302, 307, 308] },

  active: { type: Boolean, default: true, index: true },
  /* Set when the slug manager creates it automatically, so the admin list can
     separate "I made this" from "this appeared when I renamed a page". */
  auto:   { type: Boolean, default: false },
  note:   { type: String, default: '' },

  hits:     { type: Number, default: 0 },
  lastHit:  { type: Date, default: null },
  createdBy:{ type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Redirect', redirectSchema);
