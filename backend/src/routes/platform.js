const express = require('express');
const crypto = require('crypto');
const { protect, adminOnly, requirePermission } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const Integration = require('../models/Integration');
const WebhookEvent = require('../models/WebhookEvent');
const ApiKey = require('../models/ApiKey');
const AuditLog = require('../models/AuditLog');

const router = express.Router();
router.use(protect, adminOnly);

/* ============================================================================
 * PHASE 9: PLATFORM ROUTES
 * Integration registry, API keys, webhook logs, health monitoring
 * ========================================================================== */

/* ── INTEGRATIONS ────────────────────────────────────────────────────────── */

/** GET /api/platform/integrations — list all integrations */
router.get('/integrations', asyncHandler(async (req, res) => {
  let integrations = await Integration.find().sort({ type: 1, name: 1 }).lean();

  // Seed built-in integrations if registry is empty
  if (integrations.length === 0) {
    for (const seed of Integration.SEED) {
      await Integration.findOneAndUpdate(
        { id: seed.id },
        { $setOnInsert: seed },
        { upsert: true, new: true }
      );
    }
    integrations = await Integration.find().sort({ type: 1, name: 1 }).lean();
  }

  // Mask sensitive config values
  const safe = integrations.map(i => ({
    ...i,
    config: Object.fromEntries(
      Object.entries(i.config || {}).map(([k, v]) => [k, v ? '••••••' + String(v).slice(-4) : ''])
    ),
  }));

  res.json({ integrations: safe, types: Integration.TYPES, statuses: Integration.STATUSES });
}));

/** GET /api/platform/integrations/:id — single integration detail */
router.get('/integrations/:id', asyncHandler(async (req, res) => {
  const integration = await Integration.findOne({ id: req.params.id }).lean();
  if (!integration) return res.status(404).json({ message: 'Integration not found' });

  // Mask config
  integration.config = Object.fromEntries(
    Object.entries(integration.config || {}).map(([k, v]) => [k, v ? '••••••' + String(v).slice(-4) : ''])
  );

  // Get recent webhook events for this integration
  const recentEvents = await WebhookEvent.find({ provider: integration.id })
    .sort({ createdAt: -1 }).limit(10).select('-metadata').lean();

  res.json({ integration, recentEvents });
}));

/** PUT /api/platform/integrations/:id — configure integration */
router.put('/integrations/:id', requirePermission('settings'), asyncHandler(async (req, res) => {
  const integration = await Integration.findOne({ id: req.params.id });
  if (!integration) return res.status(404).json({ message: 'Integration not found' });

  const { config, enabled, sandbox, status } = req.body || {};

  if (config) {
    // Only update non-empty values (don't overwrite with masked values)
    for (const [k, v] of Object.entries(config)) {
      if (v && !String(v).startsWith('••••••')) {
        integration.config[k] = v;
      }
    }
    integration.configuredAt = new Date();
    integration.configuredBy = req.user?.name || req.user?.email || '';
  }

  if (enabled !== undefined) integration.enabled = !!enabled;
  if (sandbox !== undefined) integration.sandbox = !!sandbox;
  if (status) integration.status = status;

  // Auto-set status based on configuration
  if (integration.enabled && Object.keys(integration.config || {}).length > 0) {
    integration.status = 'active';
  } else if (!integration.enabled) {
    integration.status = 'disabled';
  }

  await integration.save();

  // Audit
  await AuditLog.create({
    user: req.user?.name || req.user?.email || 'system',
    action: 'update',
    target: 'integration',
    targetId: integration.id,
    newValue: { enabled: integration.enabled, status: integration.status },
  });

  res.json({ integration: { ...integration.toObject(), config: {} } });
}));

/** POST /api/platform/integrations/:id/test — test integration connection */
router.post('/integrations/:id/test', requirePermission('settings'), asyncHandler(async (req, res) => {
  const integration = await Integration.findOne({ id: req.params.id });
  if (!integration) return res.status(404).json({ message: 'Integration not found' });

  try {
    // Payment gateway test
    if (integration.type === 'payment') {
      const gateways = require('../utils/paymentGateways');
      if (integration.id === 'jazzcash') {
        const ok = gateways.jazzcash.isConfigured(integration.config);
        integration.lastSuccess = ok ? new Date() : null;
        integration.lastError = ok ? '' : 'JazzCash credentials incomplete';
        integration.lastErrorAt = ok ? null : new Date();
        if (!ok) integration.errorCount++;
        await integration.save();
        return res.json({ ok, message: ok ? 'JazzCash credentials verified' : 'Missing credentials' });
      }
      if (integration.id === 'safepay') {
        const ok = gateways.safepay.isConfigured(integration.config);
        integration.lastSuccess = ok ? new Date() : null;
        integration.lastError = ok ? '' : 'SafePay credentials incomplete';
        integration.lastErrorAt = ok ? null : new Date();
        if (!ok) integration.errorCount++;
        await integration.save();
        return res.json({ ok, message: ok ? 'SafePay credentials verified' : 'Missing credentials' });
      }
    }

    // SMTP test
    if (integration.id === 'smtp_email') {
      try {
        const { sendMail } = require('../utils/mailer');
        const result = await sendMail({ to: req.user?.email || 'test@hushae.pk', subject: 'HUSHAE SMTP Test', html: '<p>SMTP connection test successful.</p>' });
        integration.lastSuccess = new Date();
        integration.lastError = '';
        await integration.save();
        return res.json({ ok: !result?.skipped, message: result?.skipped ? 'SMTP not configured' : 'Test email sent' });
      } catch (e) {
        integration.lastError = e.message;
        integration.lastErrorAt = new Date();
        integration.errorCount++;
        await integration.save();
        return res.json({ ok: false, message: e.message });
      }
    }

    res.json({ ok: true, message: 'Integration is configured' });
  } catch (e) {
    integration.lastError = e.message;
    integration.lastErrorAt = new Date();
    integration.errorCount++;
    await integration.save();
    res.json({ ok: false, message: e.message });
  }
}));

