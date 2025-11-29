const mongoose = require('mongoose');

const TrendAlertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  metric: { type: String, required: true },
  resourceType: { type: String, enum: ['user', 'post', 'product', 'event', 'group'], required: true },
  condition: {
    type: { type: String, enum: ['increase', 'decrease', 'threshold', 'anomaly'], required: true },
    operator: { type: String, enum: ['gt', 'gte', 'lt', 'lte', 'eq', 'ne'] },
    value: Number,
    percentage: Number,
    timeWindow: { type: Number, default: 3600000 }
  },
  currentValue: Number,
  previousValue: Number,
  changePercent: Number,
  status: { 
    type: String, 
    enum: ['active', 'triggered', 'resolved', 'suppressed'], 
    default: 'active',
    index: true
  },
  severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  triggeredAt: Date,
  resolvedAt: Date,
  notifications: [{
    type: { type: String, enum: ['email', 'push', 'sms', 'webhook'] },
    target: String,
    sentAt: Date
  }],
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

TrendAlertSchema.index({ owner: 1, status: 1 });
TrendAlertSchema.index({ metric: 1, resourceType: 1 });

const ForecastRuleSchema = new mongoose.Schema({
  ruleId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  metric: { type: String, required: true },
  algorithm: { 
    type: String, 
    enum: ['linear', 'moving_average', 'exponential_smoothing', 'seasonal'], 
    default: 'moving_average' 
  },
  parameters: {
    historicalPeriod: { type: Number, default: 30 },
    forecastPeriod: { type: Number, default: 7 },
    seasonality: Number,
    smoothingFactor: Number,
    confidenceLevel: { type: Number, default: 0.95 }
  },
  historical Data: [{
    timestamp: Date,
    value: Number
  }],
  forecasts: [{
    timestamp: Date,
    predictedValue: Number,
    lowerBound: Number,
    upperBound: Number,
    confidence: Number
  }],
  accuracy: {
    mape: Number,
    rmse: Number,
    mae: Number,
    r2: Number
  },
  lastRun: Date,
  nextRun: Date,
  runFrequency: { type: String, enum: ['hourly', 'daily', 'weekly'], default: 'daily' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

ForecastRuleSchema.index({ owner: 1, enabled: 1 });
ForecastRuleSchema.index({ nextRun: 1 });

const RiskScoreSchema = new mongoose.Schema({
  resourceType: { 
    type: String, 
    enum: ['user', 'transaction', 'device', 'post', 'login'], 
    required: true,
    index: true
  },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  score: { type: Number, required: true, min: 0, max: 100 },
  level: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    required: true,
    index: true
  },
  factors: [{
    name: String,
    weight: Number,
    value: Number,
    contribution: Number,
    description: String
  }],
  rules: [{
    ruleId: String,
    ruleName: String,
    matched: Boolean,
    score: Number
  }],
  actions: [{
    type: { type: String, enum: ['flag', 'review', 'block', 'alert', 'monitor'] },
    status: { type: String, enum: ['pending', 'completed', 'failed'] },
    executedAt: Date
  }],
  reviewed: {
    isReviewed: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    decision: { type: String, enum: ['approve', 'reject', 'escalate'] },
    notes: String
  },
  metadata: mongoose.Schema.Types.Mixed,
  calculatedAt: { type: Date, default: Date.now },
  expiresAt: Date
}, { timestamps: true });

RiskScoreSchema.index({ resourceType: 1, resourceId: 1, calculatedAt: -1 });
RiskScoreSchema.index({ level: 1, calculatedAt: -1 });
RiskScoreSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CohortAnalysisSchema = new mongoose.Schema({
  cohortId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  type: { 
    type: String, 
    enum: ['acquisition', 'behavior', 'retention', 'revenue'], 
    required: true 
  },
  definition: {
    criteria: [{
      field: String,
      operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'between'] },
      value: mongoose.Schema.Types.Mixed
    }],
    dateField: String,
    startDate: Date,
    endDate: Date,
    groupBy: { type: String, enum: ['day', 'week', 'month'] }
  },
  members: {
    total: { type: Number, default: 0 },
    userIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  metrics: [{
    period: String,
    date: Date,
    activeUsers: Number,
    newUsers: Number,
    retainedUsers: Number,
    churnedUsers: Number,
    retentionRate: Number,
    churnRate: Number,
    avgEngagement: Number,
    totalRevenue: Number,
    avgRevenuePerUser: Number
  }],
  insights: [{
    type: { type: String, enum: ['trend', 'pattern', 'anomaly', 'opportunity'] },
    title: String,
    description: String,
    confidence: Number,
    detectedAt: Date
  }],
  comparison: {
    baseline: String,
    difference: Number,
    percentChange: Number,
    significance: Number
  },
  lastCalculated: Date,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' }
}, { timestamps: true });

CohortAnalysisSchema.index({ owner: 1, type: 1 });
CohortAnalysisSchema.index({ type: 1, 'definition.startDate': -1 });

const EventCorrelationSchema = new mongoose.Schema({
  correlationId: { type: String, required: true, unique: true, index: true },
  name: String,
  events: [{
    eventType: String,
    eventId: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
    metadata: mongoose.Schema.Types.Mixed
  }],
  pattern: {
    type: { type: String, enum: ['sequential', 'concurrent', 'causal'] },
    timeWindow: Number,
    minOccurrences: Number
  },
  correlation: {
    strength: { type: Number, min: 0, max: 1 },
    confidence: Number,
    support: Number,
    lift: Number
  },
  insights: String,
  actions: [{
    type: String,
    description: String,
    automated: Boolean
  }],
  detectedAt: { type: Date, default: Date.now },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
}, { timestamps: true });

EventCorrelationSchema.index({ 'events.eventType': 1, detectedAt: -1 });

const PredictiveMaintenanceSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice', required: true, index: true },
  component: String,
  prediction: {
    failureProbability: { type: Number, min: 0, max: 1 },
    estimatedTimeToFailure: Number,
    confidenceLevel: Number,
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] }
  },
  indicators: [{
    metric: String,
    currentValue: Number,
    normalRange: { min: Number, max: Number },
    trend: { type: String, enum: ['stable', 'increasing', 'decreasing'] },
    anomalyScore: Number
  }],
  recommendations: [{
    action: String,
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
    estimatedCost: Number,
    estimatedDowntime: Number,
    deadline: Date
  }],
  schedule: {
    scheduledDate: Date,
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'scheduled', 'completed', 'cancelled'] }
  },
  history: [{
    timestamp: Date,
    failureProbability: Number,
    action: String
  }],
  lastAnalysis: { type: Date, default: Date.now },
  nextAnalysis: Date
}, { timestamps: true });

