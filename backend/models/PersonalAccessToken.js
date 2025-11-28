const mongoose = require('mongoose');
const crypto = require('crypto');

const personalAccessTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true },
  scopes: [String],
  lastUsed: Date,
  expiresAt: Date,
  active: { type: Boolean, default: true },
  ipRestrictions: [String],
  usageCount: { type: Number, default: 0 }
}, { timestamps: true });

personalAccessTokenSchema.index({ user: 1, active: 1 });
personalAccessTokenSchema.index({ tokenHash: 1 });

personalAccessTokenSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = mongoose.model('PersonalAccessToken', personalAccessTokenSchema);
