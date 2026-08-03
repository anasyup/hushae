const AuditLog = require('../models/AuditLog');

async function logAction(userEmail, action, target, targetId = '', oldValue = null, newValue = null) {
  try {
    await AuditLog.create({
      user: userEmail || 'system',
      action,
      target,
      targetId: String(targetId),
      oldValue,
      newValue,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
