const mongoose = require('mongoose');

const marketplaceItemSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  category: { type: String, required: true },
  condition: { type: String, enum: ['new', 'like-new', 'good', 'fair', 'poor'] },
  images: [String],
  location: String,
  isAvailable: { type: Boolean, default: true },
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [String]
}, { timestamps: true });

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema);