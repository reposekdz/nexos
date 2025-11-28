const mongoose = require('mongoose');

const shippingLabelSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  carrier: { type: String, required: true },
  service: String,
  trackingNumber: { type: String, required: true, unique: true, index: true },
  labelUrl: String,
  labelFormat: { type: String, enum: ['PDF', 'ZPL', 'PNG'], default: 'PDF' },
  shipFrom: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  shipTo: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  package: {
    weight: Number,
    weightUnit: { type: String, default: 'kg' },
    dimensions: { length: Number, width: Number, height: Number },
    dimensionUnit: { type: String, default: 'cm' }
  },
  cost: {
    amount: Number,
    currency: String
  },
  status: { type: String, enum: ['created', 'printed', 'shipped', 'cancelled'], default: 'created' },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  manifestId: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

shippingLabelSchema.index({ order: 1 });
shippingLabelSchema.index({ trackingNumber: 1 });
shippingLabelSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('ShippingLabel', shippingLabelSchema);
