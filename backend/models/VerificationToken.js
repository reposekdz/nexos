const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'phone_verification', 'email_change'],
    default: 'email_verification'
  },
  newEmail: String,
  newPhone: String,
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  used: { type: Boolean, default: false },
  usedAt: Date,
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationTokenSchema.index({ tokenHash: 1, used: 1 });

verificationTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

verificationTokenSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

verificationTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date() && this.attempts < this.maxAttempts;
};

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);