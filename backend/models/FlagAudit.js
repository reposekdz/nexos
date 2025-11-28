const mongoose = require('mongoose');

const flagAuditSchema = new mongoose.Schema({
  flag: { type: mongoose.Schema.Types.ObjectId, ref: 'FeatureFlag', required: true, index: true },
  action: { type: String, enum: ['created', 'updated', 'enabled', 'disabled', 'deleted', 'rollback'], required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  previousState: mongoose.Schema.Types.Mixed,
  newState: mongoose.Schema.Types.Mixed,
  diff: mongoose.Schema.Types.Mixed,
  reason: String,
  ipAddress: String,
  userAgent: String,
  signature: String
}, { timestamps: true });

flagAuditSchema.index({ flag: 1, createdAt: -1 });
flagAuditSchema.index({ actor: 1, createdAt: -1 });

module.exports = mongoose.model('FlagAudit', flagAuditSchema);
