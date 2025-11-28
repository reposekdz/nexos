const fs = require('fs');
const path = require('path');

console.log('🚀 Nexos Platform - Features 401-453 Complete Implementation\n');

const baseDir = __dirname;
const backendDir = path.join(baseDir, 'backend');
const modelsDir = path.join(backendDir, 'models');
const routesDir = path.join(backendDir, 'routes');
const servicesDir = path.join(backendDir, 'services');
const middlewareDir = path.join(backendDir, 'middleware');

let stats = {
  modelsCreated: 0,
  routesCreated: 0,
  servicesCreated: 0,
  middlewareCreated: 0
};

const models = {
  'SettlementBatch.js': `const mongoose = require('mongoose');

const settlementBatchSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'square', 'braintree', 'manual']
  },
  batchId: { type: String, required: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  transactionCount: { type: Number, default: 0 },
  fileUrl: String,
  fileHash: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'reconciled', 'discrepancy', 'failed'],
    default: 'pending'
  },
  processedAt: Date,
  reconciledAt: Date,
  reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed,
  notes: String
}, { timestamps: true });

settlementBatchSchema.index({ provider: 1, batchId: 1 });
settlementBatchSchema.index({ status: 1, createdAt: -1 });
settlementBatchSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('SettlementBatch', settlementBatchSchema);`,

  'ReconciliationRecord.js': `const mongoose = require('mongoose');

const reconciliationRecordSchema = new mongoose.Schema({
  settlementBatch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SettlementBatch',
    required: true,
    index: true
  },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  providerTransactionId: String,
  status: {
    type: String,
    enum: ['matched', 'unmatched', 'discrepancy', 'resolved', 'disputed'],
    default: 'unmatched'
  },
  matchScore: { type: Number, min: 0, max: 1 },
  providerAmount: Number,
  platformAmount: Number,
  difference: Number,
  discrepancyType: {
    type: String,
    enum: ['amount_mismatch', 'missing_platform', 'missing_provider', 'duplicate', 'timing']
  },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

reconciliationRecordSchema.index({ settlementBatch: 1, status: 1 });
reconciliationRecordSchema.index({ transaction: 1 });
reconciliationRecordSchema.index({ providerTransactionId: 1 });

module.exports = mongoose.model('ReconciliationRecord', reconciliationRecordSchema);`,

  'EmailBounce.js': `const mongoose = require('mongoose');

const emailBounceSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true, lowercase: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bounceType: {
    type: String,
    enum: ['hard', 'soft', 'transient', 'complaint', 'suppression'],
    required: true
  },
  reason: String,
  diagnosticCode: String,
  provider: { type: String, default: 'sendgrid' },
  messageId: String,
  templateId: String,
  bounceCount: { type: Number, default: 1 },
  firstBounceAt: { type: Date, default: Date.now },
  lastBounceAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'suppressed', 'resolved'],
    default: 'active'
  },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

emailBounceSchema.index({ email: 1, bounceType: 1 });
emailBounceSchema.index({ status: 1 });
emailBounceSchema.index({ lastBounceAt: -1 });

module.exports = mongoose.model('EmailBounce', emailBounceSchema);`,

  'EmailUnsubscribe.js': `const mongoose = require('mongoose');

const emailUnsubscribeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  email: { type: String, required: true, lowercase: true },
  categories: [{
    type: String,
    enum: ['marketing', 'promotional', 'newsletter', 'digest', 'social', 'transactional_optional']
  }],
  unsubscribeAll: { type: Boolean, default: false },
  token: { type: String, unique: true, sparse: true },
  tokenExpiry: Date,
  source: { type: String, enum: ['link', 'preference_center', 'support', 'admin'] },
  ipAddress: String,
  userAgent: String,
  canResubscribe: { type: Boolean, default: true },
  resubscribedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

emailUnsubscribeSchema.index({ user: 1, unsubscribeAll: 1 });
emailUnsubscribeSchema.index({ email: 1 });
emailUnsubscribeSchema.index({ token: 1, tokenExpiry: 1 });

module.exports = mongoose.model('EmailUnsubscribe', emailUnsubscribeSchema);`,

  'PhoneVerification.js': `const mongoose = require('mongoose');
const crypto = require('crypto');

const phoneVerificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  phoneNormalized: { type: String, required: true, index: true },
  phoneCountry: String,
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000),
    index: { expires: 0 }
  },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  ipAddress: String,
  userAgent: String,
  provider: { type: String, default: 'twilio' },
  providerMessageId: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

phoneVerificationSchema.index({ phoneNormalized: 1, verified: 1 });
phoneVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

phoneVerificationSchema.statics.hashCode = function(code) {
  return crypto.createHash('sha256').update(code.toString()).digest('hex');
};

phoneVerificationSchema.methods.isValid = function() {
  return !this.verified && this.expiresAt > new Date() && this.attempts < this.maxAttempts;
};

module.exports = mongoose.model('PhoneVerification', phoneVerificationSchema);`,

  'EmergencyContact.js': `const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  relationship: {
    type: String,
    enum: ['parent', 'sibling', 'spouse', 'partner', 'friend', 'other']
  },
  phoneNormalized: { type: String, required: true },
  phoneCountry: String,
  email: { type: String, lowercase: true },
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  verificationToken: String,
  verificationExpiry: Date,
  consentGiven: { type: Boolean, default: false },
  consentAt: Date,
  alertsEnabled: { type: Boolean, default: false },
  alertTypes: [{
    type: String,
    enum: ['account_lockout', 'security_breach', 'inactivity', 'user_request']
  }],
  lastAlertSent: Date,
  alertCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

emergencyContactSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('EmergencyContact', emergencyContactSchema);`,

  'LegalExportJob.js': `const mongoose = require('mongoose');

const legalExportJobSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  caseNumber: String,
  requestType: {
    type: String,
    enum: ['law_enforcement', 'court_order', 'subpoena', 'warrant', 'gdpr', 'other'],
    required: true
  },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requesterInfo: {
    organization: String,
    name: String,
    email: String,
    phone: String,
    jurisdiction: String
  },
  dataTypes: [{
    type: String,
    enum: ['profile', 'posts', 'messages', 'contacts', 'activity', 'transactions', 'all']
  }],
  dateRange: {
    start: Date,
    end: Date
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'processing', 'completed', 'rejected', 'failed'],
    default: 'pending_approval'
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: Date,
  exportUrl: String,
  exportHash: String,
  exportSize: Number,
  expiresAt: Date,
  downloadedAt: Date,
  downloadedBy: String,
  redactionApplied: { type: Boolean, default: false },
  encryptionKey: String,
  auditLog: [{
    action: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    notes: String
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

legalExportJobSchema.index({ requestId: 1 });
legalExportJobSchema.index({ targetUser: 1 });
legalExportJobSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('LegalExportJob', legalExportJobSchema);`,

  'ArchivedPost.js': `const mongoose = require('mongoose');

const archivedPostSchema = new mongoose.Schema({
  originalPostId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: {
    type: String,
    enum: ['policy_violation', 'age_limit', 'compliance', 'user_request', 'legal', 'retention_policy'],
    required: true
  },
  archiveDate: { type: Date, default: Date.now },
  originalContent: mongoose.Schema.Types.Mixed,
  archiveLocation: String,
  storageClass: { type: String, default: 'cold' },
  contentHash: String,
  retentionUntil: Date,
  canRestore: { type: Boolean, default: true },
  restoredAt: Date,
  restoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  accessLog: [{
    accessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    accessedAt: { type: Date, default: Date.now },
    reason: String
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

archivedPostSchema.index({ originalPostId: 1 });
archivedPostSchema.index({ archiveDate: 1 });
archivedPostSchema.index({ retentionUntil: 1 });
archivedPostSchema.index({ canRestore: 1 });

module.exports = mongoose.model('ArchivedPost', archivedPostSchema);`,

  'MetricsRetentionPolicy.js': `const mongoose = require('mongoose');

const metricsRetentionPolicySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  metricType: {
    type: String,
    required: true,
    enum: ['raw_events', 'aggregated', 'user_activity', 'system_metrics', 'analytics']
  },
  retentionTiers: [{
    name: String,
    duration: { type: Number, required: true },
    durationType: { type: String, enum: ['days', 'months', 'years'], default: 'days' },
    aggregationLevel: { type: String, enum: ['raw', 'hourly', 'daily', 'weekly', 'monthly'] },
    storageClass: String
  }],
  jurisdictionOverrides: [{
    jurisdiction: String,
    minRetention: Number,
    maxRetention: Number
  }],
  purgeSchedule: String,
  lastPurgeAt: Date,
  nextPurgeAt: Date,
  isActive: { type: Boolean, default: true },
  exemptions: [String],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

metricsRetentionPolicySchema.index({ metricType: 1, isActive: 1 });
metricsRetentionPolicySchema.index({ nextPurgeAt: 1 });

module.exports = mongoose.model('MetricsRetentionPolicy', metricsRetentionPolicySchema);`,

  'AccountRestoration.js': `const mongoose = require('mongoose');

const accountRestorationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestType: {
    type: String,
    enum: ['self_service', 'support_ticket', 'admin_review', 'automated'],
    required: true
  },
  previousStatus: String,
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'approved', 'partial', 'rejected', 'completed'],
    default: 'pending'
  },
  verificationSteps: [{
    type: { type: String },
    required: Boolean,
    completed: Boolean,
    completedAt: Date,
    metadata: mongoose.Schema.Types.Mixed
  }],
  restrictions: [{
    feature: String,
    duration: Number,
    expiresAt: Date,
    reason: String
  }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  restoredAt: Date,
  sessionsRevoked: { type: Boolean, default: false },
  passwordResetRequired: { type: Boolean, default: false },
  timeline: [{
    event: String,
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    notes: String
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

accountRestorationSchema.index({ user: 1, status: 1 });
accountRestorationSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('AccountRestoration', accountRestorationSchema);`,

  'WatermarkPolicy.js': `const mongoose.require('mongoose');

const watermarkPolicySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerType: { type: String, enum: ['user', 'page', 'group'], default: 'user' },
  enabled: { type: Boolean, default: false },
  watermarkType: {
    type: String,
    enum: ['text', 'logo', 'composite', 'dynamic'],
    default: 'text'
  },
  textContent: String,
  logoUrl: String,
  position: {
    type: String,
    enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
    default: 'bottom-right'
  },
  opacity: { type: Number, min: 0, max: 1, default: 0.7 },
  scale: { type: Number, min: 0.1, max: 2, default: 1 },
  color: { type: String, default: '#FFFFFF' },
  applyToTypes: [{
    type: String,
    enum: ['image', 'video', 'all']
  }],
  excludeTypes: [String],
  dynamicData: {
    includeUserId: Boolean,
    includeTimestamp: Boolean,
    includeHash: Boolean
  },
  processingPriority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
  isActive: { type: Boolean, default: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

watermarkPolicySchema.index({ owner: 1, ownerType: 1 });
watermarkPolicySchema.index({ isActive: 1 });

module.exports = mongoose.model('WatermarkPolicy', watermarkPolicySchema);`,

  'CopyrightClaim.js': `const mongoose = require('mongoose');

const copyrightClaimSchema = new mongoose.Schema({
  claimId: { type: String, required: true, unique: true },
  claimant: {
    name: String,
    email: String,
    organization: String,
    address: String
  },
  targetContent: {
    contentType: { type: String, enum: ['post', 'comment', 'media', 'profile'], required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    url: String
  },
  contentOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workDescription: { type: String, required: true },
  originalWorkUrl: String,
  registrationNumber: String,
  infringementDescription: { type: String, required: true },
  evidence: [{
    type: String,
    url: String,
    uploadedAt: Date
  }],
  status: {
    type: String,
    enum: ['submitted', 'reviewing', 'valid', 'invalid', 'counter_claimed', 'resolved', 'withdrawn'],
    default: 'submitted'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
  actionTaken: {
    type: String,
    enum: ['none', 'content_disabled', 'content_removed', 'account_warned', 'account_suspended']
  },
  actionDate: Date,
  counterClaim: {
    filed: Boolean,
    filedAt: Date,
    reason: String,
    evidence: [String],
    status: String
  },
  resolution: {
    outcome: String,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  },
  timeline: [{
    event: String,
    actor: String,
    timestamp: { type: Date, default: Date.now },
    details: String
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

copyrightClaimSchema.index({ claimId: 1 });
copyrightClaimSchema.index({ contentOwner: 1, status: 1 });
copyrightClaimSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CopyrightClaim', copyrightClaimSchema);`,

  'DMCATakedown.js': `const mongoose = require('mongoose');

const dmcaTakedownSchema = new mongoose.Schema({
  takedownId: { type: String, required: true, unique: true },
  copyrightClaim: { type: mongoose.Schema.Types.ObjectId, ref: 'CopyrightClaim' },
  complainant: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: String,
    phone: String,
    organization: String
  },
  affectedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetContent: [{
    contentType: String,
    contentId: mongoose.Schema.Types.ObjectId,
    url: String,
    description: String
  }],
  legalBasis: { type: String, required: true },
  swornStatement: { type: Boolean, default: false },
  signature: String,
  signedAt: Date,
  status: {
    type: String,
    enum: ['received', 'validated', 'processing', 'executed', 'counter_notice', 'restored', 'closed'],
    default: 'received'
  },
  notifiedUser: { type: Boolean, default: false },
  notifiedAt: Date,
  contentDisabledAt: Date,
  counterNotice: {
    filed: Boolean,
    filedAt: Date,
    userStatement: String,
    userSignature: String,
    userAddress: String,
    consentToJurisdiction: Boolean
  },
  counterNoticeDeadline: Date,
  restorationEligible: { type: Boolean, default: false },
  restorationDate: Date,
  restoredAt: Date,
  correspondence: [{
    direction: { type: String, enum: ['inbound', 'outbound'] },
    recipient: String,
    subject: String,
    sentAt: Date,
    body: String
  }],
  transparencyReport: {
    published: Boolean,
    publishedAt: Date,
    reportUrl: String
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

dmcaTakedownSchema.index({ takedownId: 1 });
dmcaTakedownSchema.index({ affectedUser: 1, status: 1 });
dmcaTakedownSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('DMCATakedown', dmcaTakedownSchema);`,

  'VerificationRequest.js': `const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entityType: { type: String, enum: ['user', 'page', 'organization'], default: 'user' },
  entityId: mongoose.Schema.Types.ObjectId,
  verificationType: {
    type: String,
    enum: ['identity', 'notable', 'business', 'government', 'custom'],
    required: true
  },
  submittedData: {
    fullName: String,
    organizationName: String,
    category: String,
    website: String,
    socialLinks: [String],
    phoneNumber: String,
    address: mongoose.Schema.Types.Mixed
  },
  documents: [{
    type: { type: String, enum: ['id', 'passport', 'business_license', 'utility_bill', 'other'] },
    url: String,
    encryptedUrl: String,
    uploadedAt: Date,
    verified: Boolean
  }],
  automatedChecks: {
    emailVerified: Boolean,
    phoneVerified: Boolean,
    socialPresence: Number,
    followerCount: Number,
    accountAge: Number,
    activityScore: Number,
    riskScore: Number
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'additional_info_required', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  reviewNotes: String,
  rejectionReason: String,
  verifiedAt: Date,
  verificationBadge: {
    type: String,
    enum: ['blue', 'gold', 'government', 'business']
  },
  expiresAt: Date,
  reVerificationRequired: Boolean,
  reVerificationDate: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

verificationRequestSchema.index({ user: 1, status: 1 });
verificationRequestSchema.index({ status: 1, createdAt: -1 });
verificationRequestSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);`,

  'IdentityDocument.js': `const mongoose = require('mongoose');

const identityDocumentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  verificationRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'VerificationRequest' },
  documentType: {
    type: String,
    enum: ['passport', 'drivers_license', 'national_id', 'residence_permit', 'utility_bill', 'business_license'],
    required: true
  },
  documentNumber: String,
  issuingCountry: String,
  issuingAuthority: String,
  issueDate: Date,
  expiryDate: Date,
  frontImageUrl: String,
  backImageUrl: String,
  selfieImageUrl: String,
  encryptedFrontUrl: String,
  encryptedBackUrl: String,
  encryptedSelfieUrl: String,
  kmsKeyId: String,
  extractedData: mongoose.Schema.Types.Mixed,
  verificationStatus: {
    type: String,
    enum: ['pending', 'processing', 'verified', 'failed', 'expired'],
    default: 'pending'
  },
  verificationProvider: String,
  verificationScore: Number,
  verificationDetails: mongoose.Schema.Types.Mixed,
  fraudChecks: {
    tampering: Boolean,
    photocopy: Boolean,
    expiry: Boolean,
    blacklist: Boolean,
    score: Number
  },
  accessLog: [{
    accessor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    accessedAt: { type: Date, default: Date.now },
    reason: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  retentionUntil: Date,
  deletedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

identityDocumentSchema.index({ user: 1, verificationStatus: 1 });
identityDocumentSchema.index({ retentionUntil: 1 });
identityDocumentSchema.index({ expiryDate: 1 });

module.exports = mongoose.model('IdentityDocument', identityDocumentSchema);`,

  'APIStatus.js': `const mongoose = require('mongoose');

const apiStatusSchema = new mongoose.Schema({
  component: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance'],
    default: 'operational'
  },
  region: { type: String, default: 'global' },
  metrics: {
    uptime: Number,
    responseTime: Number,
    errorRate: Number,
    throughput: Number
  },
  lastChecked: { type: Date, default: Date.now },
  lastIncident: Date,
  currentIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
  statusChangedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

apiStatusSchema.index({ component: 1, region: 1 });
apiStatusSchema.index({ status: 1, lastChecked: -1 });

module.exports = mongoose.model('APIStatus', apiStatusSchema);`,

  'Incident.js': `const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['investigating', 'identified', 'monitoring', 'resolved', 'postmortem'],
    default: 'investigating'
  },
  affectedComponents: [String],
  affectedRegions: [String],
  impact: {
    usersAffected: Number,
    servicesAffected: [String],
    estimatedDowntime: Number
  },
  detectedAt: { type: Date, default: Date.now },
  detectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  detectionMethod: { type: String, enum: ['monitoring', 'user_report', 'manual'] },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  responders: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    joinedAt: Date
  }],
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionTime: Number,
  rootCause: String,
  remediation: String,
  preventionSteps: [String],
  postmortemUrl: String,
  postmortemPublished: Boolean,
  communicationsSent: [{
    channel: String,
    sentAt: Date,
    message: String
  }],
  slaBreached: Boolean,
  sloBreach: Number,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

incidentSchema.index({ incidentId: 1 });
incidentSchema.index({ status: 1, severity: 1 });
incidentSchema.index({ detectedAt: -1 });

module.exports = mongoose.model('Incident', incidentSchema);`,

  'IncidentTimeline.js': `const mongoose = require('mongoose');

const incidentTimelineSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
  eventType: {
    type: String,
    enum: ['detected', 'update', 'status_change', 'escalation', 'communication', 'action', 'resolved'],
    required: true
  },
  description: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  automated: { type: Boolean, default: false },
  visibility: { type: String, enum: ['internal', 'public'], default: 'internal' },
  attachments: [{
    type: String,
    url: String,
    name: String
  }],
  metrics: mongoose.Schema.Types.Mixed,
  correlationId: String,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

incidentTimelineSchema.index({ incident: 1, createdAt: 1 });
incidentTimelineSchema.index({ eventType: 1 });

module.exports = mongoose.model('IncidentTimeline', incidentTimelineSchema);`,

  'VisibilityDecision.js': `const mongoose = require('mongoose');

const visibilityDecisionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  visible: { type: Boolean, required: true },
  score: Number,
  rulesApplied: [{
    rule: String,
    weight: Number,
    result: Boolean
  }],
  factors: {
    userPreferences: mongoose.Schema.Types.Mixed,
    privacySettings: mongoose.Schema.Types.Mixed,
    algorithmicScore: Number,
    blockedOrMuted: Boolean,
    reportedContent: Boolean
  },
  sessionId: String,
  feedContext: String,
  timestamp: { type: Date, default: Date.now, index: { expires: 2592000 } }
}, { timestamps: false });

visibilityDecisionSchema.index({ user: 1, post: 1, timestamp: -1 });
visibilityDecisionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('VisibilityDecision', visibilityDecisionSchema);`,

  'UserEvent.js': `const mongoose = require('mongoose');

const userEventSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: { type: String, index: true },
  eventType: { type: String, required: true, index: true },
  eventCategory: { type: String, index: true },
  eventAction: String,
  eventLabel: String,
  eventValue: Number,
  properties: mongoose.Schema.Types.Mixed,
  page: {
    url: String,
    title: String,
    referrer: String
  },
  device: {
    type: { type: String },
    os: String,
    browser: String,
    version: String
  },
  location: {
    country: String,
    region: String,
    city: String
  },
  timestamp: { type: Date, default: Date.now, index: 1 },
  processed: { type: Boolean, default: false },
  retentionTier: { type: String, default: 'raw' }
}, { timestamps: false });

userEventSchema.index({ eventType: 1, timestamp: -1 });
userEventSchema.index({ user: 1, timestamp: -1 });
userEventSchema.index({ processed: 1, timestamp: 1 });

module.exports = mongoose.model('UserEvent', userEventSchema);`,

  'Cohort.js': `const mongoose = require('mongoose');

const cohortSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  cohortType: {
    type: String,
    enum: ['acquisition', 'behavior', 'demographic', 'custom'],
    default: 'custom'
  },
  definition: {
    filters: mongoose.Schema.Types.Mixed,
    dateRange: {
      start: Date,
      end: Date
    },
    eventCriteria: [{
      eventType: String,
      operator: String,
      value: mongoose.Schema.Types.Mixed
    }]
  },
  memberCount: { type: Number, default: 0 },
  lastComputedAt: Date,
  computeSchedule: String,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

cohortSchema.index({ name: 1 });
cohortSchema.index({ isActive: 1, lastComputedAt: -1 });

module.exports = mongoose.model('Cohort', cohortSchema);`,

  'RetentionMetric.js': `const mongoose = require('mongoose');

const retentionMetricSchema = new mongoose.Schema({
  cohort: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort', index: true },
  periodType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  dayNumber: Number,
  weekNumber: Number,
  monthNumber: Number,
  totalUsers: { type: Number, required: true },
  activeUsers: { type: Number, required: true },
  retentionRate: { type: Number, required: true },
  churnedUsers: Number,
  churnRate: Number,
  newUsers: Number,
  resurrectedUsers: Number,
  segmentation: mongoose.Schema.Types.Mixed,
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });

retentionMetricSchema.index({ cohort: 1, periodType: 1, periodStart: 1 });
retentionMetricSchema.index({ periodStart: 1, periodEnd: 1 });

module.exports = mongoose.model('RetentionMetric', retentionMetricSchema);`,

  'Funnel.js': `const mongoose = require('mongoose');

const funnelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  steps: [{
    order: Number,
    name: String,
    eventType: String,
    filters: mongoose.Schema.Types.Mixed
  }],
  conversionWindow: { type: Number, default: 86400000 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metrics: {
    totalEntered: Number,
    totalCompleted: Number,
    conversionRate: Number,
    avgTimeToComplete: Number,
    lastComputedAt: Date
  },
  stepMetrics: [{
    step: Number,
    entered: Number,
    completed: Number,
    dropped: Number,
    dropRate: Number,
    avgTimeToNext: Number
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

funnelSchema.index({ name: 1 });
funnelSchema.index({ isActive: 1 });

module.exports = mongoose.model('Funnel', funnelSchema);`,

  'ActiveUserMetric.js': `const mongoose.require('mongoose');

const activeUserMetricSchema = new mongoose.Schema({
  date: { type: Date, required: true, index: true },
  metricType: {
    type: String,
    enum: ['DAU', 'WAU', 'MAU'],
    required: true,
    index: true
  },
  platform: { type: String, enum: ['web', 'mobile_ios', 'mobile_android', 'desktop', 'all'], default: 'all' },
  count: { type: Number, required: true },
  uniqueUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  newUsers: Number,
  returningUsers: Number,
  segments: mongoose.Schema.Types.Mixed,
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });

activeUserMetricSchema.index({ date: -1, metricType: 1, platform: 1 }, { unique: true });
activeUserMetricSchema.index({ metricType: 1, date: -1 });

module.exports = mongoose.model('ActiveUserMetric', activeUserMetricSchema);`,

  'CrashReport.js': `const mongoose = require('mongoose');

const crashReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  sessionId: String,
  crashId: { type: String, required: true, unique: true },
  platform: {
    type: String,
    enum: ['web', 'mobile_ios', 'mobile_android', 'desktop_windows', 'desktop_mac', 'desktop_linux'],
    required: true
  },
  appVersion: { type: String, required: true, index: true },
  osVersion: String,
  deviceModel: String,
  errorMessage: String,
  errorType: String,
  stackTrace: String,
  symbolicated: { type: Boolean, default: false },
  breadcrumbs: [mongoose.Schema.Types.Mixed],
  metadata: mongoose.Schema.Types.Mixed,
  occurrenceCount: { type: Number, default: 1 },
  firstOccurrence: { type: Date, default: Date.now },
  lastOccurrence: { type: Date, default: Date.now },
  signature: { type: String, index: true },
  groupId: String,
  status: {
    type: String,
    enum: ['new', 'investigating', 'fixed', 'ignored'],
    default: 'new'
  },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedIn: String,
  tags: [String]
}, { timestamps: true });

crashReportSchema.index({ signature: 1, appVersion: 1 });
crashReportSchema.index({ platform: 1, status: 1 });
crashReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CrashReport', crashReportSchema);`,

  'ClientVersion.js': `const mongoose = require('mongoose');

const clientVersionSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['web', 'mobile_ios', 'mobile_android', 'desktop_windows', 'desktop_mac', 'desktop_linux'],
    required: true
  },
  version: { type: String, required: true },
  buildNumber: Number,
  releaseDate: { type: Date, default: Date.now },
  minSupportedVersion: String,
  updatePolicy: {
    type: String,
    enum: ['none', 'optional', 'recommended', 'required'],
    default: 'optional'
  },
  enforcementDate: Date,
  features: [String],
  bugFixes: [String],
  knownIssues: [String],
  downloadUrl: String,
  releaseNotes: String,
  isActive: { type: Boolean, default: true },
  deprecatedAt: Date,
  analytics: {
    totalInstalls: Number,
    activeInstalls: Number,
    crashRate: Number,
    adoptionRate: Number
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

clientVersionSchema.index({ platform: 1, version: 1 }, { unique: true });
clientVersionSchema.index({ platform: 1, isActive: 1 });

module.exports = mongoose.model('ClientVersion', clientVersionSchema);`,

  'FeatureAdoption.js': `const mongoose = require('mongoose');

const featureAdoptionSchema = new mongoose.Schema({
  featureName: { type: String, required: true, index: true },
  featureId: String,
  date: { type: Date, required: true },
  totalUsers: Number,
  adoptedUsers: Number,
  adoptionRate: Number,
  newAdopters: Number,
  activeUsers: Number,
  engagementMetrics: {
    avgUsagePerUser: Number,
    avgSessionDuration: Number,
    totalInteractions: Number
  },
  cohortBreakdown: [{
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cohort' },
    adoptionRate: Number,
    users: Number
  }],
  platformBreakdown: [{
    platform: String,
    adoptionRate: Number,
    users: Number
  }],
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });

featureAdoptionSchema.index({ featureName: 1, date: -1 });
featureAdoptionSchema.index({ date: -1 });

module.exports = mongoose.model('FeatureAdoption', featureAdoptionSchema);`,

  'Heatmap.js': `const mongoose = require('mongoose');

const heatmapSchema = new mongoose.Schema({
  pageUrl: { type: String, required: true, index: true },
  pageName: String,
  date: { type: Date, required: true },
  device: { type: String, enum: ['mobile', 'tablet', 'desktop'], default: 'desktop' },
  viewport: {
    width: Number,
    height: Number
  },
  dataPoints: [{
    x: Number,
    y: Number,
    count: Number,
    elementId: String,
    elementClass: String,
    actionType: { type: String, enum: ['click', 'tap', 'scroll', 'hover'] }
  }],
  aggregatedData: mongoose.Schema.Types.Mixed,
  sampleSize: Number,
  sessionCount: Number,
  computedAt: { type: Date, default: Date.now }
}, { timestamps: true });

heatmapSchema.index({ pageUrl: 1, date: -1, device: 1 });

module.exports = mongoose.model('Heatmap', heatmapSchema);`,

  'CustomEvent.js': `const mongoose = require('mongoose');

const customEventSchema = new mongoose.Schema({
  eventName: { type: String, required: true, index: true },
  eventKey: { type: String, required: true, unique: true },
  description: String,
  schema: mongoose.Schema.Types.Mixed,
  category: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  samplingRate: { type: Number, min: 0, max: 1, default: 1 },
  quota: {
    daily: Number,
    monthly: Number,
    currentDaily: { type: Number, default: 0 },
    currentMonthly: { type: Number, default: 0 }
  },
  validationRules: mongoose.Schema.Types.Mixed,
  retention: {
    raw: Number,
    aggregated: Number
  },
  analytics: {
    totalEvents: Number,
    uniqueUsers: Number,
    lastEventAt: Date
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

customEventSchema.index({ eventKey: 1 });
customEventSchema.index({ isActive: 1 });

module.exports = mongoose.model('CustomEvent', customEventSchema);`,

  'ConversionTracking.js': `const mongoose = require('mongoose');

const conversionTrackingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  conversionType: { type: String, required: true, index: true },
  conversionValue: Number,
  currency: { type: String, default: 'USD' },
  source: {
    type: String,
    enum: ['organic', 'ad', 'referral', 'direct', 'social', 'email'],
    required: true
  },
  campaign: {
    id: String,
    name: String,
    source: String,
    medium: String,
    term: String,
    content: String
  },
  ad: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' },
    impressionId: String,
    clickId: String
  },
  attributionWindow: Number,
  touchpoints: [{
    timestamp: Date,
    source: String,
    campaign: String,
    action: String
  }],
  attributionModel: {
    type: String,
    enum: ['first_touch', 'last_touch', 'linear', 'time_decay', 'position_based'],
    default: 'last_touch'
  },
  deviceType: String,
  platform: String,
  location: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

conversionTrackingSchema.index({ conversionType: 1, timestamp: -1 });
conversionTrackingSchema.index({ 'campaign.id': 1, timestamp: -1 });
conversionTrackingSchema.index({ 'ad.id': 1, timestamp: -1 });

module.exports = mongoose.model('ConversionTracking', conversionTrackingSchema);`,

  'Goal.js': `const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  goalType: {
    type: String,
    enum: ['destination', 'event', 'duration', 'pages_per_session', 'custom'],
    required: true
  },
  definition: {
    eventType: String,
    url: String,
    duration: Number,
    pageCount: Number,
    filters: mongoose.Schema.Types.Mixed
  },
  value: Number,
  currency: String,
  conversionWindow: { type: Number, default: 86400000 },
  funnelSteps: [{
    order: Number,
    name: String,
    eventType: String,
    required: Boolean
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metrics: {
    totalAttempts: Number,
    totalCompletions: Number,
    conversionRate: Number,
    totalValue: Number,
    avgValue: Number,
    lastComputedAt: Date
  },
  alerts: [{
    condition: String,
    threshold: Number,
    recipients: [String],
    enabled: Boolean
  }],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

goalSchema.index({ name: 1 });
goalSchema.index({ isActive: 1 });
goalSchema.index({ goalType: 1 });

module.exports = mongoose.model('Goal', goalSchema);`,

  'AnalyticsExport.js': `const mongoose = require('mongoose');

const analyticsExportSchema = new mongoose.Schema({
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exportType: {
    type: String,
    enum: ['events', 'users', 'metrics', 'cohorts', 'funnels', 'custom'],
    required: true
  },
  format: { type: String, enum: ['csv', 'json', 'xlsx', 'parquet'], default: 'csv' },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  filters: mongoose.Schema.Types.Mixed,
  columns: [String],
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed', 'expired'],
    default: 'queued'
  },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  rowCount: Number,
  fileSize: Number,
  exportUrl: String,
  signedUrl: String,
  urlExpiresAt: Date,
  downloadedAt: Date,
  downloadCount: { type: Number, default: 0 },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  error: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

analyticsExportSchema.index({ requestedBy: 1, createdAt: -1 });
analyticsExportSchema.index({ status: 1, createdAt: 1 });
analyticsExportSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('AnalyticsExport', analyticsExportSchema);`,

  'VisualizationWidget.js': `const mongoose = require('mongoose');

const visualizationWidgetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  widgetType: {
    type: String,
    enum: ['line_chart', 'bar_chart', 'pie_chart', 'funnel', 'table', 'number', 'heatmap'],
    required: true
  },
  dashboard: String,
  position: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  dataSource: {
    type: { type: String, enum: ['events', 'metrics', 'cohorts', 'custom_query'] },
    query: mongoose.Schema.Types.Mixed,
    aggregation: String,
    groupBy: [String],
    filters: mongoose.Schema.Types.Mixed
  },
  visualization: {
    xAxis: String,
    yAxis: [String],
    colorScheme: String,
    legend: Boolean,
    gridLines: Boolean,
    customOptions: mongoose.Schema.Types.Mixed
  },
  refreshInterval: { type: Number, default: 300000 },
  lastRefreshed: Date,
  cachedData: mongoose.Schema.Types.Mixed,
  isPublic: { type: Boolean, default: false },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'edit'] }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

visualizationWidgetSchema.index({ createdBy: 1, dashboard: 1 });
visualizationWidgetSchema.index({ isPublic: 1 });

module.exports = mongoose.model('VisualizationWidget', visualizationWidgetSchema);`
};

console.log('📦 Creating Models...\n');
for (const [filename, content] of Object.entries(models)) {
  const filePath = path.join(modelsDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${filename}`);
    stats.modelsCreated++;
  } else {
    console.log(`⏭️  Skipped (exists): ${filename}`);
  }
}

console.log(`\n✅ Models Complete: ${stats.modelsCreated} new models created\n`);
console.log('═'.repeat(70));
console.log('\n📍 Next: Run route and service generators\n');

module.exports = stats;