const fs = require('fs');
const path = require('path');

console.log('🚀 Nexos Platform - Features 601-800 Part 2: Marketplace & Logistics\n');

const baseDir = __dirname;
const backendDir = path.join(baseDir, 'backend');
const modelsDir = path.join(backendDir, 'models');

let stats = { modelsCreated: 0 };

const models = {
  'Refund.js': `const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  type: { type: String, enum: ['full', 'partial', 'automated', 'manual'], default: 'full' },
  reason: { type: String, enum: ['customer_request', 'failed_delivery', 'product_defect', 'fraud', 'other'], required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed', 'rejected'], default: 'pending' },
  method: String,
  processor: String,
  processorRefundId: String,
  trigger: { type: String, enum: ['manual', 'automated', 'rule_based'] },
  rule: { type: mongoose.Schema.Types.ObjectId, ref: 'FraudRule' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
  processedAt: Date,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

refundSchema.index({ transaction: 1, status: 1 });
refundSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Refund', refundSchema);
`,

  'Inventory.js': `const mongoose = require('mongoose');

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
`,

  'Warehouse.js': `const mongoose = require('mongoose');

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
`,

  'RMA.js': `const mongoose = require('mongoose');

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
`,

  'SellerRating.js': `const mongoose = require('mongoose');

const sellerRatingSchema = new mongoose.Schema({
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  period: { type: String, required: true },
  metrics: {
    orders: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      refunded: { type: Number, default: 0 }
    },
    fulfillment: {
      onTimeRate: { type: Number, default: 100 },
      averageProcessingTime: Number,
      lateShipments: { type: Number, default: 0 }
    },
    quality: {
      averageRating: { type: Number, default: 5 },
      totalReviews: { type: Number, default: 0 },
      positiveRate: { type: Number, default: 100 }
    },
    disputes: {
      total: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      escalated: { type: Number, default: 0 }
    },
    returns: {
      total: { type: Number, default: 0 },
      rate: { type: Number, default: 0 }
    }
  },
  score: { type: Number, required: true, min: 0, max: 100 },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze' },
  badges: [{ type: String, awardedAt: Date }],
  warnings: [{
    type: String,
    reason: String,
    issuedAt: Date,
    resolvedAt: Date
  }],
  suspended: { type: Boolean, default: false },
  suspensionReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

sellerRatingSchema.index({ seller: 1, period: -1 });
sellerRatingSchema.index({ score: -1, tier: 1 });

module.exports = mongoose.model('SellerRating', sellerRatingSchema);
`,

  'ShippingLabel.js': `const mongoose = require('mongoose');

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
`,

  'ShipmentTracking.js': `const mongoose.require('mongoose');

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
`,

  'SAMLConfig.js': `const mongoose = require('mongoose');

const samlConfigSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  entityId: { type: String, required: true, unique: true },
  ssoUrl: { type: String, required: true },
  sloUrl: String,
  certificate: { type: String, required: true },
  certificateExpiry: Date,
  signRequests: { type: Boolean, default: false },
  encryptAssertions: { type: Boolean, default: false },
  attributeMapping: {
    email: { type: String, default: 'email' },
    firstName: { type: String, default: 'firstName' },
    lastName: { type: String, default: 'lastName' },
    groups: { type: String, default: 'groups' }
  },
  status: { type: String, enum: ['active', 'disabled', 'testing'], default: 'testing' },
  testMode: { type: Boolean, default: true },
  testUsers: [String],
  metadata: {
    idpName: String,
    contactEmail: String,
    setupCompletedAt: Date
  },
  logs: [{
    event: String,
    success: Boolean,
    error: String,
    timestamp: Date
  }]
}, { timestamps: true });

samlConfigSchema.index({ organization: 1 });
samlConfigSchema.index({ entityId: 1 });

module.exports = mongoose.model('SAMLConfig', samlConfigSchema);
`,

  'SCIMSync.js': `const mongoose = require('mongoose');

const scimSyncSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  provider: { type: String, enum: ['okta', 'azure_ad', 'onelogin', 'google', 'custom'], required: true },
  status: { type: String, enum: ['active', 'paused', 'disabled', 'error'], default: 'active' },
  endpoint: String,
  token: String,
  config: {
    autoProvision: { type: Boolean, default: true },
    autoDeprovision: { type: Boolean, default: false },
    groupSync: { type: Boolean, default: true },
    attributeMapping: mongoose.Schema.Types.Mixed
  },
  lastSync: {
    startedAt: Date,
    completedAt: Date,
    status: String,
    usersCreated: { type: Number, default: 0 },
    usersUpdated: { type: Number, default: 0 },
    usersDeactivated: { type: Number, default: 0 },
    groupsSync: { type: Number, default: 0 },
    errors: [{ user: String, error: String }]
  },
  metrics: {
    totalSyncs: { type: Number, default: 0 },
    failedSyncs: { type: Number, default: 0 },
    lastSuccessfulSync: Date
  },
  webhookUrl: String,
  logs: [{
    action: String,
    userId: String,
    status: String,
    error: String,
    timestamp: Date
  }]
}, { timestamps: true });

scimSyncSchema.index({ organization: 1 });
scimSyncSchema.index({ status: 1 });

module.exports = mongoose.model('SCIMSync', scimSyncSchema);
`,

  'DeviceFingerprint.js': `const mongoose = require('mongoose');

const deviceFingerprintSchema = new mongoose.Schema({
  fingerprint: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  signals: {
    userAgent: String,
    platform: String,
    screenResolution: String,
    timezone: String,
    language: String,
    plugins: [String],
    fonts: [String],
    canvas: String,
    webgl: String,
    audio: String
  },
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  riskFactors: [{
    factor: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    detectedAt: Date
  }],
  associations: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confidence: Number,
    firstSeen: Date,
    lastSeen: Date
  }],
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  seenCount: { type: Number, default: 1 },
  blocklisted: { type: Boolean, default: false },
  blockReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

deviceFingerprintSchema.index({ fingerprint: 1 });
deviceFingerprintSchema.index({ user: 1, lastSeen: -1 });
deviceFingerprintSchema.index({ trustScore: 1 });

module.exports = mongoose.model('DeviceFingerprint', deviceFingerprintSchema);
`
};

console.log('Creating models...');
for (const [filename, content] of Object.entries(models)) {
  const filePath = path.join(modelsDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Created model: ${filename}`);
    stats.modelsCreated++;
  } else {
    console.log(`⊗ Model already exists: ${filename}`);
  }
}

console.log('\\n✅ Part 2 Generation Complete!');
console.log(`📊 Models Created: ${stats.modelsCreated}`);
