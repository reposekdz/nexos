const mongoose = require('mongoose');
const conversionTrackingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  conversionType: { type: String, required: true, index: true },
  conversionValue: Number,
  currency: { type: String, default: 'USD' },
  source: { type: String, enum: ['organic', 'ad', 'referral', 'direct', 'social', 'email'], required: true },
  campaign: { id: String, name: String, source: String, medium: String },
  ad: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' }, impressionId: String, clickId: String },
  attributionWindow: Number,
  touchpoints: [{ timestamp: Date, source: String, campaign: String, action: String }],
  attributionModel: { type: String, enum: ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'], default: 'last_touch' },
  deviceType: String,
  platform: String,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
conversionTrackingSchema.index({ conversionType: 1, timestamp: -1 });
module.exports = mongoose.model('ConversionTracking', conversionTrackingSchema);