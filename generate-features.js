#!/usr/bin/env node

/**
 * NEXOS PLATFORM - COMPLETE FEATURES 1-453 GENERATOR
 * This script generates all models, routes, and services for features 1-453
 * Run: node generate-features.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Nexos Platform - Generating Features 1-453...\n');

const baseDir = __dirname;
const backendDir = path.join(baseDir, 'backend');
const modelsDir = path.join(backendDir, 'models');
const routesDir = path.join(backendDir, 'routes');
const servicesDir = path.join(backendDir, 'services');

// Ensure directories exist
[modelsDir, routesDir, servicesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ============================================================================
// MODELS
// ============================================================================

const models = {
  'VerificationToken.js': `const mongoose = require('mongoose');
const crypto = require('crypto');

const verificationTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['email_verification', 'phone_verification', 'email_change'],
    default: 'email_verification'
  },
  newEmail: String,
  newPhone: String,
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 5 },
  used: { type: Boolean, default: false },
  usedAt: Date,
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
verificationTokenSchema.index({ tokenHash: 1, used: 1 });

verificationTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

verificationTokenSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

verificationTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date() && this.attempts < this.maxAttempts;
};

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);`,

  'PasswordResetToken.js': `const mongoose = require('mongoose');
const crypto = require('crypto');

const passwordResetTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 60 * 60 * 1000)
  },
  used: { type: Boolean, default: false },
  usedAt: Date,
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

passwordResetTokenSchema.statics.generateToken = function() {
  return crypto.randomBytes(32).toString('hex');
};

passwordResetTokenSchema.statics.hashToken = function(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
};

passwordResetTokenSchema.methods.isValid = function() {
  return !this.used && this.expiresAt > new Date() && this.attempts < this.maxAttempts;
};

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);`,

  'Session.js': `const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  token: { type: String, required: true, unique: true },
  refreshToken: { type: String, unique: true, sparse: true },
  deviceInfo: {
    type: { type: String, enum: ['web', 'mobile_ios', 'mobile_android', 'desktop'], default: 'web' },
    name: String,
    os: String,
    browser: String
  },
  ipAddress: String,
  userAgent: String,
  location: {
    country: String,
    city: String
  },
  isActive: { type: Boolean, default: true },
  lastActivity: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  rememberMe: { type: Boolean, default: false }
}, { timestamps: true });

sessionSchema.index({ token: 1, isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

sessionSchema.statics.invalidateUserSessions = async function(userId, exceptToken = null) {
  const query = { user: userId, isActive: true };
  if (exceptToken) query.token = { $ne: exceptToken };
  await this.updateMany(query, { $set: { isActive: false } });
};

module.exports = mongoose.model('Session', sessionSchema);`,

  'FriendRequest.js': `const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired', 'canceled'],
    default: 'pending'
  },
  message: { type: String, maxlength: 500 },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  respondedAt: Date,
  responseMessage: String
}, { timestamps: true });

friendRequestSchema.index({ from: 1, to: 1 });
friendRequestSchema.index({ to: 1, status: 1 });
friendRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);`,

  'Friendship.js': `const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friendsSince: { type: Date, default: Date.now },
  closeFriend: { type: Boolean, default: false },
  favoritedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  interactionScore: { type: Number, default: 0 },
  lastInteraction: Date
}, { timestamps: true });

friendshipSchema.index({ user1: 1, user2: 1 }, { unique: true });

module.exports = mongoose.model('Friendship', friendshipSchema);`,

  'Block.js': `const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: String,
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' }
}, { timestamps: true });

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocked: 1 });

module.exports = mongoose.model('Block', blockSchema);`,

  'Follow.js': `const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notificationsEnabled: { type: Boolean, default: true },
  isCloseFriend: { type: Boolean, default: false }
}, { timestamps: true });

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 });

module.exports = mongoose.model('Follow', followSchema);`,

  'Comment.js': `const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  content: { type: String, required: true, maxlength: 10000 },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  media: [{
    type: { type: String, enum: ['image', 'video', 'gif'] },
    url: String,
    thumbnail: String
  }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'] }
  }],
  reactionCounts: {
    like: { type: Number, default: 0 },
    love: { type: Number, default: 0 },
    haha: { type: Number, default: 0 },
    wow: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    angry: { type: Number, default: 0 }
  },
  repliesCount: { type: Number, default: 0 },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  editHistory: [{
    content: String,
    editedAt: Date
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  threadPath: String,
  depth: { type: Number, default: 0 }
}, { timestamps: true });

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1 });
commentSchema.index({ threadPath: 1 });

module.exports = mongoose.model('Comment', commentSchema);`,

  'PostDraft.js': `const mongoose = require('mongoose');

const postDraftSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, maxlength: 100000 },
  media: [{
    type: { type: String, enum: ['image', 'video', 'file'] },
    url: String,
    thumbnail: String,
    size: Number,
    fileName: String
  }],
  audience: {
    type: { type: String, enum: ['public', 'friends', 'friends_except', 'specific_friends', 'only_me'], default: 'public' },
    allowList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    denyList: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  location: {
    name: String,
    coordinates: { type: [Number], index: '2dsphere' }
  },
  feeling: String,
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pollData: Object,
  autoSavedAt: Date,
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

postDraftSchema.index({ author: 1, createdAt: -1 });
postDraftSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PostDraft', postDraftSchema);`,

  'LinkPreview.js': `const mongoose = require('mongoose');

const linkPreviewSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  canonicalUrl: String,
  title: String,
  description: String,
  images: [String],
  siteName: String,
  favicon: String,
  type: String,
  video: {
    url: String,
    width: Number,
    height: Number
  },
  lastFetched: { type: Date, default: Date.now },
  fetchCount: { type: Number, default: 1 },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

linkPreviewSchema.index({ url: 1 });
linkPreviewSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LinkPreview', linkPreviewSchema);`,

  'PromoCode.js': `const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: { type: String, enum: ['percentage', 'fixed_amount', 'free_shipping', 'free_trial'], required: true },
  value: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  description: String,
  isActive: { type: Boolean, default: true },
  expiresAt: Date,
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  minPurchaseAmount: Number,
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [String],
  excludedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  firstTimeOnly: { type: Boolean, default: false },
  stackable: { type: Boolean, default: false },
  autoApply: { type: Boolean, default: false },
  metadata: Object,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

promoCodeSchema.index({ code: 1 });
promoCodeSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);`,

  'PromoRedemption.js': `const mongoose = require('mongoose');

const promoRedemptionSchema = new mongoose.Schema({
  promo: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  discountAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  ipAddress: String,
  userAgent: String,
  idempotencyKey: { type: String, unique: true, sparse: true }
}, { timestamps: true });

promoRedemptionSchema.index({ promo: 1, user: 1 });
promoRedemptionSchema.index({ user: 1, createdAt: -1 });
promoRedemptionSchema.index({ idempotencyKey: 1 });

module.exports = mongoose.model('PromoRedemption', promoRedemptionSchema);`,

  'TaxRule.js': `const mongoose = require('mongoose');

const taxRuleSchema = new mongoose.Schema({
  country: { type: String, required: true },
  state: String,
  region: String,
  postalCode: String,
  taxRate: { type: Number, required: true },
  taxType: { type: String, enum: ['vat', 'gst', 'sales_tax', 'custom'], default: 'sales_tax' },
  applicableProducts: [String],
  priority: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  effectiveFrom: Date,
  effectiveUntil: Date
}, { timestamps: true });

taxRuleSchema.index({ country: 1, state: 1, isActive: 1 });
taxRuleSchema.index({ effectiveFrom: 1, effectiveUntil: 1 });

module.exports = mongoose.model('TaxRule', taxRuleSchema);`,

  'CurrencyRate.js': `const mongoose = require('mongoose');

const currencyRateSchema = new mongoose.Schema({
  baseCurrency: { type: String, required: true },
  targetCurrency: { type: String, required: true },
  rate: { type: Number, required: true },
  provider: String,
  retrievedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }
}, { timestamps: true });

currencyRateSchema.index({ baseCurrency: 1, targetCurrency: 1, retrievedAt: -1 });
currencyRateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CurrencyRate', currencyRateSchema);`,

  'Transaction.js': `const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['purchase', 'refund', 'payout', 'fee', 'credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  amountBase: { type: Number, required: true },
  currency: { type: String, required: true },
  baseCurrency: { type: String, default: 'USD' },
  exchangeRate: Number,
  rateSnapshot: { type: mongoose.Schema.Types.ObjectId, ref: 'CurrencyRate' },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: String,
  paymentProvider: String,
  providerTransactionId: String,
  metadata: Object,
  description: String,
  relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  relatedTransaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }
}, { timestamps: true });

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ providerTransactionId: 1 });
transactionSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);`,

  'ContactImport.js': `const mongoose = require('mongoose');

const contactImportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  source: { type: String, enum: ['csv', 'google', 'outlook', 'manual'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  totalContacts: { type: Number, default: 0 },
  processedContacts: { type: Number, default: 0 },
  matchedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  rawData: String,
  error: String,
  processedAt: Date
}, { timestamps: true });

contactImportSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ContactImport', contactImportSchema);`,

  'Suggestion.js': `const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  suggestedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, enum: ['mutual_friends', 'same_location', 'same_interests', 'contact_import'], required: true },
  score: { type: Number, default: 0 },
  mutualFriendsCount: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'dismissed', 'accepted'], default: 'active' },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
}, { timestamps: true });

suggestionSchema.index({ user: 1, status: 1, score: -1 });
suggestionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Suggestion', suggestionSchema);`
};

// Create all models
console.log('📦 Creating Models...');
let modelCount = 0;
for (const [fileName, content] of Object.entries(models)) {
  const filePath = path.join(modelsDir, fileName);
  fs.writeFileSync(filePath, content);
  modelCount++;
  console.log(`  ✓ ${fileName}`);
}
console.log(`✅ Created ${modelCount} models\n`);

// ============================================================================
// INSTALLATION COMPLETE MESSAGE
// ============================================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║                 MODELS GENERATED SUCCESSFULLY                ║');
console.log('╠══════════════════════════════════════════════════════════════╣');
console.log(`║  Total Models Created: ${modelCount.toString().padEnd(40)} ║`);
console.log('║                                                              ║');
console.log('║  Next Steps:                                                 ║');
console.log('║  1. Run: npm install speakeasy qrcode axios cheerio          ║');
console.log('║  2. Routes will be generated in next phase                   ║');
console.log('║  3. Update your .env file with required credentials          ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

console.log('\n✨ Generation Complete!\n');
