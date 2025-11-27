const mongoose = require('mongoose');

const adSchema = new mongoose.Schema({
  advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  campaignName: { type: String, required: true },
  format: { 
    type: String, 
    enum: ['image', 'video', 'carousel', 'stories', 'sponsored_post', 'in_stream', 'collection', 'dynamic'],
    required: true 
  },
  creative: {
    images: [{ url: String, thumbnail: String }],
    videos: [{ url: String, thumbnail: String, duration: Number }],
    headline: String,
    description: String,
    callToAction: { type: String, enum: ['learn_more', 'shop_now', 'sign_up', 'download', 'contact', 'book_now'] },
    destinationUrl: String,
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem' }]
  },
  targeting: {
    demographics: {
      ageRange: { min: Number, max: Number },
      gender: [{ type: String, enum: ['male', 'female', 'other', 'all'] }],
      income: [String],
      occupation: [String],
      education: [String],
      relationshipStatus: [String]
    },
    geographic: {
      countries: [String],
      regions: [String],
      cities: [String],
      radius: { lat: Number, lng: Number, distance: Number }
    },
    behavioral: {
      interests: [String],
      purchaseBehavior: [String],
      appUsage: [String],
      browsingHistory: [String]
    },
    customAudiences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Audience' }],
    lookalike: { sourceAudience: { type: mongoose.Schema.Types.ObjectId, ref: 'Audience' }, similarity: Number },
    retargeting: { pixelId: String, eventType: String, days: Number },
    devices: [{ type: String, enum: ['mobile', 'tablet', 'desktop'] }],
    os: [{ type: String, enum: ['ios', 'android', 'windows', 'mac'] }],
    timeTargeting: {
      daysOfWeek: [Number],
      hoursOfDay: [Number],
      timezone: String
    }
  },
  budget: {
    type: { type: String, enum: ['daily', 'lifetime'], required: true },
    amount: { type: Number, required: true },
    spent: { type: Number, default: 0 }
  },
  bidding: {
    strategy: { type: String, enum: ['cpc', 'cpm', 'cpa', 'auto'], required: true },
    bidAmount: Number,
    optimizationGoal: { type: String, enum: ['clicks', 'impressions', 'conversions', 'reach'] }
  },
  schedule: {
    startDate: { type: Date, required: true },
    endDate: Date,
    isActive: { type: Boolean, default: false }
  },
  metrics: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    videoViews: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  abTest: {
    enabled: { type: Boolean, default: false },
    variants: [{
      name: String,
      creative: mongoose.Schema.Types.Mixed,
      impressions: Number,
      clicks: Number,
      conversions: Number
    }]
  },
  status: { type: String, enum: ['draft', 'pending', 'active', 'paused', 'completed', 'rejected'], default: 'draft' },
  rejectionReason: String
}, { timestamps: true });

adSchema.index({ advertiser: 1, status: 1 });
adSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });

module.exports = mongoose.model('Ad', adSchema);