PredictiveMaintenanceSchema.index({ device: 1, lastAnalysis: -1 });
PredictiveMaintenanceSchema.index({ 'prediction.riskLevel': 1, nextAnalysis: 1 });

const ForecastDashboardSchema = new mongoose.Schema({
  dashboardId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  widgets: [{
    widgetId: String,
    type: { type: String, enum: ['trend', 'forecast', 'comparison', 'alert', 'metric'] },
    title: String,
    metric: String,
    visualization: { type: String, enum: ['line', 'bar', 'area', 'gauge', 'number'] },
    config: mongoose.Schema.Types.Mixed,
    position: { x: Number, y: Number, w: Number, h: Number }
  }],
  filters: {
    dateRange: {
      start: Date,
      end: Date
    },
    metrics: [String],
    groupBy: String
  },
  refreshInterval: { type: Number, default: 300000 },
  lastRefresh: Date,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit'] }
  }],
  isPublic: { type: Boolean, default: false },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }
}, { timestamps: true });

ForecastDashboardSchema.index({ owner: 1 });

module.exports = {
  TrendAlert: mongoose.model('TrendAlert', TrendAlertSchema),
  ForecastRule: mongoose.model('ForecastRule', ForecastRuleSchema),
  RiskScore: mongoose.model('RiskScore', RiskScoreSchema),
  CohortAnalysis: mongoose.model('CohortAnalysis', CohortAnalysisSchema),
  EventCorrelation: mongoose.model('EventCorrelation', EventCorrelationSchema),
  PredictiveMaintenanceSchema: mongoose.model('PredictiveMaintenance', PredictiveMaintenanceSchema),
  ForecastDashboard: mongoose.model('ForecastDashboard', ForecastDashboardSchema)
};
