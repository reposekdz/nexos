const mongoose = require('mongoose');

const notificationDeliveryAttemptSchema = new mongoose.Schema({
  notification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification',
    required: true
  },
  channel: {
    type: String,
    enum: ['push', 'email', 'sms', 'in_app', 'webhook'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
    default: 'pending'
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  attemptedAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: Date,
  error: {
    code: String,
    message: String,
    details: Object
  },
  provider: String,
  providerResponse: Object,
  nextRetryAt: Date
}, {
  timestamps: true
});

notificationDeliveryAttemptSchema.index({ notification: 1, channel: 1 });
notificationDeliveryAttemptSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model('NotificationDeliveryAttempt', notificationDeliveryAttemptSchema);
