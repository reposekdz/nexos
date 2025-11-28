const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true, index: true },
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    coordinates: { lat: Number, lng: Number }
  },
  type: { type: String, enum: ['main', 'regional', 'dropship', '3pl'], default: 'regional' },
  status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active' },
  capacity: {
    total: Number,
    used: Number,
    unit: { type: String, default: 'cubic_meters' }
  },
  fulfillmentCost: {
    baseFee: Number,
    perItemFee: Number,
    perKgFee: Number
  },
  shippingZones: [String],
  processingTime: { type: Number, default: 24 },
  contactInfo: {
    email: String,
    phone: String,
    manager: String
  },
  integrations: {
    wms: String,
    carrier: [String]
  },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

warehouseSchema.index({ code: 1 });
warehouseSchema.index({ status: 1, 'address.country': 1 });

module.exports = mongoose.model('Warehouse', warehouseSchema);
