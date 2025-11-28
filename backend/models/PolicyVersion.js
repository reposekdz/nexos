const mongoose = require('mongoose');

const policyVersionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['privacy', 'terms', 'community_guidelines', 'cookie'],
    required: true
  },
  version: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  summary: String,
  changes: [{
    section: String,
    description: String
  }],
  machineReadable: {
    type: Object
  },
  isActive: {
    type: Boolean,
    default: false
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  publishedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acceptanceRequired: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

policyVersionSchema.index({ type: 1, version: 1 }, { unique: true });
policyVersionSchema.index({ type: 1, isActive: 1 });
policyVersionSchema.index({ effectiveDate: -1 });

module.exports = mongoose.model('PolicyVersion', policyVersionSchema);
