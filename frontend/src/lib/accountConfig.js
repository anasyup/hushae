/* ============================================================================
 * ACCOUNT CONFIG
 *
 * Same contract as cartConfig / checkoutConfig: these defaults are identical
 * to the `account` block in backend/src/models/Settings.js, so the first paint
 * already matches the merchant's saved rules and nothing flashes while
 * /settings is in flight.
 *
 * IMPORTANT — two sources, on purpose:
 *   · settings.account  → what the merchant WANTS (rendered immediately)
 *   · /auth/policy      → what the server can actually DO right now
 *
 * They differ in one place that matters: `emailFeatures`. The merchant can
 * switch it on, but if no SMTP transport is configured the server will refuse
 * to pretend it sent anything. The UI must trust the server's answer, never
 * the merchant's intention, or it will show "check your inbox" for an email
 * that was never sent.
 * ========================================================================== */

export const ACCOUNT_DEFAULTS = {
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

  signInTitle: 'Your account',
  signInSubtitle: 'Sign in for order history, saved addresses and faster checkout.',
  welcomeGreeting: 'Welcome back',
  guestNote: 'Accounts are optional — guest checkout always works.',
};

/** Merge the merchant's saved account block over the defaults. */
export function accountConfig(settings, serverPolicy) {
  const a = settings?.account || {};
  const out = { ...ACCOUNT_DEFAULTS };
  for (const k of Object.keys(ACCOUNT_DEFAULTS)) {
    const v = a[k];
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  // The server has the final say on capability, never the merchant's wish.
  if (serverPolicy) {
    if (serverPolicy.emailFeatures !== undefined) out.emailFeatures = !!serverPolicy.emailFeatures;
    if (serverPolicy.emailVerifyRequired !== undefined) out.emailVerifyRequired = !!serverPolicy.emailVerifyRequired;
    if (serverPolicy.registrationEnabled !== undefined) out.registrationEnabled = !!serverPolicy.registrationEnabled;
    if (serverPolicy.passwordMinLength) out.passwordMinLength = serverPolicy.passwordMinLength;
  }
  return out;
}

/**
 * Validate a password against the merchant's policy.
 * Mirrors backend/src/utils/accountPolicy.js#checkPassword exactly — if these
 * drift, the form accepts something the API then rejects.
 */
export function passwordError(pw, cfg) {
  const s = String(pw || '');
  const min = Number(cfg.passwordMinLength) || 8;
  if (s.length < min) return `Use at least ${min} characters`;
  if (cfg.passwordRequireLetter && !/[a-zA-Z]/.test(s)) return 'Include at least one letter';
  if (cfg.passwordRequireNumber && !/[0-9]/.test(s)) return 'Include at least one number';
  if (cfg.passwordRequireSymbol && !/[^a-zA-Z0-9]/.test(s)) return 'Include at least one symbol';
  return '';
}

/** 0–4 strength score, used only for the visual meter — never to block. */
export function passwordStrength(pw) {
  const s = String(pw || '');
  if (!s) return 0;
  let n = 0;
  if (s.length >= 8) n += 1;
  if (s.length >= 12) n += 1;
  if (/[a-zA-Z]/.test(s) && /[0-9]/.test(s)) n += 1;
  if (/[^a-zA-Z0-9]/.test(s)) n += 1;
  return Math.min(4, n);
}

export const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong'];
