const mongoose = require('mongoose');
const crypto = require('crypto');

const FlagExposureSchema = new mongoose.Schema({
  flagId: { type: mongoose.Schema.Types.ObjectId, ref: 'FeatureFlag', required: true, index: true },
  userHash: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  variant: String,
  enabled: Boolean,
  timestamp: { type: Date, default: Date.now, index: true },
  context: {
    platform: String,
    version: String,
    region: String,
    device: String
  },
  performance: {
    latency: Number,
    errors: [String]
  }
}, { timestamps: true });

FlagExposureSchema.index({ flagId: 1, userHash: 1 });
FlagExposureSchema.index({ timestamp: -1 });

const ShareTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  resourceType: { type: String, enum: ['post', 'story', 'reel', 'video', 'document', 'file'], required: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, index: true },
  maxViews: Number,
  viewCount: { type: Number, default: 0 },
  password: String,
  requireAuth: { type: Boolean, default: false },
  allowDownload: { type: Boolean, default: false },
  accessLog: [{
    accessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  status: { type: String, enum: ['active', 'expired', 'revoked'], default: 'active' }
}, { timestamps: true });

ShareTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

ShareTokenSchema.methods.isValid = function() {
  if (this.status !== 'active') return false;
  if (this.expiresAt < new Date()) return false;
  if (this.maxViews && this.viewCount >= this.maxViews) return false;
  return true;
};

const ActionNonceSchema = new mongoose.Schema({
  nonce: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  expiresAt: { type: Date, required: true, index: true },
  used: { type: Boolean, default: false },
  usedAt: Date,
  ipAddress: String
}, { timestamps: true });

ActionNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

ActionNonceSchema.methods.consume = async function() {
  if (this.used) throw new Error('Nonce already used');
  if (this.expiresAt < new Date()) throw new Error('Nonce expired');
  
  this.used = true;
  this.usedAt = new Date();
  await this.save();
  return this.data;
};

const TrustedDeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  deviceId: { type: String, required: true },
  deviceName: String,
  deviceType: { type: String, enum: ['mobile', 'tablet', 'desktop', 'other'] },
  fingerprint: { type: String, required: true },
  trustToken: { type: String, required: true },
  trustedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  lastUsed: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    region: String,
    city: String
  },
  status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' }
}, { timestamps: true });

TrustedDeviceSchema.index({ userId: 1, fingerprint: 1 });
TrustedDeviceSchema.index({ expiresAt: 1 });

const AuthPolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  actions: [{ type: String, required: true }],
  requireStepUp: { type: Boolean, default: true },
  stepUpMethods: [{ type: String, enum: ['totp', 'sms', 'email', 'biometric', 'hardware_key'] }],
  maxSessionAge: Number,
  requireTrustedDevice: { type: Boolean, default: false },
  ipWhitelist: [String],
  geoRestrictions: {
    allowedCountries: [String],
    blockedCountries: [String]
  },
  riskThresholds: {
    low: Number,
    medium: Number,
    high: Number
  },
  enabled: { type: Boolean, default: true },
  priority: { type: Number, default: 0 }
}, { timestamps: true });

const MagicLinkSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date, required: true, index: true },
  used: { type: Boolean, default: false },
  usedAt: Date,
  sessionId: String,
  ipAddress: String,
  userAgent: String,
  purpose: { type: String, enum: ['login', 'signup', 'verify', 'reset'], default: 'login' }
}, { timestamps: true });

MagicLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

MagicLinkSchema.statics.generate = async function(email, purpose = 'login') {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  
  const link = await this.create({
    token,
    email,
    expiresAt,
    purpose
  });
  
  return { token, link };
};

const CompromiseEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  eventType: { 
    type: String, 
    enum: ['suspicious_login', 'multiple_failed_attempts', 'unusual_location', 'rapid_actions', 'leaked_credential', 'malware_detected', 'account_takeover'],
    required: true 
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  description: String,
  evidence: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    region: String,
    city: String
  },
  detectedAt: { type: Date, default: Date.now },
  actionTaken: { type: String, enum: ['none', 'logged', 'challenged', 'blocked', 'quarantined'] },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true });

CompromiseEventSchema.index({ userId: 1, detectedAt: -1 });

const PasswordPolicySchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  name: { type: String, required: true },
  minLength: { type: Number, default: 8 },
  maxLength: { type: Number, default: 128 },
  requireUppercase: { type: Boolean, default: true },
  requireLowercase: { type: Boolean, default: true },
  requireNumbers: { type: Boolean, default: true },
  requireSpecialChars: { type: Boolean, default: true },
  specialChars: { type: String, default: '!@#$%^&*()_+-=[]{}|;:,.<>?' },
  preventCommon: { type: Boolean, default: true },
  preventBreached: { type: Boolean, default: true },
  preventUserInfo: { type: Boolean, default: true },
  historyCount: { type: Number, default: 5 },
  maxAge: Number,
  minAge: Number,
  lockoutThreshold: { type: Number, default: 5 },
  lockoutDuration: { type: Number, default: 900000 },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const PhoneCodeSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  code: { type: String, required: true },
  codeHash: { type: String, required: true },
  purpose: { type: String, enum: ['verification', '2fa', 'recovery'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  expiresAt: { type: Date, required: true, index: true },
  verified: { type: Boolean, default: false },
  verifiedAt: Date
}, { timestamps: true });

PhoneCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

PhoneCodeSchema.methods.verify = async function(code) {
  if (this.verified) throw new Error('Code already verified');
  if (this.expiresAt < new Date()) throw new Error('Code expired');
  if (this.attempts >= this.maxAttempts) throw new Error('Max attempts exceeded');
  
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  
  if (hash !== this.codeHash) {
    this.attempts++;
    await this.save();
    throw new Error('Invalid code');
  }
  
  this.verified = true;
  this.verifiedAt = new Date();
  await this.save();
  return true;
};

const ContactPreferencesSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  email: {
    marketing: { type: Boolean, default: true },
    transactional: { type: Boolean, default: true },
    newsletters: { type: Boolean, default: false },
    productUpdates: { type: Boolean, default: true },
    frequency: { type: String, enum: ['realtime', 'daily', 'weekly', 'monthly'], default: 'realtime' }
  },
  sms: {
    marketing: { type: Boolean, default: false },
    transactional: { type: Boolean, default: true },
    alerts: { type: Boolean, default: true }
  },
  push: {
    enabled: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    likes: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    follows: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true }
  },
  quietHours: {
    enabled: { type: Boolean, default: false },
    start: String,
    end: String,
    timezone: String
  }
}, { timestamps: true });

const ConsentRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  consentType: { 
    type: String, 
    enum: ['terms', 'privacy', 'marketing', 'cookies', 'data_processing', 'third_party_sharing'],
    required: true 
  },
  granted: { type: Boolean, required: true },
  policyVersion: { type: String, required: true },
  policyUrl: String,
  consentMethod: { type: String, enum: ['explicit', 'implicit', 'opt_in', 'opt_out'], required: true },
  ipAddress: String,
  userAgent: String,
  location: String,
  language: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

ConsentRecordSchema.index({ userId: 1, consentType: 1, createdAt: -1 });

const BackupCodeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  codeHash: { type: String, required: true },
  used: { type: Boolean, default: false },
  usedAt: Date,
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

BackupCodeSchema.methods.verify = async function(code) {
  if (this.used) throw new Error('Code already used');
  
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  
  if (hash !== this.codeHash) {
    throw new Error('Invalid code');
  }
  
  this.used = true;
  this.usedAt = new Date();
  await this.save();
  return true;
};

const WebAuthnCredentialSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  credentialId: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  counter: { type: Number, default: 0 },
  deviceType: String,
  transports: [String],
  aaguid: String,
  name: String,
  createdAt: { type: Date, default: Date.now },
  lastUsed: Date
}, { timestamps: true });

const FlagExposure = mongoose.model('FlagExposure', FlagExposureSchema);
const ShareToken = mongoose.model('ShareToken', ShareTokenSchema);
const ActionNonce = mongoose.model('ActionNonce', ActionNonceSchema);
const TrustedDevice = mongoose.model('TrustedDevice', TrustedDeviceSchema);
const AuthPolicy = mongoose.model('AuthPolicy', AuthPolicySchema);
const MagicLink = mongoose.model('MagicLink', MagicLinkSchema);
const CompromiseEvent = mongoose.model('CompromiseEvent', CompromiseEventSchema);
const PasswordPolicy = mongoose.model('PasswordPolicy', PasswordPolicySchema);
const PhoneCode = mongoose.model('PhoneCode', PhoneCodeSchema);
const ContactPreferences = mongoose.model('ContactPreferences', ContactPreferencesSchema);
const ConsentRecord = mongoose.model('ConsentRecord', ConsentRecordSchema);
const BackupCode = mongoose.model('BackupCode', BackupCodeSchema);
const WebAuthnCredential = mongoose.model('WebAuthnCredential', WebAuthnCredentialSchema);

module.exports = {
  FlagExposure,
  ShareToken,
  ActionNonce,
  TrustedDevice,
  AuthPolicy,
  MagicLink,
  CompromiseEvent,
  PasswordPolicy,
  PhoneCode,
  ContactPreferences,
  ConsentRecord,
  BackupCode,
  WebAuthnCredential
};
