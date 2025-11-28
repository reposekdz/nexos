const mongoose.require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['banner', 'modal', 'toast', 'announcement', 'promotion'], required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'], default: 'draft' },
  priority: { type: Number, default: 0 },
  creative: {
    title: String,
    subtitle: String,
    body: String,
    image: String,
    ctaText: String,
    ctaUrl: String,
    backgroundColor: String,
    textColor: String
  },
  targeting: {
    segments: [String],
    userAttributes: mongoose.Schema.Types.Mixed,
    geoTargeting: { countries: [String], cities: [String] },
    deviceTargeting: { types: [String], os: [String] }
  },
  scheduling: {
    startDate: Date,
    endDate: Date,
    timezone: String,
    daysOfWeek: [Number],
    hoursOfDay: [Number]
  },
  quota: {
    maxImpressions: Number,
    maxClicks: Number,
    impressionsPerUser: { type: Number, default: 3 },
    frequencyCap: { count: Number, period: String }
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    dismissals: { type: Number, default: 0 }
  },
  variants: [{ name: String, creative: mongoose.Schema.Types.Mixed, weight: Number }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

campaignSchema.index({ status: 1, priority: -1 });
campaignSchema.index({ 'scheduling.startDate': 1, 'scheduling.endDate': 1 });

module.exports = mongoose.model('Campaign', campaignSchema);
