const mongoose = require('mongoose');
const crypto = require('crypto');

const RetentionPolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  resourceType: { type: String, required: true },
  retentionPeriod: { type: Number, required: true },
  retentionUnit: { type: String, enum: ['days', 'months', 'years'], default: 'days' },
  action: { type: String, enum: ['delete', 'archive', 'anonymize'], default: 'archive' },
  conditions: mongoose.Schema.Types.Mixed,
  enabled: { type: Boolean, default: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastRun: Date,
  nextRun: Date,
  itemsProcessed: { type: Number, default: 0 }
}, { timestamps: true });

const DocumentArchiveSchema = new mongoose.Schema({
  originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
  resourceType: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  dataHash: String,
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  archivedAt: { type: Date, default: Date.now },
  retentionPolicy: { type: mongoose.Schema.Types.ObjectId, ref: 'RetentionPolicy' },
  deleteAfter: Date,
  encrypted: { type: Boolean, default: false },
  encryptionKey: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

DocumentArchiveSchema.index({ originalId: 1, resourceType: 1 });
DocumentArchiveSchema.index({ deleteAfter: 1 });

const SessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionToken: { type: String, required: true, unique: true },
  refreshToken: String,
  deviceId: String,
  deviceName: String,
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'other'] },
  platform: String,
  browser: String,
  ipAddress: { type: String, required: true },
  location: {
    country: String,
    region: String,
    city: String
  },
  userAgent: String,
  createdAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  active: { type: Boolean, default: true },
  terminatedAt: Date,
  terminationReason: String
}, { timestamps: true });

SessionSchema.index({ sessionToken: 1 });
SessionSchema.index({ userId: 1, active: 1 });
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

SessionSchema.methods.isValid = function() {
  return this.active && this.expiresAt > new Date();
};

SessionSchema.methods.terminate = async function(reason) {
  this.active = false;
  this.terminatedAt = new Date();
  this.terminationReason = reason;
  await this.save();
};

const SecurityIncidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['breach', 'intrusion', 'ddos', 'malware', 'phishing', 'unauthorized_access', 'data_leak', 'other'],
    required: true 
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  status: { type: String, enum: ['detected', 'investigating', 'contained', 'resolved', 'closed'], default: 'detected' },
  description: { type: String, required: true },
  detectedAt: { type: Date, default: Date.now },
  detectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  affectedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  affectedSystems: [String],
  indicators: mongoose.Schema.Types.Mixed,
  timeline: [{
    event: String,
    timestamp: { type: Date, default: Date.now },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    details: String
  }],
  mitigation: {
    actions: [String],
    completedAt: Date,
    effectiveness: String
  },
  postMortem: {
    rootCause: String,
    impact: String,
    lessonsLearned: [String],
    preventiveMeasures: [String],
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

SecurityIncidentSchema.index({ status: 1, severity: 1 });
SecurityIncidentSchema.index({ detectedAt: -1 });

const AccessReviewSchema = new mongoose.Schema({
  reviewId: { type: String, required: true, unique: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope: {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    resources: [String]
  },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  dueDate: Date,
  startedAt: Date,
  completedAt: Date,
  findings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issue: String,
    severity: String,
    recommendation: String,
    action: { type: String, enum: ['revoke', 'modify', 'approve', 'escalate'] },
    actionTaken: Boolean,
    actionAt: Date
  }],
  summary: String
}, { timestamps: true });

const PasswordHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  passwordHash: { type: String, required: true },
  changedAt: { type: Date, default: Date.now }
}, { timestamps: true });

PasswordHistorySchema.index({ userId: 1, changedAt: -1 });

const SecureBackupSchema = new mongoose.Schema({
  backupId: { type: String, required: true, unique: true },
  type: { type: String, enum: ['full', 'incremental', 'differential'], required: true },
  scope: [String],
  location: { type: String, required: true },
  size: Number,
  encrypted: { type: Boolean, default: true },
  encryptionAlgorithm: String,
  keyId: String,
  checksum: String,
  status: { type: String, enum: ['initiated', 'in_progress', 'completed', 'failed'], default: 'initiated' },
  startedAt: Date,
  completedAt: Date,
  error: String,
  metadata: mongoose.Schema.Types.Mixed,
  retentionPeriod: Number,
  deleteAfter: Date,
  verified: { type: Boolean, default: false },
  verifiedAt: Date
}, { timestamps: true });

SecureBackupSchema.index({ backupId: 1 });
SecureBackupSchema.index({ deleteAfter: 1 });

