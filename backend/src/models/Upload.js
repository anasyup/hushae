const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  mime: { type: String, required: true },
  data: { type: Buffer, required: true },
  size: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Upload', uploadSchema);
