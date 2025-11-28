const mongoose = require('mongoose');

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

module.exports = mongoose.model('TaxRule', taxRuleSchema);