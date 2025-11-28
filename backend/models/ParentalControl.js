const mongoose = require('mongoose');

const parentalControlSchema = new mongoose.Schema({
  childAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  guardianAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationMethod: {
    type: String,
    enum: ['email', 'phone', 'id_document', 'credit_card'],
  },
  verifiedAt: Date,
  settings: {
    allowMessaging: {
      type: String,
      enum: ['none', 'friends_only', 'all'],
      default: 'friends_only'
    },
    allowGroupCreation: {
      type: Boolean,
      default: false
    },
    allowPublicPosts: {
      type: Boolean,
      default: false
    },
    allowDiscovery: {
      type: Boolean,
      default: false
    },
    screenTimeLimit: {
      daily: { type: Number, default: 120 },
      enabled: { type: Boolean, default: false }
    },
    quietHours: {
      enabled: { type: Boolean, default: false },
      start: String,
      end: String
    },
    contentFiltering: {
      level: {
        type: String,
        enum: ['strict', 'moderate', 'minimal'],
        default: 'strict'
      }
    },
    allowMonetization: {
      type: Boolean,
      default: false
    },
    requireApprovalForContacts: {
      type: Boolean,
      default: true
    }
  },
  activityReports: {
    enabled: { type: Boolean, default: true },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    lastSent: Date
  },
  alerts: [{
    type: {
      type: String,
      enum: ['content_flagged', 'screen_time_exceeded', 'inappropriate_contact', 'location_alert']
    },
    message: String,
    timestamp: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false }
  }],
  accessLog: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    details: Object
  }]
}, {
  timestamps: true
});

parentalControlSchema.index({ childAccount: 1 });
parentalControlSchema.index({ guardianAccount: 1 });

module.exports = mongoose.model('ParentalControl', parentalControlSchema);
