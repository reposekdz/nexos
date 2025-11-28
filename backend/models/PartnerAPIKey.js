const mongoose = require('mongoose');
const crypto = require('crypto');

const partnerAPIKeySchema = new mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true },
  scopes: [String],
  rateLimit: {
    requestsPerMinute: { type: Number, default: 1000 },
    requestsPerDay: { type: Number, default: 100000 }
  },
  usage: {
    requests: { type: Number, default: 0 },
    lastUsed: Date
  },
  active: { type: Boolean, default: true },
  expiresAt: Date,
  rotationSchedule: String,
  webhookUrl: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

partnerAPIKeySchema.index({ partner: 1, active: 1 });
partnerAPIKeySchema.index({ keyHash: 1 });

partnerAPIKeySchema.statics.hashKey = function(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
};

module.exports = mongoose.model('PartnerAPIKey', partnerAPIKeySchema);
