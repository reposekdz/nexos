const mongoose = require('mongoose');
const settlementBatchSchema = new mongoose.Schema({
  provider: { type: String, required: true, enum: ['stripe', 'paypal', 'square', 'braintree', 'manual'] },
  batchId: { type: String, required: true, unique: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  transactionCount: { type: Number, default: 0 },
  fileUrl: String,
  fileHash: String,
  status: { type: String, enum: ['pending', 'processing', 'reconciled', 'discrepancy', 'failed'], default: 'pending' },
  processedAt: Date,
  reconciledAt: Date,
  reconciledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
settlementBatchSchema.index({ provider: 1, batchId: 1 });
settlementBatchSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('SettlementBatch', settlementBatchSchema);