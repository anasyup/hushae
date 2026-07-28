const mongoose = require('mongoose');

/**
 * Theme document — the JSON page tree produced by the Theme Editor plus the
 * global theme settings. Stored as Mixed because the shape is schema-driven on
 * the client and must stay open-ended.
 */
const themeSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true, index: true },
  /** Live document served to the storefront. */
  doc: { type: mongoose.Schema.Types.Mixed, default: null },
  /** Global theme settings (colours, typography, spacing…). */
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  /** Draft that autosave writes to before a publish. */
  draft: { type: mongoose.Schema.Types.Mixed, default: null },
  draftSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  publishedAt: { type: Date, default: null },
  updatedBy: { type: String, default: '' },
}, { timestamps: true, minimize: false });

const versionSchema = new mongoose.Schema({
  key: { type: String, default: 'main', index: true },
  label: { type: String, required: true },
  doc: { type: mongoose.Schema.Types.Mixed, required: true },
  theme: { type: mongoose.Schema.Types.Mixed, default: {} },
  /** Node ids touched since the previous version — useful for an audit trail. */
  changedNodes: { type: [String], default: [] },
  removedNodes: { type: [String], default: [] },
  createdBy: { type: String, default: '' },
}, { timestamps: { createdAt: true, updatedAt: false }, minimize: false });

versionSchema.index({ key: 1, createdAt: -1 });

module.exports = {
  Theme: mongoose.model('Theme', themeSchema),
  ThemeVersion: mongoose.model('ThemeVersion', versionSchema),
};
