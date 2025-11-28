const mongoose = require('mongoose');
const cohortSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  cohortType: { type: String, enum: ['acquisition', 'behavior', 'demographic', 'custom'], default: 'custom' },
  definition: { filters: mongoose.Schema.Types.Mixed, dateRange: { start: Date, end: Date }, eventCriteria: [{ eventType: String, operator: String, value: mongoose.Schema.Types.Mixed }] },
  memberCount: { type: Number, default: 0 },
  lastComputedAt: Date,
  computeSchedule: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
cohortSchema.index({ name: 1 });
module.exports = mongoose.model('Cohort', cohortSchema);