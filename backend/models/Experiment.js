const mongoose = require('mongoose');

const experimentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'archived'],
    default: 'draft'
  },
  variants: [{
    name: { type: String, required: true },
    key: { type: String, required: true },
    description: String,
    weight: { type: Number, required: true, min: 0, max: 100 },
    config: Object
  }],
  targetAudience: {
    percentage: { type: Number, default: 100, min: 0, max: 100 },
    userSegments: [String],
    countries: [String],
    platforms: [{
      type: String,
      enum: ['web', 'mobile', 'desktop']
    }],
    minAccountAge: Number,
    includeUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    excludeUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  metrics: [{
    name: String,
    key: String,
    type: { type: String, enum: ['conversion', 'engagement', 'retention', 'revenue'] },
    isPrimary: { type: Boolean, default: false }
  }],
  stats: {
    totalExposures: { type: Number, default: 0 },
    variantExposures: { type: Map, of: Number },
    conversions: { type: Map, of: Number },
    startedAt: Date,
    completedAt: Date
  },
  schedule: {
    startDate: Date,
    endDate: Date,
    duration: Number
  },
  hypothesisstatement: String,
  confidenceLevel: {
    type: Number,
    default: 95,
    min: 0,
    max: 100
  },
  minSampleSize: Number,
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

experimentSchema.index({ key: 1 });
experimentSchema.index({ status: 1 });
experimentSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });

module.exports = mongoose.model('Experiment', experimentSchema);
