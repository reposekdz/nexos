const mongoose = require('mongoose');

const NotificationPreferenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  channels: {
    push: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true }
  },
  categories: {
    social: {
      enabled: { type: Boolean, default: true },
      channels: [String],
      frequency: { type: String, enum: ['instant', 'hourly', 'daily', 'weekly'], default: 'instant' }
    },
    updates: {
      enabled: { type: Boolean, default: true },
      channels: [String],
      frequency: { type: String, enum: ['instant', 'hourly', 'daily', 'weekly'], default: 'daily' }
    },
    marketing: {
      enabled: { type: Boolean, default: false },
      channels: [String],
      frequency: { type: String, enum: ['instant', 'hourly', 'daily', 'weekly'], default: 'weekly' }
    },
    security: {
      enabled: { type: Boolean, default: true },
      channels: [String],
      frequency: { type: String, enum: ['instant', 'hourly', 'daily', 'weekly'], default: 'instant' }
    },
    system: {
      enabled: { type: Boolean, default: true },
      channels: [String],
      frequency: { type: String, enum: ['instant', 'hourly', 'daily', 'weekly'], default: 'instant' }
    }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: String,
    end: String,
    timezone: String,
    exceptions: [String]
  },
  digest: {
    enabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },
    time: String,
    categories: [String]
  },
  keywords: {
    muted: [String],
    highlighted: [String]
  }
}, { timestamps: true });

const PushTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true, index: true },
  platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
  deviceId: String,
  deviceName: String,
  appVersion: String,
  osVersion: String,
  language: String,
  timezone: String,
  active: { type: Boolean, default: true },
  lastUsed: Date,
  failureCount: { type: Number, default: 0 },
  expiresAt: Date
}, { timestamps: true });

PushTokenSchema.index({ userId: 1, active: 1 });
PushTokenSchema.index({ token: 1, platform: 1 });

const NotificationBatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  type: { 
    type: String, 
    enum: ['broadcast', 'segment', 'cohort', 'targeted'], 
    required: true 
  },
  title: String,
  message: String,
  data: mongoose.Schema.Types.Mixed,
  recipients: {
    total: { type: Number, default: 0 },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    segments: [String],
    filters: mongoose.Schema.Types.Mixed
  },
  channels: [{ type: String, enum: ['push', 'email', 'sms', 'inApp'] }],
  scheduling: {
    scheduledAt: Date,
    timezone: String,
    localTime: Boolean
  },
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
    default: 'draft',
    index: true
  },
  progress: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 }
  },
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  expiry: { type: Number, default: 86400 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  startedAt: Date,
  completedAt: Date
}, { timestamps: true });

NotificationBatchSchema.index({ status: 1, 'scheduling.scheduledAt': 1 });
NotificationBatchSchema.index({ createdBy: 1, createdAt: -1 });

const NotificationQueueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  notification: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification' },
  batchId: String,
  channel: { type: String, enum: ['push', 'email', 'sms', 'inApp'], required: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  status: { 
    type: String, 
    enum: ['queued', 'processing', 'sent', 'delivered', 'failed', 'expired'],
    default: 'queued',
    index: true
  },
  payload: mongoose.Schema.Types.Mixed,
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  nextAttempt: Date,
  scheduledAt: Date,
  sentAt: Date,
  deliveredAt: Date,
  failedAt: Date,
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },
  metadata: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, index: true }
}, { timestamps: true });

NotificationQueueSchema.index({ status: 1, nextAttempt: 1 });
NotificationQueueSchema.index({ userId: 1, status: 1 });
NotificationQueueSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const NotificationTemplateSchema = new mongoose.Schema({
  templateId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['social', 'updates', 'marketing', 'security', 'system'] },
  channels: [{
    type: { type: String, enum: ['push', 'email', 'sms', 'inApp'] },
    subject: String,
    title: String,
    body: String,
    html: String,
    variables: [String],
    actionButtons: [{
      text: String,
      action: String,
      url: String
    }]
  }],
  localization: [{
    language: String,
    translations: mongoose.Schema.Types.Mixed
  }],
  variables: [{
    name: String,
    type: { type: String, enum: ['string', 'number', 'date', 'boolean'] },
    required: Boolean,
    default: mongoose.Schema.Types.Mixed
  }],
  scheduling: {
    allowScheduling: { type: Boolean, default: true },
    respectQuietHours: { type: Boolean, default: true },
    maxRetries: { type: Number, default: 3 }
  },
  active: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
}, { timestamps: true });

NotificationTemplateSchema.index({ category: 1, active: 1 });

const NotificationAnalyticsSchema = new mongoose.Schema({
  period: { type: String, enum: ['hourly', 'daily', 'weekly', 'monthly'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  channel: { type: String, enum: ['push', 'email', 'sms', 'inApp', 'all'] },
  category: String,
  metrics: {
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
    dismissed: { type: Number, default: 0 },
    deliveryRate: Number,
    openRate: Number,
    clickRate: Number,
    avgDeliveryTime: Number
  },
  topNotifications: [{
    type: String,
    sent: Number,
    openRate: Number
  }],
  deviceBreakdown: [{
    platform: String,
    count: Number,
    deliveryRate: Number
  }],
  errors: [{
    code: String,
    count: Number,
    percentage: Number
  }],
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
}, { timestamps: true });

NotificationAnalyticsSchema.index({ period: 1, periodStart: -1 });
NotificationAnalyticsSchema.index({ channel: 1, periodStart: -1 });

const InAppNotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['info', 'success', 'warning', 'error', 'social', 'update'],
    required: true 
  },
  title: String,
  message: { type: String, required: true },
  icon: String,
  image: String,
  actions: [{
    text: String,
    action: String,
    url: String,
    primary: Boolean
  }],
  data: mongoose.Schema.Types.Mixed,
  priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  read: { type: Boolean, default: false, index: true },
  readAt: Date,
  clicked: { type: Boolean, default: false },
  clickedAt: Date,
  dismissed: { type: Boolean, default: false },
  dismissedAt: Date,
  expiresAt: Date,
  groupKey: String
}, { timestamps: true });

InAppNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
InAppNotificationSchema.index({ userId: 1, groupKey: 1 });
InAppNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = {
  NotificationPreference: mongoose.model('NotificationPreference', NotificationPreferenceSchema),
  PushToken: mongoose.model('PushToken', PushTokenSchema),
  NotificationBatch: mongoose.model('NotificationBatch', NotificationBatchSchema),
  NotificationQueue: mongoose.model('NotificationQueue', NotificationQueueSchema),
  NotificationTemplate: mongoose.model('NotificationTemplate', NotificationTemplateSchema),
  NotificationAnalytics: mongoose.model('NotificationAnalytics', NotificationAnalyticsSchema),
  InAppNotification: mongoose.model('InAppNotification', InAppNotificationSchema)
};
