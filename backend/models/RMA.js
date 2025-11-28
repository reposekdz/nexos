const mongoose = require('mongoose');

const rmaSchema = new mongoose.Schema({
  rmaNumber: { type: String, required: true, unique: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem' },
    quantity: Number,
    reason: String,
    condition: String
  }],
  reason: { type: String, enum: ['defective', 'wrong_item', 'not_as_described', 'damaged', 'unwanted', 'other'], required: true },
  status: { 
    type: String, 
    enum: ['requested', 'approved', 'rejected', 'shipped', 'received', 'inspecting', 'refunded', 'replaced', 'closed'], 
    default: 'requested' 
  },
  returnShipping: {
    carrier: String,
    trackingNumber: String,
    labelUrl: String,
    cost: Number,
    paidBy: { type: String, enum: ['customer', 'merchant', 'waived'] }
  },
  inspection: {
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    inspectedAt: Date,
    passed: Boolean,
    notes: String,
    photos: [String]
  },
  resolution: {
    type: { type: String, enum: ['refund', 'replacement', 'store_credit', 'rejected'] },
    amount: Number,
    processedAt: Date
  },
  autoApprove: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

rmaSchema.index({ rmaNumber: 1 });
rmaSchema.index({ user: 1, status: 1 });
rmaSchema.index({ order: 1 });

module.exports = mongoose.model('RMA', rmaSchema);
