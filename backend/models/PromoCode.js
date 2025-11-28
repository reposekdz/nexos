const mongoose = require('mongoose');

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

module.exports = mongoose.model('PromoCode', promoCodeSchema);