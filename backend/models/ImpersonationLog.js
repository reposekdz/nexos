const mongoose = require('mongoose');

const impersonationLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: { type: String, required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  token: String,
  scopes: [String],
  restrictions: [String],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  duration: Number,
  actions: [{
    action: String,
    resource: String,
    timestamp: Date,
    details: mongoose.Schema.Types.Mixed
  }],
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

impersonationLogSchema.index({ admin: 1, startedAt: -1 });
impersonationLogSchema.index({ target: 1, startedAt: -1 });

module.exports = mongoose.model('ImpersonationLog', impersonationLogSchema);
