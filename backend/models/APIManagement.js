const mongoose = require('mongoose');
const crypto = require('crypto');

const WebhookDeliveryLogSchema = new mongoose.Schema({
  webhookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Webhook', required: true, index: true },
  endpoint: { type: String, required: true },
  event: { type: String, required: true },
  payload: mongoose.Schema.Types.Mixed,
  signature: String,
  signatureAlgorithm: { type: String, default: 'sha256' },
  timestamp: { type: Date, default: Date.now },
  nonce: String,
  attempt: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'success', 'failed', 'retrying'], default: 'pending' },
  statusCode: Number,
  response: mongoose.Schema.Types.Mixed,
  error: String,
  duration: Number,
  deliveredAt: Date,
  nextRetryAt: Date
}, { timestamps: true });

WebhookDeliveryLogSchema.index({ webhookId: 1, timestamp: -1 });
WebhookDeliveryLogSchema.index({ status: 1, nextRetryAt: 1 });

const WebhookSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  secret: { type: String, required: true },
  events: [{ type: String, required: true }],
  enabled: { type: Boolean, default: true },
  retryPolicy: {
    maxAttempts: { type: Number, default: 3 },
    backoffType: { type: String, enum: ['linear', 'exponential'], default: 'exponential' },
    initialDelay: { type: Number, default: 1000 },
    maxDelay: { type: Number, default: 60000 }
  },
  timeout: { type: Number, default: 30000 },
  headers: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const ApiKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true },
  keyPrefix: { type: String, required: true },
  scopes: [{ type: String, required: true }],
  rateLimit: {
    requests: { type: Number, default: 1000 },
    window: { type: Number, default: 3600000 }
  },
  ipWhitelist: [String],
  allowedOrigins: [String],
  expiresAt: Date,
  lastUsed: Date,
  usageCount: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ApiKeySchema.index({ keyHash: 1 });
ApiKeySchema.index({ userId: 1, enabled: 1 });

const ApiUsageSchema = new mongoose.Schema({
  apiKeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  statusCode: Number,
  duration: Number,
  requestSize: Number,
  responseSize: Number,
  ipAddress: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now, index: true },
  error: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ApiUsageSchema.index({ apiKeyId: 1, timestamp: -1 });
ApiUsageSchema.index({ userId: 1, timestamp: -1 });
ApiUsageSchema.index({ endpoint: 1, timestamp: -1 });

const ServiceAccountSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  clientId: { type: String, required: true, unique: true },
  clientSecretHash: { type: String, required: true },
  scopes: [{ type: String, required: true }],
  permissions: mongoose.Schema.Types.Mixed,
  rateLimit: {
    requests: { type: Number, default: 5000 },
    window: { type: Number, default: 3600000 }
  },
  ipWhitelist: [String],
  enabled: { type: Boolean, default: true },
  expiresAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

const IdempotencyKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  requestHash: { type: String, required: true },
  statusCode: Number,
  response: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true, index: true }
}, { timestamps: true });

IdempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ApiContractSchema = new mongoose.Schema({
  name: { type: String, required: true },
  version: { type: String, required: true },
  spec: mongoose.Schema.Types.Mixed,
  specFormat: { type: String, enum: ['openapi', 'swagger', 'graphql'], default: 'openapi' },
  endpoints: [{
    path: String,
    method: String,
    deprecated: { type: Boolean, default: false },
    deprecationDate: Date,
    sunsetDate: Date
  }],
  enabled: { type: Boolean, default: true },
  enforceValidation: { type: Boolean, default: true },
  publishedAt: Date,
  changelog: [{
    version: String,
    changes: [String],
    publishedAt: Date
  }]
}, { timestamps: true });

const ApiDeprecationSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  version: { type: String, required: true },
  deprecatedAt: { type: Date, default: Date.now },
  sunsetDate: { type: Date, required: true },
  reason: String,
  migrationGuide: String,
  alternativeEndpoint: String,
  notificationsSent: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentAt: Date,
    channel: String
  }]
}, { timestamps: true });

const RateLimitRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  endpoint: String,
  method: String,
  scope: { type: String, enum: ['global', 'user', 'ip', 'api_key'], default: 'user' },
  limit: { type: Number, required: true },
  window: { type: Number, required: true },
  burst: Number,
  penalty: {
    type: { type: String, enum: ['block', 'throttle', 'captcha'], default: 'block' },
    duration: Number
  },
  whitelist: [String],
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 0 }
}, { timestamps: true });

const CircuitBreakerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  service: { type: String, required: true },
  endpoint: String,
  state: { type: String, enum: ['closed', 'open', 'half_open'], default: 'closed' },
  failureThreshold: { type: Number, default: 5 },
  successThreshold: { type: Number, default: 2 },
  timeout: { type: Number, default: 60000 },
  consecutiveFailures: { type: Number, default: 0 },
  consecutiveSuccesses: { type: Number, default: 0 },
  lastFailureAt: Date,
  lastSuccessAt: Date,
  nextAttemptAt: Date,
  totalCalls: { type: Number, default: 0 },
  successfulCalls: { type: Number, default: 0 },
  failedCalls: { type: Number, default: 0 },
  history: [{
    state: String,
    timestamp: Date,
    reason: String
  }]
}, { timestamps: true });

const WebhookDeliveryLog = mongoose.model('WebhookDeliveryLog', WebhookDeliveryLogSchema);
const Webhook = mongoose.model('Webhook', WebhookSchema);
const ApiKey = mongoose.model('ApiKey', ApiKeySchema);
const ApiUsage = mongoose.model('ApiUsage', ApiUsageSchema);
const ServiceAccount = mongoose.model('ServiceAccount', ServiceAccountSchema);
const IdempotencyKey = mongoose.model('IdempotencyKey', IdempotencyKeySchema);
const ApiContract = mongoose.model('ApiContract', ApiContractSchema);
const ApiDeprecation = mongoose.model('ApiDeprecation', ApiDeprecationSchema);
const RateLimitRule = mongoose.model('RateLimitRule', RateLimitRuleSchema);
const CircuitBreaker = mongoose.model('CircuitBreaker', CircuitBreakerSchema);

module.exports = {
  WebhookDeliveryLog,
  Webhook,
  ApiKey,
  ApiUsage,
  ServiceAccount,
  IdempotencyKey,
  ApiContract,
  ApiDeprecation,
  RateLimitRule,
  CircuitBreaker
};
