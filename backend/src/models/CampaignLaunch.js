const mongoose = require('mongoose');

const campaignLaunchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'live', 'ended'], default: 'draft', index: true },
  startsAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  discountCode: { type: String, default: '' },
  bannerNote: { type: String, default: '' },
  productIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  notes: { type: String, default: '' },
  launchedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('CampaignLaunch', campaignLaunchSchema);
