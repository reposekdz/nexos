const mongoose = require('mongoose');
const crypto = require('crypto');

const IoTDeviceSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['sensor', 'camera', 'actuator', 'gateway', 'wearable', 'smart_home', 'industrial', 'medical', 'other'],
    required: true 
  },
  manufacturer: String,
  model: String,
  serialNumber: String,
  firmwareVersion: String,
  hardwareVersion: String,
  status: { 
    type: String, 
    enum: ['online', 'offline', 'maintenance', 'error', 'updating'], 
    default: 'offline',
    index: true
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] },
    address: String,
    building: String,
    floor: String,
    room: String
  },
  connectivity: {
    protocol: { type: String, enum: ['mqtt', 'http', 'websocket', 'coap', 'bluetooth', 'zigbee', 'lora'], default: 'mqtt' },
    ipAddress: String,
    macAddress: String,
    signalStrength: Number,
    bandwidth: Number,
    lastSeen: Date
  },
  health: {
    battery: Number,
    temperature: Number,
    cpuUsage: Number,
    memoryUsage: Number,
    storageUsage: Number,
    uptime: Number,
    errorCount: { type: Number, default: 0 },
    lastHealthCheck: Date
  },
  capabilities: [{
    name: String,
    type: { type: String, enum: ['read', 'write', 'execute'] },
    dataType: String,
    unit: String,
    minValue: Number,
    maxValue: Number
  }],
  configuration: mongoose.Schema.Types.Mixed,
  security: {
    encrypted: { type: Boolean, default: true },
    authMethod: { type: String, enum: ['token', 'certificate', 'key', 'oauth'], default: 'token' },
    authToken: String,
    certificateId: String,
    lastAuthUpdate: Date,
    accessPolicy: String
  },
  metadata: mongoose.Schema.Types.Mixed,
  tags: [String],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeviceGroup' }],
  alertsEnabled: { type: Boolean, default: true },
  dataRetentionDays: { type: Number, default: 90 },
  registeredAt: { type: Date, default: Date.now },
  lastCommand: {
    commandId: String,
    type: String,
    status: String,
    timestamp: Date
  }
}, { timestamps: true });

IoTDeviceSchema.index({ owner: 1, status: 1 });
IoTDeviceSchema.index({ tenantId: 1, type: 1 });
IoTDeviceSchema.index({ 'location.coordinates': '2dsphere' });
IoTDeviceSchema.index({ tags: 1 });

IoTDeviceSchema.methods.updateHealth = function(healthData) {
  Object.assign(this.health, healthData);
  this.health.lastHealthCheck = new Date();
  this.connectivity.lastSeen = new Date();
};

IoTDeviceSchema.methods.isHealthy = function() {
  const { battery, temperature, cpuUsage, memoryUsage } = this.health;
  return battery > 20 && temperature < 80 && cpuUsage < 90 && memoryUsage < 90;
};

const DeviceCommandSchema = new mongoose.Schema({
  commandId: { type: String, required: true, unique: true, index: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice', required: true, index: true },
  type: { 
    type: String, 
    enum: ['reboot', 'update', 'configure', 'read', 'write', 'execute', 'reset', 'shutdown', 'custom'],
    required: true 
  },
  command: { type: String, required: true },
  parameters: mongoose.Schema.Types.Mixed,
  priority: { type: String, enum: ['low', 'normal', 'high', 'critical'], default: 'normal' },
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'received', 'executing', 'completed', 'failed', 'timeout', 'cancelled'],
    default: 'pending',
    index: true
  },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issuedAt: { type: Date, default: Date.now },
  sentAt: Date,
  receivedAt: Date,
  executedAt: Date,
  completedAt: Date,
  timeout: { type: Number, default: 30000 },
  result: mongoose.Schema.Types.Mixed,
  error: {
    code: String,
    message: String,
    details: mongoose.Schema.Types.Mixed
  },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 3 }
}, { timestamps: true });

DeviceCommandSchema.index({ device: 1, status: 1 });
DeviceCommandSchema.index({ issuedAt: -1 });

const FirmwareVersionSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  deviceType: { type: String, required: true },
  manufacturer: String,
  releaseDate: { type: Date, required: true },
  description: String,
  fileUrl: String,
  fileSize: Number,
  checksum: { type: String, required: true },
  checksumAlgorithm: { type: String, default: 'sha256' },
  changelog: [String],
  requiredVersion: String,
  features: [String],
  bugFixes: [String],
  securityPatches: [String],
  status: { 
    type: String, 
    enum: ['draft', 'testing', 'stable', 'deprecated'], 
    default: 'draft' 
  },
  downloadCount: { type: Number, default: 0 },
  successfulInstalls: { type: Number, default: 0 },
  failedInstalls: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

