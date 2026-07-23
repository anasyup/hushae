const mongoose = require('mongoose');

const uploadChunkSchema = new mongoose.Schema({
  session: { type: String, required: true, index: true },
  idx: { type: Number, required: true },
  data: { type: Buffer, required: true },
}, { timestamps: true });

module.exports = mongoose.model('UploadChunk', uploadChunkSchema);
