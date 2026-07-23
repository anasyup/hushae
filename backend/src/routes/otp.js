const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const OtpCode = require('../models/OtpCode');
const { asyncHandler } = require('../utils/helpers');
const { normalizePhone } = require('../utils/validators');
const { sendSms, isConfigured } = require('../utils/sms');

const router = express.Router();

const CODE_TTL_MS = 5 * 60 * 1000; // code valid 5 minutes
const PHONE_TOKEN_TTL = '15m'; // verified-phone token valid 15 minutes (enough to finish registering)
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 code per minute per number
const DAILY_CAP = 5; // max codes per number per day
const MAX_ATTEMPTS = 5; // max wrong guesses per code

const hash = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

// POST /api/otp/send { phone }
router.post('/send', asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  if (!phone) return res.status(400).json({ message: 'Incorrect number' });

  const now = Date.now();
  const existing = await OtpCode.findOne({ phone });
  if (existing) {
    // resend cooldown
    if (now - new Date(existing.lastSentAt).getTime() < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - new Date(existing.lastSentAt).getTime())) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting a new code`, waitSec: wait });
    }
    // daily cap (rolling 24h window)
    const sameWindow = now - new Date(existing.windowStart).getTime() < 24 * 3600 * 1000;
    if (sameWindow && existing.resends >= DAILY_CAP) {
      return res.status(429).json({ message: 'Too many codes requested for this number — try again tomorrow' });
    }
    if (!sameWindow) { existing.resends = 0; existing.windowStart = new Date(now); }
  }

  const code = String(crypto.randomInt(100000, 1000000)); // 6 digits
  const doc = existing || new OtpCode({ phone });
  doc.codeHash = hash(code);
  doc.expiresAt = new Date(now + CODE_TTL_MS);
  doc.attempts = 0;
  doc.resends = (existing ? existing.resends : 0) + 1;
  doc.lastSentAt = new Date(now);
  await doc.save();

  if (isConfigured()) {
    const e164 = `+92${phone.slice(1)}`;
    await sendSms(e164, `Your VELOURA verification code is ${code}. It expires in 5 minutes.`);
    return res.json({ sent: true, demo: false });
  }
  // Demo mode (no SMS provider connected yet): code returned so the flow can be tested
  res.json({ sent: true, demo: true, demoCode: code });
}));

// POST /api/otp/verify { phone, code }
router.post('/verify', asyncHandler(async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').replace(/\D/g, '');
  if (!phone || code.length !== 6) return res.status(400).json({ message: 'Enter the 6-digit code' });

  const doc = await OtpCode.findOne({ phone });
  if (!doc) return res.status(400).json({ message: 'No code was sent to this number — tap "Send code" first' });
  if (doc.expiresAt.getTime() < Date.now()) return res.status(400).json({ message: 'Code expired — tap "Resend code"' });
  if (doc.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many wrong tries — tap "Resend code" for a new one' });
  }
  if (doc.codeHash !== hash(code)) {
    doc.attempts += 1;
    await doc.save();
    const left = MAX_ATTEMPTS - doc.attempts;
    return res.status(400).json({ message: left > 0 ? `Incorrect code — ${left} ${left === 1 ? 'try' : 'tries'} left` : 'Incorrect code — tap "Resend code"' });
  }

  await OtpCode.deleteOne({ phone });
  const phoneToken = jwt.sign({ phone, phv: 1 }, process.env.JWT_SECRET, { expiresIn: PHONE_TOKEN_TTL });
  res.json({ verified: true, phoneToken });
}));

module.exports = router;
