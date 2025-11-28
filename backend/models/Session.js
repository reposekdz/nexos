const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true },
  refreshToken: { type: String, unique: true, sparse: true },
  deviceInfo: {
    type: { type: String, enum: ['web', 'mobile_ios', 'mobile_android', 'desktop'], default: 'web' },
    name: String,
    os: String,
    browser: String
  },
  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    city: String
  },
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  rememberMe: { type: Boolean, default: false }
}, { timestamps: true });

sessionSchema.index({ token: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.statics.invalidateUserSessions = async function(userId, exceptToken = null) {
  const query = { user: userId, isActive: true };
  if (exceptToken) query.token = { $ne: exceptToken };
  await this.updateMany(query, { $set: { isActive: false } });
};

module.exports = mongoose.model('Session', sessionSchema);