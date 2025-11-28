const mongoose = require('mongoose');
const featureAdoptionSchema = new mongoose.Schema({
  featureName: { type: String, required: true, index: true },
  featureId: String,
  date: { type: Date, required: true },
  totalUsers: Number,
  adoptedUsers: Number,
  adoptionRate: Number,
  newAdopters: Number,
  activeUsers: Number,
  engagementMetrics: { avgUsagePerUser: Number, avgSessionDuration: Number, totalInteractions: Number },
  cohortBreakdown: [{ cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort' }, adoptionRate: Number, users: Number }],
  platformBreakdown: [{ platform: String, adoptionRate: Number, users: Number }],
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });
featureAdoptionSchema.index({ featureName: 1, date: -1 });
module.exports = mongoose.model('FeatureAdoption', featureAdoptionSchema);