const EncryptionKeySchema = new mongoose.Schema({
  keyId: { type: String, required: true, unique: true },
  algorithm: { type: String, required: true },
  keyMaterial: { type: String, required: true },
  status: { type: String, enum: ['active', 'rotating', 'retired', 'compromised'], default: 'active' },
  purpose: { type: String, enum: ['data', 'backup', 'transport', 'signing'], required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date,
  rotationSchedule: {
    frequency: Number,
    unit: { type: String, enum: ['days', 'months', 'years'] },
    nextRotation: Date
  },
  rotationHistory: [{
    rotatedAt: Date,
    previousKeyId: String,
    reason: String
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

EncryptionKeySchema.index({ keyId: 1 });
EncryptionKeySchema.index({ status: 1, purpose: 1 });

const ComplianceCheckSchema = new mongoose.Schema({
  framework: { type: String, enum: ['gdpr', 'hipaa', 'iso27001', 'soc2', 'pci_dss'], required: true },
  checkType: { type: String, required: true },
  status: { type: String, enum: ['compliant', 'non_compliant', 'partial', 'not_applicable'], required: true },
  checkedAt: { type: Date, default: Date.now },
  checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  evidence: [{
    type: String,
    description: String,
    url: String,
    verifiedAt: Date
  }],
  issues: [{
    description: String,
    severity: String,
    remediation: String,
    dueDate: Date,
    resolved: Boolean,
    resolvedAt: Date
  }],
  nextCheck: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ComplianceCheckSchema.index({ framework: 1, checkedAt: -1 });

const GovernancePolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  rules: [{
    condition: mongoose.Schema.Types.Mixed,
    action: String,
    enforcement: { type: String, enum: ['mandatory', 'recommended', 'optional'], default: 'mandatory' }
  }],
  scope: {
    tenants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
  },
  enabled: { type: Boolean, default: true },
  effectiveFrom: Date,
  effectiveUntil: Date,
  version: { type: Number, default: 1 },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date
}, { timestamps: true });

const LoginAttemptSchema = new mongoose.Schema({
  email: String,
  username: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  success: { type: Boolean, required: true },
  method: { type: String, enum: ['password', 'oauth', 'magic_link', 'biometric', '2fa'], required: true },
  ipAddress: { type: String, required: true },
  userAgent: String,
  location: {
    country: String,
    region: String,
    city: String
  },
  failureReason: String,
  timestamp: { type: Date, default: Date.now, index: true },
  blocked: { type: Boolean, default: false }
}, { timestamps: true });

LoginAttemptSchema.index({ userId: 1, timestamp: -1 });
LoginAttemptSchema.index({ ipAddress: 1, timestamp: -1 });
LoginAttemptSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const SecurityAuditSchema = new mongoose.Schema({
  auditType: { type: String, required: true },
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scope: mongoose.Schema.Types.Mixed,
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' },
  findings: [{
    category: String,
    severity: String,
    description: String,
    recommendation: String,
    evidence: mongoose.Schema.Types.Mixed
  }],
  summary: String,
  report: {
    url: String,
    generatedAt: Date
  }
}, { timestamps: true });

const RetentionPolicy = mongoose.model('RetentionPolicy', RetentionPolicySchema);
const DocumentArchive = mongoose.model('DocumentArchive', DocumentArchiveSchema);
const Session = mongoose.model('Session', SessionSchema);
const SecurityIncident = mongoose.model('SecurityIncident', SecurityIncidentSchema);
const AccessReview = mongoose.model('AccessReview', AccessReviewSchema);
const PasswordHistory = mongoose.model('PasswordHistory', PasswordHistorySchema);
const SecureBackup = mongoose.model('SecureBackup', SecureBackupSchema);
const EncryptionKey = mongoose.model('EncryptionKey', EncryptionKeySchema);
const ComplianceCheck = mongoose.model('ComplianceCheck', ComplianceCheckSchema);
const GovernancePolicy = mongoose.model('GovernancePolicy', GovernancePolicySchema);
const LoginAttempt = mongoose.model('LoginAttempt', LoginAttemptSchema);
const SecurityAudit = mongoose.model('SecurityAudit', SecurityAuditSchema);

module.exports = {
  RetentionPolicy,
  DocumentArchive,
  Session,
  SecurityIncident,
  AccessReview,
  PasswordHistory,
  SecureBackup,
  EncryptionKey,
  ComplianceCheck,
  GovernancePolicy,
  LoginAttempt,
  SecurityAudit
};
