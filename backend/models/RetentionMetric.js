const mongoose = require('mongoose');
const retentionMetricSchema = new mongoose.Schema({
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', index: true },
  periodType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  totalUsers: { type: Number, required: true },
  activeUsers: { type: Number, required: true },
  retentionRate: { type: Number, required: true },
  churnedUsers: Number,
  churnRate: Number,
  newUsers: Number,
  resurrectedUsers: Number,
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });
retentionMetricSchema.index({ cohort: 1, periodType: 1, periodStart: 1 });
module.exports = mongoose.model('RetentionMetric', retentionMetricSchema);