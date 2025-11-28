const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member', 'guest'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  settings: {
    mfaRequired: { type: Boolean, default: false },
    ssoEnabled: { type: Boolean, default: false },
    allowedDomains: [String]
  },
  billing: {
    plan: String,
    status: String,
    billingEmail: String
  },
  quotas: {
    users: Number,
    storage: Number,
    apiCalls: Number
  },
  usage: {
    users: { type: Number, default: 0 },
    storage: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 }
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

organizationSchema.index({ slug: 1 });
organizationSchema.index({ owner: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
