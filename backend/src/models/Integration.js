const mongoose = require('mongoose');

/* ============================================================================
 * INTEGRATION REGISTRY — Phase 9: Central integration management
 *
 * Every payment gateway, shipping provider, communication channel, and
 * future app is registered here with manifest, permissions, and lifecycle.
 * ========================================================================== */

const TYPES = ['payment', 'shipping', 'communication', 'marketing', 'analytics', 'storage', 'search', 'tax', 'other'];
const STATUSES = ['installed', 'configuring', 'active', 'disabled', 'error', 'uninstalled'];

const integrationSchema = new mongoose.Schema({
  // Identity
  id: { type: String, required: true, unique: true, index: true }, // e.g. 'jazzcash', 'safepay', 'whatsapp'
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: TYPES, required: true, index: true },
  version: { type: String, default: '1.0.0' },
  icon: { type: String, default: '' }, // icon name or URL

  // Permissions declared by this integration
  permissions: { type: [String], default: [] }, // e.g. ['payments:read', 'payments:write']

  // Configuration
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
  configFields: [{
    key: String,
    label: String,
    type: { type: String, enum: ['text', 'password', 'select', 'boolean'], default: 'text' },
    required: { type: Boolean, default: false },
    options: [String], // for select type
    hint: String,
  }],

  // Lifecycle
  status: { type: String, enum: STATUSES, default: 'installed', index: true },
  enabled: { type: Boolean, default: false },
  sandbox: { type: Boolean, default: true },

  // Health
  lastSuccess: { type: Date, default: null },
  lastError: { type: String, default: '' },
  lastErrorAt: { type: Date, default: null },
  errorCount: { type: Number, default: 0 },
  webhookHealthy: { type: Boolean, default: null }, // null = unknown

  // Audit
  installedAt: { type: Date, default: Date.now },
  configuredAt: { type: Date, default: null },
  configuredBy: { type: String, default: '' },
}, { timestamps: true });

integrationSchema.statics.TYPES = TYPES;
integrationSchema.statics.STATUSES = STATUSES;

// Seed built-in integrations
integrationSchema.statics.SEED = [
  {
    id: 'cod', name: 'Cash on Delivery', type: 'payment',
    description: 'Manual cash payment collected at delivery.',
    permissions: ['payments:read'], status: 'active', enabled: true, sandbox: false,
  },
  {
    id: 'jazzcash', name: 'JazzCash', type: 'payment',
    description: 'JazzCash hosted checkout for mobile wallets and cards.',
    permissions: ['payments:read', 'payments:write'], status: 'installed',
    configFields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'integritySalt', label: 'Integrity Salt', type: 'password', required: true },
      { key: 'sandbox', label: 'Sandbox Mode', type: 'boolean' },
    ],
  },
  {
    id: 'safepay', name: 'SafePay (Visa/Mastercard)', type: 'payment',
    description: 'Card payments via SafePay gateway.',
    permissions: ['payments:read', 'payments:write'], status: 'installed',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'secret', label: 'Secret', type: 'password', required: true },
      { key: 'sandbox', label: 'Sandbox Mode', type: 'boolean' },
    ],
  },
  {
    id: 'bank_transfer', name: 'Bank Transfer', type: 'payment',
    description: 'Manual bank transfer with admin verification.',
    permissions: ['payments:read'], status: 'active', enabled: true, sandbox: false,
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business', type: 'communication',
    description: 'WhatsApp messaging via Meta Cloud API.',
    permissions: ['customers:read', 'marketing:send'], status: 'installed',
    configFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'webhookVerifyToken', label: 'Webhook Verify Token', type: 'password' },
    ],
  },
  {
    id: 'smtp_email', name: 'SMTP Email', type: 'communication',
    description: 'Transactional and marketing email via SMTP.',
    permissions: ['customers:read', 'marketing:send'], status: 'installed',
    configFields: [
      { key: 'host', label: 'SMTP Host', type: 'text', required: true },
      { key: 'port', label: 'Port', type: 'text', required: true },
      { key: 'user', label: 'Username', type: 'text', required: true },
      { key: 'pass', label: 'Password', type: 'password', required: true },
      { key: 'from', label: 'From Address', type: 'text', required: true },
    ],
  },
  {
    id: 'manual_shipping', name: 'Manual Shipping', type: 'shipping',
    description: 'Manual shipping rates configured by country/city.',
    permissions: ['shipping:read', 'shipping:write'], status: 'active', enabled: true, sandbox: false,
  },
];

module.exports = mongoose.model('Integration', integrationSchema);
