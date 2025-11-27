const mongoose = require('mongoose');

const businessPageSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: String,
  logo: String,
  coverImage: String,
  contact: {
    email: String,
    phone: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: { lat: Number, lng: Number }
    }
  },
  hours: [{
    day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    open: String,
    close: String,
    isClosed: Boolean
  }],
  products: [{
    name: String,
    description: String,
    price: Number,
    images: [String],
    inStock: Boolean
  }],
  services: [{
    name: String,
    description: String,
    price: Number,
    duration: Number,
    bookingEnabled: Boolean
  }],
  reviews: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  metrics: {
    pageViews: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 }
  },
  verified: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false }
}, { timestamps: true });

businessPageSchema.index({ 'contact.address.coordinates': '2dsphere' });

module.exports = mongoose.model('BusinessPage', businessPageSchema);
