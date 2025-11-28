const mongoose = require('mongoose');

const ExperimentConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  feature: { type: String, required: true },
  variants: [{
    id: String,
    name: String,
    description: String,
    config: mongoose.Schema.Types.Mixed,
    allocation: { type: Number, default: 0 }
  }],
  targeting: {
    userSegments: [String],
    platforms: [String],
    regions: [String],
    customRules: mongoose.Schema.Types.Mixed
  },
  metrics: [{
    name: String,
    type: { type: String, enum: ['conversion', 'engagement', 'revenue', 'custom'] },
    goal: String,
    weight: Number
  }],
  status: { 
    type: String, 
    enum: ['draft', 'active', 'paused', 'completed', 'archived'], 
    default: 'draft' 
  },
  startDate: Date,
  endDate: Date,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  randomSeed: { type: String, required: true },
  sampleSize: Number,
  confidenceLevel: { type: Number, default: 95 },
  minSamplePerVariant: { type: Number, default: 100 },
  resultsSnapshot: mongoose.Schema.Types.Mixed,
  winner: String
}, { timestamps: true });

const ExperimentExposureSchema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperimentConfig', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  variant: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  sessionId: String,
  platform: String,
  userAgent: String,
  region: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ExperimentExposureSchema.index({ experiment: 1, user: 1 }, { unique: true });
ExperimentExposureSchema.index({ timestamp: 1 });

const ExperimentMetricSchema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperimentConfig', required: true },
  exposure: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperimentExposure', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  variant: { type: String, required: true },
  metric: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

ExperimentMetricSchema.index({ experiment: 1, variant: 1 });
ExperimentMetricSchema.index({ timestamp: 1 });

const AssignmentOverrideSchema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperimentConfig', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  variant: { type: String, required: true },
  reason: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const ExperimentArchiveSchema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperimentConfig', required: true },
  config: mongoose.Schema.Types.Mixed,
  randomSeed: String,
  exposures: [{
    user: mongoose.Schema.Types.ObjectId,
    variant: String,
    timestamp: Date
  }],
  metrics: mongoose.Schema.Types.Mixed,
  overrides: mongoose.Schema.Types.Mixed,
  results: mongoose.Schema.Types.Mixed,
  checksum: String,
  exportedAt: { type: Date, default: Date.now },
  exportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  signedBundle: String,
  libraryVersions: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ExperimentArchiveSchema.index({ experiment: 1, exportedAt: -1 });

const BanditStateSchema = new mongoose.Schema({
  experiment: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperimentConfig', required: true },
  variant: { type: String, required: true },
  pulls: { type: Number, default: 0 },
  successes: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  allocationPercentage: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

BanditStateSchema.index({ experiment: 1, timestamp: -1 });

const IdentityMergeLogSchema = new mongoose.Schema({
  fromId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  toId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exposuresAdjusted: Number,
  metricsAdjusted: Number,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const FeatureFlagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  enabled: { type: Boolean, default: false },
  rules: [{
    condition: mongoose.Schema.Types.Mixed,
    enabled: Boolean,
    variant: String
  }],
  variants: mongoose.Schema.Types.Mixed,
  targeting: {
    userSegments: [String],
    platforms: [String],
    regions: [String],
    percentage: { type: Number, default: 0 }
  },
  dependencies: [String],
  metadata: mongoose.Schema.Types.Mixed,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const ExperimentConfig = mongoose.model('ExperimentConfig', ExperimentConfigSchema);
const ExperimentExposure = mongoose.model('ExperimentExposure', ExperimentExposureSchema);
const ExperimentMetric = mongoose.model('ExperimentMetric', ExperimentMetricSchema);
const AssignmentOverride = mongoose.model('AssignmentOverride', AssignmentOverrideSchema);
const ExperimentArchive = mongoose.model('ExperimentArchive', ExperimentArchiveSchema);
const BanditState = mongoose.model('BanditState', BanditStateSchema);
const IdentityMergeLog = mongoose.model('IdentityMergeLog', IdentityMergeLogSchema);
const FeatureFlag = mongoose.model('FeatureFlag', FeatureFlagSchema);

module.exports = {
  ExperimentConfig,
  ExperimentExposure,
  ExperimentMetric,
  AssignmentOverride,
  ExperimentArchive,
  BanditState,
  IdentityMergeLog,
  FeatureFlag
};
