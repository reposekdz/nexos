const mongoose = require('mongoose');

const experimentConfigSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  key: { type: String, required: true, unique: true, index: true },
  hypothesis: String,
  description: String,
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'archived'], default: 'draft' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  variants: [{
    name: { type: String, required: true },
    key: { type: String, required: true },
    weight: { type: Number, default: 50 },
    config: mongoose.Schema.Types.Mixed
  }],
  targeting: {
    segments: [String],
    percentage: { type: Number, default: 100 },
    rules: [{
      attribute: String,
      operator: { type: String, enum: ['equals', 'not_equals', 'in', 'not_in', 'gt', 'lt', 'gte', 'lte', 'contains'] },
      value: mongoose.Schema.Types.Mixed
    }]
  },
  metrics: {
    primary: { name: String, type: String, goal: String },
    secondary: [{ name: String, type: String, goal: String }]
  },
  startDate: Date,
  endDate: Date,
  sampleSize: Number,
  confidenceLevel: { type: Number, default: 95 },
  results: {
    exposures: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    variantMetrics: mongoose.Schema.Types.Mixed,
    winner: String,
    significance: Number
  },
  rollback: {
    enabled: { type: Boolean, default: true },
    threshold: Number,
    metric: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

experimentConfigSchema.index({ status: 1, startDate: -1 });
experimentConfigSchema.index({ key: 1, status: 1 });

module.exports = mongoose.model('ExperimentConfig', experimentConfigSchema);
