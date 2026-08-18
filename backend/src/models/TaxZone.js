const mongoose = require('mongoose');

const taxZoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  country: { type: String, required: true },
  region: { type: String, default: '' },
  rate: { type: Number, required: true, min: 0 },
  inclusive: { type: Boolean, default: false },
  appliesToShipping: { type: Boolean, default: false },
  className: { type: String, default: 'standard' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('TaxZone', taxZoneSchema);
