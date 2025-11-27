const mongoose = require('mongoose');

const monetizationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['ad_revenue', 'subscription', 'donation', 'tip', 'sponsored_content', 'marketplace_sale', 'virtual_gift', 'premium_content'],
    required: true 
  },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  source: {
    contentId: mongoose.Schema.Types.ObjectId,
    contentType: String,
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ad' }
  },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  platformFee: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  payoutDate: Date,
  transactionId: String
}, { timestamps: true });

const subscriptionSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subscriber: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tier: {
    name: String,
    price: Number,
    benefits: [String],
    badgeUrl: String
  },
  status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
  startDate: { type: Date, default: Date.now },
  endDate: Date,
  autoRenew: { type: Boolean, default: true }
}, { timestamps: true });

const virtualCurrencySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  balance: { type: Number, default: 0 },
  transactions: [{
    type: { type: String, enum: ['purchase', 'spend', 'earn', 'gift'] },
    amount: Number,
    description: String,
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = {
  Monetization: mongoose.model('Monetization', monetizationSchema),
  Subscription: mongoose.model('Subscription', subscriptionSchema),
  VirtualCurrency: mongoose.model('VirtualCurrency', virtualCurrencySchema)
};
