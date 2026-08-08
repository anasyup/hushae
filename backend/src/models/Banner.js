const mongoose = require('mongoose');

/**
 * A BANNER — image/video/HTML creative assigned to a slot, with schedule,
 * priority and analytics counters.
 *
 * "Live" resolution (server-side, single source of truth):
 *   1. status === 'active'  (draft → never shown, archived → never shown)
 *   2. now >= startAt (when set)
 *   3. now <= endAt   (when set)
 *   4. device targeting matches (all / desktop / mobile — resolved per request)
 *
 * Analytics are simple counters incremented via the public tracking endpoints
 * (impression on 50%-visible IntersectionObserver, click on CTA).
 */
const bannerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'BannerSlot', required: true },

  // ── Creative ────────────────────────────────────────────────────────────
  type: { type: String, enum: ['image', 'video', 'html'], default: 'image' },
  mediaUrl: { type: String, default: '' },       // image or video (upload id / URL)
  html: { type: String, default: '' },           // when type === 'html'

  // Overlay text
  heading: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  ctaText: { type: String, default: '' },
  ctaLink: { type: String, default: '' },

  // Text position + colour
  textPosition: { type: String, enum: ['center', 'left', 'right'], default: 'left' },
  textColor: { type: String, default: '#FFFFFF' },
  overlayOpacity: { type: Number, default: 40, min: 0, max: 100 }, // percent

  // ── Assignment ──────────────────────────────────────────────────────────
  priority: { type: Number, default: 5, min: 1, max: 10 }, // higher wins

  // ── Schedule ────────────────────────────────────────────────────────────
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  startAt: { type: Date, default: null },
  endAt: { type: Date, default: null },
  alwaysActive: { type: Boolean, default: true },
  device: { type: String, enum: ['all', 'desktop', 'mobile'], default: 'all' },

  // ── Analytics ───────────────────────────────────────────────────────────
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },

  createdBy: { type: String, default: '' },
}, { timestamps: true });

bannerSchema.index({ slot: 1, priority: -1 });
bannerSchema.index({ status: 1, startAt: 1, endAt: 1 });

/** Resolve the effective schedule status for the admin list. */
bannerSchema.methods.scheduleState = function scheduleState(now = new Date()) {
  if (this.status !== 'active') return this.status; // draft | archived
  if (this.alwaysActive) return 'active';
  const start = this.startAt ? new Date(this.startAt) : null;
  const end = this.endAt ? new Date(this.endAt) : null;
  if (start && now < start) return 'scheduled';
  if (end && now > end) return 'expired';
  return 'active';
};

/** Is this banner live for the given device + time? */
bannerSchema.methods.isLive = function isLive(device = 'all', now = new Date()) {
  if (this.status !== 'active') return false;
  if (this.alwaysActive) return true;
  if (this.startAt && now < new Date(this.startAt)) return false;
  if (this.endAt && now > new Date(this.endAt)) return false;
  if (this.device !== 'all' && this.device !== device) return false;
  return true;
};

module.exports = mongoose.model('Banner', bannerSchema);
