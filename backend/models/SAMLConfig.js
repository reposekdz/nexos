const mongoose = require('mongoose');

const samlConfigSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  entityId: { type: String, required: true, unique: true },
  ssoUrl: { type: String, required: true },
  sloUrl: String,
  certificate: { type: String, required: true },
  certificateExpiry: Date,
  signRequests: { type: Boolean, default: false },
  encryptAssertions: { type: Boolean, default: false },
  attributeMapping: {
    email: { type: String, default: 'email' },
    firstName: { type: String, default: 'firstName' },
    lastName: { type: String, default: 'lastName' },
    groups: { type: String, default: 'groups' }
  },
  status: { type: String, enum: ['active', 'disabled', 'testing'], default: 'testing' },
  testMode: { type: Boolean, default: true },
  testUsers: [String],
  metadata: {
    idpName: String,
    contactEmail: String,
    setupCompletedAt: Date
  },
  logs: [{
    event: String,
    success: Boolean,
    error: String,
    timestamp: Date
  }]
}, { timestamps: true });

samlConfigSchema.index({ organization: 1 });
samlConfigSchema.index({ entityId: 1 });

module.exports = mongoose.model('SAMLConfig', samlConfigSchema);
