const mongoose = require('mongoose');

// First-party, privacy-friendly visit events (no cookies, no personal data — only an anonymous session id)
const pageViewSchema = new mongoose.Schema({
  sid: { type: String, required: true, index: true },      // anonymous browser-session id
  event: { type: String, enum: ['pageview', 'cart', 'checkout'], default: 'pageview', index: true },
  path: { type: String, default: '/' },
  referrer: { type: String, default: '' },
  device: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
  country: { type: String, default: '' },
  city: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

// Keep the free database light — auto-remove events older than 45 days
pageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 45 * 24 * 60 * 60 });

module.exports = mongoose.model('PageView', pageViewSchema);
