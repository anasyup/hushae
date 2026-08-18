const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  kind: { type: String, enum: ['warehouse', 'store', '3pl', 'virtual'], default: 'warehouse' },
  address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: 'PK' },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
