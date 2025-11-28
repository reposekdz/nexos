const mongoose = require('mongoose');

const safelistSchema = new mongoose.Schema({
  type: { type: String, enum: ['email', 'ip', 'domain', 'token', 'user', 'device'], required: true, index: true },
  value: { type: String, required: true, index: true },
  pattern: String,
  reason: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

safelistSchema.index({ type: 1, value: 1 }, { unique: true });
safelistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Safelist', safelistSchema);
