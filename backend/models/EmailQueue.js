const mongoose = require('mongoose');

const emailQueueSchema = new mongoose.Schema({
  recipient: {
    email: { type: String, required: true },
    name: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailTemplate'
  },
  templateKey: String,
  subject: {
    type: String,
    required: true
  },
  htmlBody: String,
  textBody: String,
  variables: Object,
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'sent', 'failed', 'bounced', 'complained'],
    default: 'pending'
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  scheduledFor: Date,
  sentAt: Date,
  failedAt: Date,
  error: String,
  providerResponse: Object,
  provider: {
    type: String,
    enum: ['sendgrid', 'ses', 'smtp'],
    default: 'sendgrid'
  },
  metadata: {
    campaign: String,
    tags: [String],
    customArgs: Object
  },
  trackingEnabled: {
    type: Boolean,
    default: true
  },
  opens: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }],
  clicks: [{
    url: String,
    timestamp: Date,
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true
});

emailQueueSchema.index({ status: 1, scheduledFor: 1 });
emailQueueSchema.index({ 'recipient.userId': 1, createdAt: -1 });
emailQueueSchema.index({ 'recipient.email': 1 });

module.exports = mongoose.model('EmailQueue', emailQueueSchema);
