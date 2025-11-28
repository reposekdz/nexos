const mongoose = require('mongoose');

const onboardingJourneySchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true, index: true },
  description: String,
  status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft' },
  targeting: {
    userRole: [String],
    region: [String],
    accountType: [String]
  },
  steps: [{
    id: String,
    name: String,
    type: { type: String, enum: ['form', 'tutorial', 'video', 'verification', 'custom'] },
    required: { type: Boolean, default: true },
    order: Number,
    config: mongoose.Schema.Types.Mixed,
    branching: [{
      condition: mongoose.Schema.Types.Mixed,
      nextStep: String
    }],
    validation: mongoose.Schema.Types.Mixed
  }],
  metrics: {
    started: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    dropoffRate: mongoose.Schema.Types.Mixed
  },
  completionReward: {
    type: String,
    value: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

onboardingJourneySchema.index({ key: 1, status: 1 });

module.exports = mongoose.model('OnboardingJourney', onboardingJourneySchema);
