const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true }
  },
  deviceType: {
    type: String,
    enum: ['web', 'mobile_android', 'mobile_ios', 'desktop'],
    required: true
  },
  browser: String,
  deviceInfo: {
    name: String,
    model: String,
    os: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  failureCount: {
    type: Number,
    default: 0
  },
  lastFailure: Date,
  preferences: {
    posts: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    likes: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    groupActivity: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

pushSubscriptionSchema.index({ user: 1, isActive: 1 });
pushSubscriptionSchema.index({ endpoint: 1 });
pushSubscriptionSchema.index({ lastUsed: 1 });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
