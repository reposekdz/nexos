const mongoose = require('mongoose');

const featureFlagSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  isEnabled: {
    type: Boolean,
    default: false
  },
  rolloutPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  targeting: {
    userIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    userSegments: [String],
    excludeUserIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    countries: [String],
    platforms: [{
      type: String,
      enum: ['web', 'mobile_ios', 'mobile_android', 'desktop']
    }],
    minAppVersion: String,
    maxAppVersion: String,
    customRules: [{
      attribute: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']
      },
      value: mongoose.Schema.Types.Mixed
    }]
  },
  variants: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  environment: {
    type: String,
    enum: ['development', 'staging', 'production'],
    default: 'development'
  },
  dependencies: [{
    flagKey: String,
    requiredValue: Boolean
  }],
  schedule: {
    enableAt: Date,
    disableAt: Date
  },
  stats: {
    totalEvaluations: { type: Number, default: 0 },
    enabledEvaluations: { type: Number, default: 0 },
    lastEvaluatedAt: Date
  },
  auditLog: [{
    action: {
      type: String,
      enum: ['created', 'enabled', 'disabled', 'updated', 'deleted']
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: { type: Date, default: Date.now },
    changes: Object,
    reason: String
  }],
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

featureFlagSchema.index({ key: 1 });
featureFlagSchema.index({ isEnabled: 1, environment: 1 });
featureFlagSchema.index({ tags: 1 });

module.exports = mongoose.model('FeatureFlag', featureFlagSchema);
