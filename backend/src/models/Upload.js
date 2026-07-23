const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  mime: { type: String, required: true },
  data: { type: Buffer, default: null },          // small files: stored directly
  chunked: { type: Boolean, default: false },     // big files: served from UploadChunk docs
  session: { type: String, default: '' },         // chunk session id
  size: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Upload', uploadSchema);
