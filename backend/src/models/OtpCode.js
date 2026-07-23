const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true }, // normalized 03XXXXXXXXX
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  attempts: { type: Number, default: 0 },
  resends: { type: Number, default: 0 },
  windowStart: { type: Date, default: Date.now },
  lastSentAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('OtpCode', otpSchema);
