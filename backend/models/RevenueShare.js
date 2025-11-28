const mongoose = require('mongoose');

const revenueShareSchema = new mongoose.Schema({
  partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
  period: { type: String, required: true, index: true },
  revenue: { type: Number, required: true },
  sharePercentage: { type: Number, required: true },
  shareAmount: { type: Number, required: true },
  fees: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'paid', 'disputed', 'adjusted'], 
    default: 'pending' 
  },
  payout: {
    paidAt: Date,
    payoutId: String,
    method: String
  },
  adjustment: {
    amount: Number,
    reason: String,
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

revenueShareSchema.index({ partner: 1, period: -1 });
revenueShareSchema.index({ status: 1, period: -1 });

module.exports = mongoose.model('RevenueShare', revenueShareSchema);
