const mongoose = require('mongoose');

const scimSyncSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  provider: { type: String, enum: ['okta', 'azure_ad', 'onelogin', 'google', 'custom'], required: true },
  status: { type: String, enum: ['active', 'paused', 'disabled', 'error'], default: 'active' },
  endpoint: String,
  token: String,
  config: {
    autoProvision: { type: Boolean, default: true },
    autoDeprovision: { type: Boolean, default: false },
    groupSync: { type: Boolean, default: true },
    attributeMapping: mongoose.Schema.Types.Mixed
  },
  lastSync: {
    startedAt: Date,
    completedAt: Date,
    status: String,
    usersCreated: { type: Number, default: 0 },
    usersUpdated: { type: Number, default: 0 },
    usersDeactivated: { type: Number, default: 0 },
    groupsSync: { type: Number, default: 0 },
    errors: [{ user: String, error: String }]
  },
  metrics: {
    totalSyncs: { type: Number, default: 0 },
    failedSyncs: { type: Number, default: 0 },
    lastSuccessfulSync: Date
  },
  webhookUrl: String,
  logs: [{
    action: String,
    userId: String,
    status: String,
    error: String,
    timestamp: Date
  }]
}, { timestamps: true });

scimSyncSchema.index({ organization: 1 });
scimSyncSchema.index({ status: 1 });

module.exports = mongoose.model('SCIMSync', scimSyncSchema);
