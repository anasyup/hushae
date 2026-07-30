const express = require('express');
const jwt = require('jsonwebtoken');
const { protect, signToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { normalizePhone, validEmail, verifyEmailDomain } = require('../utils/validators');
const { isConfigured: isOtpConfigured } = require('../utils/sms');
const crypto = require('crypto');
const { getAccountPolicy, canSendEmail, checkPassword } = require('../utils/accountPolicy');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Brute-force walls
const loginLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 12, key: 'login', message: 'Too many sign-in attempts — try again in a few minutes' });
const registerLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, key: 'register', message: 'Too many accounts created from your connection — try later' });

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role,
  addresses: u.addresses, createdAt: u.createdAt,
  avatar: u.avatar || '', emailVerified: !!u.emailVerified,
  notify: u.notify || {},
});

/* Token lifetime follows the merchant's session policy. "Remember me" gets
   the longer window; a plain sign-in gets the short one. */
const signFor = (user, remember, policy) => {
  const days = remember
    ? (Number(policy.rememberMeDays) || 30)
    : (Number(policy.sessionDays) || 2);
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: `${days}d` });
};

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

/* The mailer pulls in nodemailer, which is optional at runtime. Every other
   route in this codebase requires it INSIDE the handler for exactly this
   reason — a top-level require took the whole API down with a 500 when the
   package was missing from package.json. Keep it lazy. */
const mailerSend = async (opts) => {
  try {
    const { sendMail } = require('../utils/mailer');
    return await sendMail(opts);
  } catch (e) {
    console.error('[auth] mailer unavailable:', e.message);
    return { skipped: true, reason: 'mailer unavailable' };
  }
};

router.post('/register', registerLimit, asyncHandler(async (req, res) => {
  const { name, email, password, phone, phoneToken } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (cleanName.length < 3) return res.status(400).json({ field: 'name', message: 'Please enter your full name' });
  if (!validEmail(cleanEmail)) return res.status(400).json({ field: 'email', message: 'Incorrect email address' });
  const domainOk = await verifyEmailDomain(cleanEmail);
  if (!domainOk) return res.status(400).json({ field: 'email', message: "This email address doesn't exist — use a real email" });
  const policy = await getAccountPolicy();
  if (!policy.registrationEnabled) {
    return res.status(403).json({ message: 'New accounts are not being accepted right now. You can still check out as a guest.' });
  }
  const pwErr = checkPassword(password, policy);
  if (pwErr) return res.status(400).json({ field: 'password', message: pwErr });

  const phoneNorm = normalizePhone(phone);
  if (policy.phoneRequired && !phoneNorm) {
    return res.status(400).json({ field: 'phone', message: 'Incorrect number — enter a Pakistani mobile (03XX-XXXXXXX)' });
  }
  if (phone && !phoneNorm) {
    return res.status(400).json({ field: 'phone', message: 'Incorrect number — enter a Pakistani mobile (03XX-XXXXXXX)' });
  }

  // Phone SMS/OTP verification is enforced only once a provider (WhatsApp/SMS) is connected
  if (isOtpConfigured()) {
    let verifiedPhone = null;
    try {
      const payload = jwt.verify(String(phoneToken || ''), process.env.JWT_SECRET);
      if (payload?.phv === 1 && payload?.phone === phoneNorm) verifiedPhone = payload.phone;
    } catch (e) { /* invalid token */ }
    if (!verifiedPhone) {
      return res.status(400).json({ field: 'phone', message: 'Verify your phone number first — tap "Send code" and enter the SMS code' });
    }
  }

  // Anti-scam: one account per email
  const exists = await require('../models/User').findOne({ email: cleanEmail });
  if (exists) return res.status(409).json({ field: 'email', message: 'This email is already registered — sign in instead' });

  // Anti-scam: one account per verified phone number
  const phoneUsed = await require('../models/User').findOne({ phone: phoneNorm });
  if (phoneUsed) return res.status(409).json({ field: 'phone', message: 'An account already exists on this number — sign in instead' });

  const user = await require('../models/User').create({
    name: cleanName, email: cleanEmail, password, phone: phoneNorm || '',
    // Verification only means anything once mail can actually be sent.
    emailVerified: !policy.emailVerifyRequired,
  });
  res.status(201).json({ token: signFor(user, !!req.body?.remember, policy), user: publicUser(user) });
}));