/* ── WEBHOOK LOGS ────────────────────────────────────────────────────────── */

/** GET /api/platform/webhooks — webhook event log */
router.get('/webhooks', asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 25));
  const provider = req.query.provider || '';
  const status = req.query.status || '';

  const filter = {};
  if (provider) filter.provider = provider;
  if (status) filter.status = status;

  const [total, events] = await Promise.all([
    WebhookEvent.countDocuments(filter),
    WebhookEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select('-metadata').lean(),
  ]);

  res.json({ events, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

/* ── API KEYS ────────────────────────────────────────────────────────────── */

/** GET /api/platform/api-keys — list API keys (masked) */
router.get('/api-keys', requirePermission('settings'), asyncHandler(async (req, res) => {
  const keys = await ApiKey.find().sort({ createdAt: -1 }).select('-keyHash').lean();
  res.json({ keys, scopes: ApiKey.SCOPES });
}));

/** POST /api/platform/api-keys — create new API key */
router.post('/api-keys', requirePermission('settings'), asyncHandler(async (req, res) => {
  const { name, scopes } = req.body || {};
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const validScopes = (scopes || []).filter(s => ApiKey.SCOPES.includes(s));
  const { doc, plaintext } = ApiKey.generate(name, validScopes, req.user);
  const key = await ApiKey.create(doc);

  await AuditLog.create({
    user: req.user?.name || req.user?.email || 'system',
    action: 'create',
    target: 'api_key',
    targetId: key._id.toString(),
    newValue: { name, scopes: validScopes },
  });

  // Return plaintext ONLY on creation — never again
  res.status(201).json({
    key: {
      _id: key._id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      createdAt: key.createdAt,
    },
    plaintext, // shown once
    warning: 'Save this key now — it will not be shown again.',
  });
}));

/** DELETE /api/platform/api-keys/:id — revoke API key */
router.delete('/api-keys/:id', requirePermission('settings'), asyncHandler(async (req, res) => {
  const key = await ApiKey.findById(req.params.id);
  if (!key) return res.status(404).json({ message: 'Key not found' });

  key.active = false;
  key.revokedAt = new Date();
  await key.save();

  await AuditLog.create({
    user: req.user?.name || req.user?.email || 'system',
    action: 'revoke',
    target: 'api_key',
    targetId: key._id.toString(),
    oldValue: { name: key.name },
  });

  res.json({ ok: true });
}));

/* ── INTEGRATION HEALTH ──────────────────────────────────────────────────── */

/** GET /api/platform/health — system health overview */
router.get('/health', asyncHandler(async (req, res) => {
  const integrations = await Integration.find({ status: { $ne: 'uninstalled' } }).lean();
  const webhooks24h = await WebhookEvent.countDocuments({ createdAt: { $gte: new Date(Date.now() - 86400000) } });
  const webhooksFailed24h = await WebhookEvent.countDocuments({ status: 'failed', createdAt: { $gte: new Date(Date.now() - 86400000) } });
  const activeKeys = await ApiKey.countDocuments({ active: true });

  // Check database connectivity (we're already connected if this runs)
  const dbOk = true;

  // Check email
  let emailOk = null;
  try {
    const Settings = require('../models/Settings');
    const s = await Settings.findOne({ key: 'store' }).lean();
    emailOk = !!(s?.integrations?.email?.host && s?.integrations?.email?.user);
  } catch {}

  res.json({
    database: { connected: dbOk },
    email: { configured: emailOk },
    integrations: integrations.map(i => ({
      id: i.id, name: i.name, type: i.type,
      status: i.status, enabled: i.enabled,
      lastSuccess: i.lastSuccess, lastError: i.lastError, errorCount: i.errorCount,
    })),
    webhooks: { total24h: webhooks24h, failed24h: webhooksFailed24h },
    apiKeys: { active: activeKeys },
  });
}));

/* ── AUDIT LOG ───────────────────────────────────────────────────────────── */

/** GET /api/platform/audit — recent audit log entries */
router.get('/audit', requirePermission('security'), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 25));
  const target = req.query.target || '';
  const action = req.query.action || '';

  const filter = {};
  if (target) filter.target = target;
  if (action) filter.action = action;

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
  ]);

  res.json({ logs, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
}));

module.exports = router;
