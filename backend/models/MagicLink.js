const mongoose = require('mongoose');

const magicLinkSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  nonce: { type: String, required: true },
  used: { type: Boolean, default: false },
  usedAt: Date,
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 15 * 60 * 1000) },
  ipAddress: String,
  userAgent: String,
  deviceInfo: mongoose.Schema.Types.Mixed
}, { timestamps: true });

magicLinkSchema.index({ token: 1, used: false });
magicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MagicLink', magicLinkSchema);