router.post('/login', loginLimit, asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
  const user = await require('../models/User').findOne({ email: String(email).toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  if (!user.isActive) return res.status(403).json({ message: 'This account has been disabled' });
  if (user.deletedAt) return res.status(403).json({ message: 'This account has been closed' });
  const policy = await getAccountPolicy();
  res.json({ token: signFor(user, !!req.body?.remember, policy), user: publicUser(user) });
}));

router.get('/me', protect, asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
}));

/* ---------------------------------------------------------------------------
 * PUBLIC ACCOUNT POLICY
 * The storefront needs to know the rules before it can render the form —
 * password length, whether registration is open, whether email features work.
 * Nothing secret is exposed: no SMTP credentials, only capability flags.
 * ------------------------------------------------------------------------- */
router.get('/policy', asyncHandler(async (req, res) => {
  const policy = await getAccountPolicy();
  const mail = await canSendEmail();
  res.json({
    registrationEnabled: policy.registrationEnabled,
    passwordMinLength: policy.passwordMinLength,
    passwordRequireLetter: policy.passwordRequireLetter,
    passwordRequireNumber: policy.passwordRequireNumber,
    passwordRequireSymbol: policy.passwordRequireSymbol,
    phoneRequired: policy.phoneRequired,
    avatarEnabled: policy.avatarEnabled,
    maxAddresses: policy.maxAddresses,
    allowDeleteAccount: policy.allowDeleteAccount,
    rememberMeDays: policy.rememberMeDays,
    // The single flag the UI needs: can we honestly offer "reset my password"?
    emailFeatures: mail.ok,
    emailVerifyRequired: policy.emailVerifyRequired && mail.ok,
  });
}));

/* ---------------------------------------------------------------------------
 * FORGOT / RESET PASSWORD
 *
 * Only the SHA-256 hash of the token is stored, so a database leak does not
 * hand an attacker working reset links.
 *
 * The response is deliberately identical whether or not the email exists —
 * otherwise this endpoint becomes a way to discover which addresses have
 * accounts. The one case where we DO differ is when email is not configured
 * at all: pretending to send would be a lie, so we say so plainly.
 * ------------------------------------------------------------------------- */
const forgotLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, key: 'forgot', message: 'Too many reset requests — try again in a few minutes' });

