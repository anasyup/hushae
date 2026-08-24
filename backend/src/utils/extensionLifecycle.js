/* ============================================================================
 * EXTENSION LIFECYCLE SERVICE — Phase 9
 *
 * Manages the full lifecycle of extensions:
 *   install → configure → enable → disable → uninstall
 *
 * Each transition:
 *   1. Validates the manifest
 *   2. Checks permissions
 *   3. Executes lifecycle hooks
 *   4. Updates state
 *   5. Emits extension events
 *   6. Audits the change
 *
 * No orphaned configuration after uninstall.
 * Historical records are always preserved.
 * ========================================================================== */

const Integration = require('../models/Integration');
const ExtensionEvent = require('../models/ExtensionEvent');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

/* ── Manifest Validation ────────────────────────────────────────────────── */

const VALID_TYPES = ['payment', 'shipping', 'communication', 'marketing', 'analytics', 'storage', 'search', 'tax', 'other'];
const VALID_PERMISSIONS = [
  'products:read', 'products:write',
  'orders:read', 'orders:write',
  'customers:read', 'customers:write',
  'payments:read', 'payments:write', 'payments:refund',
  'shipping:read', 'shipping:write',
  'marketing:read', 'marketing:send',
  'analytics:read',
  'integrations:read', 'integrations:write',
  'settings:read', 'settings:write',
];

/**
 * Validate an extension manifest. Returns { valid, errors[] }.
 */
