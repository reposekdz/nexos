const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  type: { type: String, enum: ['full', 'partial', 'automated', 'manual'], default: 'full' },
  reason: { type: String, enum: ['customer_request', 'failed_delivery', 'product_defect', 'fraud', 'other'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'rejected'], default: 'pending' },
  method: String,
  processor: String,
  processorRefundId: String,
  trigger: { type: String, enum: ['manual', 'automated', 'rule_based'] },
  rule: { type: mongoose.Schema.Types.ObjectId, ref: 'FraudRule' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  processedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

refundSchema.index({ transaction: 1, status: 1 });
refundSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Refund', refundSchema);