router.post('/forgot-password', forgotLimit, asyncHandler(async (req, res) => {
  const mail = await canSendEmail();
  if (!mail.ok) {
    return res.status(503).json({
      code: mail.reason,
      message: mail.reason === 'smtp'
        ? 'Password reset by email is not switched on for this store yet. Please contact us and we will help you sign in.'
        : 'Password reset is currently unavailable. Please contact us and we will help you sign in.',
    });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  const User = require('../models/User');
  const user = email ? await User.findOne({ email, deletedAt: null }) : null;

  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = hashToken(raw);
    user.resetTokenExp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const base = (process.env.PUBLIC_URL || req.headers.origin || 'https://hushae.vercel.app').replace(/\/$/, '');
    const link = `${base}/reset-password?token=${raw}&email=${encodeURIComponent(user.email)}`;
    await mailerSend({
      to: user.email,
      subject: 'Reset your HUSHAE password',
      text: `Open this link to choose a new password (valid for 1 hour):\n\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
      html: `<p>Open this link to choose a new password. It is valid for one hour.</p>
             <p><a href="${link}">Reset my password</a></p>
             <p style="color:#666;font-size:12px">If you did not ask for this, you can safely ignore this email.</p>`,
    });
  }

  // Same answer either way — never reveal whether the address is registered.
  res.json({ ok: true, message: 'If that email has an account, a reset link is on its way.' });
}));

router.post('/reset-password', forgotLimit, asyncHandler(async (req, res) => {
  const { token, email, password } = req.body || {};
  if (!token || !email) return res.status(400).json({ message: 'This reset link is incomplete' });

  const policy = await getAccountPolicy();
  const pwErr = checkPassword(password, policy);
  if (pwErr) return res.status(400).json({ field: 'password', message: pwErr });

  const User = require('../models/User');
  const user = await User.findOne({ email: String(email).toLowerCase(), deletedAt: null })
    .select('+resetTokenHash +resetTokenExp');

  if (!user || !user.resetTokenHash || !user.resetTokenExp || user.resetTokenExp < new Date()) {
    return res.status(400).json({ message: 'This reset link has expired. Please request a new one.' });
  }
  // Constant-time compare so the endpoint cannot be used as a timing oracle.
  const given = Buffer.from(hashToken(token));
  const stored = Buffer.from(user.resetTokenHash);
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    return res.status(400).json({ message: 'This reset link is not valid. Please request a new one.' });
  }

  user.password = password;          // hashed by the pre-save hook
  user.resetTokenHash = '';
  user.resetTokenExp = null;
  await user.save();

  res.json({ token: signFor(user, false, policy), user: publicUser(user) });
}));

/* ---------------------------------------------------------------------------
 * EMAIL VERIFICATION
 * ------------------------------------------------------------------------- */
const verifyLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 6, key: 'verify', message: 'Too many verification emails — try again shortly' });

router.post('/send-verification', protect, verifyLimit, asyncHandler(async (req, res) => {
  const mail = await canSendEmail();
  if (!mail.ok) return res.status(503).json({ code: mail.reason, message: 'Email verification is not switched on for this store yet.' });
  if (req.user.emailVerified) return res.json({ ok: true, already: true });

  const User = require('../models/User');
  const user = await User.findById(req.user._id);
  const raw = crypto.randomBytes(32).toString('hex');
  user.verifyTokenHash = hashToken(raw);
  user.verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const base = (process.env.PUBLIC_URL || req.headers.origin || 'https://hushae.vercel.app').replace(/\/$/, '');
  const link = `${base}/verify-email?token=${raw}&email=${encodeURIComponent(user.email)}`;
  await mailerSend({
    to: user.email,
    subject: 'Confirm your HUSHAE email',
    text: `Confirm your email address (valid for 24 hours):\n\n${link}`,
    html: `<p>Please confirm your email address. This link is valid for 24 hours.</p><p><a href="${link}">Confirm my email</a></p>`,
  });
  res.json({ ok: true });
}));

router.post('/verify-email', verifyLimit, asyncHandler(async (req, res) => {
  const { token, email } = req.body || {};
  if (!token || !email) return res.status(400).json({ message: 'This confirmation link is incomplete' });

  const User = require('../models/User');
  const user = await User.findOne({ email: String(email).toLowerCase(), deletedAt: null })
    .select('+verifyTokenHash +verifyTokenExp');

  if (!user || !user.verifyTokenHash || !user.verifyTokenExp || user.verifyTokenExp < new Date()) {
    return res.status(400).json({ message: 'This confirmation link has expired. Please request a new one.' });
  }
  const given = Buffer.from(hashToken(token));
  const stored = Buffer.from(user.verifyTokenHash);
  if (given.length !== stored.length || !crypto.timingSafeEqual(given, stored)) {
    return res.status(400).json({ message: 'This confirmation link is not valid.' });
  }

  user.emailVerified = true;
  user.verifyTokenHash = '';
  user.verifyTokenExp = null;
  await user.save();
  res.json({ ok: true, user: publicUser(user) });
}));

/* ---------------------------------------------------------------------------
 * Share link — hand the admin console to someone without handing over the
 * password.
 *
 * The owner mints a link; whoever opens it is signed in as the owner for a
 * limited window and nothing longer. The link cannot be used to discover the
 * password, and revoking it is a single click. This exists because the
 * alternative people reach for — removing the login entirely — leaves a live
 * shop open to the whole internet.
 * ------------------------------------------------------------------------- */
const shareLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, key: 'share', message: 'Too many share links — try again later' });

router.post('/share-link', protect, shareLimit, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });

  const hours = Math.min(72, Math.max(1, Number(req.body?.hours) || 24));
  const Settings = require('../models/Settings');
  const s = (await Settings.findOne({ key: 'store' })) || (await Settings.create({ key: 'store' }));

  // A per-link id recorded on the settings doc, so "revoke" is just clearing it.
  const linkId = require('crypto').randomBytes(9).toString('hex');
  s.adminShare = { linkId, createdAt: new Date(), expiresAt: new Date(Date.now() + hours * 3600000), label: String(req.body?.label || '').slice(0, 60) };
  await s.save();

  const token = jwt.sign({ id: req.user._id, role: 'admin', share: linkId }, process.env.JWT_SECRET, { expiresIn: `${hours}h` });
  res.json({ token, hours, expiresAt: s.adminShare.expiresAt, label: s.adminShare.label });
}));

router.get('/share-link', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
  const Settings = require('../models/Settings');
  const s = await Settings.findOne({ key: 'store' }).lean();
  const share = s?.adminShare;
  const live = share?.linkId && share.expiresAt && new Date(share.expiresAt) > new Date();
  res.json({ active: Boolean(live), expiresAt: live ? share.expiresAt : null, label: live ? share.label : '' });
}));

router.delete('/share-link', protect, asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admins only' });
  const Settings = require('../models/Settings');
  const s = await Settings.findOne({ key: 'store' });
  if (s) { s.adminShare = { linkId: '', createdAt: null, expiresAt: null, label: '' }; await s.save(); }
  res.json({ ok: true });
}));

// Change password — signed-in user only (customer or admin).
// Requires current password to prevent hijacked-token abuse.
const changePwLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, key: 'chgpw', message: 'Too many password change attempts — try again later' });
router.post('/change-password', protect, changePwLimit, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }
  const newPw = String(newPassword);
  if (newPw.length < 8) {
    return res.status(400).json({ field: 'newPassword', message: 'New password must be at least 8 characters' });
  }
  if (!/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw)) {
    return res.status(400).json({ field: 'newPassword', message: 'New password must include letters and numbers' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ field: 'newPassword', message: 'New password must be different from the current one' });
  }

  // Reload user with password field (protect middleware excludes it)
  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  const ok = await user.comparePassword(String(currentPassword));
  if (!ok) return res.status(401).json({ field: 'currentPassword', message: 'Current password is incorrect' });

  user.password = newPw; // pre-save hook re-hashes
  await user.save();

  // Rotate token so old sessions on other devices stop working
  res.json({ message: 'Password changed successfully', token: signToken(user), user: publicUser(user) });
}));

// Change username / login email — requires current password to prevent hijack.
// Rotates the JWT so any other device using the old token is immediately
// signed out. Enforces uniqueness across the users collection.
router.post('/change-username', protect, changePwLimit, asyncHandler(async (req, res) => {
  const { currentPassword, newUsername } = req.body || {};
  const clean = String(newUsername || '').trim().toLowerCase();

  if (!currentPassword) return res.status(400).json({ message: 'Current password is required' });
  if (!clean) return res.status(400).json({ field: 'newUsername', message: 'New username is required' });
  if (clean.length < 4) return res.status(400).json({ field: 'newUsername', message: 'Username must be at least 4 characters' });
  if (clean.length > 40) return res.status(400).json({ field: 'newUsername', message: 'Username is too long' });
  // Allow either a simple handle (letters/numbers/._-) or a valid email
  const handleOk = /^[a-z0-9._-]+$/.test(clean);
  const emailOk  = /^\S+@\S+\.\S+$/.test(clean);
  if (!handleOk && !emailOk) {
    return res.status(400).json({ field: 'newUsername', message: 'Use letters, numbers, dot, underscore or dash (or a valid email)' });
  }

  const User = require('../models/User');
  const user = await User.findById(req.user._id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (clean === (user.email || '').toLowerCase()) {
    return res.status(400).json({ field: 'newUsername', message: 'That is already your current username' });
  }

  const ok = await user.comparePassword(String(currentPassword));
  if (!ok) return res.status(401).json({ field: 'currentPassword', message: 'Current password is incorrect' });

  // Uniqueness check — another user might already use this identifier
  const clash = await User.findOne({ email: clean, _id: { $ne: user._id } });
  if (clash) return res.status(409).json({ field: 'newUsername', message: 'This username is already taken' });

  user.email = clean;
  await user.save();

  // Rotate JWT so old sessions (other devices / browsers) stop working
  res.json({ message: 'Username changed successfully', token: signToken(user), user: publicUser(user) });
}));

module.exports = router;
