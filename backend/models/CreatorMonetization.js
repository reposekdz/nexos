const mongoose = require('mongoose');

const SubscriptionTierSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  interval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  benefits: [String],
  perks: [{
    type: { type: String, enum: ['content', 'badge', 'access', 'discount', 'custom'] },
    description: String,
    value: mongoose.Schema.Types.Mixed
  }],
  maxSubscribers: Number,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const SubscriptionSchema = new mongoose.Schema({
  subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tier: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionTier', required: true },
  status: { 
    type: String, 
    enum: ['active', 'cancelled', 'expired', 'trial', 'suspended'], 
    default: 'active' 
  },
  startDate: { type: Date, default: Date.now },
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  cancelAtPeriodEnd: { type: Boolean, default: false },
  cancelledAt: Date,
  trialEnd: Date,
  paymentMethod: String,
  stripeSubscriptionId: String,
  paypalSubscriptionId: String
}, { timestamps: true });

SubscriptionSchema.index({ subscriber: 1, creator: 1 });
SubscriptionSchema.index({ status: 1, currentPeriodEnd: 1 });

const UnlockableContentSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['post', 'video', 'image', 'file', 'course', 'bundle'], required: true },
  content: mongoose.Schema.Types.Mixed,
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  thumbnail: String,
  previewContent: mongoose.Schema.Types.Mixed,
  tags: [String],
  isActive: { type: Boolean, default: true },
  purchaseCount: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: Number,
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const ContentPurchaseSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: mongoose.Schema.Types.ObjectId, ref: 'UnlockableContent', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentMethod: String,
  transactionId: String,
  status: { type: String, enum: ['completed', 'pending', 'refunded', 'failed'], default: 'pending' },
  refundedAt: Date,
  refundReason: String
}, { timestamps: true });

ContentPurchaseSchema.index({ buyer: 1, content: 1 });

const CreatorEarningsSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: Date, required: true },
  subscriptionRevenue: { type: Number, default: 0 },
  contentSalesRevenue: { type: Number, default: 0 },
  tipsRevenue: { type: Number, default: 0 },
  adRevenue: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  platformFee: { type: Number, default: 0 },
  netEarnings: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' },
  paidAt: Date,
  paymentMethod: String,
  transactionId: String
}, { timestamps: true });

CreatorEarningsSchema.index({ creator: 1, period: -1 });

const TipSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  message: String,
  contentReference: {
    type: { type: String, enum: ['post', 'story', 'reel', 'video', 'live'] },
    id: mongoose.Schema.Types.ObjectId
  },
  paymentMethod: String,
  transactionId: String,
  status: { type: String, enum: ['completed', 'pending', 'refunded', 'failed'], default: 'pending' }
}, { timestamps: true });

TipSchema.index({ recipient: 1, createdAt: -1 });

const PayoutSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  method: { type: String, enum: ['bank_transfer', 'paypal', 'stripe', 'other'], required: true },
  accountDetails: mongoose.Schema.Types.Mixed,
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  requestedAt: { type: Date, default: Date.now },
  processedAt: Date,
  completedAt: Date,
  transactionId: String,
  failureReason: String
}, { timestamps: true });

const MembershipBenefitSchema = new mongoose.Schema({
  tier: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionTier', required: true },
  type: { 
    type: String, 
    enum: ['badge', 'emote', 'discount', 'early_access', 'exclusive_content', 'priority_support', 'custom'],
    required: true 
  },
  name: String,
  description: String,
  icon: String,
  value: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const ContentBundleSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  contents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'UnlockableContent' }],
  price: { type: Number, required: true },
  originalPrice: Number,
  discount: Number,
  thumbnail: String,
  isActive: { type: Boolean, default: true },
  purchaseCount: { type: Number, default: 0 }
}, { timestamps: true });

const CreatorAnalyticsSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  metrics: {
    subscribers: { type: Number, default: 0 },
    newSubscribers: { type: Number, default: 0 },
    cancelledSubscribers: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    contentSales: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    churnRate: { type: Number, default: 0 },
    avgRevenuePerUser: { type: Number, default: 0 },
    lifetimeValue: { type: Number, default: 0 }
  }
}, { timestamps: true });

CreatorAnalyticsSchema.index({ creator: 1, date: -1 });

const SubscriptionTier = mongoose.model('SubscriptionTier', SubscriptionTierSchema);
const Subscription = mongoose.model('Subscription', SubscriptionSchema);
const UnlockableContent = mongoose.model('UnlockableContent', UnlockableContentSchema);
const ContentPurchase = mongoose.model('ContentPurchase', ContentPurchaseSchema);
const CreatorEarnings = mongoose.model('CreatorEarnings', CreatorEarningsSchema);
const Tip = mongoose.model('Tip', TipSchema);
const Payout = mongoose.model('Payout', PayoutSchema);
const MembershipBenefit = mongoose.model('MembershipBenefit', MembershipBenefitSchema);
const ContentBundle = mongoose.model('ContentBundle', ContentBundleSchema);
const CreatorAnalytics = mongoose.model('CreatorAnalytics', CreatorAnalyticsSchema);

module.exports = {
  SubscriptionTier,
  Subscription,
  UnlockableContent,
  ContentPurchase,
  CreatorEarnings,
  Tip,
  Payout,
  MembershipBenefit,
  ContentBundle,
  CreatorAnalytics
};
