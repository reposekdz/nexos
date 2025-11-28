const mongoose = require('mongoose');
const metricsRetentionPolicySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  metricType: { type: String, required: true, enum: ['raw_events', 'aggregated', 'user_activity', 'system_metrics', 'analytics'] },
  retentionTiers: [{ name: String, duration: { type: Number, required: true }, durationType: { type: String, enum: ['days', 'months', 'years'], default: 'days' }, aggregationLevel: { type: String, enum: ['raw', 'hourly', 'daily', 'weekly', 'monthly'] }, storageClass: String }],
  purgeSchedule: String,
  lastPurgeAt: Date,
  nextPurgeAt: Date,
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
metricsRetentionPolicySchema.index({ metricType: 1, isActive: 1 });
module.exports = mongoose.model('MetricsRetentionPolicy', metricsRetentionPolicySchema);