const mongoose = require('mongoose');
const crypto = require('crypto');

const PluginSchema = new mongoose.Schema({
  pluginId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  displayName: String,
  description: String,
  version: { type: String, required: true },
  author: {
    name: String,
    email: String,
    url: String
  },
  category: { 
    type: String, 
    enum: ['analytics', 'integration', 'automation', 'ui', 'storage', 'security', 'communication', 'utility'],
    required: true,
    index: true
  },
  type: { 
    type: String, 
    enum: ['backend', 'frontend', 'fullstack'], 
    default: 'backend' 
  },
  status: { 
    type: String, 
    enum: ['draft', 'pending_review', 'approved', 'rejected', 'deprecated'],
    default: 'draft',
    index: true
  },
  icon: String,
  banner: String,
  screenshots: [String],
  documentation: {
    readme: String,
    changelog: String,
    installation: String,
    configuration: String,
    apiReference: String
  },
  repository: {
    type: { type: String, enum: ['git', 'npm', 'custom'] },
    url: String,
    branch: String
  },
  package: {
    url: String,
    checksum: String,
    size: Number,
    format: { type: String, enum: ['zip', 'tar', 'npm'] }
  },
  dependencies: [{
    name: String,
    version: String,
    required: Boolean
  }],
  permissions: [{
    scope: String,
    actions: [String],
    reason: String
  }],
  hooks: [{
    event: String,
    handler: String,
    priority: Number
  }],
  config: {
    schema: mongoose.Schema.Types.Mixed,
    defaults: mongoose.Schema.Types.Mixed
  },
  endpoints: [{
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
    path: String,
    handler: String,
    auth: Boolean,
    rateLimit: Number
  }],
  ui: {
    routes: [{
      path: String,
      component: String,
      exact: Boolean
    }],
    widgets: [{
      id: String,
      name: String,
      component: String,
      placement: [String]
    }],
    menus: [{
      label: String,
      icon: String,
      path: String,
      order: Number
    }]
  },
  pricing: {
    model: { type: String, enum: ['free', 'freemium', 'subscription', 'one_time'], default: 'free' },
    price: Number,
    currency: String,
    trial: {
      enabled: Boolean,
      days: Number
    }
  },
  compatibility: {
    minVersion: String,
    maxVersion: String,
    platforms: [String]
  },
  statistics: {
    downloads: { type: Number, default: 0 },
    installations: { type: Number, default: 0 },
    activeInstallations: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 }
  },
  verified: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  tags: [String],
  license: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publishedAt: Date
}, { timestamps: true });

PluginSchema.index({ category: 1, status: 1 });
PluginSchema.index({ 'statistics.downloads': -1 });
PluginSchema.index({ 'statistics.rating': -1 });

const PluginInstallationSchema = new mongoose.Schema({
  plugin: { type: mongoose.Schema.Types.ObjectId, ref: 'Plugin', required: true, index: true },
  pluginId: String,
  pluginVersion: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', index: true },
  status: { 
    type: String, 
    enum: ['installing', 'active', 'disabled', 'updating', 'uninstalling', 'failed'],
    default: 'installing',
    index: true
  },
  configuration: mongoose.Schema.Types.Mixed,
  apiKey: String,
  webhookSecret: String,
  installedAt: { type: Date, default: Date.now },
  lastUpdated: Date,
  lastUsed: Date,
  autoUpdate: { type: Boolean, default: true },
  usage: {
    apiCalls: { type: Number, default: 0 },
    dataProcessed: { type: Number, default: 0 },
    errors: { type: Number, default: 0 }
  },
  subscription: {
    plan: String,
    status: { type: String, enum: ['trial', 'active', 'suspended', 'cancelled'] },
    startDate: Date,
    endDate: Date,
    autoRenew: Boolean
  },
  errors: [{
    timestamp: Date,
    type: String,
    message: String,
    stack: String
  }]
}, { timestamps: true });

PluginInstallationSchema.index({ plugin: 1, tenantId: 1 }, { unique: true });
PluginInstallationSchema.index({ user: 1, status: 1 });

