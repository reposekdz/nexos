const mongoose = require('mongoose');
const accountRestorationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestType: { type: String, enum: ['self_service', 'support_ticket', 'admin_review', 'automated'], required: true },
  previousStatus: String,
  reason: String,
  status: { type: String, enum: ['pending', 'reviewing', 'approved', 'partial', 'rejected', 'completed'], default: 'pending' },
  verificationSteps: [{ type: { type: String }, required: Boolean, completed: Boolean, completedAt: Date, metadata: mongoose.Schema.Types.Mixed }],
  restrictions: [{ feature: String, duration: Number, expiresAt: Date, reason: String }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  restoredAt: Date,
  sessionsRevoked: { type: Boolean, default: false },
  passwordResetRequired: { type: Boolean, default: false },
  timeline: [{ event: String, actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: { type: Date, default: Date.now }, notes: String }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
accountRestorationSchema.index({ user: 1, status: 1 });
module.exports = mongoose.model('AccountRestoration', accountRestorationSchema);