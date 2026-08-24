const mongoose = require('mongoose');

/* ============================================================================
 * BACKUP SCHEDULE — Phase 9: Automated backup scheduling + restore verification
 *
 * Defines when backups should run, retention policy, and tracks execution.
 * Actual execution is triggered by Vercel cron hitting /api/backup/scheduled-run
 * or manually by admin.
 * ========================================================================== */

const FREQUENCIES = ['hourly', 'daily', 'weekly', 'monthly', 'disabled'];

const backupScheduleSchema = new mongoose.Schema({
  name: { type: String, required: true, default: 'Default Schedule' },
  frequency: { type: String, enum: FREQUENCIES, default: 'daily', index: true },

  // Retention
  maxSnapshots: { type: Number, default: 30 },
  maxAgeDays: { type: Number, default: 90 },

  // What to back up
  collections: {
    type: [String],
    default: ['orders', 'products', 'customers', 'categories', 'discounts', 'promotions', 'settings', 'reviews', 'subscribers'],
  },

  // Schedule state
  enabled: { type: Boolean, default: true },
  lastRunAt: { type: Date, default: null },
  lastRunStatus: { type: String, enum: ['success', 'failed', 'skipped', null], default: null },
  lastRunError: { type: String, default: '' },
  lastRunDurationMs: { type: Number, default: 0 },
  lastRunSizeBytes: { type: Number, default: 0 },
  nextRunAt: { type: Date, default: null },

  // Restore verification
  lastVerifiedAt: { type: Date, default: null },
  lastVerifiedBy: { type: String, default: '' },
  lastVerifiedResult: { type: mongoose.Schema.Types.Mixed, default: null },

  // Audit
  createdBy: { type: String, default: 'system' },
  runCount: { type: Number, default: 0 },
  failCount: { type: Number, default: 0 },
}, { timestamps: true });

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Calculate next run time based on frequency.
 */
backupScheduleSchema.methods.calculateNextRun = function() {
  if (!this.enabled || this.frequency === 'disabled') {
    this.nextRunAt = null;
    return;
  }
  const now = new Date();
  switch (this.frequency) {
    case 'hourly':
      this.nextRunAt = new Date(now.getTime() + 60 * 60 * 1000);
      break;
    case 'daily':
      this.nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      this.nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'monthly':
      this.nextRunAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      this.nextRunAt = null;
  }
};

/**
 * Check if this schedule is due to run.
 */
backupScheduleSchema.methods.isDue = function() {
  if (!this.enabled || this.frequency === 'disabled') return false;
  if (!this.nextRunAt) return true; // never run
  return new Date() >= this.nextRunAt;
};

/**
 * Record a successful run.
 */
backupScheduleSchema.methods.recordSuccess = function(sizeBytes, durationMs) {
  this.lastRunAt = new Date();
  this.lastRunStatus = 'success';
  this.lastRunError = '';
  this.lastRunDurationMs = durationMs || 0;
  this.lastRunSizeBytes = sizeBytes || 0;
  this.runCount++;
  this.calculateNextRun();
  return this.save();
};

/**
 * Record a failed run.
 */
backupScheduleSchema.methods.recordFailure = function(error) {
  this.lastRunAt = new Date();
  this.lastRunStatus = 'failed';
  this.lastRunError = String(error || '').slice(0, 500);
  this.failCount++;
  this.calculateNextRun();
  return this.save();
};

/**
 * Record restore verification.
 */
backupScheduleSchema.methods.recordVerification = function(result, actor) {
  this.lastVerifiedAt = new Date();
  this.lastVerifiedBy = actor || '';
  this.lastVerifiedResult = result;
  return this.save();
};

backupScheduleSchema.statics.FREQUENCIES = FREQUENCIES;

module.exports = mongoose.model('BackupSchedule', backupScheduleSchema);
