const mongoose = require('mongoose');

const assignmentOverrideSchema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperimentConfig', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  email: { type: String, index: true },
  variant: { type: String, required: true },
  reason: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date
}, { timestamps: true });

assignmentOverrideSchema.index({ experiment: 1, user: 1 }, { unique: true, sparse: true });
assignmentOverrideSchema.index({ experiment: 1, email: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('AssignmentOverride', assignmentOverrideSchema);
