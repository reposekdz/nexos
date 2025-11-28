const mongoose = require('mongoose');

const delegationSchema = new mongoose.Schema({
  delegator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  delegate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  scopes: [String],
  resources: [{ type: String, id: String }],
  expiresAt: Date,
  status: { type: String, enum: ['pending', 'active', 'revoked', 'expired'], default: 'pending' },
  approvedAt: Date,
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

delegationSchema.index({ delegator: 1, status: 1 });
delegationSchema.index({ delegate: 1, status: 1 });

module.exports = mongoose.model('Delegation', delegationSchema);
