const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  idempotencyKey: { type: String, required: true, unique: true, index: true },
  status: { 
    type: String, 
    enum: ['initiated', 'payment_pending', 'processing', 'completed', 'failed', 'abandoned', 'refunded'], 
    default: 'initiated' 
  },
  cart: {
    items: [{
      product: { type: mongoose.Schema.Types.ObjectId, refPath: 'cart.items.productType' },
      productType: String,
      quantity: Number,
      price: Number,
      discount: Number,
      subtotal: Number
    }],
    subtotal: Number,
    tax: Number,
    shipping: Number,
    discount: Number,
    total: Number,
    currency: String
  },
  shipping: {
    address: {
      name: String,
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
    method: String,
    trackingNumber: String
  },
  payment: {
    method: String,
    status: String,
    transactionId: String,
    processor: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  inventory: [{
    item: mongoose.Schema.Types.ObjectId,
    reserved: Boolean,
    reservedAt: Date,
    reservationExpires: Date
  }],
  completedAt: Date,
  abandonedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

checkoutSchema.index({ user: 1, status: 1, createdAt: -1 });
checkoutSchema.index({ idempotencyKey: 1 }, { unique: true });
checkoutSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('Checkout', checkoutSchema);
