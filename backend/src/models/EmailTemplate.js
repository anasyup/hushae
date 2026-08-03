const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema({
  templateKey: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  bodyHTML: { type: String, required: true },
  variables: { type: [String], default: [] },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('EmailTemplate', emailTemplateSchema);