const PluginHookSchema = new mongoose.Schema({
  installation: { type: mongoose.Schema.Types.ObjectId, ref: 'PluginInstallation', required: true, index: true },
  hookName: { type: String, required: true, index: true },
  event: { type: String, required: true },
  priority: { type: Number, default: 10 },
  handler: String,
  config: mongoose.Schema.Types.Mixed,
  enabled: { type: Boolean, default: true },
  executionCount: { type: Number, default: 0 },
  lastExecuted: Date,
  avgExecutionTime: Number,
  failureCount: { type: Number, default: 0 }
}, { timestamps: true });

PluginHookSchema.index({ event: 1, priority: 1 });
PluginHookSchema.index({ installation: 1, event: 1 });

const PluginEventLogSchema = new mongoose.Schema({
  installation: { type: mongoose.Schema.Types.ObjectId, ref: 'PluginInstallation', required: true, index: true },
  eventType: { 
    type: String, 
    enum: ['install', 'uninstall', 'enable', 'disable', 'update', 'config_change', 'hook_execution', 'error'],
    required: true,
    index: true
  },
  details: mongoose.Schema.Types.Mixed,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  success: { type: Boolean, default: true },
  duration: Number,
  error: {
    message: String,
    stack: String
  },
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

PluginEventLogSchema.index({ installation: 1, timestamp: -1 });
PluginEventLogSchema.index({ eventType: 1, timestamp: -1 });

const PluginReviewSchema = new mongoose.Schema({
  plugin: { type: mongoose.Schema.Types.ObjectId, ref: 'Plugin', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  review: String,
  pros: [String],
  cons: [String],
  version: String,
  verified: { type: Boolean, default: false },
  helpful: { type: Number, default: 0 },
  helpfulBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  response: {
    text: String,
    respondedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    respondedAt: Date
  },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

PluginReviewSchema.index({ plugin: 1, rating: -1 });
PluginReviewSchema.index({ user: 1, plugin: 1 }, { unique: true });

const PluginMarketplaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['public', 'private', 'enterprise'], default: 'public' },
  url: String,
  apiEndpoint: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  curated: { type: Boolean, default: false },
  requiresApproval: { type: Boolean, default: true },
  featured: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Plugin' }],
  categories: [{
    name: String,
    icon: String,
    order: Number
  }],
  policies: {
    allowThirdParty: { type: Boolean, default: true },
    requireVerification: { type: Boolean, default: true },
    autoUpdate: { type: Boolean, default: false }
  },
  statistics: {
    totalPlugins: { type: Number, default: 0 },
    totalDownloads: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 }
  },
  active: { type: Boolean, default: true }
}, { timestamps: true });

const PluginAPIKeySchema = new mongoose.Schema({
  installation: { type: mongoose.Schema.Types.ObjectId, ref: 'PluginInstallation', required: true, index: true },
  key: { type: String, required: true, unique: true, index: true },
  secret: String,
  name: String,
  scopes: [String],
  permissions: [String],
  rateLimit: {
    requests: Number,
    period: Number,
    currentUsage: { type: Number, default: 0 },
    resetAt: Date
  },
  ipWhitelist: [String],
  active: { type: Boolean, default: true },
  expiresAt: Date,
  lastUsed: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

PluginAPIKeySchema.index({ key: 1, active: 1 });
PluginAPIKeySchema.index({ installation: 1, active: 1 });

module.exports = {
  Plugin: mongoose.model('Plugin', PluginSchema),
  PluginInstallation: mongoose.model('PluginInstallation', PluginInstallationSchema),
  PluginHook: mongoose.model('PluginHook', PluginHookSchema),
  PluginEventLog: mongoose.model('PluginEventLog', PluginEventLogSchema),
  PluginReview: mongoose.model('PluginReview', PluginReviewSchema),
  PluginMarketplace: mongoose.model('PluginMarketplace', PluginMarketplaceSchema),
  PluginAPIKey: mongoose.model('PluginAPIKey', PluginAPIKeySchema)
};
