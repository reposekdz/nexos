const mongoose = require('mongoose');
const crypto = require('crypto');
const phoneVerificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  phoneNormalized: { type: String, required: true, index: true },
  phoneCountry: String,
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 10 * 60 * 1000), index: { expires: 0 } },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  ipAddress: String,
  provider: { type: String, default: 'twilio' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
phoneVerificationSchema.statics.hashCode = function(code) {
  return crypto.createHash('sha256').update(code.toString()).digest('hex');
};
phoneVerificationSchema.methods.isValid = function() {
  return !this.verified && this.expiresAt > new Date() && this.attempts < this.maxAttempts;
};
module.exports = mongoose.model('PhoneVerification', phoneVerificationSchema);