FirmwareVersionSchema.index({ deviceType: 1, status: 1 });
FirmwareVersionSchema.index({ version: 1 });

const FirmwareUpdateSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice', required: true, index: true },
  fromVersion: String,
  toVersion: { type: String, required: true },
  firmware: { type: mongoose.Schema.Types.ObjectId, ref: 'FirmwareVersion', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'downloading', 'downloaded', 'installing', 'verifying', 'completed', 'failed', 'rolled_back'],
    default: 'pending',
    index: true
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  startedAt: Date,
  completedAt: Date,
  duration: Number,
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rollbackAvailable: { type: Boolean, default: true },
  error: {
    code: String,
    message: String,
    phase: String
  },
  logs: [{
    timestamp: { type: Date, default: Date.now },
    level: { type: String, enum: ['info', 'warning', 'error'] },
    message: String
  }]
}, { timestamps: true });

FirmwareUpdateSchema.index({ device: 1, status: 1 });
FirmwareUpdateSchema.index({ startedAt: -1 });

const DeviceMetricSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice', required: true, index: true },
  metricType: { type: String, required: true, index: true },
  value: { type: Number, required: true },
  unit: String,
  quality: { type: Number, min: 0, max: 100 },
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, index: true },
  aggregation: {
    period: { type: String, enum: ['1m', '5m', '15m', '1h', '1d'] },
    min: Number,
    max: Number,
    avg: Number,
    count: Number
  }
}, { timestamps: true });

DeviceMetricSchema.index({ device: 1, metricType: 1, timestamp: -1 });
DeviceMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const DeviceAlertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true, index: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice', required: true, index: true },
  type: { 
    type: String, 
    enum: ['offline', 'low_battery', 'high_temperature', 'error', 'threshold', 'security', 'maintenance', 'custom'],
    required: true,
    index: true
  },
  severity: { 
    type: String, 
    enum: ['info', 'warning', 'critical', 'emergency'], 
    default: 'warning',
    index: true
  },
  title: { type: String, required: true },
  message: String,
  metric: String,
  threshold: Number,
  currentValue: Number,
  condition: String,
  triggeredAt: { type: Date, default: Date.now },
  acknowledgedAt: Date,
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { 
    type: String, 
    enum: ['active', 'acknowledged', 'resolved', 'ignored'], 
    default: 'active',
    index: true
  },
  actions: [{
    type: { type: String, enum: ['email', 'sms', 'push', 'webhook', 'command'] },
    target: String,
    executedAt: Date,
    status: String,
    response: mongoose.Schema.Types.Mixed
  }],
  recurrence: {
    count: { type: Number, default: 1 },
    lastOccurrence: Date,
    suppressUntil: Date
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

DeviceAlertSchema.index({ device: 1, status: 1 });
DeviceAlertSchema.index({ triggeredAt: -1 });
DeviceAlertSchema.index({ type: 1, severity: 1 });

const DeviceGroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['manual', 'dynamic', 'location', 'capability'], default: 'manual' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  devices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice' }],
  rules: [{
    field: String,
    operator: { type: String, enum: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'] },
    value: mongoose.Schema.Types.Mixed
  }],
  tags: [String],
  permissions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['viewer', 'operator', 'admin'] }
  }]
}, { timestamps: true });

DeviceGroupSchema.index({ owner: 1, tenantId: 1 });

const EdgeCacheSchema = new mongoose.Schema({
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'IoTDevice', required: true, index: true },
  dataType: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  cachedAt: { type: Date, default: Date.now },
  syncedAt: Date,
  syncStatus: { 
    type: String, 
    enum: ['pending', 'syncing', 'synced', 'failed'], 
    default: 'pending' 
  },
  priority: { type: Number, default: 5 },
  retryCount: { type: Number, default: 0 },
  expiresAt: Date
}, { timestamps: true });

EdgeCacheSchema.index({ device: 1, syncStatus: 1 });
EdgeCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = {
  IoTDevice: mongoose.model('IoTDevice', IoTDeviceSchema),
  DeviceCommand: mongoose.model('DeviceCommand', DeviceCommandSchema),
  FirmwareVersion: mongoose.model('FirmwareVersion', FirmwareVersionSchema),
  FirmwareUpdate: mongoose.model('FirmwareUpdate', FirmwareUpdateSchema),
  DeviceMetric: mongoose.model('DeviceMetric', DeviceMetricSchema),
  DeviceAlert: mongoose.model('DeviceAlert', DeviceAlertSchema),
  DeviceGroup: mongoose.model('DeviceGroup', DeviceGroupSchema),
  EdgeCache: mongoose.model('EdgeCache', EdgeCacheSchema)
};
