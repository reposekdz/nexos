const mongoose = require('mongoose');

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

module.exports = mongoose.model('CurrencyRate', currencyRateSchema);