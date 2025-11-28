const mongoose = require('mongoose');
const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  status: { type: String, enum: ['investigating', 'identified', 'monitoring', 'resolved', 'postmortem'], default: 'investigating' },
  affectedComponents: [String],
  affectedRegions: [String],
  impact: { usersAffected: Number, servicesAffected: [String], estimatedDowntime: Number },
  detectedAt: { type: Date, default: Date.now },
  detectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  detectionMethod: { type: String, enum: ['monitoring', 'user_report', 'manual'] },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  responders: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String, joinedAt: Date }],
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rootCause: String,
  remediation: String,
  postmortemUrl: String,
  slaBreached: Boolean,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
incidentSchema.index({ incidentId: 1 });
incidentSchema.index({ status: 1, severity: 1 });
module.exports = mongoose.model('Incident', incidentSchema);