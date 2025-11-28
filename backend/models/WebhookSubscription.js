const mongoose = require('mongoose');

const webhookSubscriptionSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  secret: {
    type: String,
    required: true
  },
  events: [{
    type: String,
    enum: [
      'post.created', 'post.updated', 'post.deleted',
      'comment.created', 'comment.deleted',
      'user.followed', 'user.unfollowed',
      'message.received',
      'group.joined', 'group.left',
      'ad.impression', 'ad.click',
      'payment.completed'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  deliveryConfig: {
    retryAttempts: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 60000 },
    timeout: { type: Number, default: 30000 }
  },
  stats: {
    totalDeliveries: { type: Number, default: 0 },
    successfulDeliveries: { type: Number, default: 0 },
    failedDeliveries: { type: Number, default: 0 },
    lastDeliveryAt: Date,
    lastSuccessAt: Date,
    lastFailureAt: Date
  },
  deliveryHistory: [{
    eventType: String,
    payload: Object,
    status: { type: String, enum: ['success', 'failure'] },
    responseCode: Number,
    responseBody: String,
    attempt: Number,
    deliveredAt: { type: Date, default: Date.now },
    error: String
  }],
  rateLimit: {
    maxPerMinute: { type: Number, default: 60 },
    maxPerHour: { type: Number, default: 1000 }
  },
  ipWhitelist: [String]
}, {
  timestamps: true
});

webhookSubscriptionSchema.index({ owner: 1, isActive: 1 });
webhookSubscriptionSchema.index({ url: 1 });

webhookSubscriptionSchema.methods.generateSecret = function() {
  return require('crypto').randomBytes(32).toString('hex');
};

module.exports = mongoose.model('WebhookSubscription', webhookSubscriptionSchema);
