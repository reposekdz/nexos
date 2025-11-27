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
  location: {
    address: String,
    city: String,
    coordinates: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]
    }
  },
  status: { type: String, enum: ['available', 'sold', 'reserved'], default: 'available' },
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  tags: [String],
  negotiations: [{
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    offeredPrice: Number,
    message: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  bids: [{
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    createdAt: { type: Date, default: Date.now }
  }],
  currentBid: Number,
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  soldAt: Date,
  priceAlerts: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetPrice: Number
  }],
  isPromoted: { type: Boolean, default: false },
  promotedUntil: Date,
  shipping: {
    available: { type: Boolean, default: true },
    cost: Number,
    methods: [String]
  },
  negotiable: { type: Boolean, default: false },
  localPickup: { type: Boolean, default: false },
  stock: { type: Number, default: 1 },
  soldCount: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 }
}, { timestamps: true });

marketplaceItemSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('MarketplaceItem', marketplaceItemSchema);