const mongoose = require('mongoose');

const sellerRatingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  period: { type: String, required: true },
  metrics: {
    orders: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      refunded: { type: Number, default: 0 }
    },
    fulfillment: {
      onTimeRate: { type: Number, default: 100 },
      averageProcessingTime: Number,
      lateShipments: { type: Number, default: 0 }
    },
    quality: {
      averageRating: { type: Number, default: 5 },
      totalReviews: { type: Number, default: 0 },
      positiveRate: { type: Number, default: 100 }
    },
    disputes: {
      total: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      escalated: { type: Number, default: 0 }
    },
    returns: {
      total: { type: Number, default: 0 },
      rate: { type: Number, default: 0 }
    }
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  badges: [{ type: String, awardedAt: Date }],
  warnings: [{
    type: String,
    reason: String,
    issuedAt: Date,
    resolvedAt: Date
  }],
  suspended: { type: Boolean, default: false },
  suspensionReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

sellerRatingSchema.index({ seller: 1, period: -1 });
sellerRatingSchema.index({ score: -1, tier: 1 });

module.exports = mongoose.model('SellerRating', sellerRatingSchema);
