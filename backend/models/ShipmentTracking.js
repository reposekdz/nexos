const mongoose.require('mongoose');

const shipmentTrackingSchema = new mongoose.Schema({
  trackingNumber: { type: String, required: true, unique: true, index: true },
  carrier: { type: String, required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned', 'exception'], 
    default: 'pending' 
  },
  events: [{
    status: String,
    description: String,
    location: String,
    timestamp: Date,
    raw: mongoose.Schema.Types.Mixed
  }],
  estimatedDelivery: Date,
  actualDelivery: Date,
  signedBy: String,
  delay: {
    detected: Boolean,
    reason: String,
    newETA: Date
  },
  lastChecked: Date,
  webhookSubscribed: { type: Boolean, default: false },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

shipmentTrackingSchema.index({ trackingNumber: 1 });
shipmentTrackingSchema.index({ order: 1 });
shipmentTrackingSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model('ShipmentTracking', shipmentTrackingSchema);
