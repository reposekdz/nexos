const mongoose = require('mongoose');

const cookieConsentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: String,
  ipAddress: String,
  userAgent: String,
  consents: {
    essential: {
      type: Boolean,
      default: true
    },
    analytics: {
      type: Boolean,
      default: false
    },
    marketing: {
      type: Boolean,
      default: false
    },
    functional: {
      type: Boolean,
      default: false
    },
    advertising: {
      type: Boolean,
      default: false
    }
  },
  consentVersion: {
    type: String,
    required: true
  },
  policyVersion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PolicyVersion'
  },
  expiresAt: Date,
  consentMethod: {
    type: String,
    enum: ['banner_accept', 'banner_reject', 'settings_page', 'implicit'],
    default: 'banner_accept'
  },
  jurisdiction: String,
  auditTrail: [{
    action: String,
    timestamp: { type: Date, default: Date.now },
    changes: Object
  }]
}, {
  timestamps: true
});

cookieConsentSchema.index({ user: 1, createdAt: -1 });
cookieConsentSchema.index({ sessionId: 1 });
cookieConsentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CookieConsent', cookieConsentSchema);
