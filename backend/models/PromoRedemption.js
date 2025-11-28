const mongoose = require('mongoose');

const promoRedemptionSchema = new mongoose.Schema({
  promo: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  discountAmount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  ipAddress: String,
  userAgent: String,
  idempotencyKey: { type: String, unique: true, sparse: true }
}, { timestamps: true });

promoRedemptionSchema.index({ promo: 1, user: 1 });
promoRedemptionSchema.index({ user: 1, createdAt: -1 });
promoRedemptionSchema.index({ idempotencyKey: 1 });

module.exports = mongoose.model('PromoRedemption', promoRedemptionSchema);