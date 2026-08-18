const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  channel: { type: String, enum: ['whatsapp', 'sms', 'email'], required: true },
  key: { type: String, required: true },
  name: { type: String, required: true },
  body: { type: String, required: true },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });
templateSchema.index({ channel: 1, key: 1 }, { unique: true });

const consentSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  email: { type: String, default: '', index: true },
  channel: { type: String, enum: ['whatsapp', 'sms', 'email'], required: true },
  status: { type: String, enum: ['opt_in', 'opt_out'], required: true },
  source: { type: String, default: 'admin' },
  at: { type: Date, default: Date.now },
}, { timestamps: true });

const logSchema = new mongoose.Schema({
  channel: { type: String, enum: ['whatsapp', 'sms', 'email'], required: true, index: true },
  to: { type: String, required: true },
  templateKey: { type: String, default: '' },
  body: { type: String, default: '' },
  status: { type: String, enum: ['queued', 'sent', 'failed', 'opened'], default: 'sent' },
  orderNumber: { type: String, default: '' },
  error: { type: String, default: '' },
  actor: { type: String, default: '' },
}, { timestamps: true });

module.exports = {
  CommsTemplate: mongoose.model('CommsTemplate', templateSchema),
  ConsentLog: mongoose.model('ConsentLog', consentSchema),
  CommsLog: mongoose.model('CommsLog', logSchema),
};
