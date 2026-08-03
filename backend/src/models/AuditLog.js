const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true, index: true }, // create, update, delete, login, logout, approve, reject
  target: { type: String, required: true, index: true }, // order, product, customer, review, page, discount, settings
  targetId: { type: String, default: '' },
  oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
