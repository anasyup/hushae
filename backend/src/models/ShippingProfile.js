const mongoose = require('mongoose');

const methodSchema = new mongoose.Schema({
  id: String,
  name: String,
  type: { type: String, enum: ['flat', 'free', 'weight', 'price', 'pickup', 'local'], default: 'flat' },
  rate: { type: Number, default: 0 },
  minOrder: { type: Number, default: 0 },
  maxWeightG: { type: Number, default: 0 },
  etaDaysMin: { type: Number, default: 2 },
  etaDaysMax: { type: Number, default: 5 },
  enabled: { type: Boolean, default: true },
}, { _id: false });

const shippingProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  countries: [{ type: String }],
  cities: [{ type: String }],
  courier: { type: String, default: '' },
  methods: { type: [methodSchema], default: [] },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('ShippingProfile', shippingProfileSchema);
