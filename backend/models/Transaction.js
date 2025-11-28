const mongoose = require('mongoose');

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

module.exports = mongoose.model('Transaction', transactionSchema);