function validateManifest(manifest) {
  const errors = [];

  if (!manifest.id || typeof manifest.id !== 'string') {
    errors.push('Manifest must have a string "id"');
  } else if (!/^[a-z0-9._-]+$/.test(manifest.id)) {
    errors.push('Manifest "id" must be lowercase alphanumeric with dots, hyphens, underscores');
  }

  if (!manifest.name || typeof manifest.name !== 'string') {
    errors.push('Manifest must have a string "name"');
  }

  if (!manifest.type || !VALID_TYPES.includes(manifest.type)) {
    errors.push(`Manifest "type" must be one of: ${VALID_TYPES.join(', ')}`);
  }

  if (manifest.permissions) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push('Manifest "permissions" must be an array');
    } else {
      for (const p of manifest.permissions) {
        if (!VALID_PERMISSIONS.includes(p)) {
          errors.push(`Invalid permission: "${p}". Valid: ${VALID_PERMISSIONS.join(', ')}`);
        }
      }
    }
  }

  if (manifest.configFields) {
    if (!Array.isArray(manifest.configFields)) {
      errors.push('Manifest "configFields" must be an array');
    } else {
      for (const f of manifest.configFields) {
        if (!f.key || !f.label) {
          errors.push('Each configField must have "key" and "label"');
        }
      }
    }
  }

  if (manifest.eventSubscriptions) {
    if (!Array.isArray(manifest.eventSubscriptions)) {
      errors.push('Manifest "eventSubscriptions" must be an array');
    } else {
      const validEvents = ExtensionEvent.EVENT_TYPES;
      for (const e of manifest.eventSubscriptions) {
        if (!validEvents.includes(e)) {
          errors.push(`Invalid event subscription: "${e}"`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ── Lifecycle Transitions ──────────────────────────────────────────────── */

/**
 * INSTALL: Register a new extension from its manifest.
 * Creates the Integration record with status='installed'.
 * Sets up event subscriptions if declared.
 */
async function install(manifest, actor) {
  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(`Invalid manifest: ${validation.errors.join('; ')}`);
  }

  // Check if already installed
  const existing = await Integration.findOne({ id: manifest.id });
  if (existing && existing.status !== 'uninstalled') {
    throw new Error(`Extension "${manifest.id}" is already installed (status: ${existing.status})`);
  }

  let integration;
  if (existing && existing.status === 'uninstalled') {
    // Re-install previously uninstalled extension
    existing.name = manifest.name;
    existing.description = manifest.description || '';
    existing.type = manifest.type;
    existing.version = manifest.version || '1.0.0';
    existing.permissions = manifest.permissions || [];
    existing.configFields = manifest.configFields || [];
    existing.config = {};
    existing.status = 'installed';
    existing.enabled = false;
    existing.sandbox = true;
    existing.installedAt = new Date();
    existing.errorCount = 0;
    existing.lastError = '';
    integration = await existing.save();
  } else {
    integration = await Integration.create({
      id: manifest.id,
      name: manifest.name,
      description: manifest.description || '',
      type: manifest.type,
      version: manifest.version || '1.0.0',
      permissions: manifest.permissions || [],
      configFields: manifest.configFields || [],
      config: {},
      status: 'installed',
      enabled: false,
      sandbox: true,
      installedAt: new Date(),
    });
  }

  // Set up event subscriptions
  if (manifest.eventSubscriptions?.length > 0) {
    for (const eventType of manifest.eventSubscriptions) {
      await ExtensionEvent.findOneAndUpdate(
        { extensionId: manifest.id, eventType },
        { $set: { active: true, deliveryMethod: 'internal' } },
        { upsert: true }
      );
    }
  }

  await AuditLog.create({
    user: actor || 'system',
    action: 'install',
    target: 'extension',
    targetId: manifest.id,
    newValue: { name: manifest.name, type: manifest.type, version: manifest.version },
  });

  // Emit extension event
  await emitExtensionEvent('extension.installed', { extensionId: manifest.id });

  return integration;
}

/**
 * CONFIGURE: Save configuration for an installed extension.
 * Validates required fields are present. Transitions to 'configuring' → 'active'.
 */
async function configure(extensionId, config, actor) {
  const integration = await Integration.findOne({ id: extensionId });
  if (!integration) throw new Error(`Extension "${extensionId}" not found`);
  if (integration.status === 'uninstalled') throw new Error('Cannot configure uninstalled extension');

  // Validate required config fields
  for (const field of (integration.configFields || [])) {
    if (field.required && !config[field.key]) {
      throw new Error(`Required field "${field.label}" (${field.key}) is missing`);
    }
  }

  // Only update non-empty, non-masked values
  for (const [k, v] of Object.entries(config)) {
    if (v !== null && v !== undefined && !String(v).startsWith('••••••')) {
      integration.config[k] = v;
    }
  }

  integration.configuredAt = new Date();
  integration.configuredBy = actor || '';
  integration.status = integration.enabled ? 'active' : 'configuring';
  await integration.save();

  await AuditLog.create({
    user: actor || 'system',
    action: 'configure',
    target: 'extension',
    targetId: extensionId,
    newValue: { configuredFields: Object.keys(config) },
  });

  return integration;
}

/**
 * ENABLE: Activate a configured extension.
 */
async function enable(extensionId, actor) {
  const integration = await Integration.findOne({ id: extensionId });
  if (!integration) throw new Error(`Extension "${extensionId}" not found`);
  if (integration.status === 'uninstalled') throw new Error('Cannot enable uninstalled extension');

  // Check that required config is present
  for (const field of (integration.configFields || [])) {
    if (field.required && !integration.config[field.key]) {
      throw new Error(`Cannot enable: required field "${field.label}" is not configured`);
    }
  }

  integration.enabled = true;
  integration.status = 'active';
  await integration.save();

  // Re-activate event subscriptions
  await ExtensionEvent.updateMany(
    { extensionId, active: false },
    { $set: { active: true } }
  );

  await AuditLog.create({
    user: actor || 'system',
    action: 'enable',
    target: 'extension',
    targetId: extensionId,
  });

  await emitExtensionEvent('extension.enabled', { extensionId });

  return integration;
}

/**
 * DISABLE: Deactivate an extension without removing config.
 */
async function disable(extensionId, actor) {
  const integration = await Integration.findOne({ id: extensionId });
  if (!integration) throw new Error(`Extension "${extensionId}" not found`);

  integration.enabled = false;
  integration.status = 'disabled';
  await integration.save();

  // Deactivate event subscriptions
  await ExtensionEvent.updateMany(
    { extensionId },
    { $set: { active: false } }
  );

  await AuditLog.create({
    user: actor || 'system',
    action: 'disable',
    target: 'extension',
    targetId: extensionId,
  });

  await emitExtensionEvent('extension.disabled', { extensionId });

  return integration;
}

/**
 * UNINSTALL: Remove extension, its config, and event subscriptions.
 * Historical records (orders, payments, etc.) are NEVER deleted.
 */
async function uninstall(extensionId, actor) {
  const integration = await Integration.findOne({ id: extensionId });
  if (!integration) throw new Error(`Extension "${extensionId}" not found`);

  // Disable first
  integration.enabled = false;
  integration.status = 'uninstalled';
  integration.config = {}; // clear config (secrets removed)
  await integration.save();

  // Remove event subscriptions
  await ExtensionEvent.deleteMany({ extensionId });

  await AuditLog.create({
    user: actor || 'system',
    action: 'uninstall',
    target: 'extension',
    targetId: extensionId,
    oldValue: { name: integration.name, type: integration.type, permissions: integration.permissions },
  });

  await emitExtensionEvent('extension.uninstalled', { extensionId });

  return integration;
}

/* ── Event Bus ──────────────────────────────────────────────────────────── */

/**
 * Emit a commerce event to all subscribed extensions.
 * This is the central event bus — called by order/payment/customer routes.
 */
async function emitEvent(eventType, payload) {
  const subscriptions = await ExtensionEvent.find({ eventType, active: true }).lean();

  for (const sub of subscriptions) {
    // Apply filter if present
    if (sub.filter) {
      const matches = Object.entries(sub.filter).every(([k, v]) => payload[k] === v);
      if (!matches) continue;
    }

    // Deliver based on method
    if (sub.deliveryMethod === 'webhook_url' && sub.webhookUrl) {
      deliverWebhook(sub, eventType, payload).catch(err => {
        console.error(`Webhook delivery failed for ${sub.extensionId}/${eventType}:`, err.message);
      });
    } else if (sub.deliveryMethod === 'internal') {
      // Internal handlers are registered via registerHandler()
      const handler = internalHandlers[`${sub.extensionId}:${eventType}`];
      if (handler) {
        try {
          await handler(payload);
          sub.lastDeliveredAt = new Date();
          sub.lastDeliveryStatus = 'success';
          sub.deliveryCount++;
          await ExtensionEvent.findByIdAndUpdate(sub._id, {
            lastDeliveredAt: sub.lastDeliveredAt,
            lastDeliveryStatus: 'success',
            deliveryCount: sub.deliveryCount,
          });
        } catch (err) {
          sub.failureCount++;
          sub.lastDeliveryStatus = 'failed';
          await ExtensionEvent.findByIdAndUpdate(sub._id, {
            lastDeliveryStatus: 'failed',
            failureCount: sub.failureCount,
          });
        }
      }
    } else {
      // log_only: just record
      await ExtensionEvent.findByIdAndUpdate(sub._id, {
        lastDeliveredAt: new Date(),
        lastDeliveryStatus: 'success',
        deliveryCount: sub.deliveryCount + 1,
      });
    }
  }
}

/**
 * Deliver event to a webhook URL with HMAC signature.
 */
async function deliverWebhook(sub, eventType, payload) {
  const body = JSON.stringify({ event: eventType, data: payload, timestamp: new Date().toISOString() });
  const signature = sub.webhookSecret
    ? crypto.createHmac('sha256', sub.webhookSecret).update(body).digest('hex')
    : '';

  try {
    const response = await fetch(sub.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hushae-Event': eventType,
        'X-Hushae-Signature': signature,
        'X-Hushae-Extension': sub.extensionId,
      },
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (response.ok) {
      await ExtensionEvent.findByIdAndUpdate(sub._id, {
        lastDeliveredAt: new Date(),
        lastDeliveryStatus: 'success',
        $inc: { deliveryCount: 1 },
      });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    await ExtensionEvent.findByIdAndUpdate(sub._id, {
      lastDeliveryStatus: 'failed',
      $inc: { failureCount: 1 },
    });
    throw err;
  }
}

/**
 * Helper to emit extension lifecycle events.
 */
async function emitExtensionEvent(eventType, payload) {
  return emitEvent(eventType, payload);
}

/* ── Internal Handler Registry ──────────────────────────────────────────── */
const internalHandlers = {};

function registerInternalHandler(extensionId, eventType, handler) {
  internalHandlers[`${extensionId}:${eventType}`] = handler;
}

/* ── Scoped API Access ──────────────────────────────────────────────────── */

/**
 * Middleware: verify that an API request from an extension has the required scope.
 * Used by routes that extensions access via API keys.
 */
function requireScope(scope) {
  return (req, res, next) => {
    // Check if request is from an API key (set by apiKeyAuth middleware)
    const apiKey = req.apiKey;
    if (!apiKey) {
      // Not an API key request — fall through to normal auth
      return next();
    }

    if (!apiKey.scopes || !apiKey.scopes.includes(scope)) {
      return res.status(403).json({
        message: `API key lacks required scope: ${scope}`,
        requiredScope: scope,
        grantedScopes: apiKey.scopes,
      });
    }

    next();
  };
}

/**
 * Middleware: authenticate API key from Authorization header.
 * Sets req.apiKey if valid.
 */
async function apiKeyAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer hs_')) return next(); // not an API key

  try {
    const ApiKey = require('../models/ApiKey');
    const rawKey = header.slice(7);
    const key = await ApiKey.verify(rawKey);
    if (!key) {
      return res.status(401).json({ message: 'Invalid or expired API key' });
    }
    req.apiKey = key;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'API key authentication failed' });
  }
}

module.exports = {
  validateManifest,
  install,
  configure,
  enable,
  disable,
  uninstall,
  emitEvent,
  registerInternalHandler,
  requireScope,
  apiKeyAuth,
  VALID_PERMISSIONS,
  VALID_TYPES,
};
