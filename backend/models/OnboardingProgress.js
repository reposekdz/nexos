const mongoose = require('mongoose');

const onboardingProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  journey: { type: mongoose.Schema.Types.ObjectId, ref: 'OnboardingJourney', required: true, index: true },
  status: { type: String, enum: ['not_started', 'in_progress', 'completed', 'skipped'], default: 'not_started' },
  currentStep: String,
  completedSteps: [String],
  stepData: mongoose.Schema.Types.Mixed,
  resumeToken: String,
  startedAt: Date,
  completedAt: Date,
  deviceInfo: { type: String, os: String, platform: String },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

onboardingProgressSchema.index({ user: 1, journey: 1 }, { unique: true });
onboardingProgressSchema.index({ resumeToken: 1 });

module.exports = mongoose.model('OnboardingProgress', onboardingProgressSchema);
