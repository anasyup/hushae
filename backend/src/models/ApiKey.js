const mongoose = require('mongoose');
const crypto = require('crypto');

/* ============================================================================
 * API KEY MODEL — Phase 9: Scoped API key management
 * Keys are shown once on creation, then only the prefix is stored/displayed.
 * ========================================================================== */

const apiKeySchema = new mongoose.Schema({
  name: { type: String, required: true },
  keyPrefix: { type: String, required: true }, // first 8 chars for display
  keyHash: { type: String, required: true, unique: true, index: true },
  scopes: { type: [String], default: [] }, // e.g. ['products:read', 'orders:read']
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdByName: { type: String, default: '' },
  lastUsedAt: { type: Date, default: null },
  lastUsedFrom: { type: String, default: '' },
  active: { type: Boolean, default: true, index: true },
  expiresAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });

// Generate a new API key — returns the plaintext ONCE
apiKeySchema.statics.generate = function(name, scopes, user) {
  const raw = 'hs_' + crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const keyPrefix = raw.slice(0, 12);
  return {
    doc: {
      name, keyPrefix, keyHash, scopes,
      createdBy: user?._id || null,
      createdByName: user?.name || user?.email || '',
    },
    plaintext: raw,
  };
};

// Verify a raw key against stored hash
apiKeySchema.statics.verify = async function(rawKey) {
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const key = await this.findOne({ keyHash: hash, active: true });
  if (!key) return null;
  if (key.expiresAt && key.expiresAt < new Date()) return null;
  // Update last used (non-blocking)
  key.lastUsedAt = new Date();
  key.save().catch(() => {});
  return key;
};

apiKeySchema.statics.SCOPES = [
  'products:read', 'products:write',
  'orders:read', 'orders:write',
  'customers:read', 'customers:write',
  'payments:read', 'payments:write',
  'shipping:read', 'shipping:write',
  'marketing:read', 'marketing:send',
  'analytics:read',
  'integrations:read', 'integrations:write',
];

module.exports = mongoose.model('ApiKey', apiKeySchema);
