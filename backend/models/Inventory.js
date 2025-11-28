const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketplaceItem', required: true, index: true },
  sku: { type: String, required: true, unique: true, index: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
  quantity: { type: Number, required: true, default: 0 },
  reserved: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  reorderPoint: { type: Number, default: 10 },
  reorderQuantity: { type: Number, default: 50 },
  status: { type: String, enum: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'], default: 'in_stock' },
  location: {
    aisle: String,
    shelf: String,
    bin: String
  },
  lastRestocked: Date,
  lastSold: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

inventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });
inventorySchema.index({ status: 1, quantity: 1 });

inventorySchema.pre('save', function(next) {
  this.available = Math.max(0, this.quantity - this.reserved);
  if (this.available <= 0) {
    this.status = 'out_of_stock';
  } else if (this.available <= this.reorderPoint) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  next();
});

module.exports = mongoose.model('Inventory', inventorySchema);
