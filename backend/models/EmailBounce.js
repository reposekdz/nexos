const mongoose = require('mongoose');
const emailBounceSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, lowercase: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bounceType: { type: String, enum: ['hard', 'soft', 'transient', 'complaint', 'suppression'], required: true },
  reason: String,
  diagnosticCode: String,
  provider: { type: String, default: 'sendgrid' },
  messageId: String,
  templateId: String,
  bounceCount: { type: Number, default: 1 },
  firstBounceAt: { type: Date, default: Date.now },
  lastBounceAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'suppressed', 'resolved'], default: 'active' },
  resolvedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
emailBounceSchema.index({ email: 1, bounceType: 1 });
module.exports = mongoose.model('EmailBounce', emailBounceSchema);