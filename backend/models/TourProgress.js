const mongoose = require('mongoose');

const tourProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tour: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductTour', required: true, index: true },
  status: { type: String, enum: ['in_progress', 'completed', 'skipped'], default: 'in_progress' },
  currentStep: Number,
  completedSteps: [String],
  surveyResponses: mongoose.Schema.Types.Mixed,
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

tourProgressSchema.index({ user: 1, tour: 1 }, { unique: true });

module.exports = mongoose.model('TourProgress', tourProgressSchema);
