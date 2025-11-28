const mongoose = require('mongoose');

const blocklistSchema = new mongoose.Schema({
  type: { type: String, enum: ['email', 'ip', 'domain', 'token', 'user', 'device', 'cidr'], required: true, index: true },
  value: { type: String, required: true, index: true },
  pattern: String,
  reason: String,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date,
  permanent: { type: Boolean, default: false },
  appealable: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

blocklistSchema.index({ type: 1, value: 1 });
blocklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { permanent: false } });
blocklistSchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('Blocklist', blocklistSchema);
