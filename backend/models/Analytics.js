const mongoose = require('mongoose');

const SystemMetricSchema = new mongoose.Schema({
  metricType: { type: String, required: true, index: true },
  service: { type: String, required: true },
  instance: String,
  value: { type: Number, required: true },
  unit: String,
  dimensions: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true },
  aggregation: {
    period: { type: String, enum: ['1m', '5m', '15m', '1h', '1d'] },
    min: Number,
    max: Number,
    avg: Number,
    count: Number
  }
}, { timestamps: true });

SystemMetricSchema.index({ metricType: 1, service: 1, timestamp: -1 });
SystemMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const UserEngagementSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: String,
  event: { type: String, required: true },
  feature: String,
  action: String,
  duration: Number,
  metadata: mongoose.Schema.Types.Mixed,
  platform: { type: String, enum: ['web', 'mobile', 'desktop'] },
  device: String,
  browser: String,
  ipAddress: String,
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

UserEngagementSchema.index({ userId: 1, timestamp: -1 });
UserEngagementSchema.index({ event: 1, timestamp: -1 });
UserEngagementSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const ErrorLogSchema = new mongoose.Schema({
  level: { type: String, enum: ['error', 'warning', 'critical'], required: true, index: true },
  message: { type: String, required: true },
  stack: String,
  code: String,
  service: { type: String, required: true },
  endpoint: String,
  method: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  request: mongoose.Schema.Types.Mixed,
  response: mongoose.Schema.Types.Mixed,
  context: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  occurrences: { type: Number, default: 1 },
  firstOccurrence: { type: Date, default: Date.now },
  lastOccurrence: { type: Date, default: Date.now },
  fingerprint: { type: String, index: true }
}, { timestamps: true });

ErrorLogSchema.index({ service: 1, level: 1, createdAt: -1 });
ErrorLogSchema.index({ fingerprint: 1 });
ErrorLogSchema.index({ resolved: 1, level: 1 });

const AlertRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  metric: { type: String, required: true },
  condition: {
    operator: { type: String, enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne'], required: true },
    threshold: { type: Number, required: true },
    window: Number,
    aggregation: { type: String, enum: ['avg', 'min', 'max', 'sum', 'count'], default: 'avg' }
  },
  actions: [{
    type: { type: String, enum: ['email', 'sms', 'push', 'webhook', 'slack'], required: true },
    target: String,
    template: String,
    cooldown: Number
  }],
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  enabled: { type: Boolean, default: true },
  tags: [String],
  lastTriggered: Date,
  triggerCount: { type: Number, default: 0 }
}, { timestamps: true });

