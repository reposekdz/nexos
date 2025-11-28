const mongoose = require('mongoose');
const crypto = require('crypto');

const AuditLedgerSchema = new mongoose.Schema({
  sequenceNumber: { type: Number, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: mongoose.Schema.Types.ObjectId,
  changes: mongoose.Schema.Types.Mixed,
  previousHash: { type: String, required: true },
  currentHash: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, immutable: true },
  ipAddress: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

AuditLedgerSchema.index({ sequenceNumber: 1 });
AuditLedgerSchema.index({ userId: 1, timestamp: -1 });
AuditLedgerSchema.index({ resourceType: 1, resourceId: 1 });

AuditLedgerSchema.statics.append = async function(entry) {
  const lastEntry = await this.findOne().sort({ sequenceNumber: -1 });
  const sequenceNumber = (lastEntry?.sequenceNumber || 0) + 1;
  const previousHash = lastEntry?.currentHash || '0000000000000000';
  
  const entryData = JSON.stringify({
    ...entry,
    sequenceNumber,
    previousHash,
    timestamp: new Date()
  });
  
  const currentHash = crypto.createHash('sha256').update(entryData).digest('hex');
  
  return await this.create({
    ...entry,
    sequenceNumber,
    previousHash,
    currentHash
  });
};

const ExportManifestSchema = new mongoose.Schema({
  exportId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dataTypes: [{ type: String, required: true }],
  dateRange: {
    from: Date,
    to: Date
  },
  format: { type: String, enum: ['json', 'csv', 'xml', 'pdf'], default: 'json' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending' 
  },
  fileUrl: String,
  fileHash: String,
  fileSize: Number,
  signature: String,
  signatureAlgorithm: String,
  kmsKeyId: String,
  checksum: String,
  recordCount: Number,
  completedAt: Date,
  expiresAt: Date
}, { timestamps: true });

const ApprovalRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resourceType: String,
  resourceId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed,
  requiredApprovals: { type: Number, required: true, default: 2 },
  approvals: [{
    approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approved: Boolean,
    reason: String,
    timestamp: { type: Date, default: Date.now }
  }],
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'executed'],
    default: 'pending' 
  },
  expiresAt: Date,
  executedAt: Date,
  executionResult: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ApprovalRequestSchema.methods.isApproved = function() {
  const approvedCount = this.approvals.filter(a => a.approved === true).length;
  return approvedCount >= this.requiredApprovals;
};

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  permissions: [{ type: String, required: true }],
  inherits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  priority: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const PermissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resourceType: { type: String, required: true },
  resourceId: mongoose.Schema.Types.ObjectId,
  actions: [{ type: String, required: true }],
  constraints: mongoose.Schema.Types.Mixed,
  grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: Date,
  revoked: { type: Boolean, default: false },
  revokedAt: Date,
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

PermissionSchema.index({ userId: 1, resourceType: 1 });

const JITAccessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, required: true },
  permissions: [String],
  reason: { type: String, required: true },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, index: true },
  active: { type: Boolean, default: true },
  revokedAt: Date,
  extensionCount: { type: Number, default: 0 }
}, { timestamps: true });

JITAccessSchema.index({ expiresAt: 1 });

const DSARRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: ['access', 'deletion', 'portability', 'rectification', 'restriction', 'objection'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['submitted', 'verified', 'processing', 'completed', 'rejected'],
    default: 'submitted' 
  },
  verificationMethod: String,
  verifiedAt: Date,
  dataTypes: [String],
  processingLog: [{
    step: String,
    completedAt: Date,
    details: mongoose.Schema.Types.Mixed
  }],
  deletionManifest: {
    collections: [{
      name: String,
      recordsDeleted: Number,
      deletedAt: Date
    }],
    backups: [{
      location: String,
      deletedAt: Date
    }],
    thirdParties: [{
      service: String,
      notifiedAt: Date,
      confirmedAt: Date
    }]
  },
  completedAt: Date,
  proofUrl: String,
  proofSignature: String
}, { timestamps: true });

const PIIDiscoverySchema = new mongoose.Schema({
  collection: { type: String, required: true },
  field: { type: String, required: true },
  piiType: { 
    type: String, 
    enum: ['email', 'phone', 'ssn', 'address', 'name', 'dob', 'ip', 'financial', 'health', 'biometric', 'other'],
    required: true 
  },
  classification: { type: String, enum: ['public', 'internal', 'confidential', 'restricted'], required: true },
  sampleCount: Number,
  encryptionStatus: { type: String, enum: ['encrypted', 'hashed', 'plaintext'], default: 'plaintext' },
  retentionPeriod: Number,
  lastScanned: { type: Date, default: Date.now },
  remediation: {
    required: Boolean,
    action: String,
    completedAt: Date
  }
}, { timestamps: true });

PIIDiscoverySchema.index({ collection: 1, field: 1 }, { unique: true });

const DataLineageSchema = new mongoose.Schema({
  datasetId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['raw', 'processed', 'derived', 'aggregated'], required: true },
  sources: [{
    datasetId: String,
    transformationId: String,
    timestamp: Date
  }],
  transformations: [{
    transformationId: String,
    type: String,
    logic: mongoose.Schema.Types.Mixed,
    timestamp: Date
  }],
  dependencies: [String],
  consumers: [{
    service: String,
    purpose: String,
    timestamp: Date
  }],
  retentionPolicy: String,
  piiContained: Boolean,
  classification: String
}, { timestamps: true });

const ConfigChangeLogSchema = new mongoose.Schema({
  service: { type: String, required: true, index: true },
  environment: { type: String, required: true },
  configKey: { type: String, required: true },
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApprovalRequest' },
  rollbackable: { type: Boolean, default: true },
  rolledBack: { type: Boolean, default: false },
  rolledBackAt: Date
}, { timestamps: true });

ConfigChangeLogSchema.index({ service: 1, environment: 1, createdAt: -1 });

const ReconciliationRecordSchema = new mongoose.Schema({
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  type: { type: String, enum: ['payment', 'inventory', 'financial'], required: true },
  systemBalance: Number,
  providerBalance: Number,
  difference: Number,
  currency: String,
  discrepancies: [{
    transactionId: String,
    amount: Number,
    reason: String,
    resolved: Boolean
  }],
  status: { 
    type: String, 
    enum: ['pending', 'reconciled', 'discrepancies_found', 'escalated'],
    default: 'pending' 
  },
  reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reconciledAt: Date
}, { timestamps: true });

const AuditLedger = mongoose.model('AuditLedger', AuditLedgerSchema);
const ExportManifest = mongoose.model('ExportManifest', ExportManifestSchema);
const ApprovalRequest = mongoose.model('ApprovalRequest', ApprovalRequestSchema);
const Role = mongoose.model('Role', RoleSchema);
const Permission = mongoose.model('Permission', PermissionSchema);
const JITAccess = mongoose.model('JITAccess', JITAccessSchema);
const DSARRequest = mongoose.model('DSARRequest', DSARRequestSchema);
const PIIDiscovery = mongoose.model('PIIDiscovery', PIIDiscoverySchema);
const DataLineage = mongoose.model('DataLineage', DataLineageSchema);
const ConfigChangeLog = mongoose.model('ConfigChangeLog', ConfigChangeLogSchema);
const ReconciliationRecord = mongoose.model('ReconciliationRecord', ReconciliationRecordSchema);

module.exports = {
  AuditLedger,
  ExportManifest,
  ApprovalRequest,
  Role,
  Permission,
  JITAccess,
  DSARRequest,
  PIIDiscovery,
  DataLineage,
  ConfigChangeLog,
  ReconciliationRecord
};
