const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 60 * 60 * 1000)
  },
  used: { type: Boolean, default: false },
  usedAt: Date,
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

passwordResetTokenSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

passwordResetTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date() && this.attempts < this.maxAttempts;
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);