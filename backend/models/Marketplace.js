const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, index: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, default: 0 },
  reserved: { type: Number, default: 0 },
  available: { type: Number, default: 0 },
  reorderPoint: Number,
  reorderQuantity: Number,
  lastStockCheck: Date,
  location: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

InventorySchema.index({ warehouseId: 1, sku: 1 });
InventorySchema.index({ productId: 1 });

InventorySchema.methods.reserve = async function(quantity) {
  if (this.available < quantity) {
    throw new Error('Insufficient inventory');
  }
  this.reserved += quantity;
  this.available -= quantity;
  await this.save();
};

InventorySchema.methods.release = async function(quantity) {
  this.reserved -= quantity;
  this.available += quantity;
  await this.save();
};

const ReservationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  inventoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Inventory', required: true },
  quantity: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['active', 'released', 'fulfilled', 'expired'],
    default: 'active' 
  },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  expiresAt: { type: Date, required: true, index: true },
  releasedAt: Date
}, { timestamps: true });

ReservationSchema.index({ expiresAt: 1 });

const WarehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ['primary', 'regional', 'dropship', 'third_party'], default: 'primary' },
  address: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  capacity: Number,
  currentUtilization: Number,
  zones: [{ name: String, capacity: Number }],
  operatingHours: mongoose.Schema.Types.Mixed,
  contactInfo: mongoose.Schema.Types.Mixed,
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'on_hold'],
    default: 'pending',
    index: true
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    sku: String,
    name: String,
    quantity: Number,
    priceCents: Number,
    discountCents: Number,
    taxCents: Number,
    totalCents: Number
  }],
  subtotalCents: { type: Number, required: true },
  discountCents: { type: Number, default: 0 },
  taxCents: { type: Number, default: 0 },
  shippingCents: { type: Number, default: 0 },
  totalCents: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  shippingAddress: {
    name: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    phone: String
  },
  billingAddress: mongoose.Schema.Types.Mixed,
  shippingMethod: String,
  trackingNumber: String,
  carrier: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    location: String,
    note: String
  }],
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: String,
  transactionId: String,
  notes: String,
  tags: [String],
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

OrderSchema.index({ userId: 1, status: 1 });
OrderSchema.index({ createdAt: -1 });

const ShippingLabelSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  carrier: { type: String, required: true },
  service: String,
  trackingNumber: { type: String, required: true, unique: true },
  labelUrl: String,
  labelFormat: { type: String, enum: ['pdf', 'zpl', 'png'], default: 'pdf' },
  costCents: Number,
  currency: String,
  weight: Number,
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: String
  },
  fromAddress: mongoose.Schema.Types.Mixed,
  toAddress: mongoose.Schema.Types.Mixed,
  insurance: {
    enabled: Boolean,
    valueCents: Number
  },
  voidedAt: Date
}, { timestamps: true });

const RMASchema = new mongoose.Schema({
  rmaNumber: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    productId: mongoose.Schema.Types.ObjectId,
    sku: String,
    quantity: Number,
    reason: String,
    condition: String
  }],
  reason: { type: String, enum: ['defective', 'wrong_item', 'not_as_described', 'damaged', 'changed_mind', 'other'], required: true },
  status: { 
    type: String, 
    enum: ['requested', 'approved', 'rejected', 'shipped', 'received', 'inspected', 'completed'],
    default: 'requested' 
  },
  returnLabelUrl: String,
  trackingNumber: String,
  resolution: { type: String, enum: ['refund', 'replacement', 'repair', 'store_credit'] },
  refundAmountCents: Number,
  restockingFeeCents: Number,
  slaDeadline: Date,
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

const SKUBundleSchema = new mongoose.Schema({
  bundleSku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  components: [{
    sku: String,
    productId: mongoose.Schema.Types.ObjectId,
    quantity: { type: Number, required: true }
  }],
  priceCents: Number,
  currency: String,
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const PriceRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['discount', 'bundle', 'bogo', 'tiered', 'volume'], required: true },
  priority: { type: Number, default: 0 },
  conditions: mongoose.Schema.Types.Mixed,
  action: mongoose.Schema.Types.Mixed,
  applicableProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  applicableCategories: [String],
  startDate: Date,
  endDate: Date,
  usageLimit: Number,
  usageCount: { type: Number, default: 0 },
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const SellerPerformanceSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  period: Date,
  metrics: {
    totalSales: Number,
    totalOrders: Number,
    averageOrderValue: Number,
    fulfillmentRate: Number,
    cancellationRate: Number,
    returnRate: Number,
    responseTime: Number,
    rating: Number,
    reviewCount: Number
  },
  thresholds: {
    minimumRating: Number,
    maximumCancellationRate: Number,
    maximumReturnRate: Number,
    minimumFulfillmentRate: Number
  },
  status: { type: String, enum: ['good', 'warning', 'suspended'], default: 'good' },
  violations: [{
    type: String,
    severity: String,
    date: Date,
    resolved: Boolean
  }]
}, { timestamps: true });

const ChannelMappingSchema = new mongoose.Schema({
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: String, enum: ['amazon', 'ebay', 'walmart', 'shopify', 'etsy', 'custom'], required: true },
  channelId: String,
  credentials: mongoose.Schema.Types.Mixed,
  mappings: [{
    localSku: String,
    channelSku: String,
    channelListingId: String,
    syncEnabled: Boolean
  }],
  syncSettings: {
    syncInventory: { type: Boolean, default: true },
    syncPricing: { type: Boolean, default: true },
    syncOrders: { type: Boolean, default: true },
    frequency: String
  },
  lastSync: Date,
  enabled: { type: Boolean, default: true }
}, { timestamps: true });

const AttributeSchemaSchema = new mongoose.Schema({
  category: { type: String, required: true },
  attributes: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'boolean', 'select', 'multiselect', 'date'], required: true },
    required: { type: Boolean, default: false },
    options: [String],
    validation: mongoose.Schema.Types.Mixed,
    displayName: String,
    helpText: String
  }],
  version: { type: Number, default: 1 }
}, { timestamps: true });

const SKULifecycleSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'deprecated', 'discontinued', 'archived'], default: 'active' },
  deprecationDate: Date,
  discontinuationDate: Date,
  replacementSku: String,
  reason: String,
  notificationsSent: Boolean
}, { timestamps: true });

const Inventory = mongoose.model('Inventory', InventorySchema);
const Reservation = mongoose.model('Reservation', ReservationSchema);
const Warehouse = mongoose.model('Warehouse', WarehouseSchema);
const Order = mongoose.model('Order', OrderSchema);
const ShippingLabel = mongoose.model('ShippingLabel', ShippingLabelSchema);
const RMA = mongoose.model('RMA', RMASchema);
const SKUBundle = mongoose.model('SKUBundle', SKUBundleSchema);
const PriceRule = mongoose.model('PriceRule', PriceRuleSchema);
const SellerPerformance = mongoose.model('SellerPerformance', SellerPerformanceSchema);
const ChannelMapping = mongoose.model('ChannelMapping', ChannelMappingSchema);
const AttributeSchema = mongoose.model('AttributeSchema', AttributeSchemaSchema);
const SKULifecycle = mongoose.model('SKULifecycle', SKULifecycleSchema);

module.exports = {
  Inventory,
  Reservation,
  Warehouse,
  Order,
  ShippingLabel,
  RMA,
  SKUBundle,
  PriceRule,
  SellerPerformance,
  ChannelMapping,
  AttributeSchema,
  SKULifecycle
};