const AlertHistorySchema = new mongoose.Schema({
  rule: { type: mongoose.Schema.Types.ObjectId, ref: 'AlertRule', required: true },
  metric: String,
  value: Number,
  threshold: Number,
  condition: String,
  severity: String,
  triggeredAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  actions: [{
    type: String,
    target: String,
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: Date,
    error: String
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

AlertHistorySchema.index({ rule: 1, triggeredAt: -1 });
AlertHistorySchema.index({ resolved: 1, severity: 1 });

const DashboardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  layout: [{
    widgetId: String,
    type: { type: String, enum: ['chart', 'metric', 'table', 'text', 'gauge'], required: true },
    position: { x: Number, y: Number },
    size: { w: Number, h: Number },
    config: mongoose.Schema.Types.Mixed
  }],
  filters: mongoose.Schema.Types.Mixed,
  refreshInterval: Number,
  visibility: { type: String, enum: ['private', 'team', 'public'], default: 'private' },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

DashboardSchema.index({ owner: 1 });

const ReportScheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  reportType: { type: String, required: true },
  frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly'], required: true },
  schedule: {
    dayOfWeek: Number,
    dayOfMonth: Number,
    hour: Number,
    minute: Number,
    timezone: String
  },
  recipients: [{
    type: { type: String, enum: ['email', 'webhook'] },
    target: String
  }],
  format: { type: String, enum: ['pdf', 'csv', 'json', 'excel'], default: 'pdf' },
  filters: mongoose.Schema.Types.Mixed,
  enabled: { type: Boolean, default: true },
  lastRun: Date,
  nextRun: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const ReportExecutionSchema = new mongoose.Schema({
  schedule: { type: mongoose.Schema.Types.ObjectId, ref: 'ReportSchedule', required: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  startedAt: Date,
  completedAt: Date,
  fileUrl: String,
  fileSize: Number,
  error: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ReportExecutionSchema.index({ schedule: 1, createdAt: -1 });

const PerformanceMetricSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  statusCode: Number,
  duration: { type: Number, required: true },
  requestSize: Number,
  responseSize: Number,
  timestamp: { type: Date, default: Date.now, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  dbQueries: Number,
  cacheHits: Number,
  cacheMisses: Number
}, { timestamps: true });

PerformanceMetricSchema.index({ endpoint: 1, timestamp: -1 });
PerformanceMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

const ResourceUsageSchema = new mongoose.Schema({
  resource: { type: String, enum: ['cpu', 'memory', 'storage', 'network'], required: true },
  service: { type: String, required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  used: { type: Number, required: true },
  total: Number,
  percentage: Number,
  unit: String,
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

ResourceUsageSchema.index({ resource: 1, service: 1, timestamp: -1 });
ResourceUsageSchema.index({ tenantId: 1, timestamp: -1 });

const AnomalyDetectionSchema = new mongoose.Schema({
  metric: { type: String, required: true },
  service: String,
  value: { type: Number, required: true },
  expectedValue: Number,
  deviation: Number,
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  detectedAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  rule: {
    type: { type: String, enum: ['threshold', 'trend', 'spike', 'pattern'] },
    params: mongoose.Schema.Types.Mixed
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

AnomalyDetectionSchema.index({ metric: 1, detectedAt: -1 });
AnomalyDetectionSchema.index({ resolved: 1, severity: 1 });

const UsageHeatmapSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  hour: { type: Number, required: true },
  feature: String,
  region: String,
  count: { type: Number, default: 0 },
  uniqueUsers: { type: Number, default: 0 },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
}, { timestamps: true });

UsageHeatmapSchema.index({ date: 1, hour: 1 });
UsageHeatmapSchema.index({ feature: 1, date: -1 });

const ServiceHealthSchema = new mongoose.Schema({
  service: { type: String, required: true, index: true },
  status: { type: String, enum: ['healthy', 'degraded', 'down'], required: true },
  uptime: Number,
  lastCheck: { type: Date, default: Date.now },
  responseTime: Number,
  errorRate: Number,
  dependencies: [{
    service: String,
    status: String,
    responseTime: Number
  }],
  incidents: [{
    startedAt: Date,
    endedAt: Date,
    duration: Number,
    reason: String
  }]
}, { timestamps: true });

ServiceHealthSchema.index({ service: 1, lastCheck: -1 });

const SystemMetric = mongoose.model('SystemMetric', SystemMetricSchema);
const UserEngagement = mongoose.model('UserEngagement', UserEngagementSchema);
const ErrorLog = mongoose.model('ErrorLog', ErrorLogSchema);
const AlertRule = mongoose.model('AlertRule', AlertRuleSchema);
const AlertHistory = mongoose.model('AlertHistory', AlertHistorySchema);
const Dashboard = mongoose.model('Dashboard', DashboardSchema);
const ReportSchedule = mongoose.model('ReportSchedule', ReportScheduleSchema);
const ReportExecution = mongoose.model('ReportExecution', ReportExecutionSchema);
const PerformanceMetric = mongoose.model('PerformanceMetric', PerformanceMetricSchema);
const ResourceUsage = mongoose.model('ResourceUsage', ResourceUsageSchema);
const AnomalyDetection = mongoose.model('AnomalyDetection', AnomalyDetectionSchema);
const UsageHeatmap = mongoose.model('UsageHeatmap', UsageHeatmapSchema);
const ServiceHealth = mongoose.model('ServiceHealth', ServiceHealthSchema);

module.exports = {
  SystemMetric,
  UserEngagement,
  ErrorLog,
  AlertRule,
  AlertHistory,
  Dashboard,
  ReportSchedule,
  ReportExecution,
  PerformanceMetric,
  ResourceUsage,
  AnomalyDetection,
  UsageHeatmap,
  ServiceHealth
};
