const mongoose = require('mongoose');
const reconciliationRecordSchema = new mongoose.Schema({
  settlementBatch: { type: mongoose.Schema.Types.ObjectId, ref: 'SettlementBatch', required: true, index: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  providerTransactionId: String,
  status: { type: String, enum: ['matched', 'unmatched', 'discrepancy', 'resolved', 'disputed'], default: 'unmatched' },
  matchScore: { type: Number, min: 0, max: 1 },
  providerAmount: Number,
  platformAmount: Number,
  difference: Number,
  discrepancyType: { type: String, enum: ['amount_mismatch', 'missing_platform', 'missing_provider', 'duplicate', 'timing'] },
  resolvedAt: Date,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolutionNotes: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });
reconciliationRecordSchema.index({ settlementBatch: 1, status: 1 });
module.exports = mongoose.model('ReconciliationRecord', reconciliationRecordSchema);