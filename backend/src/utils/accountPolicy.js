/* ============================================================================
 * ACCOUNT POLICY
 *
 * One place that answers "what are this store's account rules right now?".
 * Both the storefront and the API validate against the SAME merchant-set
 * policy — but the server is authoritative, because the client copy can be
 * edited in a browser console.
 *
 * Defaults here are byte-identical to the `account` block in
 * models/Settings.js. If they ever drift, a store that has never opened the
 * admin page would be validated against different rules than it displays.
 * ========================================================================== */

const ACCOUNT_DEFAULTS = {
  registrationEnabled: true,
  emailFeatures: false,
  emailVerifyRequired: false,
  passwordMinLength: 8,
  passwordRequireLetter: true,
  passwordRequireNumber: false,
  passwordRequireSymbol: false,
  rememberMeDays: 30,
  sessionDays: 2,
  avatarEnabled: true,
  phoneRequired: true,
  maxAddresses: 5,
  allowDeleteAccount: true,
  showWishlist: true,
  showRecentlyViewed: true,
  showSessions: true,
  showNotifications: true,
  allowReorder: true,
  allowCancelRequest: true,
  allowReturnRequest: true,
  allowInvoice: true,
};

/** Resolve the merchant's account policy, falling back to the defaults. */
async function getAccountPolicy() {
  try {
    const Settings = require('../models/Settings');
    const s = await Settings.findOne({ key: 'store' }).lean();
    const a = (s && s.account) || {};
    const out = { ...ACCOUNT_DEFAULTS };
    for (const k of Object.keys(ACCOUNT_DEFAULTS)) {
      if (a[k] !== undefined && a[k] !== null && a[k] !== '') out[k] = a[k];
    }
    return out;
  } catch {
    return { ...ACCOUNT_DEFAULTS };
  }
}

/**
 * Is email actually deliverable right now?
 *
 * Two things must both be true: the merchant switched the feature on, AND a
 * transport is really configured. Without the second check "we sent you a
 * reset link" would be a lie — the mailer logs to console and returns
 * `{ skipped: true }` when SMTP is missing.
 */
async function canSendEmail() {
  const policy = await getAccountPolicy();
  if (!policy.emailFeatures) return { ok: false, reason: 'disabled' };

  const envReady = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  if (envReady) return { ok: true, policy };

  try {
    const Settings = require('../models/Settings');
    const s = await Settings.findOne({ key: 'store' }).lean();
    const cfg = (s && s.integrations && s.integrations.email) || {};
    if (cfg.host && cfg.user && cfg.pass) return { ok: true, policy };
  } catch { /* noop */ }

  return { ok: false, reason: 'smtp' };
}

/** Validate a password against the merchant's policy. Returns '' when valid. */
function checkPassword(pw, policy) {
  const s = String(pw || '');
  const min = Number(policy.passwordMinLength) || 8;
  if (s.length < min) return `Password must be at least ${min} characters`;
  if (policy.passwordRequireLetter && !/[a-zA-Z]/.test(s)) return 'Password must include at least one letter';
  if (policy.passwordRequireNumber && !/[0-9]/.test(s)) return 'Password must include at least one number';
  if (policy.passwordRequireSymbol && !/[^a-zA-Z0-9]/.test(s)) return 'Password must include at least one symbol';
  return '';
}

module.exports = { ACCOUNT_DEFAULTS, getAccountPolicy, canSendEmail, checkPassword };
