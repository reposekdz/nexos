const mongoose = require('mongoose');

const trustedDeviceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  deviceFingerprint: String,
  deviceInfo: {
    type: String,
    name: String,
    os: String,
    browser: String
  },
  ipAddress: String,
  location: { country: String, city: String },
  trustScore: { type: Number, default: 100, min: 0, max: 100 },
  expiresAt: { type: Date, required: true },
  lastUsed: Date,
  active: { type: Boolean, default: true }
}, { timestamps: true });

trustedDeviceSchema.index({ user: 1, active: 1 });
trustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('TrustedDevice', trustedDeviceSchema);
