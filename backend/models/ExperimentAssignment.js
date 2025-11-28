const mongoose = require('mongoose');

const experimentAssignmentSchema = new mongoose.Schema({
  experiment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experiment',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  variantKey: {
    type: String,
    required: true
  },
  assignmentHash: String,
  exposedAt: Date,
  convertedAt: Date,
  metadata: {
    userAgent: String,
    platform: String,
    location: String
  }
}, {
  timestamps: true
});

experimentAssignmentSchema.index({ experiment: 1, user: 1 }, { unique: true });
experimentAssignmentSchema.index({ user: 1, exposedAt: 1 });

module.exports = mongoose.model('ExperimentAssignment', experimentAssignmentSchema);
