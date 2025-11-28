const mongoose = require('mongoose');
const activeUserMetricSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  metricType: { type: String, enum: ['DAU', 'WAU', 'MAU'], required: true, index: true },
  platform: { type: String, enum: ['web', 'mobile_ios', 'mobile_android', 'desktop', 'all'], default: 'all' },
  count: { type: Number, required: true },
  newUsers: Number,
  returningUsers: Number,
  segments: mongoose.Schema.Types.Mixed,
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });
activeUserMetricSchema.index({ date: -1, metricType: 1, platform: 1 }, { unique: true });
module.exports = mongoose.model('ActiveUserMetric', activeUserMetricSchema);